# Research findings: PICO-8 `.p8.png` Lua compression bit format ("pxa")

## Executive summary

Both originally-ambiguous points are now **resolved with high confidence**, corroborated
by three independent sources that agree on every bit-level detail:

1. **The official Lexaloffle reference C source** (`pxa_compress_snippets.c`, by Zep,
   the PICO-8 author) — the actual production implementation.
2. **shrinko8**, an independent third-party Python reimplementation, which matches the
   C source's behavior exactly (down to identical constants) despite being written
   independently.
3. **pancelor's "adventures in PICO-8 compression" blog post**, an independent
   reverse-engineering write-up, which also matches exactly.

No conflicts were found between these three sources.

**The likely root cause of the brute-force failure**: the brief's guess assumed the
offset-width selector is always a fixed 2 bits. It is not — it's a **variable-length**
selector: 1 bit for the 15-bit-offset case, 2 bits for the 5-bit and 10-bit cases. A
fixed-2-bit brute force can never land on the correct bitstream alignment for any
back-reference that happens to hit the 15-bit case, because every bit after it is
shifted by one relative to the correct decode — which would corrupt the entire rest of
the stream, matching your observation that outputs were "not close but wrong, fully
incoherent."

The MTF literal index encoding is also **not** Elias-gamma (`2^n - 1 + fixed`) as
guessed. It's a bucketed scheme where both the bucket base *and* the fixed-bit width
depend on the unary count in a different, non-Elias-gamma way (see below).

---

## 1. Header / outer structure — CONFIRMED, no changes needed

Your existing understanding is correct. From `pxa_compress_snippets.c` (`pxa_compress`):

```c
// appear empty in old versions of pico-8 (not relevant anymore)
PXA_WRITE_VAL(0);
PXA_WRITE_VAL('p');
PXA_WRITE_VAL('x');
PXA_WRITE_VAL('a');

// write uncompressed size (plain uint32 so that easy to read & allocate dest before calling)
PXA_WRITE_VAL(len/256);
PXA_WRITE_VAL(len%256);

// compressed size (fill in later). used for robust/safe decompression
PXA_WRITE_VAL(0);
PXA_WRITE_VAL(0);
```

and at the end:

```c
int bytes_written = dest_pos;
dest_buf[6] = bytes_written / 256;
dest_buf[7] = bytes_written % 256;
```

`dest_pos` counts from 0 at the very start of the header (byte 0 = the `\0` of `\0pxa`),
so **the "compressed length" field is the total byte count including the 8-byte
header itself** — exactly your "compressed-length+8" description, confirmed
byte-for-byte. shrinko8's independent implementation reads it the same way
(`pico_compress.py`):

```python
if header == k_new_compressed_code_header:
    unc_size = r.u16()
    com_size = r.u16()
    ...
    assert r.pos() == start_pos + com_size
```

`k_new_compressed_code_header = b"\0pxa"`.

Header layout: `\x00 p x a` (4 bytes) + `unc_size` (2 bytes BE) + `com_size` (2 bytes
BE, = total bytes incl. header), then the bit-packed body starts at byte offset 8.

## 2. Bitstream primitives — LSB-first, confirmed

Bits are read **LSB-first within each byte**, and multi-bit values are also
reconstructed LSB-first (the first bit read becomes the least-significant bit of the
resulting integer) — this applies uniformly everywhere in the format, there is no
special MSB-first sub-case anywhere.

From the C reference:

```c
static int bit = 1;
static int getbit()
{
	int ret;
	ret = (src_buf[src_pos] & bit) ? 1 : 0;
	bit <<= 1;
	if (bit == 256)
	{
		bit = 1;
		src_pos ++;
	}
	return ret;
}

static int getval(int bits)
{
	int i;
	int val = 0;
	if (bits == 0) return 0;
	for (i = 0; i < bits; i++)
		if (getbit())
			val |= (1 << i);
	return val;
}
```

