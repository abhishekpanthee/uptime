import { describe, it, expect } from "bun:test";
import {
  extractBearerToken,
} from "../src/middleware/auth";

describe("Auth Middleware", () => {
  describe("extractBearerToken", () => {
    it("should extract token from valid Bearer header", () => {
      const token = extractBearerToken({ authorization: "Bearer abc123" });
      expect(token).toBe("abc123");
    });

    it("should return null for missing authorization header", () => {
      const token = extractBearerToken({});
      expect(token).toBeNull();
    });

    it("should return null for non-Bearer authorization", () => {
      const token = extractBearerToken({ authorization: "Basic abc123" });
      expect(token).toBeNull();
    });

    it("should return null for undefined authorization", () => {
      const token = extractBearerToken({ authorization: undefined });
      expect(token).toBeNull();
    });

    it("should handle Bearer with empty token", () => {
      const token = extractBearerToken({ authorization: "Bearer " });
      expect(token).toBe("");
    });
  });
});
