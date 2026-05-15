import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, percentileLabel, t } from "../src/i18n.js";

test("normalizes supported languages", () => {
  assert.equal(normalizeLanguage("es"), "es");
  assert.equal(normalizeLanguage("fr"), "en");
});

test("translates chart labels and percentile labels", () => {
  assert.equal(t("es", "buying"), "Comprar");
  assert.equal(percentileLabel("es", 90), "percentil 90");
  assert.equal(percentileLabel("en", 90), "90 percentile");
  assert.equal(
    t("en", "confidenceDecision", { option: "Buying", confidence: "62.50%" }),
    "Buying with 62.50% confidence"
  );
  assert.equal(
    t("en", "buyerPercentileNetWorth", { mode: "nominal" }),
    "Buyer's 50th percentile nominal net worth"
  );
});
