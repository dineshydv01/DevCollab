import { describe, it, expect } from "vitest";
import { MinHeap, getTopKByScore } from "../../src/utils/minHeap.js";

describe("MinHeap", () => {
  it("extracts items in ascending order", () => {
    const heap = new MinHeap((a, b) => a - b);
    [5, 3, 8, 1, 9, 2, 7].forEach((n) => heap.insert(n));
    const out = [];
    while (heap.size() > 0) out.push(heap.extractMin());
    expect(out).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });
});

describe("getTopKByScore", () => {
  it("matches a brute-force full sort for the top K", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ id: i, score: Math.floor(Math.random() * 1000) }));
    const topK = getTopKByScore(items, 10, (x) => x.score);
    const bruteForce = [...items].sort((a, b) => b.score - a.score).slice(0, 10);
    expect(topK.map((x) => x.score)).toEqual(bruteForce.map((x) => x.score));
  });

  it("returns results sorted descending", () => {
    const items = Array.from({ length: 50 }, () => ({ score: Math.random() }));
    const topK = getTopKByScore(items, 10, (x) => x.score);
    for (let i = 1; i < topK.length; i++) {
      expect(topK[i - 1].score).toBeGreaterThanOrEqual(topK[i].score);
    }
  });

  it("handles k=0, k>n, and empty input", () => {
    const items = [{ score: 1 }, { score: 2 }];
    expect(getTopKByScore(items, 0, (x) => x.score)).toEqual([]);
    expect(getTopKByScore(items, 100, (x) => x.score)).toHaveLength(2);
    expect(getTopKByScore([], 10, (x) => x.score)).toEqual([]);
  });
});