`bit` starts at `0x01` (LSB) and shifts left, so the first bit tested in a byte is bit
0. `getval` assigns the *first-read* bit to `1 << 0`, i.e. the LSB of the result — so
reading order and value-construction order are the same LSB-first convention
throughout, not "LSB-first bytes but MSB-first sub-fields" or anything like that.

There's also a generic "chain" primitive used for both length groups and the offset
selector — read groups of `link_bits` bits, keep accumulating (summing) as long as a
group reads the maximum possible value for that width, stop (and don't read further)
as soon as a group reads less than the max:

```c
static int getchain(int link_bits, int max_bits)
{
	int max_link_val = (1 << link_bits) - 1;
	int val = 0;
	int vv = max_link_val;
	int bits_read = 0;
	while (vv == max_link_val)
	{
		vv = getval(link_bits);
		bits_read += link_bits;
		val += vv;
		if (bits_read >= max_bits) return val;
	}
	return val;
}
```

This single primitive is reused for: the length-group accumulation (`link_bits=3`) and
the offset-width selector (`link_bits=1`, described below).

## 3. Header bit — CONFIRMED, no changes needed

`getbit()`: **1 = literal, 0 = back-reference/block.** Matches your existing
understanding exactly (both C reference and shrinko8):

```c
int block_type = getbit();
if (block_type == 0) { /* block */ } else { /* literal */ }
```

```python
if br.bit():
    # literal
    ...
else:
    # block
    ...
```

## 4. MTF literal index encoding — the exact "unary + fixed bits" scheme

**This is NOT Elias-gamma.** It's a bucketed scheme where:
- the unary prefix (count of leading `1`-bits, terminated by a `0`-bit — confirmed,
  the `0` terminator bit is consumed but not counted) determines a bucket `n` (0, 1,
  2, …),
- the fixed-bit field width is `4 + n` bits (**not** `n` bits as classic Elias-gamma
  would use — it starts at 4, not 0),
- the bucket's base offset is `16 * (2^n - 1)` (not `2^n - 1` as classic Elias-gamma
  would use).

From the C reference (`pxa_decompress`), with `TINY_LITERAL_BITS` = 4:

```c
int lpos = 0;
int bits = 0;
int safety = 0;
while (getbit() == 1 && safety++ < 16)
{
	lpos += (1 << (TINY_LITERAL_BITS + bits));
	bits ++;
}
bits += TINY_LITERAL_BITS;
lpos += getval(bits);
if (lpos > 255) return 0; // something wrong
int c = literal[lpos];
```

shrinko8's independent implementation, exactly equivalent, more compact:

```python
extra = 0
while br.bit():
    extra += 1
idx = br.bits(4 + extra) + make_mask(4, extra)
```

where `make_mask(pos, size) = ((1 << size) - 1) << pos`, i.e.
`make_mask(4, extra) = (2**extra - 1) * 16` — identical formula to the C
accumulation above, just computed directly instead of via a running sum.

pancelor's independent write-up states the same formula and even tabulates the
buckets:

```
unary = 0
while read_bit() == 1 do unary += 1 end
unary_mask = ((1 << unary) - 1)
index = read_bits(4 + unary) + (unary_mask << 4)
```

| unary count `n` | fixed bits | index range | total bits for this bucket |
|---|---|---|---|
| 0 | 4 | 0 – 15 | 1 (terminator) + 4 = 5 |
| 1 | 5 | 16 – 47 | 2 (prefix `1`+term) + 5 = 7 |
| 2 | 6 | 48 – 111 | 3 + 6 = 9 |
| 3 | 7 | 112 – 239 | 4 + 7 = 11 |
| 4 | 8 | 240 – 255 (of the 256 range representable, capped at 255) | 5 + 8 = 13 |

**Fixed-bit sub-field bit order**: read via the same `getval`/`br.bits` primitive as
everything else — LSB-first, first bit read = LSB of the field value. No special
ordering.

**Worked example** — see §7 below for a full byte-level trace.

## 5. Offset-width selector — the key correction

