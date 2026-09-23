import type {
  District,
  CityBudget,
  IndicatorKey,
  Indicators,
  MetricKey,
  DistrictMetrics,
} from "../types/city";
export const datasetVersion = "districts-2026-v2";
export const horizon = 8;
export const cityBudget: CityBudget = {
  total: 100,
  spent: 0,
  currency: "условные единицы",
};
export const indicatorDefinitions: {
  key: IndicatorKey;
  category: MetricKey;
  label: string;
  weight: number;
  meaning: string;
}[] = [
  {
    key: "T1",
    category: "transport",
    label: "Разгрузка дорог",
    weight: 0.1,
    meaning: "100 — нет пробок в час пик; 0 — стоит всё.",
  },
  {
    key: "T2",
    category: "transport",
    label: "Доступность общественного транспорта",
    weight: 0.1,
    meaning:
      "100 — остановка в 500 м от каждого жителя, интервал не более 10 минут.",
  },
  {
    key: "E1",
    category: "greenery",
    label: "Озеленение",
    weight: 0.09,
    meaning: "100 — не менее 20 м² зелени на жителя.",
  },
  {
    key: "E2",
    category: "greenery",
    label: "Качество воздуха",
    weight: 0.11,
    meaning: "100 — зимой AQI не выше 50; 0 — хронический смог.",
  },
  {
    key: "S1",
    category: "social",
    label: "Школы и детсады",
    weight: 0.11,
    meaning: "100 — потребность обеспечена без второй смены.",
  },
  {
    key: "S2",
    category: "social",
    label: "Поликлиники и первичная медпомощь",
    weight: 0.11,
    meaning: "100 — норматив на жителя выполнен полностью.",
  },
  {
    key: "B1",
    category: "safety",
    label: "Безопасность улиц",
    weight: 0.09,
    meaning: "100 — освещение и камеры везде, минимум происшествий.",
  },
  {
    key: "B2",
    category: "safety",
    label: "Безопасность дорожного движения",
    weight: 0.09,
    meaning: "100 — минимум ДТП с пострадавшими.",
  },
  {
    key: "C1",
    category: "service",
    label: "Надёжность ЖКХ",
    weight: 0.1,
    meaning: "100 — нет аварий отопления и воды за год.",
  },
  {
    key: "C2",
    category: "service",
    label: "Скорость решения обращений",
    weight: 0.1,
    meaning: "100 — все обращения закрыты в срок.",
  },
];
export const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function groupMetrics(indicators: Indicators): DistrictMetrics {
  const result = {} as DistrictMetrics;
  for (const key of [
    "transport",
    "greenery",
    "social",
    "safety",
    "service",
  ] as MetricKey[]) {
    const group = indicatorDefinitions.filter((i) => i.category === key);
    result[key] = round2(
      group.reduce((sum, i) => sum + indicators[i.key] * i.weight, 0) /
        group.reduce((sum, i) => sum + i.weight, 0),
    );
  }
  return result;
}
const source: {
  id: string;
  name: string;
  populationShare: number;
  profile: string;
  values: number[];
}[] = [
  {
    id: "yesil",
    name: "Есиль",
    populationShare: 0.27,
    profile: "Богатый район, но с пробками на мостах и переполненными школами.",
    values: [45, 62, 68, 72, 48, 55, 78, 60, 75, 70],
  },
  {
    id: "almaty",
    name: "Алматы",
    populationShare: 0.24,
    profile: "Старый ЖКХ и пробки.",
    values: [40, 75, 50, 55, 60, 65, 62, 52, 50, 60],
  },
  {
    id: "saryarka",
    name: "Сарыарка",
    populationShare: 0.2,
    profile: "Смог от частного сектора, слабое озеленение.",
    values: [50, 70, 42, 40, 62, 68, 58, 55, 45, 55],
  },
  {
    id: "baikonyr",
    name: "Байконур",
    populationShare: 0.13,
    profile: "Средние показатели без ярких перекосов.",
    values: [52, 68, 55, 50, 58, 60, 52, 58, 55, 58],
  },
  {
    id: "nura",
    name: "Нура",
    populationShare: 0.16,
    profile:
      "Главный дефицит — социальная инфраструктура и общественный транспорт.",
    values: [55, 40, 45, 65, 38, 35, 55, 50, 60, 50],
  },
];
export const districts: District[] = source.map(({ values, ...d }) => {
  const indicators = Object.fromEntries(
    indicatorDefinitions.map((i, n) => [i.key, values[n]]),
  ) as Indicators;
  return { ...d, indicators, metrics: groupMetrics(indicators) };
});
