# Research findings: PICO-8 `pxa` **compressor** (encoder) match-selection algorithm

## Executive summary

The reference PICO-8 compressor (`pxa_compress()` in `pxa_compress_snippets.c`) is
**greedy, single-pass, left-to-right**, with two specific, fully-specified refinements:
a cheap **2-position lookahead** that can veto an otherwise-acceptable match, and a
separate, periodic **retrospective raw-block substitution** pass that re-evaluates
~32-byte windows of already-emitted output after the fact. **It is not optimal
dynamic-programming parsing.** Every scoring decision uses a closed-form heuristic —
`score = matched_length * 256 / bit_cost` — computed from an **approximate** bit-cost
model for back-references (off by ±1 bit at the 5-bit/15-bit offset-width extremes,
and ignoring length-chain overhead beyond the first link) but an **exact** bit-cost
model for literals (computed from the live, correctly-simulated MTF table state, not
an estimate). All of this is fully specified below with direct quotes, so the
algorithm is deterministic and directly implementable — no unresolved ambiguity was
found in the C reference for any of the 6 brief questions.

**Important finding not anticipated by the brief**: shrinko8's `pico_compress.py` does
**not** implement the same algorithm as the C reference. Its `compress_code()` /
`get_lz77()` use a genuinely different, more sophisticated approximate-optimal
parse (a cost-tracked lookahead search with pruned candidate "advances," carrying a
simulated MTF context through each candidate path). It is **not usable as a source of
truth for byte-exact reproduction of real carts** — real carts were compressed by the
C reference, not by shrinko8, and the two algorithms make different choices in
general. shrinko8 is flagged here as a secondary, structurally-different reference,
not a corroborating one (see §9 and §11 "Conflicts").

pancelor's blog post was re-checked specifically for compressor content and confirmed
(via targeted fetch) to cover **decompression and reverse-engineering only** — it
contains no compressor implementation or match-selection discussion. It is not cited
further in this document.

---

## 0. Where the code lives

- C reference: function `pxa_compress()` (main driver, ~line 429–700) and its helper
  `pxa_find_repeatable_block()` (match search + scoring, ~line 237–333), both in
  `pxa_compress_snippets.c`, fetched in full (828 lines) from
  `https://raw.githubusercontent.com/dansanderson/lexaloffle/master/pxa_compress_snippets.c`.
- shrinko8 (structurally different, see §9): function `compress_code()` and its helper
  `get_lz77()`, in `pico_compress.py`, fetched in full (668 lines) from
  `https://raw.githubusercontent.com/thisismypassport/shrinko8/master/pico_compress.py`.

---

## 1. Match search strategy (Q1): greedy single pass, not optimal DP

`pxa_compress()`'s main loop advances a single position cursor `pos` from 0 to `len`,
making one block-or-literal decision per iteration and then jumping `pos` forward by
however much was just consumed. There is no whole-input cost table and no
backtracking beyond the narrow mechanisms below.

```c
while (pos < len)
{
    // either copy or literal
    block_len = pxa_find_repeatable_block(in, pos, len, &block_offset, &block_score);
    int c = in[pos];
    int lpos = literal_pos[c];
    ...
    if (block_len >= PXA_MIN_BLOCK_LEN && block_score > literal_score)
    if (block_score < 128) // 25% faster, only slight drop in compression ratio
    {
        int ii;
        for (ii = 1; ii < 3; ii++)
        {
            int block_offset2 = 0, block_score2 = 0;
            pxa_find_repeatable_block(in, pos+ii, len, &block_offset2, &block_score2);
            if (block_score2 > block_score * 6/5) // 6/5
            {
                block_score = 0;
                break;
            }
        }
    }

    if (block_len >= PXA_MIN_BLOCK_LEN && block_score > literal_score)
    {
        // block
        putbit(0);
        block_bits_written += putnum(block_offset - 1);
        block_bits_written += putchain(block_len - PXA_MIN_BLOCK_LEN, BLOCK_LEN_CHAIN_BITS, 100000);
        pos += block_len;
    }
    else
    {
        // literal
        ...
        pos ++;
    }
```

So the strategy is: **greedy** — take the single best-scoring candidate at the
current position — **plus a bounded 2-step lookahead veto**. The comment above the
loop states the intent directly:

> `// If block score is good (>= 128), just take it. But otherwise, look for better
> block score in next 2 characters before commiting to a block. Saves ~400 bytes for
> heavy carts (!)`

