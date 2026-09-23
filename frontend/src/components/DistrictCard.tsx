import { Bus, Trees, Building2, ShieldCheck, Wrench } from 'lucide-react';
import type { District, MetricKey } from '../types/city';
import { MetricBar } from './MetricBar';

const METRICS: { key: MetricKey; label: string; icon: typeof Bus; accent: string }[] = [
  { key: 'transport', label: 'Transport', icon: Bus, accent: 'bg-sky-400' },
  { key: 'greenery', label: 'Greenery', icon: Trees, accent: 'bg-emerald-400' },
  { key: 'social', label: 'Social infra', icon: Building2, accent: 'bg-violet-400' },
  { key: 'safety', label: 'Safety', icon: ShieldCheck, accent: 'bg-amber-400' },
  { key: 'service', label: 'Services', icon: Wrench, accent: 'bg-rose-400' },
];

function averageScore(metrics: District['metrics']) {
  const values = Object.values(metrics);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function DistrictCard({ district }: { district: District }) {
  const avg = averageScore(district.metrics);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-100">{district.name}</h3>
          <p className="text-[11px] text-slate-500">{district.population.toLocaleString()} people</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg leading-none text-slate-100">{avg}</div>
          <div className="text-[10px] text-slate-500">index</div>
        </div>
      </div>

      <div className="space-y-2">
        {METRICS.map((m) => (
          <MetricBar key={m.key} icon={m.icon} label={m.label} value={district.metrics[m.key]} accent={m.accent} />
        ))}
      </div>
    </div>
  );
}
