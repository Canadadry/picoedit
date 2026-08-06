import {
  applyMapEdits,
  cellIndex,
  copyMapRegion,
  fillMapArea,
  MAP_HEIGHT,
  MAP_WIDTH,
  normalizeRect,
  pasteStamp,
  rasterizeLine,
  singleStamp,
} from "./tools.ts";

function has(edits: { x: number; y: number }[], x: number, y: number): boolean {
  return edits.some((e) => e.x === x && e.y === y);
}

test("cellIndex converts (x, y) to the row-major MapGrid.cells index", () => {
  expect(cellIndex(0, 0)).toBe(0);
  expect(cellIndex(3, 0)).toBe(3);
  expect(cellIndex(0, 1)).toBe(128);
});

test("normalizeRect orders an unordered drag rect into left/right/top/bottom", () => {
  expect(normalizeRect({ x0: 3, y0: 3, x1: 1, y1: 1 })).toEqual({ left: 1, right: 3, top: 1, bottom: 3 });
});

test("singleStamp wraps one sprite index as a 1x1 stamp", () => {
  expect(singleStamp(42)).toEqual({ width: 1, height: 1, sprites: [42] });
});

test("copyMapRegion captures the selection's sprite indices in row-major order, normalized regardless of drag direction", () => {
  const grid = new Map<string, number>([
    ["1,1", 10],
    ["2,1", 11],
    ["1,2", 12],
    ["2,2", 13],
  ]);
  const getCell = (x: number, y: number) => grid.get(`${x},${y}`) ?? 0;

  const stamp = copyMapRegion(getCell, { x0: 2, y0: 2, x1: 1, y1: 1 });

  expect(stamp).toEqual({ width: 2, height: 2, sprites: [10, 11, 12, 13] });
});

test("pasteStamp places the stamp's sprites with its top-left at the given origin", () => {
  const stamp = { width: 2, height: 1, sprites: [5, 6] };
  const edits = pasteStamp(stamp, 10, 20);
  expect(edits).toContainEqual({ x: 10, y: 20, spriteIndex: 5 });
  expect(edits).toContainEqual({ x: 11, y: 20, spriteIndex: 6 });
});

test("pasteStamp clips edits that would land outside the 128x64 map", () => {
  const stamp = { width: 2, height: 2, sprites: [1, 2, 3, 4] };
  const edits = pasteStamp(stamp, MAP_WIDTH - 1, MAP_HEIGHT - 1);
  expect(edits).toEqual([{ x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1, spriteIndex: 1 }]);
});

test("fillMapArea with no bounds fills the entire width/height with the given sprite index", () => {
  const edits = fillMapArea(3, 2, null, 7);
  expect(edits.length).toBe(6);
  expect(edits.every((e) => e.spriteIndex === 7)).toBe(true);
});

test("fillMapArea restricted to bounds only fills within them", () => {
  const edits = fillMapArea(10, 10, { x0: 2, y0: 2, x1: 3, y1: 3 }, 7);
  expect(edits.length).toBe(4);
  expect(has(edits, 2, 2)).toBe(true);
  expect(has(edits, 5, 5)).toBe(false);
});

test("rasterizeLine on a 45-degree diagonal produces the exact diagonal cells (Bresenham)", () => {
  const points = rasterizeLine(0, 0, 3, 3);
  expect(points).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ]);
});

test("applyMapEdits on a map-only cell (row >= 32) patches only cart.map.cells", () => {
  const cart = {
    gfx: { width: 128, height: 128, pixels: new Array(128 * 128).fill(0) },
    map: { width: 128, height: 64, cells: new Array(128 * 64).fill(0) },
  } as never;

  const patch = applyMapEdits(cart, [{ x: 5, y: 40, spriteIndex: 9 }]);

  expect(patch.map?.cells[cellIndex(5, 40)]).toBe(9);
  expect(patch.gfx).toBeUndefined();
});

test("applyMapEdits on a shared-region cell (row < 32) patches both cart.map.cells and the mirrored cart.gfx.pixels", () => {
  const cart = {
    gfx: { width: 128, height: 128, pixels: new Array(128 * 128).fill(0) },
    map: { width: 128, height: 64, cells: new Array(128 * 64).fill(0) },
  } as never;

  const patch = applyMapEdits(cart, [{ x: 8, y: 0, spriteIndex: 0xcc }]);

  expect(patch.map?.cells[cellIndex(8, 0)]).toBe(0xcc);
  expect(patch.gfx?.pixels[64 * 128 + 16]).toBe(0xc);
  expect(patch.gfx?.pixels[64 * 128 + 17]).toBe(0xc);
});