The veto only fires when the current match's `block_score` is below 128 (i.e. the
match is only "mediocre," not clearly good — see §3 for what the score number means)
AND a match starting 1 or 2 bytes later scores at least 20% better
(`block_score2 > block_score * 6/5`); in that case the current match is discarded
(`block_score = 0`), forcing a literal to be emitted at `pos` instead, so that the
better match 1–2 bytes ahead can be taken on the next iteration(s).

This is explicitly a speed/ratio tradeoff, not an attempt at optimality — the same
comment block states: `// 25% faster, only slight drop in compression ratio (lost avg
3.6 bytes across 5 carts)`. There is no lookahead beyond 2 positions, and no
consideration of "2 shorter matches vs 1 longer one" beyond this narrow veto.

A separate, unrelated mechanism (§6) retrospectively **replaces already-encoded
output** with a raw literal block if that segment turns out to have compressed
worse than storing it raw — this is the only place where the algorithm revisits a
decision after the fact, and it operates on a coarse ~32-destination-byte granularity,
not per-symbol.

**Conclusion for Q1**: greedy left-to-right, single best-scoring match per position,
with (a) a 2-position/20%-improvement lookahead veto and (b) a periodic
whole-segment raw-block re-evaluation. Not global optimal parsing/DP. (Contrast with
shrinko8's independent `get_lz77`, which *does* implement a real lookahead/DP-like
search — see §9 — but that is a different algorithm, not what produced real carts.)

---

## 2. Match-finding structure (Q2): 3-byte hash, exhaustive per-bucket search, no depth cap

Matches are found via a hash table keyed on the **3-byte prefix** at each candidate
position (`N = 3`):

```c
#define HASH_MAX 4096
#define MINI_HASH(pp, i) ((pp[i+0]*7 + pp[i+1]*1503 + pp[i+2]*51717) & (HASH_MAX-1))
```

The table is built once, up front, for the entire input (`pxa_build_hash_lookup`),
producing for each of the 4096 buckets a growable list of all positions `i` (in
ascending order) whose 3-byte prefix hashes to that bucket:

```c
for (i = 0; i < len-2; i++)
{
    hash = MINI_HASH(in, i);
    list = hash_list[hash];
    if (!list) { /* allocate new list, size 4 */ ... }
    if (list[0] == list[1]) { /* double list allocation */ ... }
    list[2 + list[1]] = i;
    list[1] ++;
}
```

At each position `pos`, `pxa_find_repeatable_block` walks **the entire candidate list**
for that hash bucket (all earlier same-hash positions within the 32767-byte history
window) — **there is no maximum search-depth/chain-length cap**:

```c
if (!list) return 0; // 0.2.0e: exit early
for (list_pos = 0; list_pos < list[1] && list[2+list_pos] < pos; list_pos++)
if (list[2+list_pos] >= pos - max_hist_len) // not out of range
{
    int pos0 = list[2 + list_pos];
    i = 0;
    // matches in history
    while (i < max_len && (pos0+i) < pos && dat[pos0 + i] == dat[pos + i])
        i ++;
    // matches in output of this repeated block (self-referential overlap)
    while (i < max_len && (pos0+i) >= pos && dat[pos0 + (i % (pos-pos0))] == dat[pos + i])
        i ++;
    ...
    score = i * 256 / bit_cost;
    if (score > best_score) { best_score = score; best_pos0 = pos0; best_len = i; }
}
```

Notes:
- `max_hist_len = 32767` (the 15-bit offset field's range) bounds how far back a
  candidate may be, but does not bound *how many* candidates within that range are
  checked — every same-hash occurrence within range is evaluated, and the
  highest-*score* one wins (score, not raw length — see §3).
- The list is naturally position-ascending (built by a forward scan), and the loop
  exploits this only for its early-exit condition (`list[2+list_pos] < pos` — stop
  once a future position is reached, since all later list entries are also future
  positions); it does **not** early-exit based on distance/count.
- The second `while` loop (matching into `pos0+i >= pos`, using
  `dat[pos0 + (i % (pos-pos0))]`) explicitly allows a match to extend **past the
  current position into output not yet written**, using modulo indexing to replicate
  the repeating pattern this creates — i.e. it directly searches for
  self-referential run-length-style matches (offset < length), matching the
  decompressor's one-byte-at-a-time copy semantics.
- A `found[]`/`last_pos` array is computed (`last_pos = found[hash];`) inside
  `pxa_find_repeatable_block` but is **never actually used** in the function body —
  it appears to be dead/vestigial code from an earlier, simpler match-finder that
  predates the full hash-list mechanism. Worth knowing so it isn't mistaken for an
  active optimization.

**Conclusion for Q2**: 3-byte hash into 4096 buckets, built once for the whole input;
per-position search walks the *complete* bucket list within the 32767-byte window (no
depth/count cap); best candidate chosen by the score formula in §3, not by raw match
length or nearest position.

---

## 3. Tie-breaking / cost-comparison rules (Q3)

### 3a. The score formula, and its approximate bit-cost model

Within `pxa_find_repeatable_block`, each candidate's **rate** (matched bytes per bit,
scaled) is computed and the highest-rate candidate wins — this is *not* raw
match length and *not* nearest offset directly, though both fall out of the formula
as documented below.

