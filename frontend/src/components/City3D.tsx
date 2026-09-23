import { useEffect, useRef, useState } from "react";
import {
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
} from "lucide-react";
import { CityWorld } from "../scene/CityWorld";
import { visualDescriptions } from "../scene/cityPlan";
import { categories, districtNames } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import DecisionPanel from "./DecisionPanel";
import { IndicatorDetails } from "./DatasetDetails";
import { districts } from "../data/mockCityData";
import { projectDistricts } from "../lib/simulation";
import { CityMap } from "./CityMap";
import "./City3D.css";
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
  const projected = projectDistricts(selection);
  const shownDistrict = (before ? districts : projected).find(
    (d) => d.id === activeDistrict,
  )!;
  const localProjects = selection.filter(
    (i) => i.scope === "city" || i.district === activeDistrict,
  );
  function selectDistrict(id: string) {
    onSelect(id);
    world.current?.focus(id);
  }
  function choose(item: Initiative) {
    onChoose(item);
    setBefore(false);
    if (item.district) selectDistrict(item.district);
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
                {selection.filter(
                  (i) => i.scope === "city" || i.district === id,
                ).length || "—"}
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
          <IndicatorDetails district={shownDistrict} />
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
          появляются в выбранном районе, а городские меры — во всех пяти.
          Показатели рассчитаны на конец восьмого квартала.
        </p>
      </div>
      <DecisionPanel
        selection={selection}
        onChoose={choose}
        activeDistrict={activeDistrict}
        onSelect={selectDistrict}
        busy={busy}
        onAnalyze={onAnalyze}
      />
    </section>
  );
}
