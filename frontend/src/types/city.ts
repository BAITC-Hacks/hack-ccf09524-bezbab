export type MetricKey =
  "transport" | "greenery" | "social" | "safety" | "service";
export type IndicatorKey =
  "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";
export type DistrictMetrics = Record<MetricKey, number>;
export type Indicators = Record<IndicatorKey, number>;
export interface District {
  id: string;
  name: string;
  populationShare: number;
  profile: string;
  indicators: Indicators;
  metrics: DistrictMetrics;
}
export interface CityBudget {
  total: number;
  spent: number;
  currency: string;
}
