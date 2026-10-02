import { describe, it, expect } from "vitest";
import { isOwnerOf, isActiveMemberOf, isEverPartOfTeam } from "../../src/utils/projectAuth.js";

const project = {
  owner: { toString: () => "owner1" },
  members: [
    { status: "active", user: { toString: () => "user1" } },
    { status: "removed", user: { toString: () => "user2" } },
  ],
};

describe("isOwnerOf", () => {
  it("matches the owner and rejects everyone else", () => {
    expect(isOwnerOf(project, "owner1")).toBe(true);
    expect(isOwnerOf(project, "user1")).toBe(false);
  });
});

describe("isActiveMemberOf", () => {
  it("matches only ACTIVE members, excluding removed ones", () => {
    expect(isActiveMemberOf(project, "user1")).toBe(true);
    expect(isActiveMemberOf(project, "user2")).toBe(false);
  });
});

describe("isEverPartOfTeam", () => {
  it("matches both active AND removed members (the key difference from isActiveMemberOf)", () => {
    expect(isEverPartOfTeam(project, "user1")).toBe(true);
    expect(isEverPartOfTeam(project, "user2")).toBe(true);
  });

  it("rejects a true non-member", () => {
    expect(isEverPartOfTeam(project, "user3")).toBe(false);
  });
});
