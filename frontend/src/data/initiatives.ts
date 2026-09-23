import type { IndicatorKey, MetricKey } from "../types/city";
import { districts } from "./mockCityData";
export interface Initiative {
  id: string;
  category: MetricKey;
  title: string;
  description: string;
  cost: number;
  lag: number;
  scope: "district" | "city";
  effects: Partial<Record<IndicatorKey, number>>;
  district?: string;
}
export const districtNames: Record<string, string> = Object.fromEntries(
  districts.map((d) => [d.id, d.name]),
);
export const categories: {
  key: MetricKey;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    key: "transport",
    label: "Транспорт",
    short: "Транспорт",
    color: "#5e88c7",
  },
  { key: "greenery", label: "Экология", short: "Экология", color: "#398769" },
  { key: "social", label: "Соцсфера", short: "Соцсфера", color: "#b08ace" },
  {
    key: "safety",
    label: "Безопасность",
    short: "Безопасность",
    color: "#ba965a",
  },
  { key: "service", label: "Сервисы", short: "Сервисы", color: "#7b92b5" },
];
export const initiatives: Initiative[] = [
  {
    id: "M1",
    category: "transport",
    title: "Выделенные полосы для автобусов",
    description: "Приоритет общественного транспорта на загруженных улицах.",
    scope: "district",
    cost: 18,
    lag: 2,
    effects: { T1: 6, T2: 9 },
  },
  {
    id: "M2",
    category: "transport",
    title: "Умные светофоры",
    description: "Адаптивное управление перекрёстками по всему городу.",
    scope: "city",
    cost: 22,
    lag: 2,
    effects: { T1: 4, B2: 3 },
  },
  {
    id: "M3",
    category: "transport",
    title: "Линия ЛРТ / расширение",
    description: "Новая транспортная связь для выбранного района.",
    scope: "district",
    cost: 30,
    lag: 4,
    effects: { T1: 16, T2: 20, E2: 4 },
  },
  {
    id: "M4",
    category: "greenery",
    title: "Парк / сквер",
    description: "Зелёное пространство рядом с домом.",
    scope: "district",
    cost: 15,
    lag: 2,
    effects: { E1: 12, E2: 3, B1: 2 },
  },
  {
    id: "M5",
    category: "greenery",
    title: "Чистое топливо для частного сектора",
    description: "Перевод домов на более чистое топливо.",
    scope: "district",
    cost: 25,
    lag: 3,
    effects: { E2: 14, C1: 4 },
  },
  {
    id: "M6",
    category: "greenery",
    title: "Озеленение и ветрозащитные полосы",
    description: "Городская программа зелёных насаждений.",
    scope: "city",
    cost: 20,
    lag: 4,
    effects: { E1: 5, E2: 3 },
  },
  {
    id: "M7",
    category: "social",
    title: "Школа + детсад",
    description: "Модульное строительство для растущих кварталов.",
    scope: "district",
    cost: 24,
    lag: 3,
    effects: { S1: 16 },
  },
  {
    id: "M8",
    category: "social",
    title: "Центр семейного здоровья / поликлиника",
    description: "Доступная первичная медицинская помощь.",
    scope: "district",
    cost: 20,
    lag: 3,
    effects: { S2: 14 },
  },
  {
    id: "M9",
    category: "social",
    title: "Дворовые спорт-хабы",
    description: "Места для спорта и активного отдыха жителей.",
    scope: "district",
    cost: 10,
    lag: 1,
    effects: { S1: 3, S2: 3, B1: 3 },
  },
  {
    id: "M10",
    category: "safety",
    title: "Освещение и камеры",
    description: "Расширение Safe City в выбранном районе.",
    scope: "district",
    cost: 12,
    lag: 1,
    effects: { B1: 12, B2: 2 },
  },
  {
    id: "M11",
    category: "safety",
    title: "Безопасные переходы и школьные зоны",
    description:
      "Безопаснее для пешеходов; пропускная способность дорог немного снижается.",
    scope: "district",
    cost: 10,
    lag: 1,
    effects: { B2: 12, T1: -2 },
  },
  {
    id: "M12",
    category: "service",
    title: "Единая цифровая платформа обращений",
    description: "Быстрее решать обращения жителей всех районов.",
    scope: "city",
    cost: 14,
    lag: 1,
    effects: { C2: 5 },
  },
  {
    id: "M13",
    category: "service",
    title: "Модернизация тепло- и водосетей",
    description: "Обновление коммунальной инфраструктуры района.",
    scope: "district",
    cost: 28,
    lag: 4,
    effects: { C1: 18, E2: 2 },
  },
  {
    id: "M14",
    category: "service",
    title: "Аварийные бригады ЖКХ",
    description: "Раннее оповещение и оперативная помощь всему городу.",
    scope: "city",
    cost: 16,
    lag: 1,
    effects: { C1: 5, C2: 2 },
  },
];
export const synergies = [
  { ids: ["M1", "M2"], indicator: "T1", bonus: 2 },
  { ids: ["M10", "M12"], indicator: "B1", bonus: 2 },
  { ids: ["M5", "M6"], indicator: "E2", bonus: 2 },
] as const;
