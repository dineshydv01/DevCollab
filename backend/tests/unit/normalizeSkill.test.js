import { describe, it, expect } from "vitest";
import { normalizeSkill, normalizeSkills } from "../../src/utils/normalizeSkill.js";

describe("normalizeSkill", () => {
  it("treats common aliases as the same canonical skill", () => {
    expect(normalizeSkill("ReactJS")).toBe(normalizeSkill("React.js"));
    expect(normalizeSkill("reactjs")).toBe("React");
  });

  it("title-cases unknown skills as a reasonable fallback", () => {
    expect(normalizeSkill("graphql")).toBe("Graphql");
  });

  it("returns an empty string for non-string input", () => {
    expect(normalizeSkill(null)).toBe("");
    expect(normalizeSkill(undefined)).toBe("");
  });
});

describe("normalizeSkills", () => {
  it("deduplicates aliased variants", () => {
    expect(normalizeSkills(["React", "reactjs", "REACT.JS", "Node.js"])).toEqual(["React", "Node.js"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeSkills(null)).toEqual([]);
    expect(normalizeSkills(undefined)).toEqual([]);
  });
});