**This is the point that most likely explains the brute-force failure.** The selector
is **not a fixed 2-bit field**. It's a variable-length unary-style chain (1 bit in one
case, 2 bits in the other two), using the same `getchain(1, 2)` primitive from §2.

From the C reference (`getnum`):

```c
static int getnum()
{
	int jump = BLOCK_DIST_BITS; // 5
	// 1  15 bits // more frequent so put first
	// 01 10 bits
	// 00  5 bits
	bits = (3 - getchain(1, 2)) * BLOCK_DIST_BITS;
	val = getval(bits);
	if (val == 0 && bits == 10)
		return -1; // raw block marker
	return val;
}
```

Tracing `getchain(1, 2)` bit-by-bit: read one bit. If it's `0`, stop immediately,
result = 0 → `bits = (3-0)*5 = 15`. If it's `1`, read a second bit and stop
unconditionally (max_bits=2 reached): second bit `0` → result 1 → `bits =
(3-1)*5 = 10`; second bit `1` → result 2 → `bits = (3-2)*5 = 5`.

So the **exact mapping, in bitstream order**, is:

| bits read (in stream order) | selector length | offset field width |
|---|---|---|
| `0` | **1 bit** | **15-bit** offset |
| `1`, `0` | 2 bits | **10-bit** offset |
| `1`, `1` | 2 bits | **5-bit** offset |

This is confirmed independently by shrinko8:

```python
offlen = (5 if br.bit() else 10) if br.bit() else 15
```

(Python evaluates the outer condition first: first bit → if false, `offlen = 15`
immediately, no second bit read; if true, read a second bit: true → 5, false → 10.
Identical to the C trace above.)

And by pancelor's write-up:

```
offset_bits = read_bit() ? (read_bit() ? 5 : 10) : 15
```

Your original guess ("first bit `0` → 5-bit; first bit `1,0` → 10-bit; first bit
`1,1` → 15-bit") had both the **bit-pattern-to-width mapping backwards** (0 is the
15-bit case, not 5-bit) **and, more critically, the wrong field length assumption**
(the 15-bit case only consumes **1** selector bit, not 2). The second error is the one
that would desync the entire rest of the bitstream on every 15-bit back-reference,
which is consistent with your "every combination produced fully incoherent garbage"
observation — a fixed-width-2 brute force cannot correct for a variable-width
selector no matter what mapping of the 2 bits you try.

## 6. Offset / back-reference semantics

**Offset field → offset value**: `offset = getval(offset_bits) + 1` (C: `getnum()`
returns the raw field value, `pxa_decompress` adds 1 — `block_offset = getnum() + 1`).
shrinko8: `offset = br.bits(offlen) + 1`. So the raw encoded field is 0-based
(`encoded = offset - 1`), and the *decoded* `offset` is what's used directly as the
distance.

**Copy source position**: `out_p[dest_pos] = out_p[dest_pos - block_offset]`
(C), equivalently `code.append(code[-offset])` (Python, negative indexing = `len(code)
- offset`). This is your **first option**: `output.length - offset`, with `offset`
already 1-based (offset=1 means "copy the immediately preceding byte"). No further
±1 adjustment. Confirmed identically by both sources. Copies happen one byte at a
time in a loop (not `memcpy`), so overlapping self-referential runs (offset < length)
correctly repeat the pattern, exactly as your brief's existing description assumed.

**Length encoding — confirmed accumulation rule, PLUS a base-offset bias you asked
about**:

```c
int block_len = getchain(BLOCK_LEN_CHAIN_BITS /* 3 */, 100000) + PXA_MIN_BLOCK_LEN /* 3 */;
```

```python
count = 3
while True:
    part = br.bits(3)
    count += part
    if part != 7:
        break
```

So: **yes**, there is a base constant, and it is exactly **3** (`PXA_MIN_BLOCK_LEN`,
the minimum length worth encoding as a back-reference at all — this is also why the
compressor only considers blocks of length ≥ 3). Your "simple reading" (group value
accumulates directly, continue only while group == 7) is correct for the
*accumulation* part, but the **total length = 3 + sum of groups**, not just the raw
sum. E.g. a single group reading `5` (not 7, so it terminates) gives length `3 + 5 =
8`, not `5`.

