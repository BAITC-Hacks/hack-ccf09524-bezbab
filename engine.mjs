import { ACTIONS, BUDGET, CATEGORIES, DISTRICTS } from "./data.mjs";

const clamp = (value) => Math.max(0, Math.min(100, value));
const round = (value) => Math.round(value * 10) / 10;
const categoryIds = CATEGORIES.map((category) => category.id);

export function getAction(categoryId, actionId) {
  return ACTIONS[categoryId]?.find((action) => action.id === actionId);
}

export function getDistrict(districtId) {
  return DISTRICTS.find((district) => district.id === districtId);
}

export function costOf(selections) {
  return categoryIds.reduce((sum, id) => sum + (getAction(id, selections[id]?.actionId)?.cost ?? 0), 0);
}

export function validateSelections(selections) {
  const errors = [];
  for (const id of categoryIds) {
    const choice = selections[id];
    if (!choice || !getAction(id, choice.actionId) || !getDistrict(choice.districtId)) {
      errors.push(`Выберите мероприятие и район: ${CATEGORIES.find((item) => item.id === id).label}.`);
    }
  }
  if (costOf(selections) > BUDGET) errors.push(`Бюджет превышен на ${costOf(selections) - BUDGET} ед.`);
  return errors;
}

function weightedScore(districts) {
  const population = districts.reduce((sum, district) => sum + district.population, 0);
  return districts.reduce((sum, district) => {
    const mean = categoryIds.reduce((total, id) => total + district.metrics[id], 0) / categoryIds.length;
    return sum + mean * district.population / population;
  }, 0);
}

function equityGap(districts) {
  const means = districts.map((district) => categoryIds.reduce((sum, id) => sum + district.metrics[id], 0) / categoryIds.length);
  return Math.max(...means) - Math.min(...means);
}

export function evaluate(selections) {
  const errors = validateSelections(selections);
  if (errors.length) return { valid: false, errors, cost: costOf(selections) };

  const districts = structuredClone(DISTRICTS);
  const impacts = [];
  const spillovers = { transport: ["service", 0.12], green: ["safety", 0.08], social: ["safety", 0.1], safety: ["transport", 0.07], service: ["social", 0.08] };

  for (const id of categoryIds) {
    const choice = selections[id];
    const district = districts.find((item) => item.id === choice.districtId);
    const action = getAction(id, choice.actionId);
    const baseline = DISTRICTS.find((item) => item.id === district.id).metrics[id];
    // Более отстающий район получает больший эффект, но показатель ограничен 100.
    const needMultiplier = 0.75 + (100 - baseline) / 200;
    const direct = round(Math.min(100 - district.metrics[id], action.gain * needMultiplier));
    district.metrics[id] = round(clamp(district.metrics[id] + direct));
    const [otherId, ratio] = spillovers[id];
    const indirect = round(Math.min(100 - district.metrics[otherId], direct * ratio));
    district.metrics[otherId] = round(clamp(district.metrics[otherId] + indirect));
    impacts.push({ categoryId: id, districtId: district.id, actionId: action.id, direct, indirect, otherId, cost: action.cost });
  }

  const baseline = weightedScore(DISTRICTS);
  const rawScore = weightedScore(districts);
  const baselineGap = equityGap(DISTRICTS);
  const gap = equityGap(districts);
  // Небольшой штраф, если разрыв между районами вырос. Это делает компромисс видимым.
  const equityPenalty = round(Math.max(0, gap - baselineGap) * 0.18);
  const score = round(clamp(rawScore - equityPenalty));
  return {
    valid: true,
    budget: BUDGET,
    cost: costOf(selections),
    remaining: BUDGET - costOf(selections),
    baseline: round(baseline),
    score,
    delta: round(score - baseline),
    equityPenalty,
    baselineGap: round(baselineGap),
    gap: round(gap),
    districts,
    impacts,
  };
}

export function analyze(result) {
  if (!result.valid) return null;
  const strongest = [...result.impacts].sort((a, b) => b.direct - a.direct)[0];
  const strongestCategory = CATEGORIES.find((category) => category.id === strongest.categoryId);
  const strongestDistrict = getDistrict(strongest.districtId);
  const weakest = result.districts.flatMap((district) => categoryIds.map((id) => ({ district: district.name, category: CATEGORIES.find((item) => item.id === id).label, value: district.metrics[id] })))
    .sort((a, b) => a.value - b.value)[0];
  const strengths = [`Максимальный локальный эффект: ${strongestCategory.label.toLowerCase()} в районе ${strongestDistrict.name} (+${strongest.direct} п.).`, `Итоговый индекс вырос на ${result.delta} п. при расходе ${result.cost} из ${BUDGET} ед.`];
  const risks = [`Самое слабое место после изменений — ${weakest.category.toLowerCase()} в районе ${weakest.district} (${round(weakest.value)} из 100).`];
  if (result.equityPenalty > 0) risks.push(`Разрыв между районами вырос; штраф за неравномерность: ${result.equityPenalty} п.`);
  if (result.remaining < 10) risks.push("Осталось меньше 10 единиц резерва для непредвиденных расходов.");
  else risks.push(`Резерв бюджета — ${result.remaining} ед.; его можно сохранить на неожиданные события.`);
  return { strengths, risks, weakest };
}

export function findBestScenario() {
  const options = categoryIds.map((id) => ACTIONS[id].flatMap((action) => DISTRICTS.map((district) => ({ actionId: action.id, districtId: district.id, cost: action.cost }))));
  let best = null;
  let bestSelections = null;

  function search(index, cost, selections) {
    if (index === categoryIds.length) {
      const result = evaluate(selections);
      if (result.valid && (!best || result.score > best.score || (result.score === best.score && cost < best.cost))) {
        best = result;
        bestSelections = structuredClone(selections);
      }
      return;
    }
    const id = categoryIds[index];
    for (const option of options[index]) {
      if (cost + option.cost > BUDGET) continue;
      selections[id] = { actionId: option.actionId, districtId: option.districtId };
      search(index + 1, cost + option.cost, selections);
    }
  }
  search(0, 0, {});
  return { selections: bestSelections, result: best };
}
