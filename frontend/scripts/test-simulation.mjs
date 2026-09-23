import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  cacheDir: "node_modules/.cache/model-tests",
  optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const model = await server.ssrLoadModule("/src/lib/simulation.ts");
  const { districts, indicatorDefinitions } = await server.ssrLoadModule(
    "/src/data/mockCityData.ts",
  );
  const { initiatives } = await server.ssrLoadModule(
    "/src/data/initiatives.ts",
  );
  const { visualPlan, districtLayout } = await server.ssrLoadModule(
    "/src/scene/cityPlan.ts",
  );
  const m = (id, district) => ({
    ...initiatives.find((i) => i.id === id),
    ...(district ? { district } : {}),
  });
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
  const baseline = JSON.stringify(districts);
  assert.equal(districts.length, 5);
  assert.equal(initiatives.length, 14);
  close(
    districts.reduce((s, d) => s + d.populationShare, 0),
    1,
  );
  close(
    indicatorDefinitions.reduce((s, i) => s + i.weight, 0),
    1,
  );
  [62.99, 57.06, 54.65, 56.63, 49.18].forEach((score, i) =>
    close(model.districtScore(districts[i]), score),
  );
  close(model.scoreBreakdown(districts).average, 56.8624);
  assert.equal(model.qualityScore(districts), 52.56);
  assert.equal(model.scoreBreakdown(districts).critical.length, 2);
  const example = [
    m("M7", "nura"),
    m("M8", "nura"),
    m("M10", "nura"),
    m("M12"),
    m("M5", "saryarka"),
  ];
  const result = model.calculateScenario(example);
  assert.equal(result.valid, true);
  assert.equal(model.spentTotal(example), 95);
  const nura = result.projected.find((d) => d.id === "nura");
  close(nura.indicators.S1, 48);
  close(nura.indicators.S2, 43.75);
  close(nura.indicators.B1, 67.5);
  close(nura.indicators.B2, 51.75);
  close(nura.indicators.C2, 54.375);
  assert.equal(result.breakdown.critical.length, 0);
  assert.equal(result.synergies.length, 1);
  const transport = model.projectDistricts([m("M1", "yesil"), m("M2")]);
  close(transport[0].indicators.T1, 54.5);
  close(transport[1].indicators.T1, 43);
  close(transport[0].indicators.T2, 68.75);
  const eco = model.projectDistricts([m("M5", "saryarka"), m("M6")]);
  close(eco[2].indicators.E2, 52.25);
  close(eco[0].indicators.E2, 73.5);
  const crossing = model.projectDistricts([m("M11", "nura")]);
  close(crossing[4].indicators.T1, 53.25);
  close(crossing[4].indicators.B2, 60.5);
  assert.deepEqual(crossing[0], districts[0]);
  const threshold = structuredClone(districts);
  threshold[4].indicators.S1 = 40;
  assert.equal(model.scoreBreakdown(threshold).critical.length, 1);
  threshold[4].indicators.S1 = 39.999;
  assert.equal(model.scoreBreakdown(threshold).critical.length, 2);
  for (const [bad, pattern] of [
    [[m("M1")], /выберите район/],
    [[m("M2", "nura")], /не указывается/],
    [[m("M1", "missing")], /выберите район/],
    [[m("M1", "yesil"), m("M1", "nura")], /повтор/],
    [[m("M1", "yesil"), m("M3", "nura")], /несовместимы/],
    [[m("M4", "nura"), m("M7", "nura")], /участок/],
    [[m("M5", "nura"), m("M13", "nura")], /дублирование/],
    [[m("M7", "nura"), m("M8", "nura"), m("M9", "yesil")], /Не более 2/],
    [
      [
        m("M3", "nura"),
        m("M5", "yesil"),
        m("M7", "baikonyr"),
        m("M13", "almaty"),
        m("M14"),
      ],
      /бюджета/,
    ],
    [[{ id: "fake" }], /Неизвестное/],
  ]) {
    assert.match(model.validateSelection(bad, false).join(" "), pattern);
    assert.equal(model.calculateScenario(bad).score, null);
  }
  assert.equal(model.calculateScenario(example.slice(0, 4)).score, null);
  assert.equal(
    model.calculateScenario([...example, m("M11", "nura")]).score,
    null,
  );
  assert.deepEqual(
    model.validateSelection([m("M4", "nura"), m("M7", "yesil")], false),
    [],
  );
  assert.deepEqual(
    model.validateSelection([m("M5", "nura"), m("M13", "yesil")], false),
    [],
  );
  const cheapest = [
    m("M9", "nura"),
    m("M11", "nura"),
    m("M10", "nura"),
    m("M12"),
    m("M4", "yesil"),
  ];
  assert.equal(model.spentTotal(cheapest), 61);
  assert.equal(model.calculateScenario(cheapest).valid, true);
  const selected = model.selectInitiative([], m("M7", "nura"));
  assert.equal(model.selectInitiative(selected, m("M8", "nura")).length, 2);
  assert.equal(model.selectInitiative(selected, m("M7", "nura")).length, 0);
  assert.equal(
    model.selectInitiative(selected, m("M7", "yesil"))[0].district,
    "yesil",
  );
  assert.equal(model.selectInitiative(selected, m("M4", "nura")), selected);
  assert.equal(model.spentTotal([{ ...m("M1", "nura"), cost: 0 }]), 18);
  function* permutations(items) {
    if (!items.length) {
      yield [];
      return;
    }
    for (let n = 0; n < items.length; n++)
      for (const tail of permutations(items.filter((_, i) => n !== i)))
        yield [items[n], ...tail];
  }
  for (const p of permutations(example)) {
    assert.deepEqual(model.projectDistricts(p), result.projected);
    assert.equal(model.calculateScenario(p).score, result.score);
  }
  let valid = 0,
    invalid = 0;
  for (let a = 0; a < 10; a++)
    for (let b = a + 1; b < 11; b++)
      for (let c = b + 1; c < 12; c++)
        for (let d = c + 1; d < 13; d++)
          for (let e = d + 1; e < 14; e++)
            for (const target of districts) {
              const choices = [a, b, c, d, e].map((index) => ({
                ...initiatives[index],
                ...(initiatives[index].scope === "district"
                  ? { district: target.id }
                  : {}),
              }));
              const r = model.calculateScenario(choices);
              if (!r.valid) {
                assert.equal(r.score, null);
                invalid++;
                continue;
              }
              valid++;
              assert.ok(Number.isFinite(r.score));
              assert.ok(
                r.projected.every((d) =>
                  Object.values(d.indicators).every((v) => v >= 0 && v <= 100),
                ),
              );
              assert.ok(model.spentTotal(choices) <= 100);
            }
  assert.equal(valid + invalid, 10010);
  assert.ok(valid > 0 && invalid > 0);
  for (const item of initiatives) {
    const plan = visualPlan([
      m(item.id, item.scope === "district" ? "nura" : undefined),
    ]);
    assert.equal(plan.length, item.scope === "city" ? 5 : 1);
    assert.ok(plan.every((p) => p.visualDescription && p.location));
    if (item.scope === "district") assert.equal(plan[0].location.id, "nura");
  }
  assert.equal(districtLayout.length, 5);
  assert.notDeepEqual(
    visualPlan([m("M4", "nura")]),
    visualPlan([m("M4", "yesil")]),
  );
  globalThis.localStorage = {
    getItem: () =>
      JSON.stringify(
        example.map((i) => ({
          id: i.id,
          ...(i.district ? { district: i.district } : {}),
        })),
      ),
  };
  assert.deepEqual(model.restoreSelection(), example);
  for (const value of [
    "{bad json",
    "null",
    '["t1"]',
    '[{"id":"M2","district":"nura"}]',
    '[{"id":"M1"}]',
    '[{"id":"M1","district":"nura"},{"id":"M1","district":"yesil"}]',
  ]) {
    globalThis.localStorage = { getItem: () => value };
    assert.deepEqual(model.restoreSelection(), []);
  }
  await assert.rejects(model.analyzeScenario([]), /ровно 5/);
  assert.equal((await model.analyzeScenario(example)).score, result.score);
  assert.equal(JSON.stringify(districts), baseline);

  const originalFetch = globalThis.fetch;
  let request;
  try {
    globalThis.fetch = async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          score: 99,
          summary: "Объяснение расчёта",
          strengths: ["Тест"],
          risks: [],
          recommendations: [],
        }),
      };
    };
    const ai = await model.analyzeScenario(
      example,
      "https://test.invalid/analyze",
    );
    assert.equal(ai.score, 56.54, "AI must not override the computed score");
    assert.equal(ai.source, "ai");
    assert.equal(request.calculation.score, 56.54);
    assert.equal(request.calculation.deltas.length, 5);
    assert.equal(request.calculation.contributions.length, 5);
    assert.equal(
      request.decisions.find((i) => i.id === "M12").district,
      undefined,
    );
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ score: 99, summary: 42 }),
    });
    await assert.rejects(
      model.analyzeScenario(example, "https://test.invalid/analyze"),
      /некорректное/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log(
    `Dataset verified: baseline 52.56; example ${result.score}, cost 95; ${valid} valid and ${invalid} invalid scenarios; 120 order permutations, scopes, lags, synergies, conflicts, critical threshold, storage and all 14 visualizations.`,
  );
} finally {
  await server.close();
}
