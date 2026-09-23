import type { District } from "../types/city";
import type { Initiative } from "../data/initiatives";
import { indicatorDefinitions, round2 } from "../data/mockCityData";
import { calculateScenario } from "../lib/simulation";
export function IndicatorDetails({ district }: { district: District }) {
  return (
    <details className="indicator-details">
      <summary>Все 10 показателей · шкала 0–100</summary>
      <p>{district.profile}</p>
      <div>
        {indicatorDefinitions.map((i) => (
          <div
            className={
              district.indicators[i.key] < 40 ? "critical-indicator" : ""
            }
            key={i.key}
            title={i.meaning}
          >
            <span>
              <b>{i.key}</b> {i.label}
            </span>
            <strong>
              {round2(district.indicators[i.key])}
              {district.indicators[i.key] < 40 && <small> · ниже 40</small>}
            </strong>
          </div>
        ))}
      </div>
      <small>
        Чем выше, тем лучше. Веса показателей учитываются при расчёте оценки
        района.
      </small>
    </details>
  );
}
export function ScoreDetails({ selection }: { selection: Initiative[] }) {
  const result = calculateScenario(selection);
  if (!result.valid) return <p role="alert">{result.errors.join(" ")}</p>;
  return (
    <section className="panel score-details">
      <h2>Как получен Score</h2>
      <p className="score-equation">
        0,7 × {round2(result.breakdown.average)} + 0,3 ×{" "}
        {round2(result.breakdown.weakest.score)} −{" "}
        {result.breakdown.critical.length} = <strong>{result.score}</strong>
      </p>
      <p>
        Средняя оценка по долям населения + вклад слабейшего района (
        {result.breakdown.weakest.name}) − число показателей строго ниже 40.
        Расчёт без промежуточного округления; на экране — два знака.
      </p>
      <div className="district-score-list">
        {result.breakdown.districtScores.map((d) => (
          <span key={d.id}>
            {d.name}
            <b>{round2(d.score)}</b>
          </span>
        ))}
      </div>
      <details>
        <summary>Вклад мероприятий и синергии</summary>
        {result.contributions.map((item) => (
          <p key={item.id}>
            <strong>{item.id}</strong> · {item.realizedFraction * 100}% полного
            эффекта ·{" "}
            {Object.entries(item.effects)
              .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
              .join(", ")}
          </p>
        ))}
        {result.synergies.map((s) => (
          <p key={s.ids.join("+")}>
            {s.ids.join(" + ")}: {s.indicator} +{s.bonus}
          </p>
        ))}
      </details>
    </section>
  );
}