```c
dist = pos - pos0; // distance

bit_cost = 0;
while (dist > 0){
    bit_cost ++;
    dist >>= BLOCK_DIST_BITS; // 5-bit steps
}
bit_cost = MIN(bit_cost,2) + bit_cost * BLOCK_DIST_BITS;   // bits to write len.bitlen   ends up being 6, 12, 17

bit_cost += 3;   // length-chain cost, hardcoded, NOT the real chain cost — see comment below
bit_cost += 1;   // is_block marker

score = i * 256 / bit_cost; // number of characters written / cost
```

The comment immediately above the `+= 3` line is explicit that this is a deliberate
approximation:

> `// block length cost: number of chain links * chain bits`
> `// commented; don't need! (and expensive to calculate) always worth taking a block
> with larger number of bit chain nodes`
> `bit_cost += 3;`

So the length-chain cost is **always approximated as exactly 3 bits** (the cost of a
single length-chain link that terminates immediately), regardless of the match's
actual length — the compressor assumes a longer match is always worth taking and
never spends time computing the true extra 3-bits-per-7-extra-length chain cost when
*searching*. (The bits actually *written* once a match is chosen, via `putchain`, are
always the exact/correct encoding — this approximation only affects which candidate
is *selected*, not how the chosen one is encoded.)

The offset-distance part of the formula (`MIN(bit_cost,2) + bit_cost*5`) is also an
approximation, not the real selector-bit cost derived independently in the prior
decompression research (`docs/prd12-research-findings.md` §5: 1 bit for the 15-bit
case, 2 bits for the 5-bit and 10-bit cases). Tracing the values:

| distance range | groups (`bit_cost` in the loop) | real field width | approx total (`MIN(n,2)+n*5`) | real total (selector + field) |
|---|---|---|---|---|
| 1–31 | 1 | 5 bits | `1+5=6` | `2+5=7` (selector 2 bits, "11") |
| 32–1023 | 2 | 10 bits | `2+10=12` | `2+10=12` (selector 2 bits, "10") |
| 1024–32767 | 3 | 15 bits | `2+15=17` | `1+15=16` (selector 1 bit, "0") |

The 5-bit case is **underestimated by 1 bit** and the 15-bit case is **overestimated
by 1 bit** by this heuristic, relative to the real selector cost established in the
decompression research. This is a genuine, quotable imprecision in the *search*
heuristic — it does not affect correctness (the final `putnum`/`putchain` calls always
emit the bit-exact correct encoding for whatever candidate is chosen), but it does
mean a byte-exact reimplementation of PICO-8's compressor must replicate this
*exact* approximate formula during search/scoring, not the true bit cost, or it will
pick different candidates than PICO-8 did in cases near these boundaries.

### 3b. Same-length, different-offset candidates: smaller offset wins

Since `bit_cost` strictly increases with `dist` (more groups ⇒ higher `bit_cost`) and
`score = i*256/bit_cost` for fixed `i` is a strictly decreasing function of
`bit_cost`, a smaller offset **always** produces a higher (or equal) score than a
larger offset at the same match length. **Worked example**, using the exact formula
above:

Two candidates both match length `i = 5` at the current position:
- Candidate A: `dist = 20` → 1 group → `bit_cost = MIN(1,2)+1*5 = 6`, `+3+1 = 10`.
  `score_A = 5*256/10 = 128.0`
- Candidate B: `dist = 40` → 2 groups → `bit_cost = MIN(2,2)+2*5 = 12`, `+3+1 = 16`.
  `score_B = 5*256/16 = 80.0`

