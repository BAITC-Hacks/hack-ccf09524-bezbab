import { Wallet, TriangleAlert } from 'lucide-react';
import type { CityBudget } from '../types/city';

function formatMoney(value: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ${currency}`;
}

export function BudgetMeter({ budget }: { budget: CityBudget }) {
  const remaining = budget.total - budget.spent;
  const usedPct = Math.min(100, (budget.spent / budget.total) * 100);
  const overBudget = remaining < 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10">
            <Wallet className="h-5 w-5 text-amber-400" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Virtual budget</p>
            <p className="font-mono text-2xl text-slate-100">{formatMoney(budget.total, budget.currency)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-slate-500">Remaining</p>
          <p className={`font-mono text-xl ${overBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatMoney(remaining, budget.currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : 'bg-amber-400'}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>Spent: {formatMoney(budget.spent, budget.currency)}</span>
        <span>{usedPct.toFixed(0)}%</span>
      </div>

      {overBudget && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Budget exceeded - adjust your choices.
        </div>
      )}
    </div>
  );
}
