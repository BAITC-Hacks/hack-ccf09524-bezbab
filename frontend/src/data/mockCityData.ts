import type { District, CityBudget } from '../types/city';

export const cityBudget: CityBudget = {
  total: 500000000,
  spent: 0,
  currency: 'tenge',
};

export const districts: District[] = [
  {
    id: 'yesil',
    name: 'Yesil district',
    population: 412000,
    metrics: { transport: 58, greenery: 41, social: 63, safety: 71, service: 66 },
  },
  {
    id: 'almaty',
    name: 'Almaty district',
    population: 365000,
    metrics: { transport: 47, greenery: 34, social: 55, safety: 60, service: 52 },
  },
  {
    id: 'saryarka',
    name: 'Saryarka district',
    population: 398000,
    metrics: { transport: 52, greenery: 39, social: 58, safety: 64, service: 57 },
  },
  {
    id: 'baikonyr',
    name: 'Baikonyr district',
    population: 210000,
    metrics: { transport: 61, greenery: 47, social: 49, safety: 68, service: 54 },
  },
];
