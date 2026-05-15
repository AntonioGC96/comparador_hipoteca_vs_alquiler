import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, percentileLabel, t } from "../src/i18n.js";

test("normalizes supported languages", () => {
  assert.equal(normalizeLanguage("es"), "es");
  assert.equal(normalizeLanguage("fr"), "en");
});

test("translates chart labels and percentile labels", () => {
  assert.equal(t("es", "buying"), "Comprar");
  assert.equal(percentileLabel("es", 84.1), "percentil 84,1");
  assert.equal(percentileLabel("en", 84.1), "84.1 percentile");
});
