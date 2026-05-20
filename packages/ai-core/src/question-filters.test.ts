import { describe, expect, it } from "vitest";
import {
  inferNameFilterFromContext,
  questionAsksForPlateNumbers
} from "./question-filters.js";

describe("question filters", () => {
  it("detects plate number questions", () => {
    expect(questionAsksForPlateNumbers("give me their plate numbers")).toBe(true);
    expect(questionAsksForPlateNumbers("how many sweepers")).toBe(false);
  });

  it("inherits sweeper filter from conversation history on follow-up", () => {
    const history = [
      "user: How many sweepers do we have?",
      "assistant: You have 5 sweepers."
    ];
    expect(inferNameFilterFromContext("give me their plate numbers", history)).toBe("Sweeper");
  });
});