`score_A (128) > score_B (80)` → candidate A (offset 20, the nearer one) wins,
confirming: **for equal length, the smaller/nearer offset is always preferred**, and
specifically preferred by a margin proportional to how much cheaper its distance
group is, not by a fixed rule — an offset that stays within the same 5-bit-group
"tier" as another offset gets no preference at all from this term, only crossing a
tier boundary (5→10→15-bit field) matters.

### 3c. Match vs. literal: literal cost is EXACT (live MTF state), match cost is approximate

```c
int c = in[pos];
int lpos = literal_pos[c];

int cat_bits = TINY_LITERAL_BITS; // 4
int cat_max_val = 1 << cat_bits;
while (lpos >= cat_max_val)
{
    cat_bits ++;
    cat_max_val += (1 << cat_bits);
}

literal_score = 1 * 256 / (2 + ((cat_bits - TINY_LITERAL_BITS) + cat_bits));
```

`literal_pos[c]` is read from the **live, currently-accurate** MTF-position table —
the same `literal`/`literal_pos` arrays that are updated after every literal emission
(see §8/§10 for the update code, identical to the decoder's). This is the *exact* bit
cost of encoding `c` as a literal right now (`2 + unary_ones + fixed_bits`, matching
the format derived in the decompression research exactly: header bit + unary prefix +
terminator + fixed field), not an approximation — see §5 for full justification.

The decision is then a direct, exact-vs-approximate comparison of two rate scores in
the same units (`i*256/bit_cost` for blocks, `1*256/bit_cost` for a single literal
byte):

```c
if (block_len >= PXA_MIN_BLOCK_LEN && block_score > literal_score)
    // take block
else
    // take literal
```

**Worked example** showing a length-3 match losing to a literal because of its far
offset (directly answers Q4 too — see below): suppose `block_len = 3` (the legal
minimum) at `dist = 2000` (falls in the 1024–32767 / 3-group / 15-bit-field range):

`bit_cost`: 2000 → shifts: 2000>>5=62 (bit_cost=1), 62>>5=1 (bit_cost=2), 1>>5=0
(bit_cost=3, loop stops). `bit_cost = MIN(3,2) + 3*5 = 2+15 = 17`, `+3+1 = 21`.
`block_score = 3*256/21 ≈ 36.6`

Suppose the literal at this position has MTF index `lpos = 5` (so `cat_bits` stays at
the default 4, since `5 < 16`): `literal_score = 1*256/(2+(4-4)+4) = 256/6 ≈ 42.7`

`literal_score (42.7) > block_score (36.6)` → **the literal wins**, even though a
valid length-3 match exists. This is exactly the offset-dependent implicit threshold
the brief asked about in Q4 (see next section).

---

## 4. Minimum match length / offset-dependent threshold (Q4)

`PXA_MIN_BLOCK_LEN = 3` is a hard floor enforced structurally — `pxa_find_repeatable_block`
returns 0 immediately if fewer than 3 bytes of remaining input exist
(`if (max_len < PXA_MIN_BLOCK_LEN) return 0;`), and the main loop's condition is
`if (block_len >= PXA_MIN_BLOCK_LEN && block_score > literal_score)`, so a match
shorter than 3 is never even considered as a candidate for comparison.

But confirming the brief's specific question: **yes**, there is additionally an
offset-dependent effective threshold, and it is not a separate explicit rule — it
falls directly out of the `block_score > literal_score` comparison in §3c, since
`block_score` for a fixed length gets strictly worse as offset (and hence `bit_cost`)
grows. The worked example immediately above (length-3, `dist=2000`, `literal_score`
wins) demonstrates this concretely and numerically from the real formula: a length-3
match is rejected purely because its offset is far enough that its exact required
bits exceed what 3 literals (at current, cheap MTF position) would cost. There is no
separate/independent "is this offset too far for this length" check anywhere in the
source — it's entirely a byproduct of the same score comparison used for every
block-vs-literal decision.

One additional wrinkle already covered in §1: even when `block_score > literal_score`
(match nominally wins), the 2-position lookahead veto in the main loop can still
override this and force a literal if `block_score < 128` and a nearby position scores
≥20% higher — this is a *second*, independent mechanism that can also suppress an
otherwise-winning short/far match, on top of the offset-dependent threshold from the
score comparison itself.

---

## 5. Raw/uncompressed-block mode (Q5): periodic retrospective substitution, not a per-symbol choice

This is **not** decided at the point of emitting each literal/block — it is a
separate, coarser mechanism that runs periodically (roughly every 32 bytes of
*compressed output*, or at end-of-input) and retroactively **rewrites** the output
for that window if raw storage would have been smaller:

```c
// 0.2.0j: if last 32 bytes (or remaining end of input) written have a ratio worse
// than ~1.0, rewrite as a raw block instead

if (dest_pos - raw_pos_dest >= 32 || pos == len)
{
    int compressed_size = dest_pos - raw_pos_dest;
    int raw_size = pos - raw_pos_src;
    int margin = raw_pos_src0 == raw_pos_src ? 3 : 0; // 3 for first section (header + null terminator), 0 for appended

    if (compressed_size > raw_size + margin)
    {
        if (stored_last_segment_as_raw == 0) // write header
        {
            raw_block_size = raw_size;
            raw_header_write_pos = raw_block_write_pos;
            set_write_pos(raw_header_write_pos);
            putbit(0); putbit(1); putbit(0); putval(0, 10);   // sentinel: block, offlen=10, offset field=0
        }
        else
        {
            // append: extend the previous raw block instead of starting a new one
            set_write_pos(raw_block_write_pos);
            dest_pos--; // overwrite previous null terminator
        }

        int k = 0;
        for (k = 0; k < raw_size; k++)
            putval(in[raw_pos_src + k], 8);
        putval(0,8); // null terminator

        stored_last_segment_as_raw = 1;
        RESTORE_VLIST_STATE();
    }
    else{
        stored_last_segment_as_raw = 0;
        raw_pos_src0 = pos;
        BACKUP_VLIST_STATE();
    }

    raw_pos_dest = dest_pos;
    raw_pos_src = pos;
    raw_block_write_pos = get_write_pos();
}
```

Key mechanics:

- **Trigger**: purely a byte-count comparison, not any content heuristic — every ~32
  bytes of *destination* output (or the final partial segment at end-of-input), check
  whether `compressed_size (bits→ counted here as the raw byte-count of dest_pos
  advance) > raw_size (source bytes in this window) + margin`. `margin = 3` only for
  the very first segment of the whole cart (accounting for the 3 extra bytes: the
  13-bit/~2-byte raw-block header plus the null terminator, vs. 0 margin for appending
  to an already-raw previous segment, since appending needs no new header at all — the
  code literally overwrites the prior segment's null terminator and keeps writing).
- **Rewrite, not proactive decision**: `set_write_pos`/`get_write_pos` (encoded as a
  packed `(dest_pos<<16)|(byte<<8)|bit` int) let the compressor rewind the output
  bitstream to the start of the segment and physically overwrite what was already
  written with the raw encoding instead. This is a genuine retrospective substitution,
  the only place in the algorithm that revisits an already-made decision.
- **Segment merging**: consecutive raw segments are merged into one continuous raw
  block by overwriting the prior segment's terminating `0x00` byte and continuing to
  append raw bytes, rather than emitting a fresh ~13-bit header each time
  (`stored_last_segment_as_raw` tracks this).
- **MTF state must be rolled back**: `RESTORE_VLIST_STATE()` / `BACKUP_VLIST_STATE()`
  snapshot and restore the `literal[]`/`literal_pos[]` (MTF) arrays around this
  decision. This matters because raw bytes bypass MTF entirely — confirmed by the
  decompressor, whose raw-block loop (`pxa_decompress`, §7 of the decompression
  findings) never touches the `literal[]` table at all. So when a segment that was
  speculatively compressed (updating MTF state along the way) gets retroactively
  replaced with a raw block, those speculative MTF updates must be undone so the
  encoder's MTF state stays in sync with what the decoder will actually have after
  the raw block (i.e., unchanged from before the raw segment). `BACKUP_VLIST_STATE()`
  snapshots state at the start of each new potential window (only when the *previous*
  window was kept as normal compressed data, i.e. a valid rollback point);
  `RESTORE_VLIST_STATE()` reverts to that snapshot when a rewrite to raw happens.

**Conclusion for Q5**: raw-block mode is chosen purely for a coarse-grained *size*
reason — a ~32-destination-byte trailing window (or the final tail of the file)
compressed worse than storing it raw — re-evaluated periodically and applied
retroactively by literally rewinding and overwriting the output bitstream, with
careful MTF-state bookkeeping so the rollback is consistent with what the decoder
will do. It is not a proactive "long run of poor MTF state" detector at the point of
literal emission — it's purely a post-hoc byte-count comparison over a fixed window
size.

---

## 6. MTF table interaction with cost comparisons (Q6)

**Yes — the compressor tracks the true, live MTF table state**, not a simplification,
for literal cost. The `literal`/`literal_pos` arrays used in `literal_score`'s
`lpos = literal_pos[c]` lookup (§3c) are the *same* arrays incrementally updated after
every literal emission, using the identical standard-MTF update already confirmed in
the decompression research:

```c
// move c to start of vlist and update positions
for (i = lpos; i > 0; i--)
{
    literal[i] = literal[i-1];
    literal_pos[literal[i]] ++;
}
literal[0] = c;
literal_pos[c] = 0;
```

Note this update happens **only when a literal is actually emitted** — comment in the
source makes this explicit:

> `// only pay attention to value outside of blocks; compression ratio is fine (maybe
> better?) and faster to calculate`

i.e., bytes consumed as part of a back-reference block do **not** update the MTF table
at all (matches the decoder, which also never touches `literal[]` inside its
back-reference copy path). So the MTF state the compressor tracks for scoring is
exactly the state the decoder will have at the same point in the stream — an exact
simulation, not an approximation — *as long as* the raw-block MTF-rollback bookkeeping
in §5 is also correctly replicated (since that's the one place state can retroactively
change).

By contrast, **back-reference cost is not MTF-state-dependent at all** (matches never
touch MTF either on encode or decode), so there is nothing to simulate there — only
the offset/length-derived approximate `bit_cost` formula of §3a applies.

**Conclusion for Q6**: literal costs used in match-vs-literal comparisons are computed
from the compressor's own live, correctly-updated MTF-position table (an exact
simulation of decoder state, not a heuristic), while back-reference costs use the
approximate formula in §3a (not MTF-related, since matches never touch MTF).

---

## 7. Full pseudocode (compress)

Combining §1–§6 into one implementable description of `pxa_compress`:

```
mtf = [i for i in 0..255]           # identity, same as decoder init
out_bits = []                        # write \0pxa header, unc_size, placeholder com_size first

pos = 0
raw_pos_dest = current_output_bit_position
raw_pos_src = pos
mtf_backup = None                    # snapshot point for raw-block rollback
stored_last_segment_as_raw = False

while pos < len(input):
    c = input[pos]
    lpos = mtf.index(c)              # exact live MTF position

    # --- exact literal cost ---
    cat_bits = 4
    cat_max_val = 16
    while lpos >= cat_max_val:
        cat_bits += 1
        cat_max_val += (1 << cat_bits)
    literal_score = 256 // (2 + (cat_bits - 4) + cat_bits)

    # --- best back-reference candidate (§2, §3a) ---
    block_len, block_offset, block_score = find_best_match(input, pos)
    # find_best_match: for every position pos0 < pos sharing input[pos:pos+3]'s hash
    #   (within 32767 bytes back, no depth cap), extend match length i (allowing
    #   self-overlap via modulo), compute:
    #     dist = pos - pos0
    #     groups = number of 5-bit right-shifts of dist to reach 0   (1, 2, or 3)
    #     approx_bit_cost = min(groups,2) + groups*5 + 3 (length-chain approx) + 1 (marker)
    #     score = i * 256 // approx_bit_cost
    #   keep the pos0 with the highest score.

    # --- 2-position lookahead veto (§1) ---
    if block_len >= 3 and block_score > literal_score and block_score < 128:
        for ii in (1, 2):
            _, _, score2 = find_best_match(input, pos + ii)
            if score2 > block_score * 6 // 5:
                block_score = 0   # veto: force literal here
                break

    if block_len >= 3 and block_score > literal_score:
        emit_bit(0)                                   # block marker
        emit_offset(block_offset - 1)                  # putnum: 1/2-bit selector + 5/10/15-bit field
        emit_length_chain(block_len - 3)                # 3-bit chain, base 3
        pos += block_len
        # NOTE: MTF is NOT updated for bytes consumed by a block
    else:
        emit_bit(1)                                    # literal marker
        emit_unary(cat_bits - 4)                        # that many 1s then a 0
        emit_bits(lpos - (cat_max_val_at_cat_bits_start), cat_bits)  # fixed field, LSB-first
        mtf_move_to_front(mtf, lpos, c)                 # standard MTF update
        pos += 1

    # --- periodic raw-block re-evaluation (§5), every ~32 dest bytes or at EOF ---
    if current_output_byte_pos - raw_pos_dest >= 32 or pos == len(input):
        compressed_size = current_output_byte_pos - raw_pos_dest
        raw_size = pos - raw_pos_src
        margin = 3 if raw_pos_src == first_segment_start else 0
        if compressed_size > raw_size + margin:
            rewind_output_to(raw_pos_dest_bit_position)
            if not stored_last_segment_as_raw:
                emit_bit(0); emit_bit(1); emit_bit(0); emit_bits(0, 10)  # raw sentinel
            else:
                drop_previous_null_terminator()
            for byte in input[raw_pos_src : pos]:
                emit_bits(byte, 8)
            emit_bits(0, 8)  # terminator
            stored_last_segment_as_raw = True
            mtf = mtf_backup                              # roll back speculative MTF updates
        else:
            stored_last_segment_as_raw = False
            mtf_backup = copy(mtf)                          # new rollback snapshot point
        raw_pos_dest = current_output_byte_pos
        raw_pos_src = pos

pad_to_byte_boundary_with_zero_bits()
fill_in_com_size_field()
if final_compressed_size > len(input):
    return input unchanged  # compression gave up: store raw at the whole-cart level
```

---

## 8. Worked examples

Both examples below are computed directly from the exact quoted formulas — not
guesses — but are hand-constructed illustrations (no real `.p8.png` cart bytes were
extracted in this environment) to make the mechanics concrete:

**Example 1 — same-length matches, different offsets (§3b)**: a 5-byte match is
available at `dist=20` and also at `dist=40`. `score_20 = 128.0`,
`score_40 = 80.0` → the compressor picks the `dist=20` candidate. This generalizes:
whenever two same-length candidates fall in the *same* 5-bit-group tier (e.g. both
under 32, or both in 32–1023), the nearer one always scores strictly higher, so
smaller offset always wins ties and near-ties at equal length.

**Example 2 — length-3 match rejected in favor of a literal due to far offset
(§3c/§4)**: a length-3 match exists at `dist=2000` (`block_score ≈ 36.6`); the current
byte's MTF position is `lpos=5` (`literal_score ≈ 42.7`). Literal wins
(`42.7 > 36.6`) even though `block_len (3) >= PXA_MIN_BLOCK_LEN (3)` and the match is
structurally valid — demonstrating the offset-dependent implicit threshold requested
in Q4 falls directly out of the score formula, with no separate rule needed.

A genuine byte-exact worked trace against real cart bytes was not possible in this
environment (no `.p8.png` fixture was available to extract from directly during this
research pass) — the picoedit repo's own 11 real test fixtures (mentioned in the
brief) are the right source for that verification once this algorithm is implemented;
this document supplies the exact formulas needed to do so deterministically.

