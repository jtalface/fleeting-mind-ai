import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_FORECAST_TRAINING_LOOKBACK_DAYS,
  forecastWindowPresetForLookbackDays,
  resolveForecastTrainingLookbackDays
} from "./forecast-lookback.js";

describe("forecast-lookback", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("defaults training lookback to 30 days", () => {
    delete process.env.FORECAST_TRAINING_LOOKBACK_DAYS;
    expect(resolveForecastTrainingLookbackDays()).toBe(DEFAULT_FORECAST_TRAINING_LOOKBACK_DAYS);
  });

  it("maps 30d to last_30d_utc preset", () => {
    expect(forecastWindowPresetForLookbackDays(30)).toBe("last_30d_utc");
  });
});
