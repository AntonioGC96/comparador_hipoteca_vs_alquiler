import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePairedOutcomes,
  computeFrenchPayment,
  computeProjection,
  computeUncertainProjection,
  effectiveAnnualRateToMonthlyRate,
  quantile
} from "../src/finance.js";
import { createInitialState, setAdvancedValue, setBasicValue } from "../src/state.js";

test("converts a TAE annual mortgage rate to an effective monthly rate", () => {
  const monthly = effectiveAnnualRateToMonthlyRate(12);
  assert.ok(Math.abs(monthly - 0.009488792934583046) < 1e-12);
});

test("computes the French fixed monthly payment", () => {
  const mortgage = computeFrenchPayment(200000, 3, 30);
  assert.equal(mortgage.months, 360);
  assert.ok(Math.abs(mortgage.payment - 838.85) < 0.01);
});

test("does not compute a projection until all mandatory values are present", () => {
  const state = createInitialState();
  assert.equal(computeProjection(state).ready, false);
});

test("computes deterministic rent and buy net worth through the mortgage horizon", () => {
  const state = completeBasicState();

  const projection = computeProjection(state);
  assert.equal(projection.ready, true);
  assert.equal(projection.mortgage.months, 360);
  assert.equal(projection.points.at(-1).year, 30);
  assert.equal(projection.points.length, 31);
  assert.ok(projection.summary.monthlyPayment > 0);
  assert.ok(projection.summary.buyerFinal > 0);
  assert.ok(projection.summary.renterFinal > 0);
});

test("quantile interpolates between sorted samples", () => {
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
});

test("computes uncertain return percentile bands", async () => {
  let state = completeBasicState();
  state = setAdvancedValue(state, "monteCarloSimulations", "80");
  state = setAdvancedValue(state, "monteCarloSeed", "42");
  const projection = computeProjection(state);
  const uncertain = await computeUncertainProjection(projection, state);

  assert.equal(uncertain.simulationCount, 80);
  assert.equal(uncertain.seed, 42);
  assert.equal(uncertain.pairComparison.total, 80);
  assert.equal(uncertain.buy.p50.length, projection.points.length);
  assert.equal(uncertain.rent.p50.length, projection.points.length);
  assert.ok(uncertain.rent.p01.at(-1).value <= uncertain.rent.p10.at(-1).value);
  assert.ok(uncertain.rent.p10.at(-1).value <= uncertain.rent.p50.at(-1).value);
  assert.ok(uncertain.rent.p50.at(-1).value <= uncertain.rent.p90.at(-1).value);
  assert.ok(uncertain.rent.p90.at(-1).value <= uncertain.rent.p99.at(-1).value);
});

test("compares sorted paired final outcomes", () => {
  const comparison = comparePairedOutcomes([30, 10, 20], [5, 35, 15]);
  assert.equal(comparison.buyerWins, 2);
  assert.equal(comparison.renterWins, 1);
  assert.equal(comparison.winner, "buy");
  assert.ok(Math.abs(comparison.confidence - 200 / 3) < 1e-12);
});

function completeBasicState() {
  let state = createInitialState();
  state = setBasicValue(state, "homePrice", "300000");
  state = setBasicValue(state, "mortgageRate", "3");
  state = setBasicValue(state, "mortgageYears", "30");
  state = setBasicValue(state, "monthlyRent", "1200");
  state = setBasicValue(state, "investmentReturn", "5");
  return state;
}