---

## 9. shrinko8's `compress_code` — a structurally different algorithm (not usable for byte-exact matching)

Unlike `uncompress_code` (which matched the C reference exactly and was corroborating
in the earlier decompression research), shrinko8's **encoder** is independently
designed and demonstrably different from the C reference described above:

- It performs an actual lookahead/near-optimal search (`get_lz77`'s `measure`
  parameter and the `Lz77Advance`-linked-list "advances" deque), not a simple 2-step
  veto:

  ```python
  class Lz77Advance(Tuple):
      """A strategy that advances from 'i' to 'next_i' using 'item' (a literal/lz77/etc)
         with cost 'cost', it was preceded by Lz77Advance 'prev'. (so Lz77Advance-s
         form a linked list) ('ctxt' is the opaque context for measure)"""
      i = next_i = cost = ctxt = item = prev = ...
  ```

- Its cost `measure()` function *does* carry a simulated MTF context per candidate
  path (structurally similar in spirit to §6's finding that literal cost must reflect
  live MTF state), but the offset/length cost formula differs from the C reference's
  approximation:

  ```python
  def measure(ctxt_mtf, item):
      if isinstance(item, Lz77Entry):
          offset_bits = max(round_up(count_significant_bits(item.offset - 1), 5), 5)
          count_bits = (((item.count - min_c) // 7) + 1) * 3
          cost = 2 + (offset_bits < 15) + offset_bits + count_bits
      else:
          ctxt_mtf = ctxt_mtf or mtf
          ch_i = ctxt_mtf.index(item)
          cost = mtf_cost_heuristic(ch_i)
          ctxt_mtf = ctxt_mtf[:]
          update_mtf(ctxt_mtf, ch_i, item)
      return cost, ctxt_mtf
  ```

  Note this `cost` for an Lz77Entry (`2 + (offset_bits<15) + offset_bits +
  count_bits`) is the *exact* real bit cost (selector + field + full length-chain
  cost), unlike the C reference's deliberately-approximate `bit_cost` in §3a. It also
  uses `mtf_cost_heuristic()` (a distinct, separately-approximated literal-cost
  function) rather than the C reference's exact category-bits formula:

  ```python
  def mtf_cost_heuristic(ch_i):
      mask = 1 << 4
      count = 6
      while ch_i >= mask:
          mask = (mask << 1) | (1 << 4)
          count += 2
      if ch_i >= 16:
          count -= 1 # heuristic, since mtf generally pays forward
      return count
  ```

  (This has an explicit `-1` fudge the code itself calls a "heuristic.")