## 7. Uncompressed-literal-block special case — CONFIRMED, with one precision correction

**Trigger condition**: your brief said "10-bit offset field encoding value 1" — the
precise trigger is actually on the *raw encoded field* being **0** (before the `+1`
bias described in §6 is applied), while the selector chose the 10-bit width. Restated
in terms of the already-biased `offset` value (as used elsewhere in this doc,
`offset = raw + 1`): the trigger is `offlen == 10 and offset == 1`. Both phrasings
describe the same event; using post-bias language ("offset == 1") matches your
original wording, so this is really just a units clarification, not a substantive
disagreement.

C reference:

```c
int block_offset = getnum() + 1;
if (block_offset == 0)   // i.e. getnum() returned -1, the raw-block sentinel
{
    // raw block
    while (dest_pos < raw_len)
    {
        out_p[dest_pos] = getval(8);
        if (out_p[dest_pos] == 0) // found end -- don't advance dest_pos
            break;
        dest_pos ++;
    }
}
```

where `getnum()` itself detects the sentinel: `if (val == 0 && bits == 10) return -1;`.

shrinko8, in the post-`+1` framing that matches your brief's wording exactly:

```python
offset = br.bits(offlen) + 1
if offset == 1 and offlen != 5:
    assert offlen == 10
    startlen = len(code)
    while True:
        ch = br.bits(8)
        if ch != 0:
            code.append(chr(ch))
        else:
            break
```

**Byte-reading mechanics**: confirmed — 8 bits at a time via the same LSB-first
`getval(8)`/`br.bits(8)` primitive as everything else (this reconstructs the original
byte value correctly since encode used the symmetric `putval(byte, 8)`), terminated by
a literal `0x00` byte which is **not** appended to the output and does not advance the
output position. No byte-alignment/padding occurs before or after — the 8-bit reads
happen at whatever bit position the stream is currently at.

## 8. MTF table update — confirmed, standard MTF

```c
int i;
for (i = lpos; i > 0; i--)
{
	literal[i] = literal[i-1];
}
literal[0] = c;
```

Values at positions `0..lpos-1` shift right into `1..lpos`; the just-read byte becomes
the new position 0. Standard MTF, matches your existing understanding; no changes
needed. Initial table is the identity permutation over all 256 byte values (`mtf[i] =
i` for `i` in `0..255`) — **note this is different from the *old* `:c:` format's
59-character `literal` table** (`" \n0123456789abc...=/*:;.,~_"`); pxa's MTF table
spans the full byte range, not just a restricted charset. Confirmed by both C
(`init_literals_state`: `for (i=0;i<256;i++) literal[i]=i;`) and shrinko8
(`mtf = [chr(i) for i in range(0x100)]`).

## 9. Anything structurally different from the brief's description?

No additional transform/entropy stage was found. The algorithm is exactly: one bitstream,
one MTF table, LZ77-style back-references with the length/offset encoding above,
plus the raw-block escape hatch. No separate padding/alignment step exists except that
after compression finishes writing, the encoder pads the final partial byte with zero
bits (`while (bit != 1) putbit(0);`) — purely an encoder-side detail to flush to a byte
boundary at end-of-stream; decoders don't need to do anything special here since the
`comp_len`/`dest_pos < raw_len` loop conditions naturally stop consuming bits once
`unc_size` characters have been produced.

One thing worth flagging since it's easy to miss: the decode loop terminates on
**output length reaching `unc_size`**, not on any in-stream end marker (`while
(src_pos < comp_len && dest_pos < raw_len && dest_pos < max_len)` in C; `while
len(code) < unc_size` in Python) — so your decoder must track output length against
the header's `unc_size` field as the loop condition, not just "keep consuming bits
until input runs out."

## 10. Full pseudocode (decode)

