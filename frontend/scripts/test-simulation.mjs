import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const model = await server.ssrLoadModule("/src/lib/simulation.ts");
  const { initiatives, categories } = await server.ssrLoadModule(
    "/src/data/initiatives.ts",
  );
  const { districts } = await server.ssrLoadModule("/src/data/mockCityData.ts");
  const { visualPlan, districtLayout } = await server.ssrLoadModule(
    "/src/scene/cityPlan.ts",
  );
  const visualized = visualPlan(initiatives);
  assert.equal(visualized.length, 15);
  assert.equal(new Set(districtLayout.map((d) => d.id)).size, 4);
  assert.deepEqual(visualPlan([]), []);
  for (const item of visualized) {
    assert.equal(
      item.location.id,
      item.district,
      "3D additions belong to the initiative district",
    );
    assert.ok(
      item.visualDescription &&
        Number.isFinite(item.location.x) &&
        Number.isFinite(item.location.z),
    );
  }
  const baseline = JSON.stringify(districts);
  assert.equal(model.qualityScore(districts), 54.8);
  let count = 0;
  const scores = new Set();
  const groups = categories.map((category) =>
    initiatives.filter((item) => item.category === category.key),
  );
  for (const a of groups[0])
    for (const b of groups[1])
      for (const c of groups[2])
        for (const d of groups[3])
          for (const e of groups[4]) {
            const choices = [a, b, c, d, e];
            const selected = choices.reduce(model.selectInitiative, []);
            assert.ok(model.spentTotal(selected) <= 500000000);
            if (model.spentTotal(choices) <= 500000000) {
              assert.equal(selected.length, 5);
              const projected = model.projectDistricts(selected);
              const score = model.qualityScore(projected);
              assert.ok(score > 54.8 && score <= 100);
              assert.ok(
                projected.every((district) =>
                  Object.values(district.metrics).every(
                    (value) => value >= 0 && value <= 100,
                  ),
                ),
              );
              scores.add(score);
              count++;
            }
          }
  const initial = model.selectInitiative([], initiatives[0]);
  assert.equal(model.selectInitiative(initial, initiatives[0]).length, 0);
  const replacement = model.selectInitiative(initial, initiatives[1]);
  assert.equal(replacement.length, 1);
  assert.equal(model.spentTotal(replacement), 100000000);
  assert.equal(
    JSON.stringify(districts),
    baseline,
    "Source data must remain unchanged",
  );
  globalThis.localStorage = { getItem: () => "{bad json" };
  assert.deepEqual(model.restoreSelection(), []);
  globalThis.localStorage = {
    getItem: () => JSON.stringify(initiatives.map((item) => item.id)),
  };
  const restored = model.restoreSelection();
  assert.equal(
    new Set(restored.map((item) => item.category)).size,
    restored.length,
  );
  assert.ok(model.spentTotal(restored) <= 500000000);
  await assert.rejects(model.analyzeScenario([]), /пять решений/);
  assert.equal(count, 182);
  assert.ok(scores.size > 1);
  console.log(
    `Passed: 243 combinations, ${count} valid scenarios, ${scores.size} different scores; replacement, cancellation, storage recovery, immutable data and validation.`,
  );
} finally {
  await server.close();
}
