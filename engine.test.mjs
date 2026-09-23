import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUDGET, EVENTS } from "./data.mjs";
import { BASELINE, costOf, decodeDecisions, encodeDecisions, evaluate, robustness, scoreOf, stressTest, validate } from "./engine.mjs";
import { analyzeSpace, bestSingleChange, enumerate, reallocate } from "./optimizer.mjs";

// Те же утверждения проверяют Z3 (verification/z3_verify.py) и Lean (verification/lean/AkimScore.lean).
const expected = JSON.parse(readFileSync(new URL("./verification/expected.json", import.meta.url), "utf-8"));
const close = (actual, claimed, message) => assert.ok(Math.abs(actual - Number(claimed)) < 1e-9, `${message}: ${actual} ≠ ${claimed}`);
const example = decodeDecisions(expected.example.code);

test("baseline Score matches the task statement (52.56)", () => {
  close(BASELINE.score, expected.baseline, "база");
  assert.equal(BASELINE.critical, 2);
});

test("example from the task: valid, costs 95, Score ≈ 56.5, synergy M10+M12", () => {
  assert.deepEqual(validate(example), []);
  const result = evaluate(example);
  assert.equal(result.cost, expected.example.cost);
  close(result.exactScore, expected.example.score, "пример");
  assert.deepEqual(result.synergies.map((s) => s.measures.join("+")), ["M10+M12"]);
});

test("the cheapest valid set costs 61", () => {
  const cheapest = decodeDecisions(expected.cheapest.code);
  assert.deepEqual(validate(cheapest), []);
  assert.equal(costOf(cheapest), 61);
  let minimum = Infinity;
  enumerate((score, cost) => { minimum = Math.min(minimum, cost); });
  assert.equal(minimum, 61);
});

test("validator rejects every rule violation with a reason", () => {
  const four = example.slice(0, 4);
  assert.match(validate(four).join(" "), /ровно 5/);
  assert.match(validate([...four, { measureId: "M7", districtId: "esil" }]).join(" "), /повторно/);
  assert.match(validate([...four, { measureId: "M9", districtId: null }]).join(" "), /нужно выбрать район/);
  assert.match(validate([...four, { measureId: "M14", districtId: "nura" }]).join(" "), /район для неё не указывается/);
  assert.match(validate([...four, { measureId: "M9", districtId: "nura" }]).join(" "), /не более 2/);
  const transport = [{ measureId: "M1", districtId: "nura" }, { measureId: "M3", districtId: "esil" }, { measureId: "M9", districtId: "nura" }, { measureId: "M11", districtId: "nura" }, { measureId: "M12", districtId: null }];
  assert.match(validate(transport).join(" "), /либо BRT, либо ЛРТ/);
  const land = [{ measureId: "M4", districtId: "nura" }, { measureId: "M7", districtId: "nura" }, { measureId: "M9", districtId: "esil" }, { measureId: "M11", districtId: "nura" }, { measureId: "M12", districtId: null }];
  assert.match(validate(land).join(" "), /нельзя в одном районе/);
  assert.equal(validate(land.map((d) => (d.measureId === "M4" ? { ...d, districtId: "esil" } : d))).length, 0);
  const expensive = [{ measureId: "M3", districtId: "nura" }, { measureId: "M13", districtId: "almaty" }, { measureId: "M7", districtId: "esil" }, { measureId: "M5", districtId: "saryarka" }, { measureId: "M2", districtId: null }];
  assert.match(validate(expensive).join(" "), /Бюджет превышен/);
  assert.equal(evaluate(expensive).valid, false);
});

test("order of decisions does not matter; changing a decision changes the Score", () => {
  assert.equal(scoreOf([...example].reverse()), scoreOf(example));
  const changed = example.map((d) => (d.measureId === "M5" ? { measureId: "M5", districtId: "almaty" } : d));
  assert.notEqual(scoreOf(changed), scoreOf(example));
});

test("Shapley contributions sum exactly to the Score change", () => {
  const result = evaluate(example);
  const total = result.decisions.reduce((sum, d) => sum + d.exactContribution, 0);
  assert.ok(Math.abs(total - (result.exactScore - BASELINE.score)) < 1e-9);
});

test("share code round-trips and rejects invalid sets", () => {
  assert.deepEqual(scoreOf(decodeDecisions(encodeDecisions(example))), scoreOf(example));
  assert.equal(decodeDecisions("M1.nura_M3.esil_M9.nura_M11.nura_M12"), null);
  assert.equal(decodeDecisions("garbage"), null);
});

test("unknown districts in conflicting measures reject share codes without throwing", () => {
  assert.equal(decodeDecisions("M4.unknown_M7.unknown_M9.nura_M11.nura_M12"), null);
  assert.equal(decodeDecisions("M5.unknown_M13.unknown_M9.nura_M11.nura_M12"), null);
  const invalid = example.map((decision) => ({ ...decision, districtId: decision.districtId ? "unknown" : null }));
  assert.equal(evaluate(invalid).valid, false);
});

test("optimizer: exhaustive count, global optimum and Pareto frontier match the verified claims", () => {
  const space = analyzeSpace();
  assert.equal(space.count, expected.validCount);
  close(scoreOf(space.best.decisions), expected.optimum.score, "оптимум");
  assert.equal(space.best.cost, expected.optimum.cost);
  assert.deepEqual(space.pareto.map((p) => p.cost), expected.pareto.map((p) => p.maxCost));
  space.pareto.forEach((point, index) => close(scoreOf(point.decisions), expected.pareto[index].score, `Парето ${point.cost}`));
  for (const option of Object.values(space.alternatives)) assert.deepEqual(validate(option.decisions), []);
});

test("single-change advice improves the Score by changing exactly one decision", () => {
  const advice = bestSingleChange(example);
  assert.ok(advice && advice.score > evaluate(example).score);
  assert.deepEqual(validate(advice.decisions), []);
  assert.equal(advice.decisions.filter((d, i) => d.measureId !== example[i].measureId || d.districtId !== example[i].districtId).length, 1);
});

test("stress test: a reserve covers events, the reallocation fits the budget", () => {
  const economical = decodeDecisions(expected.pareto.find((p) => p.maxCost === 86).code);
  assert.ok(stressTest(economical).every((event) => event.covered));
  const stress = stressTest(example);
  assert.ok(stress.every((event) => !event.covered));
  const heat = EVENTS.find((event) => event.id === "heat");
  const plan = reallocate(example, heat.id);
  assert.ok(plan.options.length > 0);
  for (const option of plan.options) {
    assert.deepEqual(validate(option.decisions), []);
    assert.ok(option.cost + heat.responseCost <= BUDGET);
  }
});

test("robustness simulation is deterministic and brackets the Score", () => {
  const a = robustness(example);
  assert.deepEqual(a, robustness(example));
  assert.ok(a.p10 <= a.p50 && a.p50 <= a.p90);
});

test("robustness is unchanged by selection order and sharing", () => {
  const reversed = [...example].reverse();
  const originalOrder = reversed.map((decision) => decision.measureId);
  const result = robustness(reversed);
  assert.deepEqual(result, robustness(example));
  assert.deepEqual(result, robustness(decodeDecisions(encodeDecisions(reversed))));
  assert.deepEqual(reversed.map((decision) => decision.measureId), originalOrder);
});
