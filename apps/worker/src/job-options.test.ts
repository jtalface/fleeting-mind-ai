import { describe, expect, it } from "vitest";
import { DEFAULT_WORKER_JOB_OPTIONS } from "./job-options.js";

describe("DEFAULT_WORKER_JOB_OPTIONS", () => {
  it("uses exponential backoff with bounded retries", () => {
    expect(DEFAULT_WORKER_JOB_OPTIONS.attempts).toBe(5);
    expect(DEFAULT_WORKER_JOB_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 2000
    });
    expect(DEFAULT_WORKER_JOB_OPTIONS.removeOnFail).toBe(false);
  });
});