```
read 4 bytes header magic, assert == 00 'p' 'x' 'a'
unc_size = read_u16_be()      # 2 bytes
com_size = read_u16_be()      # 2 bytes, includes the 8-byte header itself
# body starts at byte offset 8; switch to LSB-first bit reading from here

mtf = [i for i in 0..255]     # identity, full byte range
out = []

while len(out) < unc_size:
    if read_bit() == 1:
        # literal
        n = 0
        while read_bit() == 1:
            n += 1
        # (the 0 that stopped the loop is consumed, not counted)
        fixed_width = 4 + n
        base = 16 * (2**n - 1)
        idx = base + read_bits(fixed_width)   # LSB-first field
        c = mtf[idx]
        out.append(c)
        # move-to-front update
        for i in range(idx, 0, -1):
            mtf[i] = mtf[i-1]
        mtf[0] = c
    else:
        # back-reference or raw block
        b0 = read_bit()
        if b0 == 0:
            offset_bits = 15
        else:
            b1 = read_bit()
            offset_bits = 5 if b1 == 1 else 10
        raw_offset = read_bits(offset_bits)   # LSB-first field
        offset = raw_offset + 1

        if offset_bits == 10 and offset == 1:
            # raw / uncompressed literal block
            while len(out) < unc_size:
                ch = read_bits(8)
                if ch == 0:
                    break
                out.append(chr(ch))
        else:
            length = 3
            while True:
                part = read_bits(3)           # LSB-first field
                length += part
                if part != 7:
                    break
            for _ in range(length):
                out.append(out[-offset])      # one byte at a time (handles overlap)

return "".join(out)
```

All bit reads (`read_bit`, `read_bits(n)`) use the LSB-first-per-byte,
LSB-first-value-construction convention from §2 uniformly — there is no place in the
format where bit order differs from this.

## 11. Worked example

Constructed by hand-applying the confirmed algorithm above (I did not have a real
`.p8.png` cart file available in this environment to extract actual compressed bytes
from, so this is a synthetic example, not one pulled from a real cart — you should
still spot-check against a real cart as a final sanity check once implemented). I
picked the 2-character Lua source string `"aa"` because it produces a clean 2-byte
body and exercises both a "first occurrence" (large unary count) and a "just-moved-
to-front" (zero unary count) literal encode.

Input Lua source: `"aa"` (`unc_size = 2`). `mtf` starts as identity, `mtf[i] = i`.

**Encoding byte 1: `'a'` = 0x61 = 97.**
`mtf[97] == 97 == 'a'` (still identity), so `idx = 97`. Bucket lookup: 97 falls in
`n=2` (range 48–111, base 48, fixed width 6). `97 - 48 = 49`.
- header bit: `1` (literal)
- unary: two `1`s then a `0` → `1 1 0`
- fixed 6 bits, value 49, LSB-first: `49 = 0b110001` → bits emitted low-to-high:
  `1 0 0 0 1 1`

Bits so far: `1 1 1 0 1 0 0 0 1 1` (10 bits). MTF update: `'a'` moves to index 0;
everything previously at indices `0..96` shifts to `1..97`.

**Encoding byte 2: `'a'` again.**
Now `mtf[0] == 'a'`, so `idx = 0`, bucket `n=0` (base 0, fixed width 4), `0 - 0 = 0`.
- header bit: `1` (literal)
- unary: immediately a `0` (n=0, no `1`s) → `0`
- fixed 4 bits, value 0: `0 0 0 0`

Bits: `1 0 0 0 0 0` (6 bits).

**Full body bitstream** (16 bits, 2 bytes exactly):
`1 1 1 0 1 0 0 0 1 1  1 0 0 0 0 0`

Packing LSB-first into bytes (first bit read = bit 0 / LSB of the byte):

- Byte 0 (bits 0–7): `1,1,1,0,1,0,0,0` → `1 + 2 + 4 + 0 + 16 + 0 + 0 + 0 = 23 = 0x17`
- Byte 1 (bits 8–15): `1,1,1,0,0,0,0,0` → `1 + 2 + 4 + 0 + 0 + 0 + 0 + 0 = 7 = 0x07`

