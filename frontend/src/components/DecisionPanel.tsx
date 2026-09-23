import { useState } from "react";
import {
  ArrowRight,
  Bus,
  Leaf,
  Users,
  ShieldCheck,
  Building2,
  X,
  Check,
} from "lucide-react";
import { categories, districtNames, initiatives } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import type { MetricKey } from "../types/city";
import { horizon, round2 } from "../data/mockCityData";
import {
  selectionError,
  spentTotal,
  validateSelection,
} from "../lib/simulation";
import "./City3D.css";
import "./Dataset.css";
const icons = {
  transport: Bus,
  greenery: Leaf,
  social: Users,
  safety: ShieldCheck,
  service: Building2,
};
export type DecisionProps = {
  selection: Initiative[];
  onChoose: (item: Initiative) => void;
  activeDistrict: string;
  onSelect: (id: string) => void;
  busy: boolean;
  onAnalyze: () => void;
};
export default function DecisionPanel({
  selection,
  onChoose,
  activeDistrict,
  onSelect,
  busy,
  onAnalyze,
}: DecisionProps) {
  const [category, setCategory] = useState<MetricKey>("transport");
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const remaining = 100 - spentTotal(selection);
  function choose(candidate: Initiative) {
    const error = selectionError(selection, candidate);
    if (error) {
      setNotice(error);
      return;
    }
    setNotice("");
    onChoose(candidate);
    if (candidate.district) onSelect(candidate.district);
  }
  return (
    <aside className="city-project-panel">
      <div className="city-project-intro">
        <span className="eyebrow">ДАТАСЕТ / 8 КВАРТАЛОВ</span>
        <h2>Меняйте город.</h2>
        <p>
          Ровно 5 мер. Не более двух из одного направления. Районные проекты
          действуют только в выбранном районе.
        </p>
      </div>
      <div className="city-wallet">
        <div>
          <span>Доступный бюджет</span>
          <strong>
            {remaining} <small>у. е.</small>
          </strong>
        </div>
        <span>{selection.length}/5</span>
        <progress
          max={100}
          value={spentTotal(selection)}
          aria-label="Распределённый бюджет"
        />
      </div>
      <div
        className="city-category-tabs"
        role="group"
        aria-label="Направления развития"
      >
        {categories.map((cat) => {
          const Icon = icons[cat.key];
          const count = selection.filter((i) => i.category === cat.key).length;
          return (
            <button
              key={cat.key}
              aria-pressed={category === cat.key}
              aria-label={cat.label}
              title={`${cat.label}: ${count}/2`}
              onClick={() => setCategory(cat.key)}
            >
              <Icon size={20} />
              {count > 0 && <span className="category-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="city-project-label">
        <h3>{categories.find((c) => c.key === category)!.label}</h3>
        <span>
          {selection.filter((i) => i.category === category).length}/2 выбрано
        </span>
      </div>
      <div className="city-options">
        {initiatives
          .filter((i) => i.category === category)
          .map((item) => {
            const selected = selection.find((i) => i.id === item.id);
            const district =
              selected?.district || targets[item.id] || activeDistrict;
            const candidate = {
              ...item,
              ...(item.scope === "district" ? { district } : {}),
            };
            const blocked = selected
              ? ""
              : selectionError(selection, candidate);
            return (
              <article
                className={`city-option ${selected ? "selected" : ""}`}
                key={item.id}
              >
                <div className="city-option-top">
                  <span>
                    {item.id} ·{" "}
                    {item.scope === "city" ? "Весь город" : "Один район"}
                  </span>
                  <i>{selected && <Check size={13} />}</i>
                </div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                {item.scope === "district" && (
                  <label className="target-district">
                    Район
                    <select
                      aria-label={`Район для ${item.id}`}
                      disabled={busy}
                      value={district}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (selected) {
                          choose({ ...item, district: id });
                        } else {
                          setTargets({ ...targets, [item.id]: id });
                          setNotice("");
                        }
                      }}
                    >
                      {Object.entries(districtNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="effect-tags">
                  {Object.entries(item.effects).map(([key, effect]) => (
                    <span key={key} className={effect < 0 ? "negative" : ""}>
                      {key} {effect > 0 ? "+" : ""}
                      {round2((effect * (horizon - item.lag)) / horizon)}
                    </span>
                  ))}
                </div>
                <p className="lag-note">
                  Лаг: {item.lag} кв. · Реализуется{" "}
                  {((horizon - item.lag) / horizon) * 100}% эффекта
                </p>
                <div className="city-option-bottom">
                  <b>{item.cost} у. е.</b>
                  <button
                    className="project-action"
                    disabled={busy || !!blocked}
                    aria-pressed={!!selected}
                    aria-label={`${selected ? "Убрать" : "Добавить"} ${item.id}`}
                    onClick={() => choose(selected || candidate)}
                  >
                    {selected ? "Убрать" : "Добавить"}
                  </button>
                </div>
                {blocked && <p className="blocked-reason">{blocked}</p>}
              </article>
            );
          })}
      </div>
      <p className="city-selection-hint">
        Показаны эффекты к концу восьмого квартала, до ограничения 0–100.
        Синергии прибавляются отдельно.
      </p>
      {notice && (
        <p className="error" role="alert">
          {notice}
        </p>
      )}
      <div className="chosen-projects">
        <h3>Ваши решения · {selection.length}/5</h3>
        {selection.length ? (
          selection.map((item) => (
            <div key={item.id}>
              <span>
                <b>
                  {item.id} · {item.title}
                </b>
                <small>
                  {item.scope === "city"
                    ? "Весь город"
                    : districtNames[item.district!]}{" "}
                  · {item.cost} у. е.
                </small>
              </span>
              <button
                aria-label={`Удалить ${item.id} из сценария`}
                disabled={busy}
                onClick={() => choose(item)}
              >
                <X size={15} />
              </button>
            </div>
          ))
        ) : (
          <p>Добавьте первый проект.</p>
        )}
      </div>
      <button
        className="button city-analyze"
        disabled={busy || validateSelection(selection).length > 0}
        onClick={onAnalyze}
      >
        {busy ? "Анализируем…" : "Оценить мой город"}
        <ArrowRight size={18} />
      </button>
      {selection.length !== 5 && (
        <p className="city-analyze-hint">
          Осталось решений: {5 - selection.length}. Итоговый Score пока не
          считается.
        </p>
      )}
    </aside>
  );
}
