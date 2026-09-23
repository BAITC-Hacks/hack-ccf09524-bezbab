import { cityBudget, districts } from "../data/mockCityData";
import { initiatives, categories, districtNames } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import type { District } from "../types/city";

export const spentTotal = (selection: Initiative[]) =>
  selection.reduce((sum, item) => sum + item.cost, 0);
export function selectInitiative(
  selection: Initiative[],
  candidate: Initiative,
): Initiative[] {
  if (selection.some((item) => item.id === candidate.id))
    return selection.filter((item) => item.id !== candidate.id);
  const next = [
    ...selection.filter((item) => item.category !== candidate.category),
    candidate,
  ];
  return spentTotal(next) <= cityBudget.total ? next : selection;
}
export function projectDistricts(selection: Initiative[]): District[] {
  return districts.map((district) => {
    const metrics = { ...district.metrics };
    categories.forEach(({ key }) => {
      const item = selection.find((i) => i.category === key);
      metrics[key] = Math.min(
        100,
        district.metrics[key] +
          (item
            ? Math.round(item.gain * (item.district === district.id ? 1 : 0.35))
            : 0),
      );
    });
    return { ...district, metrics };
  });
}
export function qualityScore(data: District[]) {
  const population = data.reduce(
    (sum, district) => sum + district.population,
    0,
  );
  return (
    Math.round(
      (data.reduce(
        (sum, district) =>
          sum +
          (Object.values(district.metrics).reduce((a, b) => a + b, 0) / 5) *
            district.population,
        0,
      ) /
        population) *
        10,
    ) / 10
  );
}
export function restoreSelection(): Initiative[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem("akim-scenario-v1") || "[]",
    );
    if (!Array.isArray(ids)) return [];
    return initiatives
      .filter((item) => ids.includes(item.id))
      .reduce<Initiative[]>(
        (list, item) =>
          list.some((i) => i.category === item.category)
            ? list
            : selectInitiative(list, item),
        [],
      );
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
  const projected = projectDistricts(selection);
  const score = qualityScore(projected);
  const weakest = categories
    .map((c) => ({
      ...c,
      value:
        projected.reduce((sum, d) => sum + d.metrics[c.key], 0) /
        projected.length,
    }))
    .sort((a, b) => a.value - b.value)[0];
  const strongest = [...selection].sort((a, b) => b.gain - a.gain).slice(0, 2);
  const remaining = cityBudget.total - spentTotal(selection);
  return {
    score,
    source: "local",
    summary: `Ваш сценарий повышает индекс с ${qualityScore(districts)} до ${score}. Все пять направлений получили поддержку. Изменения рассчитаны по условной модели, а не являются прогнозом для реального города.`,
    strengths: strongest.map(
      (i) =>
        `${i.title}: +${i.gain} к показателю «${categories.find((c) => c.key === i.category)!.short}» в районе ${districtNames[i.district]}.`,
    ),
    risks: [
      selection.slice().sort((a, b) => b.cost - a.cost)[0]?.risk ||
        "Решения пока не выбраны.",
      ...(remaining < 50000000
        ? ["На непредвиденные расходы осталось менее 10% бюджета."]
        : [
            `Резерв ${remaining / 1000000} млн ₸ позволяет реагировать на непредвиденные расходы.`,
          ]),
    ],
    recommendations: [
      `При следующем пересмотре уделите внимание направлению «${weakest.label}»: его средняя оценка — ${Math.round(weakest.value)} из 100.`,
      "Сравните несколько наборов решений и оцените, какие районы получают наибольшую пользу.",
    ],
  };
}
export async function analyzeScenario(
  selection: Initiative[],
): Promise<Analysis> {
  if (selection.length !== 5 || spentTotal(selection) > cityBudget.total)
    throw new Error("Выберите пять решений в пределах бюджета.");
  const endpoint = import.meta.env.VITE_ANALYSIS_URL;
  if (!endpoint) return localAnalysis(selection);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budget: { ...cityBudget, spent: spentTotal(selection) },
      districts,
      decisions: selection,
      projectedDistricts: projectDistricts(selection),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      "Не удалось получить AI-анализ. Попробуйте ещё раз или используйте локальный расчёт.",
    );
  const data = await response.json();
  if (
    typeof data.score !== "number" ||
    !Number.isFinite(data.score) ||
    data.score < 0 ||
    data.score > 100 ||
    typeof data.summary !== "string" ||
    !["strengths", "risks", "recommendations"].every(
      (key) =>
        Array.isArray(data[key]) &&
        data[key].every((item: unknown) => typeof item === "string"),
    )
  )
    throw new Error(
      "Сервис вернул некорректный результат. Попробуйте локальный расчёт.",
    );
  return { ...data, source: "ai" };
}
