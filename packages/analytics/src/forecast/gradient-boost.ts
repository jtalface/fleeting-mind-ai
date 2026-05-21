import { mean, round } from "./math.js";

interface LagFeatureRow {
  y: number;
  lag1: number;
  lag7: number;
  roll3: number;
  roll7: number;
  dow: number;
}

const rollingMean = (series: number[], endIndex: number, window: number): number => {
  const start = Math.max(0, endIndex - window + 1);
  const slice = series.slice(start, endIndex + 1);
  return mean(slice);
};

const buildTrainingRows = (series: number[]): LagFeatureRow[] => {
  const rows: LagFeatureRow[] = [];
  for (let index = 7; index < series.length; index += 1) {
    rows.push({
      y: series[index] ?? 0,
      lag1: series[index - 1] ?? 0,
      lag7: series[index - 7] ?? 0,
      roll3: rollingMean(series, index - 1, 3),
      roll7: rollingMean(series, index - 1, 7),
      dow: index % 7
    });
  }
  return rows;
};

const featureNames: Array<keyof Omit<LagFeatureRow, "y">> = ["lag1", "lag7", "roll3", "roll7", "dow"];

const predictRow = (
  row: LagFeatureRow,
  trees: Array<{ feature: keyof Omit<LagFeatureRow, "y">; threshold: number; left: number; right: number }>
): number => {
  let prediction = mean([row.lag1, row.lag7, row.roll7]);
  for (const tree of trees) {
    const value = row[tree.feature];
    prediction += value <= tree.threshold ? tree.left : tree.right;
  }
  return prediction;
};

type RegressionStump = {
  feature: keyof Omit<LagFeatureRow, "y">;
  threshold: number;
  left: number;
  right: number;
};

const fitStump = (rows: LagFeatureRow[], residuals: number[]): RegressionStump | null => {
  if (rows.length === 0) {
    return null;
  }
  let bestFeature: keyof Omit<LagFeatureRow, "y"> = "lag1";
  let bestThreshold = 0;
  let bestLeft = 0;
  let bestRight = 0;
  let bestError = Number.POSITIVE_INFINITY;

  for (const feature of featureNames) {
    const values = [...new Set(rows.map((row) => row[feature]))].sort((a, b) => a - b);
    for (const threshold of values) {
      const leftResiduals: number[] = [];
      const rightResiduals: number[] = [];
      rows.forEach((row, index) => {
        const residual = residuals[index] ?? 0;
        if (row[feature] <= threshold) {
          leftResiduals.push(residual);
        } else {
          rightResiduals.push(residual);
        }
      });
      const left = mean(leftResiduals);
      const right = mean(rightResiduals);
      const error = rows.reduce((sum, row, index) => {
        const residual = residuals[index] ?? 0;
        const prediction = row[feature] <= threshold ? left : right;
        return sum + (residual - prediction) ** 2;
      }, 0);
      if (error < bestError) {
        bestError = error;
        bestFeature = feature;
        bestThreshold = threshold;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  return { feature: bestFeature, threshold: bestThreshold, left: bestLeft, right: bestRight };
};

const TREE_COUNT = 24;
const LEARNING_RATE = 0.12;

/**
 * Lightweight gradient-boosted regression stumps on lag / rolling features.
 */
export function gradientBoostingStumpsForecast(series: number[], horizon: number): number[] {
  const n = series.length;
  if (n === 0) {
    return Array.from({ length: horizon }, () => 0);
  }
  if (n < 8) {
    const last = series[n - 1] ?? 0;
    return Array.from({ length: horizon }, () => round(last));
  }

  const trainRows = buildTrainingRows(series);
  const trees: RegressionStump[] = [];
  const fitted = trainRows.map((row) => mean([row.lag1, row.lag7, row.roll7]));
  const residuals = trainRows.map((row, index) => row.y - (fitted[index] ?? 0));

  for (let treeIndex = 0; treeIndex < TREE_COUNT; treeIndex += 1) {
    const stump = fitStump(trainRows, residuals);
    if (!stump) {
      break;
    }
    trees.push({
      feature: stump.feature,
      threshold: stump.threshold,
      left: stump.left * LEARNING_RATE,
      right: stump.right * LEARNING_RATE
    });
    trainRows.forEach((row, index) => {
      const contribution = row[stump.feature] <= stump.threshold ? stump.left * LEARNING_RATE : stump.right * LEARNING_RATE;
      fitted[index] = (fitted[index] ?? 0) + contribution;
      residuals[index] = row.y - (fitted[index] ?? 0);
    });
  }

  const extended = [...series];
  const forecasts: number[] = [];
  for (let step = 0; step < horizon; step += 1) {
    const index = extended.length;
    const row: LagFeatureRow = {
      y: 0,
      lag1: extended[index - 1] ?? 0,
      lag7: extended[index - 7] ?? extended[0] ?? 0,
      roll3: rollingMean(extended, index - 1, 3),
      roll7: rollingMean(extended, index - 1, 7),
      dow: index % 7
    };
    const value = round(predictRow(row, trees));
    forecasts.push(value);
    extended.push(value);
  }
  return forecasts;
}

export const GRADIENT_BOOST_TREE_COUNT = TREE_COUNT;
