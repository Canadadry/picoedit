# Research brief: PICO-8 `.p8.png` Lua compression bit format

## Context

`picoedit` is a TypeScript toolkit that extracts a PICO-8 cartridge (`.p8.png`) into
editable files and repacks it. Every section of the cart's 32KB payload has been
successfully decoded/encoded bit-exactly against real fixture carts — gfx, map, gff,
sfx, music, and the PNG steganography layer itself. The one remaining gap is the **Lua
source code section**, which PICO-8 stores compressed using a proprietary
"move-to-front + unary" scheme (informally called "pxa" compression).

Our current implementation (`src/cart-lua.ts` / `src/cart-lua-encode.ts`) is based on
this partial spec description:

> Decoding maintains a "move-to-front" lookup table of the 256 possible byte values
> (initialized to identity) and reads the stream bit by bit, from the LSB to the MSB of
> each byte. Each bit group starts with a header bit:
> - **bit = 1**: read an index encoded in unary + fixed bits, pointing into the
>   move-to-front table; the found byte is emitted to the output, then moved to the
>   front of the table.
> - **bit = 0**: read an offset/length pair (offset encoded on 5, 10, or 15 bits
>   depending on 2 selector bits; length encoded in groups of 3 bits, accumulated as
>   long as the group equals 7). Step back "offset" characters into the output already
>   produced, copy "length" characters — the length can exceed the offset, in which case
>   the pattern repeats. Special case: if the offset is encoded on 10 bits and equals 1,
>   it's not a copy but the start of an uncompressed character block, read 8 bits at a
>   time up to a null byte.

This is precise about the **overall structure** (header bit, MTF table, back-reference
vs. literal, uncompressed-block special case, 3-bit length groups) but leaves **two
specific bit-level encodings ambiguous**:

1. **The exact "unary + fixed bits" encoding for the MTF-table literal index.** We
   guessed a standard Elias-gamma-style scheme (count consecutive `1`-bits as `n`,
   terminated by a `0`-bit, then read `n` more bits as `f`, `index = (2^n - 1) + f`),
   but this is unconfirmed against the real format.
2. **The exact mapping from the 2 selector bits to offset width (5, 10, or 15 bits).**
   We guessed: first bit `0` → 5-bit offset; first bit `1` then second bit `0` →
   10-bit; first bit `1` then second bit `1` → 15-bit — again unconfirmed.

We tried empirically brute-forcing 288 combinations of these two unknowns (plus a few
adjacent variants: bit order, off-by-one on the copy offset) against the actual
compressed Lua bytes of 11 real `.p8.png` cartridges, scoring decoded output for
"looks like real Lua source" (printable-ASCII ratio, keyword counts, `--`-comment
prefix). **Every single combination produced garbage** — not "close but wrong," fully
incoherent. This suggests our guess is wrong in some way brute-forcing these two axes
alone can't fix (maybe a genuinely different encoding scheme, not just a different
parameter for the one we assumed), and confirms we need the *actual* reference
algorithm, not another guess.

## What I need you to find

Please research and report back the **exact, complete bit-level algorithm** PICO-8
uses for this compression format (sometimes called "pxa" compression, used in the
"new"/"recent" `.p8.png` cart format since PICO-8 ~0.2.0). I already know the general
shape (MTF table + unary/back-reference hybrid, LSB-first bit reading) — I need the
**precise bit-packing details**, ideally corroborated by more than one source.

### Suggested sources (in priority order — feel free to find better ones)

1. **Roberto Vaccari's write-up** (described as a step-by-step walkthrough with
   pseudocode for both PICO-8 compression algorithms):
   https://robertovaccari.com/blog/2021_01_03_stegano_pico8/
2. **picotool** (Python reference implementation reading/writing `.p8`/`.p8.png`):
   https://github.com/dansanderson/picotool — look for the decompression code, likely
   under something like `pico8/game/lua.py` or similar (module names may have changed;
   search the repo).
3. **Official reference C source** (pxa/legacy compression, open license):
   https://github.com/dansanderson/lexaloffle — files `pxa_compress_snippets.c` and
   `p8_compress.c`.
4. **shrinko8** (another reference tool for `.p8.png` minification/compression
   roundtrip): https://github.com/thisismypassport/shrinko8
