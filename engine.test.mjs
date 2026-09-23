import test from "node:test";
import assert from "node:assert/strict";
import { BUDGET } from "./data.mjs";
import { costOf, evaluate, findBestScenario, findBestSingleChange, validateSelections } from "./engine.mjs";

const base = {
  transport: { actionId: "walk", districtId: "almaty" },
  green: { actionId: "yards", districtId: "saryarka" },
  social: { actionId: "school", districtId: "almaty" },
  safety: { actionId: "response", districtId: "almaty" },
  service: { actionId: "feedback", districtId: "almaty" },
};

test("requires one valid decision in each of five directions", () => {
  assert.equal(validateSelections(base).length, 0);
  assert.ok(validateSelections({ ...base, safety: undefined }).length > 0);
  assert.ok(validateSelections({ ...base, safety: { actionId: "fake", districtId: "almaty" } }).length > 0);
});

test("rejects scenarios that exceed the common budget", () => {
  const expensive = {
    transport: { actionId: "bus", districtId: "almaty" },
    green: { actionId: "park", districtId: "almaty" },
    social: { actionId: "clinic", districtId: "almaty" },
    safety: { actionId: "lighting", districtId: "almaty" },
    service: { actionId: "repair", districtId: "almaty" },
  };
  assert.ok(costOf(expensive) > BUDGET);
  assert.equal(evaluate(expensive).valid, false);
});

test("changing decisions changes the score, and scoring is deterministic", () => {
  const first = evaluate(base);
  const second = evaluate({ ...base, transport: { actionId: "signals", districtId: "almaty" } });
  assert.equal(first.valid, true);
  assert.equal(first.score, evaluate(base).score);
  assert.notEqual(first.score, second.score);
  assert.ok(first.score > first.baseline);
  assert.ok(first.score <= 100);
});

test("advisor finds an affordable scenario at least as good as a basic one", () => {
  const best = findBestScenario();
  assert.ok(best.result.valid);
  assert.ok(best.result.cost <= BUDGET);
  assert.ok(best.result.score >= evaluate(base).score);
});

test("single-change advice identifies one affordable improvement", () => {
  const advice = findBestSingleChange(base);
  assert.ok(advice);
  assert.ok(advice.result.score > evaluate(base).score);
  assert.ok(advice.result.cost <= BUDGET);
  const changed = Object.keys(base).filter((id) => JSON.stringify(base[id]) !== JSON.stringify(advice.selections[id]));
  assert.deepEqual(changed, [advice.categoryId]);
});
