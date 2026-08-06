# Follow-up research brief: PICO-8's exact Lua *compressor* match-selection algorithm

## Context / relationship to the prior brief

This is a follow-up to `docs/prd12-research-brief.md` and `docs/prd12-research-findings.md`
(read both first — they're in the same folder). That earlier round fully resolved the
**decompression** side of PICO-8's "pxa" Lua compression format: we now correctly
decode real carts' compressed Lua into genuinely readable source text, confirmed
against three independent sources (PICO-8's own reference C source
`pxa_compress_snippets.c`, the shrinko8 Python reimplementation, and pancelor's
reverse-engineering blog post).

**What's still missing**: byte-exact *recompression*. Our encoder (`src/cart-lua-encode.ts`)
now uses the correct bit-level format and produces valid, PICO-8-loadable output, and
`encodeLua(decodeLua(x))` round-trips text correctly. But when we decode a real cart's
Lua and then recompress that same text with zero edits, the resulting compressed bytes
are **not** identical to the cart's original compressed bytes (currently 0 out of 11
real fixtures match byte-for-byte). The pxa format has some inherent freedom in *how*
a given piece of text can be encoded — e.g. when a back-reference and a plain literal
are both valid options, or when several back-references of different offset/length
could all work — and the compressed bytes only match PICO-8's own output if we
replicate PICO-8's own compressor's exact choices in every one of those situations, not
just any valid encoding.

The earlier research brief only asked about *decompression* and only quoted the
header-writing portion of `pxa_compress()`. The full `pxa_compress_snippets.c` file was
fetched in full (828 lines) during that research pass, so the actual compression
function's body may already be sitting in whatever browsing history/cache your agent
has — worth checking before re-fetching from scratch.

## What I need you to find

The **exact match-selection / cost-comparison algorithm** PICO-8's real compressor uses
when encoding Lua source into the pxa format. I already have the target bitstream
format nailed down (see the decode pseudocode in `docs/prd12-research-findings.md` §10
— every valid encoding decodes correctly); what I need now is which *specific* valid
encoding PICO-8's compressor picks whenever there's a choice.

### Suggested sources (same priority list as before, now focused on the compress side)

1. **Official reference C source**: `pxa_compress_snippets.c` at
   https://github.com/dansanderson/lexaloffle/blob/master/pxa_compress_snippets.c —
   this time, focus on the `pxa_compress()` function body (not just the
   header-writing prologue/epilogue already covered), and any helper functions it
   calls for finding/scoring matches (look for names like `find_best_match`,
   `find_match`, hash-table/hash-chain setup, cost-comparison logic).
2. **shrinko8**: `pico_compress.py` at
   https://github.com/thisismypassport/shrinko8/blob/master/pico_compress.py — this
   file's name suggests it covers both directions; look for a `compress_code`-style
   function (the earlier research only quoted `uncompress_code`).
3. **pancelor's blog**:
   https://pancelor.bearblog.dev/adventures-in-pico-8-compression-mine1k/ — the
   earlier research quoted its decompression pseudocode; check whether it also
   describes/implements a compressor (the "mine1k" context suggests this post might
   be specifically about *writing* a competitive compressor for size-coding
   competitions, which would make it an especially good source for exactly this
   question).
4. Any other credible source (other size-coding/PICO-8 community write-ups,
   forum threads specifically about matching the reference compressor byte-for-byte,
   etc).

### Specific questions to answer

1. **Match search strategy**: Is match-finding a simple single-pass greedy scan (take
   the first/longest match found at each position and move on), or does PICO-8's
   compressor do optimal parsing (dynamic programming / lookahead across the whole
   remaining input to minimize total output size)? If DP, what's the exact cost model
   per bit/byte it minimizes?

2. **Match-finding structure**: How does it search for back-reference candidates — a
   hash table/hash chain over N-byte prefixes (what's N)? A full suffix
   search? Is there a maximum search depth/chain length (a real compressor often caps
   how many candidate positions it checks for performance — I need the exact cap if
   one exists, since it affects which match gets chosen when multiple are available)?

3. **Tie-breaking rules**: when multiple valid encodings exist for the same position
   with equal or near-equal cost, what does PICO-8's compressor prefer? Concretely:
   - Given two back-reference candidates of the same length but different offsets,
     which offset does it prefer (nearest/smallest, since smaller offsets need fewer
     bits when they cross the 5/10/15-bit selector boundaries)?
   - Given a choice between one longer match vs. two shorter ones (or a match vs. a
     literal) that produce a similar total bit cost, which does it prefer?
   - Is the true bit-cost of a literal encoding (which depends on the MTF table's
     *current* state, since more-recently-used bytes encode cheaper) actually factored
     into the match-vs-literal decision, or does the compressor use a simpler
     approximation (e.g. a flat per-byte cost estimate) for this comparison?

4. **Minimum match length**: I already know length ≥ 3 is required to ever emit a
   back-reference (`PXA_MIN_BLOCK_LEN` = 3, confirmed in the prior research) — confirm
   whether there's additionally some length/offset-dependent threshold (e.g. "only use
   a length-3 match if the offset is small enough that it's actually cheaper than 3
   literals," given a length-3 match with a 15-bit offset might cost MORE bits than 3
   cheap MTF-table-front literals).

5. **Raw/uncompressed-block mode**: when does the compressor choose to emit the
   uncompressed-literal-block escape (offset-width=10, offset=1 sentinel, followed by
   raw 8-bit bytes) instead of normal MTF-literal encoding? Is this ever chosen
   deliberately for cost reasons (e.g. a long run of bytes with uniformly poor MTF
   table state), or is it purely a fallback for some other constraint?

6. **MTF table interaction**: since the true bit-cost of an MTF-literal depends on the
   byte's *current* position in the table (which itself depends on the full history of
   prior encoding decisions), does the compressor simulate/track the MTF table state
   while making its cost comparisons (the way a correct encoder must, to know the real
   cost), or does it use some simplification?

## Expected output format

Same as before:

1. **Plain-English + pseudocode description** of the complete match-selection
   algorithm — precise enough to implement directly, not "it's greedy" without the
   actual tie-breaking specifics.
2. **Direct quotes/code excerpts** from primary sources, attributed.
3. **A worked example if feasible**: take a short string with a genuine ambiguity (at
   least two different valid encodings of similar cost) and show which one PICO-8's
   real compressor would pick and why, ideally cross-checked against actual compressed
   bytes from a real `.p8.png` cart if you can obtain or reason about one.
4. **Source URLs.**
5. **Flag any conflicts** between sources explicitly rather than picking one silently.

If the true algorithm turns out to be "optimal DP over an exact bit-cost model" (fully
deterministic, no real ambiguity once you compute costs correctly) rather than
"greedy with ad hoc tie-breaks," that's a very useful answer too — say so plainly, since
it changes the implementation approach substantially (DP over cost is very
implementable if the cost model itself is fully specified; ad hoc greedy heuristics are
harder to replicate exactly without the literal source).

If you cannot find primary material on this and would otherwise have to guess,
say so clearly rather than presenting a guess as confirmed fact.
