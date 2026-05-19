import type { Job } from "bullmq";
import { describe, expect, it } from "vitest";
import { isFinalFailure } from "./dlq.js";

const job = (attemptsMade: number, attempts?: number): Job =>
  ({
    attemptsMade,
    opts: attempts === undefined ? {} : { attempts }
  }) as Job;

describe("isFinalFailure", () => {
  it("is false before the final attempt", () => {
    expect(isFinalFailure(job(2, 5))).toBe(false);
  });

  it("is true on the final attempt", () => {
    expect(isFinalFailure(job(5, 5))).toBe(true);
  });

  it("defaults attempts to 1 when opts omit attempts", () => {
    expect(isFinalFailure(job(1))).toBe(true);
    expect(isFinalFailure(job(0))).toBe(false);
  });
});