- It also has its own separate raw-literal-block heuristic
  (`preprocess_litblock_idxs`, a sliding-window running-cost-delta detector), entirely
  different in mechanism from the C reference's periodic rewind-and-substitute
  approach in §5.

None of this is wrong or a "bug" in shrinko8 — it's simply a different, independently
engineered encoder that happens to target the same bitstream *format*. But because it
makes different match/cost/tie-break choices at essentially every decision point
covered by Q1–Q6, **it will not reproduce PICO-8's own compressed byte output**, and
should not be used as a reference for the byte-exact-recompression goal this research
was commissioned for. It remains useful only as a secondary sanity check that a given
implementation produces *valid, decodable* pxa streams — not that it produces
*PICO-8-identical* ones.

---

## 10. Source URLs

- **Official reference C source** (primary, authoritative): `pxa_compress_snippets.c`,
  functions `pxa_compress()` and `pxa_find_repeatable_block()`, fetched in full (828
  lines) from
  `https://raw.githubusercontent.com/dansanderson/lexaloffle/master/pxa_compress_snippets.c`
  (github.com blob URL: `https://github.com/dansanderson/lexaloffle/blob/master/pxa_compress_snippets.c`).
- **shrinko8** (secondary, structurally different — see §9): `pico_compress.py`,
  functions `compress_code()` and `get_lz77()`, fetched in full (668 lines) from
  `https://raw.githubusercontent.com/thisismypassport/shrinko8/master/pico_compress.py`
  (github.com blob URL: `https://github.com/thisismypassport/shrinko8/blob/master/pico_compress.py`).
