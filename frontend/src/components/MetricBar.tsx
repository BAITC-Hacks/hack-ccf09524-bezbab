import type { LucideIcon } from 'lucide-react';

interface MetricBarProps {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
}

export function MetricBar({ icon: Icon, label, value, accent }: MetricBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
      <span className="w-20 shrink-0 text-[11px] text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-[11px] text-slate-300">{value}</span>
    </div>
  );
}
