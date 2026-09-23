import { BudgetMeter } from './BudgetMeter';
import { DistrictCard } from './DistrictCard';
import { cityBudget, districts } from '../data/mockCityData';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Mayor for 5 hours</p>
          <h1 className="text-xl font-medium text-slate-100">City control panel</h1>
        </header>

        <BudgetMeter budget={cityBudget} />

        <h2 className="mb-3 mt-8 text-[11px] uppercase tracking-wide text-slate-500">City districts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {districts.map((d) => (
            <DistrictCard key={d.id} district={d} />
          ))}
        </div>
      </div>
    </div>
  );
}
