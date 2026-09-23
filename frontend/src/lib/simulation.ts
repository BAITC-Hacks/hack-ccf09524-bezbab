import {
  cityBudget,
  districts,
  horizon,
  indicatorDefinitions,
  groupMetrics,
  round2,
  datasetVersion,
} from "../data/mockCityData";
import { initiatives, districtNames, synergies } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import type { District, IndicatorKey } from "../types/city";
export const storageKey = "akim-scenario-dataset-v2";
const catalog = (id: string) => initiatives.find((i) => i.id === id);
export const spentTotal = (selection: Initiative[]) =>
  selection.reduce((sum, item) => sum + (catalog(item.id)?.cost ?? 0), 0);
export function validateSelection(
  selection: Initiative[],
  complete = true,
): string[] {
  const errors: string[] = [];
  if (complete && selection.length !== 5)
    errors.push("Нужно выбрать ровно 5 мероприятий.");
  if (selection.length > 5) errors.push("Допускается не более 5 мероприятий.");
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const choice of selection) {
    if (!choice || typeof choice.id !== "string") {
      errors.push("Некорректное мероприятие.");
      continue;
    }
    const item = catalog(choice.id);
    if (!item) {
      errors.push(`Неизвестное мероприятие: ${choice.id}.`);
      continue;
    }
    if (seen.has(item.id))
      errors.push(`${item.id}: повтор мероприятия запрещён.`);
    seen.add(item.id);
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
    if (
      item.scope === "district" &&
      !districts.some((d) => d.id === choice.district)
    )
      errors.push(`${item.id}: выберите район.`);
    if (item.scope === "city" && choice.district !== undefined)
      errors.push(`${item.id}: для городской меры район не указывается.`);
  }
  if ([...counts.values()].some((n) => n > 2))
    errors.push("Не более 2 мероприятий одного направления.");
  if (
    selection.every((i) => i && typeof i.id === "string") &&
    spentTotal(selection) > cityBudget.total
  )
    errors.push("Не хватает бюджета: лимит 100 у. е.");
  if (seen.has("M1") && seen.has("M3"))
    errors.push(
      "M1 и M3 несовместимы в любом районе: выберите автобусные полосы или ЛРТ.",
    );
  for (const [a, b, reason] of [
    ["M4", "M7", "конфликт за участок"],
    ["M5", "M13", "дублирование программы"],
  ]) {
    const x = selection.find((i) => i?.id === a),
      y = selection.find((i) => i?.id === b);
    if (x && y && x.district === y.district)
      errors.push(`${a} и ${b} нельзя выбрать в одном районе: ${reason}.`);
  }
  return errors;
}
export function proposedSelection(
  selection: Initiative[],
  candidate: Initiative,
): Initiative[] {
  const prior = selection.find((i) => i.id === candidate.id);
  if (prior && prior.district === candidate.district)
    return selection.filter((i) => i.id !== candidate.id);
  const definition = catalog(candidate.id);
  if (!definition) return [...selection, candidate];
  const clean: Initiative = {
    ...definition,
    ...(candidate.district === undefined
      ? {}
      : { district: candidate.district }),
  };
  return [...selection.filter((i) => i.id !== candidate.id), clean];
}
export function selectionError(selection: Initiative[], candidate: Initiative) {
  return (
    validateSelection(proposedSelection(selection, candidate), false)[0] || ""
  );
}
export function selectInitiative(
  selection: Initiative[],
  candidate: Initiative,
) {
  const next = proposedSelection(selection, candidate);
  return validateSelection(next, false).length ? selection : next;
}
export function districtScore(district: District) {
  return indicatorDefinitions.reduce(
    (sum, i) => sum + district.indicators[i.key] * i.weight,
    0,
  );
}
export function scoreBreakdown(data: District[]) {
  const districtScores = data.map((d) => ({
    id: d.id,
    name: d.name,
    score: districtScore(d),
  }));
  const average = data.reduce(
    (sum, d) => sum + districtScore(d) * d.populationShare,
    0,
  );
  const weakest = districtScores.reduce((a, b) => (a.score <= b.score ? a : b));
  const critical = data.flatMap((d) =>
    indicatorDefinitions
      .filter((i) => d.indicators[i.key] < 40)
      .map((i) => ({
        district: d.id,
        indicator: i.key,
        value: d.indicators[i.key],
      })),
  );
  const score = 0.7 * average + 0.3 * weakest.score - critical.length;
  return { score, average, weakest, critical, districtScores };
}
export function qualityScore(data: District[]) {
  return round2(scoreBreakdown(data).score);
}
export function activeSynergies(selection: Initiative[]) {
  return synergies
    .filter((s) => s.ids.every((id) => selection.some((i) => i.id === id)))
    .map((s) => ({
      ...s,
      district: selection.find((i) => i.id === s.ids[0])!.district!,
    }));
}
export function projectDistricts(selection: Initiative[]): District[] {
  const errors = validateSelection(selection, false);
  if (errors.length) throw new Error(errors.join(" "));
  return districts.map((d) => {
    const indicators = { ...d.indicators };
    // Accumulate unrounded effects and synergies; clip only once at the end.
    for (const choice of [...selection].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      const item = catalog(choice.id)!;
      if (item.scope === "district" && choice.district !== d.id) continue;
      for (const [key, effect] of Object.entries(item.effects))
        indicators[key as IndicatorKey] +=
          (effect * (horizon - item.lag)) / horizon;
    }
    for (const synergy of activeSynergies(selection))
      if (synergy.district === d.id)
        indicators[synergy.indicator] += synergy.bonus;
    for (const key of Object.keys(indicators) as IndicatorKey[])
      indicators[key] = Math.min(100, Math.max(0, indicators[key]));
    return { ...d, indicators, metrics: groupMetrics(indicators) };
  });
}
export function calculateScenario(selection: Initiative[]) {
  const errors = validateSelection(selection);
  if (errors.length) return { valid: false as const, score: null, errors };
  const projected = projectDistricts(selection);
  const breakdown = scoreBreakdown(projected);
  const contributions = selection.map((choice) => {
    const item = catalog(choice.id)!;
    return {
      id: item.id,
      scope: item.scope,
      ...(choice.district ? { district: choice.district } : {}),
      realizedFraction: (horizon - item.lag) / horizon,
      effects: Object.fromEntries(
        Object.entries(item.effects).map(([k, v]) => [
          k,
          (v * (horizon - item.lag)) / horizon,
        ]),
      ),
    };
  });
  return {
    valid: true as const,
    score: round2(breakdown.score),
    errors,
    projected,
    breakdown,
    synergies: activeSynergies(selection),
    contributions,
    deltas: projected.map((d, n) => ({
      id: d.id,
      indicators: Object.fromEntries(
        indicatorDefinitions.map((i) => [
          i.key,
          d.indicators[i.key] - districts[n].indicators[i.key],
        ]),
      ),
      districtScore: districtScore(d) - districtScore(districts[n]),
    })),
  };
}
export function restoreSelection(): Initiative[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(value)) return [];
    const selected: Initiative[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string")
        return [];
      const item = catalog(entry.id);
      if (!item) return [];
      selected.push({
        ...item,
        ...(entry.district === undefined ? {} : { district: entry.district }),
      });
    }
    return validateSelection(selected, false).length ? [] : selected;
  } catch {
    return [];
  }
}
export interface Analysis {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  source: "local" | "ai";
}
export function localAnalysis(selection: Initiative[]): Analysis {
  const result = calculateScenario(selection);
  if (!result.valid) throw new Error(result.errors.join(" "));
  const { breakdown } = result;
  const improvements = [...result.deltas].sort(
    (a, b) => b.districtScore - a.districtScore,
  );
  return {
    score: result.score,
    source: "local",
    summary: `За ${horizon} кварталов индекс меняется с ${qualityScore(districts)} до ${result.score}. Средневзвешенная оценка районов — ${round2(breakdown.average)}, слабейший район — ${breakdown.weakest.name} (${round2(breakdown.weakest.score)}). Штраф за показатели ниже 40: ${breakdown.critical.length}.`,
    strengths: improvements
      .filter((d) => d.districtScore > 0)
      .slice(0, 3)
      .map(
        (d) =>
          `${districtNames[d.id]}: +${round2(d.districtScore)} к оценке района.`,
      )
      .concat(
        result.synergies.map(
          (s) =>
            `Синергия ${s.ids.join(" + ")}: ${s.indicator} +${s.bonus} в районе ${districtNames[s.district]}.`,
        ),
      ),
    risks: [
      ...(breakdown.critical.length
        ? breakdown.critical.map(
            (c) =>
              `${districtNames[c.district]}: ${c.indicator} = ${round2(c.value)}, ниже критического порога 40.`,
          )
        : ["Показателей ниже 40 после решений нет."]),
      ...(selection.some((i) => i.id === "M11")
        ? ["Безопасные переходы уменьшают T1 на 1,75 в выбранном районе."]
        : []),
      `Остаток бюджета — ${100 - spentTotal(selection)} у. е.; бонуса за остаток нет.`,
    ],
    recommendations: [
      `Уделите внимание району ${breakdown.weakest.name}: его оценка входит в Score с весом 30%.`,
      "Сравнивайте эффекты с учётом лага: к концу восьмого квартала реализуется только часть полного эффекта.",
    ],
  };
}
export async function analyzeScenario(
  selection: Initiative[],
  endpoint: string = import.meta.env.VITE_ANALYSIS_URL || "",
): Promise<Analysis> {
  const calculation = calculateScenario(selection);
  if (!calculation.valid) throw new Error(calculation.errors.join(" "));
  if (!endpoint) return localAnalysis(selection);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetVersion,
      horizon,
      budget: { ...cityBudget, spent: spentTotal(selection) },
      districts,
      decisions: selection.map((i) => ({
        id: i.id,
        ...(i.district ? { district: i.district } : {}),
      })),
      calculation,
      instructions:
        "Объясни готовый расчёт, дельты, вклад мер и синергии. Не пересчитывай и не придумывай числовые значения. Верни summary, strengths, risks, recommendations.",
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      "Не удалось получить объяснение AI. Используйте локальный расчёт или повторите запрос.",
    );
  const data = await response.json();
  if (
    !data ||
    typeof data.summary !== "string" ||
    !["strengths", "risks", "recommendations"].every(
      (key) =>
        Array.isArray(data[key]) &&
        data[key].every((item: unknown) => typeof item === "string"),
    )
  )
    throw new Error("Сервис вернул некорректное объяснение.");
  return {
    score: calculation.score,
    summary: data.summary,
    strengths: data.strengths,
    risks: data.risks,
    recommendations: data.recommendations,
    source: "ai",
  };
}