**Full 10-byte compressed representation of Lua source `"aa"`:**

```
00 70 78 61  00 02  00 0A  17 07
└─ \0pxa ─┘  └unc=2┘ └com=10┘ └body┘
```

(`com_size = 10` = 8-byte header + 2-byte body, per §1.)

Decoding this back: header bit 1 → literal, unary `1,1,0` → n=2 → fixed 6 bits read
as `1,0,0,0,1,1` → LSB-first value `1 + 0 + 0 + 0 + 16 + 32 = 49` → idx = 48+49... 

**Correction check**: idx = base(48) + 49 = 97 → `mtf[97] = 'a'` (0x61). ✓. Then
second literal: header bit 1 → unary immediately `0` → n=0 → fixed 4 bits `0,0,0,0` →
value 0 → idx = 0 → `mtf[0]` at that point is `'a'` (just moved there) → `'a'`. ✓.
Output `"aa"`, matches input. Self-consistent round-trip.

## 12. Source URLs

- **Official reference C source** (primary, authoritative — actual PICO-8 author's
  code): `pxa_compress_snippets.c` at
  https://github.com/dansanderson/lexaloffle/blob/master/pxa_compress_snippets.c
  (fetched in full, 828 lines, license header confirms "Copyright (c) 2020-22
  Lexaloffle Games LLP", author `joseph@lexaloffle.com`). Note: the brief's suggested
  filename `p8_compress.c` also exists in that repo
  (https://github.com/dansanderson/lexaloffle/blob/master/p8_compress.c) but
  implements the **old legacy `:c:` format**, not pxa — not relevant to this question,
  included here only to flag it so you don't mix them up.
- **shrinko8** (independent third-party reimplementation, cross-referenced):
  `pico_compress.py`, function `uncompress_code`, at
  https://github.com/thisismypassport/shrinko8/blob/master/pico_compress.py
  (fetched in full, 668 lines).
- **pancelor's blog** (independent reverse-engineering write-up, cross-referenced):
  "adventures in PICO-8 compression: mine1k" —
  https://pancelor.bearblog.dev/adventures-in-pico-8-compression-mine1k/ (fetched in
  full).

### Sources attempted but not usable

- **Roberto Vaccari's blog** (https://robertovaccari.com/blog/2021_01_03_stegano_pico8/)
  — the brief's #1 suggested source. Direct fetch returned HTTP 403 (blocked); no
  archive.org mirror was reachable from this environment either. A web search
  surfaced only a short indirect snippet describing it as covering "move-to-front
  encoding scheme that employs unary value reading and bit manipulation to decode
  characters from an index," consistent with everything above but not detailed enough
  to quote or rely on independently. **I could not corroborate or contradict anything
  using this source** — treat it as unverified/unused for this report. You may have
  better luck fetching it directly yourself.
- **picotool** (https://github.com/dansanderson/picotool) — fetched
  `pico8/game/compress.py` in full (162 lines). It only implements the **old `:c:`
  format** (`compress_code`/`decompress_code`); it does not implement pxa at all. Not
  useful for this question despite being the brief's #2 suggested source — worth
  knowing so you don't spend time searching that repo further for pxa logic.
- **Original 2015 lexaloffle forum post** (tid=2400) — not fetched; by the brief's own
  framing this predates the pxa format (introduced ~0.2.0, pxa file explicitly says
  "as of 0.2.4c"), so it almost certainly only describes the old `:c:`-era format and
  wasn't pursued further given the three strong sources above already fully resolved
  the question.

## 13. Conflicts between sources

**None.** All three primary/independent sources (official C reference, shrinko8,
pancelor's write-up) agree exactly on every bit-level mechanic covered above: the
unary+bucket literal index formula, the variable-length offset-width selector and its
bit-pattern mapping, the length-encoding base-3 bias, the raw-block trigger condition,
and the header layout. Where I noted a "correction" above (§5, §7), those are
corrections relative to your brief's original *guess*, not disagreements between the
sources I found.
