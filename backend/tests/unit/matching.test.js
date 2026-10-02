import { describe, it, expect } from "vitest";
import { computeMatchScore, findTopMatches } from "../../src/services/matching.service.js";

const project = {
  requiredSkills: ["React", "Node.js", "MongoDB", "Socket.IO"],
  difficulty: "Intermediate",
  preferredRoles: [],
};

describe("matching.service — computeMatchScore", () => {
  it("matches the spec's own worked example (3/4 skills -> skillScore 37.5)", () => {
    const dev = {
      skills: ["React", "Node.js", "MongoDB", "JavaScript"],
      experienceLevel: "Intermediate",
      availability: 15,
      preferredRoles: [],
    };
    const result = computeMatchScore(dev, project);
    expect(result.skillScore).toBe(37.5);
    expect(result.matchedSkills).toEqual(["React", "Node.js", "MongoDB"]);
    expect(result.missingSkills).toEqual(["Socket.IO"]);
  });

  it("edge case: no matching skills scores 0, all required skills listed as missing", () => {
    const dev = { skills: ["COBOL"], experienceLevel: "Beginner", availability: 0, preferredRoles: [] };
    const result = computeMatchScore(dev, project);
    expect(result.skillScore).toBe(0);
    expect(result.missingSkills).toHaveLength(4);
  });

  it("edge case: all required skills matched (plus extras) scores full 50", () => {
    const dev = {
      skills: ["React", "Node.js", "MongoDB", "Socket.IO", "Docker"],
      experienceLevel: "Intermediate",
      availability: 20,
      preferredRoles: [],
    };
    const result = computeMatchScore(dev, project);
    expect(result.skillScore).toBe(50);
    expect(result.missingSkills).toHaveLength(0);
  });

  it("gives full experience credit for an exact level match", () => {
    const dev = { skills: [], experienceLevel: "Intermediate", availability: 0, preferredRoles: [] };
    expect(computeMatchScore(dev, project).experienceScore).toBe(20);
  });

  it("gives partial experience credit for a one-level gap", () => {
    const dev = { skills: [], experienceLevel: "Beginner", availability: 0, preferredRoles: [] };
    expect(computeMatchScore(dev, project).experienceScore).toBe(12);
  });

  it("gives minimal experience credit for a two-level gap", () => {
    const dev = { skills: [], experienceLevel: "Beginner", availability: 0, preferredRoles: [] };
    expect(computeMatchScore(dev, { ...project, difficulty: "Advanced" }).experienceScore).toBe(4);
  });

  it.each([
    [0, 0],
    [5, 5],
    [10, 10],
    [15, 15],
    [30, 15],
  ])("availability of %i hours/week scores %i points", (hours, expected) => {
    const dev = { skills: [], experienceLevel: "Intermediate", availability: hours, preferredRoles: [] };
    expect(computeMatchScore(dev, project).availabilityScore).toBe(expected);
  });

  it("gives full role credit when the project has no role preference", () => {
    const dev = { skills: [], experienceLevel: "Intermediate", availability: 0, preferredRoles: [] };
    expect(computeMatchScore(dev, project).roleScore).toBe(15);
  });

  it("gives partial role credit proportional to overlap", () => {
    const projWithRoles = { ...project, preferredRoles: ["Frontend Developer", "Backend Developer"] };
    const dev = { skills: [], experienceLevel: "Intermediate", availability: 0, preferredRoles: ["Frontend Developer"] };
    expect(computeMatchScore(dev, projWithRoles).roleScore).toBe(7.5);
  });
});

describe("matching.service — findTopMatches (Top-K via min-heap)", () => {
  it("returns exactly `limit` results, sorted descending by matchScore", () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      skills: i % 3 === 0 ? ["React", "Node.js", "MongoDB", "Socket.IO"] : ["COBOL"],
      experienceLevel: "Intermediate",
      availability: i,
      preferredRoles: [],
    }));
    const top5 = findTopMatches(project, candidates, 5);
    expect(top5).toHaveLength(5);
    for (let i = 1; i < top5.length; i++) {
      expect(top5[i - 1].matchScore).toBeGreaterThanOrEqual(top5[i].matchScore);
    }
  });

  it("returns an empty array when there are no candidates", () => {
    expect(findTopMatches(project, [], 10)).toEqual([]);
  });
});
