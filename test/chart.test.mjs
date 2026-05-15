import assert from "node:assert/strict";
import test from "node:test";
import { paddedExtent } from "../src/chart.js";

test("chart y-axis extent starts at the minimum plotted value", () => {
  assert.equal(paddedExtent([-60000, 100000, 300000]).min, -60000);
  assert.equal(paddedExtent([10000, 20000, 30000]).min, 0);
});