- **pancelor's blog** — re-checked specifically for compressor content via a targeted
  fetch of `https://pancelor.bearblog.dev/adventures-in-pico-8-compression-mine1k/`;
  confirmed to contain decompression/reverse-engineering content only ("I studied
  pico8's compression algorithm, curious to see what other lua crimes I could commit
  to make the number go down" — a manual-Lua-rewriting angle, not a compressor
  implementation). No compressor pseudocode, match-selection, or tie-break discussion
  found. Not cited further.
- A web search for other community write-ups specifically about matching PICO-8's
  reference compressor byte-for-byte did not surface any additional primary source
  beyond the two above (search: "PICO-8 pxa compressor byte-exact reimplementation
  match selection greedy lookahead"; results were unrelated patents, a PICO-8 source
  *size* visualizer tool with no published algorithm write-up, and an unrelated
  "PX8" image-compression forum thread). No further sources were pursued given the
  C reference fully and unambiguously answers all 6 brief questions on its own.

---

## 11. Conflicts between sources

**One substantive conflict, already flagged inline above**: shrinko8's
`compress_code`/`get_lz77` implements a **different algorithm** from the C reference
at essentially every decision point relevant to this brief — search strategy (real
lookahead/DP-style vs. greedy+2-step-veto), back-reference cost model (exact vs.
approximate-with-known-off-by-one), literal cost model (a different heuristic with an
explicit "heuristic" fudge factor vs. the C reference's exact category-bits formula),
and raw-block trigger mechanism (sliding-window cost-delta detector vs. periodic
rewind-and-substitute). This is not a disagreement about what the C reference does —
both files are unambiguous and internally consistent on their own terms — it's simply
that shrinko8's encoder is an independent design that targets the same wire format
without trying to reproduce PICO-8's own compressor's exact choices. **Only the C
reference algorithm in §1–§7 above should be used for the byte-exact-recompression
goal.**

No other conflicts were found. pancelor's blog contains no compressor material to
conflict with or corroborate. No other primary sources were located.
