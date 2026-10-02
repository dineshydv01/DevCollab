import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests run in milliseconds, but integration tests make real
    // network calls to MongoDB Atlas — Vitest's 5-second default
    // timeout is too tight for a beforeAll that registers three users
    // and creates a project, each a real round trip.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
