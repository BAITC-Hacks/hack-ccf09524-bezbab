import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sun,
  Bus,
  Leaf,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { CityWorld } from "../scene/CityWorld";
import { visualDescriptions } from "../scene/cityPlan";
import { categories, districtNames, initiatives } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import type { MetricKey } from "../types/city";
import { cityBudget, districts } from "../data/mockCityData";
import { projectDistricts, spentTotal } from "../lib/simulation";
import { CityMap } from "./CityMap";
import "./City3D.css";
const icons = {
  transport: Bus,
  greenery: Leaf,
  social: Users,
  safety: ShieldCheck,
  service: Building2,
};
const million = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value / 1000000);
type Props = {
  selection: Initiative[];
  onChoose: (item: Initiative) => void;
  activeDistrict: string;
  onSelect: (id: string) => void;
  busy: boolean;
  onAnalyze: () => void;
};
export default function City3D({
  selection,
  onChoose,
  activeDistrict,
  onSelect,
  busy,
  onAnalyze,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<CityWorld | null>(null);
  const onSelectRef = useRef(onSelect);
  const [fallback, setFallback] = useState(false);
  const [before, setBefore] = useState(false);
  const [night, setNight] = useState(false);
  const [motion, setMotion] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [category, setCategory] = useState<MetricKey>("transport");
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!host.current) return;
    try {
      world.current = new CityWorld(
        host.current,
        (id) => onSelectRef.current(id),
        () => {
          world.current?.dispose();
          world.current = null;
          setFallback(true);
        },
      );
    } catch {
      // WebGL initialization is an external system; report failure to render the fallback.
      // oxlint-disable-next-line react/set-state-in-effect
      setFallback(true);
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, []);
  useEffect(() => {
    world.current?.setMotion(motion);
  }, [motion]);
  useEffect(() => {
    world.current?.setSelection(selection);
  }, [selection]);
  useEffect(() => {
    world.current?.setBefore(before);
  }, [before]);
  useEffect(() => {
    world.current?.setNight(night);
  }, [night]);
  useEffect(() => {
    world.current?.focus(activeDistrict, false);
  }, [activeDistrict]);
  const spent = spentTotal(selection);
  const remaining = cityBudget.total - spent;
  const projected = projectDistricts(selection);
  const shownDistrict = (before ? districts : projected).find(
    (d) => d.id === activeDistrict,
  )!;
  const localProjects = selection.filter((i) => i.district === activeDistrict);
  function selectDistrict(id: string) {
    onSelect(id);
    world.current?.focus(id);
  }
  function choose(item: Initiative) {
    onChoose(item);
    setBefore(false);
    selectDistrict(item.district);
  }
  return (
    <section className="city-experience" aria-label="Интерактивный город">
      <div className="city-main">
        <div className="city-stage">
          <div className="city-stage-heading">
            <span>
              <i />
              АСТАНА В МИНИАТЮРЕ
            </span>
            <span>BEZ BAB / CITY LAB</span>
          </div>
          <div
            className="city-view-switch"
            role="group"
            aria-label="Сравнение города"
          >
            <button aria-pressed={before} onClick={() => setBefore(true)}>
              До решений
            </button>
            <button aria-pressed={!before} onClick={() => setBefore(false)}>
              После решений <span>{selection.length}</span>
            </button>
          </div>
          <div
            className={`city-viewport ${night ? "evening" : ""}`}
            ref={host}
            hidden={fallback}
          />
          {fallback && (
            <div className="city-fallback">
              <p role="status">
                3D недоступно в этом браузере. Вы можете продолжить на карте.
              </p>
              <CityMap
                active={activeDistrict}
                onSelect={onSelect}
                projected={before ? districts : projected}
              />
            </div>
          )}
          <div
            className="city-camera"
            role="group"
            aria-label="Управление камерой"
          >
            <button
              title="Приблизить"
              aria-label="Приблизить город"
              disabled={fallback}
              onClick={() => world.current?.zoom(true)}
            >
              <Plus size={19} />
            </button>
            <button
              title="Отдалить"
              aria-label="Отдалить город"
              disabled={fallback}
              onClick={() => world.current?.zoom(false)}
            >
              <Minus size={19} />
            </button>
            <span />
            <button
              title="Повернуть влево"
              aria-label="Повернуть город влево"
              disabled={fallback}
              onClick={() => world.current?.rotate(1)}
            >
              <RotateCcw size={18} />
            </button>
            <button
              title="Повернуть вправо"
              aria-label="Повернуть город вправо"
              disabled={fallback}
              onClick={() => world.current?.rotate(-1)}
            >
              <RotateCw size={18} />
            </button>
            <button
              title="Весь город"
              aria-label="Показать весь город"
              disabled={fallback}
              onClick={() => world.current?.reset()}
            >
              <Compass size={19} />
            </button>
          </div>
          <div className="city-environment">
            <button
              disabled={fallback}
              aria-pressed={night}
              onClick={() => setNight(!night)}
            >
              {night ? <Moon size={15} /> : <Sun size={15} />}{" "}
              {night ? "Вечер" : "День"}
            </button>
            <button
              disabled={fallback}
              aria-pressed={!motion}
              aria-label={motion ? "Остановить движение" : "Включить движение"}
              onClick={() => setMotion(!motion)}
            >
              {motion ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </div>
          <div className="city-stage-foot">
            <span>
              {before
                ? "Исходный город"
                : selection.length
                  ? `${selection.length} из 5 решений в городе`
                  : "Выберите первый проект"}
            </span>
            <span>Вращайте · приближайте · исследуйте</span>
          </div>
        </div>
        <div
          className="city-district-tabs"
          role="group"
          aria-label="Районы 3D-города"
        >
          {Object.entries(districtNames).map(([id, name]) => (
            <button
              key={id}
              aria-pressed={id === activeDistrict}
              onClick={() => selectDistrict(id)}
            >
              <span className="district-tab-dot" />
              {name}
              <span>
                {selection.filter((i) => i.district === id).length || "—"}
              </span>
            </button>
          ))}
        </div>
        <div className="city-district-detail">
          <div className="city-detail-heading">
            <div>
              <span className="eyebrow">В ФОКУСЕ</span>
              <h2>Район {districtNames[activeDistrict]}</h2>
            </div>
            <span className="city-detail-badge">
              {before ? "До изменений" : "Ваш сценарий"}
            </span>
          </div>
          <div className="city-metrics">
            {categories.map((cat) => (
              <div key={cat.key}>
                <span>{cat.short}</span>
                <strong>
                  {shownDistrict.metrics[cat.key]}
                  <small>/100</small>
                </strong>
                <div>
                  <i
                    style={{
                      width: `${shownDistrict.metrics[cat.key]}%`,
                      background: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="city-change-list" aria-live="polite">
            {before ? (
              <p>
                Исходное состояние. Переключитесь на «После решений», чтобы
                увидеть ваши проекты.
              </p>
            ) : localProjects.length ? (
              localProjects.map((item) => (
                <p key={item.id}>
                  <Check size={15} />
                  <span>
                    <strong>{item.title}.</strong> {visualDescriptions[item.id]}
                  </span>
                </p>
              ))
            ) : (
              <p>
                Здесь ещё нет новых проектов. Выберите инициативу для этого
                района.
              </p>
            )}
          </div>
        </div>
        <p className="city-model-note">
          Схематическая модель: расположение кварталов условное. Объекты
          появляются в районе проекта; влияние на показатели остальных районов
          учитывается в расчёте.
        </p>
      </div>
      <aside className="city-project-panel">
        <div className="city-project-intro">
          <span className="eyebrow">ОТ ИДЕИ К ПЕРЕМЕНАМ</span>
          <h2>Меняйте город.</h2>
          <p>Выберите проект — и он появится в своём районе.</p>
        </div>
        <div className="city-wallet">
          <div>
            <span>Доступный бюджет</span>
            <strong>
              {million(remaining)} <small>млн ₸</small>
            </strong>
          </div>
          <span>{selection.length}/5</span>
          <progress
            max={cityBudget.total}
            value={spent}
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
            return (
              <button
                key={cat.key}
                aria-pressed={category === cat.key}
                aria-label={cat.label}
                title={cat.label}
                onClick={() => setCategory(cat.key)}
              >
                <Icon size={20} />
                {selection.some((i) => i.category === cat.key) && <i />}
              </button>
            );
          })}
        </div>
        <div className="city-project-label">
          <h3>{categories.find((c) => c.key === category)!.label}</h3>
          <span>Один проект</span>
        </div>
        <div className="city-options">
          {initiatives
            .filter((i) => i.category === category)
            .map((item) => {
              const selected = selection.some((i) => i.id === item.id);
              const refunded =
                selection.find((i) => i.category === category)?.cost || 0;
              const affordable = item.cost <= remaining + refunded;
              return (
                <button
                  className={`city-option ${selected ? "selected" : ""}`}
                  key={item.id}
                  disabled={busy || (!selected && !affordable)}
                  aria-pressed={selected}
                  onClick={() => choose(item)}
                >
                  <div className="city-option-top">
                    <span>{districtNames[item.district]}</span>
                    <i>{selected && <Check size={13} />}</i>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <div className="city-option-bottom">
                    <b>{million(item.cost)} млн ₸</b>
                    <span>
                      {!affordable
                        ? "Не хватает бюджета"
                        : selected
                          ? "Выбрано · отменить"
                          : "Добавить в город"}{" "}
                      {!selected && affordable && <Plus size={13} />}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
        <p className="city-selection-hint">
          По одному проекту в каждом направлении. Новый выбор заменяет
          предыдущий.
        </p>
        <button
          className="button city-analyze"
          disabled={selection.length !== 5 || busy}
          onClick={onAnalyze}
        >
          {busy ? "Анализируем…" : "Оценить мой город"}
          <ArrowRight size={18} />
        </button>
        {selection.length !== 5 && (
          <p className="city-analyze-hint">
            Выбрано {selection.length} из 5 направлений
          </p>
        )}
      </aside>
    </section>
  );
}
