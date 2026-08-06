import {
  copyRegion,
  fillArea,
  pasteClipboard,
  rasterizeLine,
  rasterizeOval,
  rasterizeRect,
  replaceColor,
  snapSquare,
} from "./tools.ts";

function has(points: { x: number; y: number }[], x: number, y: number): boolean {
  return points.some((p) => p.x === x && p.y === y);
}

test("rasterizeLine on a horizontal segment covers every x at the fixed y", () => {
  const points = rasterizeLine(2, 5, 6, 5);
  for (let x = 2; x <= 6; x++) {
    expect(has(points, x, 5)).toBe(true);
  }
  expect(points.length).toBe(5);
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

test("rasterizeRect filled covers every cell in the bounding box, unfilled covers only the border", () => {
  const rect = { x0: 1, y0: 1, x1: 3, y1: 3 };

  const filled = rasterizeRect(rect, true);
  expect(filled.length).toBe(9);

  const outline = rasterizeRect(rect, false);
  expect(outline.length).toBe(8);
  expect(has(outline, 2, 2)).toBe(false);
  expect(has(outline, 1, 1)).toBe(true);
  expect(has(outline, 3, 3)).toBe(true);
});

test("rasterizeRect normalizes coordinates regardless of drag direction", () => {
  const rect = { x0: 3, y0: 3, x1: 1, y1: 1 };
  const filled = rasterizeRect(rect, true);
  expect(filled.length).toBe(9);
  expect(has(filled, 1, 1)).toBe(true);
  expect(has(filled, 3, 3)).toBe(true);
});

test("rasterizeOval reaches the 4 extreme points of its bounding box but not the corners", () => {
  const rect = { x0: 0, y0: 0, x1: 10, y1: 10 };
  const outline = rasterizeOval(rect, false);

  expect(has(outline, 5, 0)).toBe(true);
  expect(has(outline, 5, 10)).toBe(true);
  expect(has(outline, 0, 5)).toBe(true);
  expect(has(outline, 10, 5)).toBe(true);
  expect(has(outline, 0, 0)).toBe(false);
  expect(has(outline, 10, 10)).toBe(false);
});

test("rasterizeOval filled contains its own center; unfilled (outline) does not", () => {
  const rect = { x0: 0, y0: 0, x1: 10, y1: 10 };

  expect(has(rasterizeOval(rect, true), 5, 5)).toBe(true);
  expect(has(rasterizeOval(rect, false), 5, 5)).toBe(false);
});

test("snapSquare adjusts the far corner so width equals height, preserving drag direction", () => {
  expect(snapSquare(0, 0, 5, 2)).toEqual({ x1: 5, y1: 5 });
  expect(snapSquare(0, 0, -5, 2)).toEqual({ x1: -5, y1: 5 });
  expect(snapSquare(0, 0, 2, -5)).toEqual({ x1: 5, y1: -5 });
});

test("replaceColor returns edits only for pixels matching the target color within bounds", () => {
  const grid = new Map<string, number>();
  grid.set("1,1", 4);
  grid.set("2,1", 5);
  const getColor = (x: number, y: number) => (grid.get(`${x},${y}`) ?? 0) as never;

  const edits = replaceColor(4, 4, getColor, null, 4 as never, 9 as never);

  expect(edits).toContainEqual({ x: 1, y: 1, color: 9 });
  expect(edits.some((e) => e.x === 2 && e.y === 1)).toBe(false);
  expect(edits.length).toBe(1);
});

test("replaceColor restricted to a selection ignores matches outside the selection bounds", () => {
  const getColor = () => 4 as never;
  const edits = replaceColor(10, 10, getColor, { x0: 0, y0: 0, x1: 1, y1: 1 }, 4 as never, 9 as never);
  expect(edits.length).toBe(4);
});

test("fillArea with no selection fills the entire width/height with the active color", () => {
  const edits = fillArea(3, 2, null, 7 as never);
  expect(edits.length).toBe(6);
  expect(edits.every((e) => e.color === 7)).toBe(true);
});

test("fillArea with a selection only fills within the selection bounds", () => {
  const edits = fillArea(10, 10, { x0: 2, y0: 2, x1: 3, y1: 3 }, 7 as never);
  expect(edits.length).toBe(4);
  expect(has(edits, 2, 2)).toBe(true);
  expect(has(edits, 5, 5)).toBe(false);
});

test("copyRegion captures the selection's pixels in row-major order, normalized regardless of drag direction", () => {
  const grid = new Map<string, number>([
    ["1,1", 1],
    ["2,1", 2],
    ["1,2", 3],
    ["2,2", 4],
  ]);
  const getColor = (x: number, y: number) => (grid.get(`${x},${y}`) ?? 0) as never;

  const clipboard = copyRegion(getColor, { x0: 2, y0: 2, x1: 1, y1: 1 });

  expect(clipboard.width).toBe(2);
  expect(clipboard.height).toBe(2);
  expect(clipboard.pixels).toEqual([1, 2, 3, 4]);
});

test("pasteClipboard places the copied block with its top-left at the given origin", () => {
  const clipboard = { width: 2, height: 1, pixels: [5, 6] as never[] };

  const edits = pasteClipboard(clipboard, 10, 20, false);

  expect(edits).toContainEqual({ x: 10, y: 20, color: 5 });
  expect(edits).toContainEqual({ x: 11, y: 20, color: 6 });
});

test("pasteClipboard with transparentZero skips color-0 pixels (stamp-tool CTRL behavior)", () => {
  const clipboard = { width: 2, height: 1, pixels: [0, 6] as never[] };

  const edits = pasteClipboard(clipboard, 10, 20, true);

  expect(edits).toEqual([{ x: 11, y: 20, color: 6 }]);
});

test("pasteClipboard clips edits that would land outside the 128x128 sheet", () => {
  const clipboard = { width: 2, height: 2, pixels: [1, 2, 3, 4] as never[] };

  const edits = pasteClipboard(clipboard, 127, 127, false);

  expect(edits).toEqual([{ x: 127, y: 127, color: 1 }]);
});