5. **Original 2015 forum post describing the compression format** (basis of later
   specs): https://www.lexaloffle.com/bbs/?tid=2400
6. Any other credible source you find along the way (PICO-8 community wikis, other
   reverse-engineering write-ups, etc.) — cross-referencing multiple independent
   sources on the exact bit encoding would be extremely valuable, since this is the
   kind of detail that's easy to get subtly wrong in any single write-up.

### Specific questions to answer

For **each** of these, I need the precise bit-level mechanics, not just a restatement
of the general shape above:

1. **MTF literal index encoding** ("unary + fixed bits", header bit = 1 case):
   - What exactly does the unary prefix count, and what terminates it (a `0` after
     `1`s, or a `1` after `0`s, or something else)?
   - How many "fixed" bits follow the unary prefix, and how do they combine with the
     unary count to produce the final index (0-255)? Is it Elias-gamma-style
     (`index = 2^n - 1 + fixed`), a bucketed scheme, or something else?
   - Are the fixed bits themselves read LSB-first or MSB-first within their own
     sub-field (even though the overall bitstream is LSB-first per byte)?
   - Ideally: a worked example — take a specific known byte value/index, show its exact
     bit encoding.

2. **Offset-width selector** (header bit = 0 case, 2 selector bits):
   - Which exact 2-bit patterns map to 5-bit, 10-bit, and 15-bit offsets?
   - Are the selector bits themselves read in the bitstream's normal LSB-first order,
     or is there something special about how they're interpreted?

3. **Offset/back-reference semantics**:
   - Is the copy source position `output.length - offset`, `output.length - offset - 1`,
     or `output.length - offset + 1`? (I.e., is offset 1-based or 0-based, and relative
     to what exact point?)
   - Confirm: does length encoding as "groups of 3 bits, accumulate while group == 7"
     mean the *first* group already counts toward the total (e.g. group value 5 with no
     continuation = length 5), and continuing only adds when a group reads exactly 7 -
     please confirm my simple reading of this is right, or supply the exact detail if
     it differs (e.g. is there a base offset added, like `length = 2 + sum(groups)`, or
     similar biasing constants PICO-8-style formats sometimes use)?

4. **Uncompressed-literal-block special case** (10-bit offset field encoding value 1):
   - Confirm the exact trigger condition and byte-reading mechanics (8 bits at a time,
     LSB-first?, terminated by a literal `0x00` byte not included in output).

5. **Header/outer structure** (I believe this part is already correct and doesn't need
   re-verification, but flag it if any source disagrees): 4-byte marker `\x00pxa` at
   the start of the Lua region, then 2 bytes decompressed-length (big-endian), 2 bytes
   compressed-length+8 (big-endian), then the compressed bitstream.

6. **Anything else structurally different from the description above** that any source
   reveals — e.g. maybe there's an additional transform/pass I'm not accounting for at
   all (some compression formats apply MTF *and* a separate entropy stage, or there's
   header padding/alignment I'm missing).

## Expected output format

Please write your findings back as a markdown report with:

1. **A plain-English + pseudocode description** of the complete bit-level
   encode/decode algorithm, precise enough that I can translate it directly into
   TypeScript without further guessing. Use concrete bit-widths and formulas, not
   vague language like "some bits."
2. **Direct quotes or code excerpts** from your sources for the specific mechanics
   above (properly attributed to which source), especially for the two originally-
   ambiguous points (MTF index encoding, offset-width selector mapping) — I want to be
   able to verify your summary against the primary material.
3. **A worked example if you can construct or find one**: ideally, take a short known
   plaintext string (even something short and arbitrary) and show its exact compressed
   bit sequence step by step, OR point to a specific real `.p8.png` cart file (with its
   actual compressed bytes) whose correct decompression you can verify against known
   Lua source, so I can cross-check my implementation against it directly.
4. **Source URLs** for everything you relied on, so I can revisit them if needed.
5. If sources conflict with each other on any point, flag the conflict explicitly
   rather than picking one silently — tell me which sources say what.

If you genuinely cannot find primary/authoritative material on the exact bit-level
encoding (only the general shape, same as what I already have), please say so clearly
rather than presenting a guess as confirmed fact — I'd rather know "still unresolved"
than get another unverified guess dressed up as an answer.
