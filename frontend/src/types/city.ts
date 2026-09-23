export type MetricKey = 'transport' | 'greenery' | 'social' | 'safety' | 'service';

export interface DistrictMetrics {
  transport: number;
  greenery: number;
  social: number;
  safety: number;
  service: number;
}

export interface District {
  id: string;
  name: string;
  population: number;
  metrics: DistrictMetrics;
}

export interface CityBudget {
  total: number;
  spent: number;
  currency: string;
}
