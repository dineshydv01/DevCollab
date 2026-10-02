import { describe, it, expect } from "vitest";
import { parsePagination, buildPaginationMeta } from "../../src/utils/pagination.js";

describe("parsePagination", () => {
  it("defaults to page 1, limit 10 when nothing is given", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("parses valid page/limit and computes skip correctly", () => {
    expect(parsePagination({ page: "2", limit: "5" })).toEqual({ page: 2, limit: 5, skip: 5 });
  });

  it("clamps an oversized limit to 50", () => {
    expect(parsePagination({ limit: "9999" }).limit).toBe(50);
  });

  it("falls back to defaults for garbage input", () => {
    expect(parsePagination({ page: "abc", limit: "-5" })).toEqual({ page: 1, limit: 10, skip: 0 });
  });
});

describe("buildPaginationMeta", () => {
  it("computes totalPages correctly", () => {
    expect(buildPaginationMeta(2, 10, 25)).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it("totalPages is at least 1 even when total is 0", () => {
    expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(1);
  });
});
