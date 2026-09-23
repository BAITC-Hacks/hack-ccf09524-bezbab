import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Bus,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Flag,
  Layers3,
  Leaf,
  Lightbulb,
  MapPin,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  ChartNoAxesCombined,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cityBudget, districts, round2 } from "./data/mockCityData";
import { categories, districtNames } from "./data/initiatives";
import type { Initiative } from "./data/initiatives";
import DecisionPanel from "./components/DecisionPanel";
import { IndicatorDetails, ScoreDetails } from "./components/DatasetDetails";
import {
  analyzeScenario,
  localAnalysis,
  projectDistricts,
  qualityScore,
  restoreSelection,
  selectInitiative,
  spentTotal,
  storageKey,
  selectionError,
  districtScore,
  calculateScenario,
} from "./lib/simulation";
import type { Analysis } from "./lib/simulation";
import "./App.css";
import { CityMap } from "./components/CityMap";
const City3D = lazy(() => import("./components/City3D"));
const icons = {
  transport: Bus,
  greenery: Leaf,
  social: Users,
  safety: ShieldCheck,
  service: Building2,
};
const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
export default function App() {
  const [selection, setSelection] = useState<Initiative[]>(restoreSelection);
  const [page, setPage] = useState<
    "overview" | "city" | "decisions" | "result"
  >("overview");
  const [activeDistrict, setActiveDistrict] = useState("yesil");
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const spent = spentTotal(selection);
  const projected = projectDistricts(selection);
  const baseScore = qualityScore(districts);
  const forecast = qualityScore(projected);
  const complete = calculateScenario(selection).valid;
  const active = projected.find((d) => d.id === activeDistrict)!;
  function commitSelection(next: Initiative[]) {
    setSelection(next);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          next.map((i) => ({
            id: i.id,
            ...(i.district ? { district: i.district } : {}),
          })),
        ),
      );
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }
  useEffect(() => {
    if (help || resetOpen) modal.current?.showModal();
    else modal.current?.close();
  }, [help, resetOpen]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  function choose(item: Initiative) {
    const reason = selectionError(selection, item);
    if (reason) {
      setError(reason);
      return;
    }
    commitSelection(selectInitiative(selection, item));
    setResult(null);
    setError("");
  }
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      setResult(await analyzeScenario(selection));
      setPage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сервис временно недоступен.");
    } finally {
      setBusy(false);
    }
  }
  function exportResult() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            team: "BEZ BAB",
            budget: cityBudget.total,
            spent,
            selection: selection.map((i) => ({
              id: i.id,
              ...(i.district ? { district: i.district } : {}),
            })),
            calculation: calculateScenario(selection),
            result,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "BEZ-BAB-scenario.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const nav = [
    { id: "overview", icon: Layers3, label: "Обзор города" },
    { id: "city", icon: Building2, label: "3D-город" },
    { id: "decisions", icon: SlidersHorizontal, label: "Мои решения" },
    { id: "result", icon: BarChart3, label: "Результаты" },
  ] as const;
  return (
    <div className={`app-shell page-${page}`}>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Аким на 5 часов — главная"
          onClick={(e) => {
            e.preventDefault();
            setPage("overview");
          }}
        >
          <span className="brand-mark">a.</span>
          <span>
            akim<span className="brand-sub">на 5 часов</span>
          </span>
        </a>
        <nav aria-label="Основная навигация">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              {item.label}
              {item.id === "decisions" && (
                <span className="nav-count">{selection.length}/5</span>
              )}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="help-button" onClick={() => setHelp(true)}>
            Как играть <CircleHelp size={16} />
          </button>
          <span className="team-tag">
            <span className="team-dot" />
            BEZ BAB
          </span>
        </div>
      </header>
      <div className="main-shell">
        <div className="topbar">
          <span>
            <MapPin size={14} />
            Астана, Казахстан
          </span>
          <span>
            Городской симулятор<span className="topbar-separator">/</span>
            HackAlem 2026
          </span>
        </div>
        <main>
          {page === "overview" ? (
            <section className="hero-layout">
              <div className="hero-scene">
                <img
                  className="hero-photo"
                  src="/images/astana.jpg"
                  alt="Панорама Астаны со стороны EXPO"
                  fetchPriority="high"
                />
                <div className="hero-shade" />
                <div className="hero-content">
                  <span className="hero-kicker">АСТАНА. СЛЕДУЮЩАЯ ГЛАВА.</span>
                  <h1>
                    Город, в котором
                    <br />
                    хочется жить.
                  </h1>
                  <p>
                    Сегодня вы решаете, каким он станет.
                    <br />
                    Пять решений для будущего Астаны.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={() => setPage("city")}
                  >
                    Исследовать 3D-город
                    <ArrowRight size={19} />
                  </button>
                </div>
                <div className="hero-caption">
                  <span>АСТАНА / EXPO</span>
                  <span>Место для ваших идей</span>
                  <span>51°10′ с. ш. 71°26′ в. д.</span>
                </div>
              </div>
              <aside className="hero-budget">
                <div className="hero-budget-top">
                  <span>Ваш ресурс для перемен</span>
                  <Wallet size={22} />
                </div>
                <div className="hero-budget-value">
                  {money(cityBudget.total - spent)}
                  <span>у. е.</span>
                </div>
                <p>
                  Из 100 у. е. городского бюджета.
                  <br />
                  Распорядитесь ими с пользой.
                </p>
                <div className="hero-budget-progress">
                  <span
                    style={{ width: `${(spent / cityBudget.total) * 100}%` }}
                  />
                </div>
                <div className="hero-budget-meta">
                  <span>Распределено {money(spent)} у. е.</span>
                  <span>{selection.length}/5 решений</span>
                </div>
                <button
                  className="button budget-button"
                  onClick={() => setPage("decisions")}
                >
                  {selection.length
                    ? "Продолжить сценарий"
                    : "Распределить бюджет"}
                  <ArrowRight size={19} />
                </button>
                <button className="hero-rules" onClick={() => setHelp(true)}>
                  Как устроен симулятор
                  <ChevronRight size={15} />
                </button>
              </aside>
            </section>
          ) : (
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  {page === "city"
                    ? "ГОРОД В ВАШИХ РУКАХ"
                    : `ВАШ СЦЕНАРИЙ / ${page === "decisions" ? "01" : "02"}`}
                </span>
                <h1>
                  {page === "city"
                    ? "Большие перемены начинаются с вас."
                    : page === "decisions"
                      ? "Что измените вы?"
                      : "Город после ваших решений."}
                </h1>
                <p>
                  {page === "city"
                    ? "Исследуйте районы, выбирайте проекты и наблюдайте, как меняется город."
                    : page === "decisions"
                      ? "Выберите ровно 5 мер, до двух в одном направлении. Бюджет — 100 у. е.."
                      : "Результат, сильные стороны и возможности для следующего шага."}
                </p>
              </div>
              <button
                className="button secondary reset"
                onClick={() => setResetOpen(true)}
                disabled={busy}
              >
                <RotateCcw size={16} />
                Новый сценарий
              </button>
            </div>
          )}
          {page === "city" && (
            <Suspense
              fallback={<div className="city-loading">Собираем город…</div>}
            >
              <City3D
                selection={selection}
                onChoose={choose}
                activeDistrict={activeDistrict}
                onSelect={setActiveDistrict}
                busy={busy}
                onAnalyze={analyze}
              />
            </Suspense>
          )}
          {page === "city" && error && (
            <div className="notice" role="alert">
              {error}
              <button
                className="button secondary"
                disabled={!complete}
                onClick={() => {
                  setResult(localAnalysis(selection));
                  setPage("result");
                }}
              >
                Локальное объяснение
              </button>
            </div>
          )}
          {storageWarning && (
            <div className="notice">
              Браузер не разрешил сохранение. Сценарий доступен до закрытия
              страницы.
            </div>
          )}
          <div className="stat-grid">
            <section className="stat-card">
              <div className="stat-label">
                <span>Бюджет города</span>
                <Wallet size={18} />
              </div>
              <div className="stat-number">
                100 <span>у. е.</span>
              </div>
              <div className="stat-foot">Единый старт для каждой команды</div>
            </section>
            <section className="stat-card">
              <div className="stat-label">
                <span>Доступно для решений</span>
                <span className="tiny-dot" />
              </div>
              <div className="stat-number green">
                {money(cityBudget.total - spent)} <span>у. е.</span>
              </div>
              <div className="budget-track">
                <span
                  style={{ width: `${(spent / cityBudget.total) * 100}%` }}
                />
              </div>
              <div className="stat-foot">
                Распределено {money(spent)} из 100 у. е.
              </div>
            </section>
            <section className="stat-card">
              <div className="stat-label">
                <span>Качество жизни</span>
                <Leaf size={18} />
              </div>
              <div className="stat-number">
                {selection.length === 0 ? baseScore : complete ? forecast : "—"}
                <span> / 100</span>
                {complete && (
                  <b className="growth">+{(forecast - baseScore).toFixed(2)}</b>
                )}
              </div>
              <div className="stat-foot">
                {selection.length
                  ? complete
                    ? "Score по формуле датасета"
                    : "Score будет рассчитан после 5 решений"
                  : "Astana Quality of Life Score"}
              </div>
            </section>
            <section className="stat-card">
              <div className="stat-label">
                <span>Ваш прогресс</span>
                <Flag size={18} />
              </div>
              <div className="stat-number">
                {selection.length} <span>из 5 решений</span>
              </div>
              <div className="progress-steps">
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className={index < selection.length ? "done" : ""}
                  />
                ))}
              </div>
              <div className="stat-foot">
                {selection.length === 5
                  ? "Всё готово для анализа сценария"
                  : "Не более двух мер одного направления"}
              </div>
            </section>
          </div>
          {page === "overview" && (
            <>
              <div className="overview-grid">
                <section className="panel map-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Познакомьтесь с городом</h2>
                      <p>Выберите район, чтобы изучить его показатели</p>
                    </div>
                    <span className="chip">
                      <MapPin size={13} />
                      Астана
                    </span>
                  </div>
                  <CityMap
                    active={activeDistrict}
                    onSelect={setActiveDistrict}
                    projected={projected}
                  />
                  <div className="map-legend">
                    <span>
                      <i className="legend-dot" />
                      Индекс качества жизни
                    </span>
                    <span>
                      0–39 <i className="legend-line low" />
                      40–69 <i className="legend-line medium" />
                      70–100 <i className="legend-line high" />
                    </span>
                  </div>
                </section>
                <section className="panel district-detail">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">В ФОКУСЕ</div>
                      <h2>Район {districtNames[active.id]}</h2>
                    </div>
                    <span className="district-index">
                      {round2(districtScore(active))}
                    </span>
                  </div>
                  <div className="population">
                    <Users size={15} />
                    {Math.round(active.populationShare * 100)}% населения города
                    <span>Доля из датасета</span>
                  </div>
                  <div className="metrics">
                    {categories.map((c) => {
                      const Icon = icons[c.key];
                      return (
                        <div className="metric" key={c.key}>
                          <div>
                            <span>
                              <Icon size={15} />
                              {c.short}
                            </span>
                            <strong>
                              {active.metrics[c.key]}
                              <small> / 100</small>
                            </strong>
                          </div>
                          <div className="metric-track">
                            <span
                              style={{
                                width: `${active.metrics[c.key]}%`,
                                background: c.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <IndicatorDetails district={active} />
                  <div className="district-insight">
                    <Lightbulb size={20} />
                    <div>
                      <strong>Точка роста</strong>
                      <p>
                        {
                          categories
                            .slice()
                            .sort(
                              (a, b) =>
                                active.metrics[a.key] - active.metrics[b.key],
                            )[0].label
                        }{" "}
                        — направление с наименьшим индексом в этом районе.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <div className="section-heading">
                <div>
                  <h2>Один город. Пять районов.</h2>
                  <p>Выберите район и узнайте, что нужно его жителям.</p>
                </div>
                <span className="muted">Синтетический датасет</span>
              </div>
              <div className="district-grid">
                {projected.map((d) => (
                  <button
                    key={d.id}
                    className={`district-card ${activeDistrict === d.id ? "selected" : ""}`}
                    onClick={() => setActiveDistrict(d.id)}
                  >
                    <div>
                      <span className="district-symbol">
                        <Building2 size={19} />
                      </span>
                      <span className="district-score">
                        {round2(districtScore(d))}
                        <small>/100</small>
                      </span>
                    </div>
                    <h3>{districtNames[d.id]}</h3>
                    <p>
                      {Math.round(d.populationShare * 100)}% населения города
                    </p>
                    <div className="mini-bars">
                      {categories.map((c) => (
                        <span
                          key={c.key}
                          title={`${c.label}: ${d.metrics[c.key]}`}
                          style={{
                            height: `${d.metrics[c.key]}%`,
                            background: c.color,
                          }}
                        />
                      ))}
                    </div>
                    <span className="district-link">
                      Показатели района
                      <ArrowRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
              <section className="cta-panel">
                <div className="cta-icon">
                  <ChartNoAxesCombined size={25} />
                </div>
                <div>
                  <h2>Хороший город начинается с решения.</h2>
                  <p>Выберите пять совместимых мер и оцените результат.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setPage("decisions")}
                >
                  Перейти к решениям
                  <ArrowRight size={17} />
                </button>
              </section>
            </>
          )}
          {page === "decisions" && (
            <div className="dataset-decisions">
              <DecisionPanel
                selection={selection}
                onChoose={choose}
                activeDistrict={activeDistrict}
                onSelect={setActiveDistrict}
                busy={busy}
                onAnalyze={analyze}
              />
              {error && (
                <div className="error" role="alert">
                  {error}
                  <button
                    className="button secondary"
                    disabled={!complete}
                    onClick={() => {
                      setResult(localAnalysis(selection));
                      setPage("result");
                    }}
                  >
                    Локальное объяснение
                  </button>
                </div>
              )}
            </div>
          )}
          {page === "result" && result && (
            <ScoreDetails selection={selection} />
          )}
          {page === "result" &&
            (result ? (
              <div className="results-layout">
                <section className="result-hero">
                  <span className="chip">
                    <ChartNoAxesCombined size={14} />
                    {result.source === "ai"
                      ? "Расчёт модели + объяснение AI"
                      : "Расчёт по датасету"}
                  </span>
                  <h2>
                    Astana Quality
                    <br />
                    of Life Score
                  </h2>
                  <div
                    className="score-ring"
                    style={{ "--score": `${result.score}%` } as CSSProperties}
                  >
                    <div>
                      <strong>{result.score}</strong>
                      <span>из 100 баллов</span>
                    </div>
                  </div>
                  <span className="result-growth">
                    {result.score >= baseScore ? "+" : ""}
                    {(result.score - baseScore).toFixed(2)} к исходной оценке{" "}
                    {baseScore}
                  </span>
                  <p>{result.summary}</p>
                  <button
                    className="button secondary"
                    onClick={() => setPage("decisions")}
                  >
                    <ArrowLeft size={16} />
                    Изменить решения
                  </button>
                </section>
                <div className="result-details">
                  {[
                    {
                      title: "Сильные стороны",
                      icon: Leaf,
                      list: result.strengths,
                      kind: "positive",
                    },
                    {
                      title: "Риски и компромиссы",
                      icon: ShieldCheck,
                      list: result.risks,
                      kind: "warning",
                    },
                    {
                      title: "Что можно улучшить",
                      icon: Lightbulb,
                      list: result.recommendations,
                      kind: "advice",
                    },
                  ].map((block) => (
                    <section
                      key={block.title}
                      className={`panel result-block ${block.kind}`}
                    >
                      <h2>
                        <block.icon size={20} />
                        {block.title}
                      </h2>
                      <ul>
                        {block.list.map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  <button className="button secondary" onClick={exportResult}>
                    <ArrowDownToLine size={16} />
                    Скачать сценарий JSON
                  </button>
                </div>
              </div>
            ) : (
              <section className="panel empty-state">
                <span className="empty-icon">
                  <BarChart3 size={36} />
                </span>
                <h2>Здесь появится будущее вашего города</h2>
                <p>
                  Выберите пять решений и запустите анализ, чтобы увидеть
                  итоговый индекс и рекомендации.
                </p>
                <button
                  className="button primary"
                  onClick={() => setPage("decisions")}
                >
                  Выбрать решения
                  <ArrowRight size={16} />
                </button>
              </section>
            ))}
          <footer className="page-footer">
            <span>АКИМ НА 5 ЧАСОВ / BEZ BAB</span>
            <button
              className="footer-reset"
              onClick={() => setResetOpen(true)}
              disabled={busy}
            >
              Новый сценарий
            </button>
            <span>Учебная симуляция · реальные идеи</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={modal}
        className="modal"
        onCancel={() => {
          setHelp(false);
          setResetOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setHelp(false);
            setResetOpen(false);
          }
        }}
      >
        <button
          className="modal-close icon-button"
          aria-label="Закрыть"
          onClick={() => {
            setHelp(false);
            setResetOpen(false);
          }}
        >
          <X size={20} />
        </button>
        {help ? (
          <>
            <span className="small-icon">
              <Compass size={24} />
            </span>
            <h2>Пять решений для лучшего города</h2>
            <p>
              Вы — аким условной Астаны. У вас 100 у. е. и пять направлений
              развития.
            </p>
            <ol>
              <li>Изучите 10 показателей пяти районов.</li>
              <li>
                Выберите ровно 5 разных мер, не более двух одного направления.
              </li>
              <li>
                Укажите район для районной меры. Городские меры действуют во
                всех районах. Следите за бюджетом и несовместимостями.
              </li>
              <li>Оцените сценарий и сравните его с исходным городом.</li>
            </ol>
            <div className="notice">
              Горизонт — 8 кварталов. Эффект × (8 − лаг) / 8, затем
              фиксированные синергии и ограничение показателей 0–100. Score =
              0,7 × средняя оценка районов по долям населения + 0,3 × оценка
              слабейшего района − число показателей ниже 40. AI объясняет
              готовый расчёт.
            </div>
            <button className="button primary" onClick={() => setHelp(false)}>
              Всё понятно
              <Check size={16} />
            </button>
          </>
        ) : (
          <>
            <h2>Начать новый сценарий?</h2>
            <p>
              Текущие решения и результат будут сброшены. Бюджет снова составит
              100 у. е..
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setResetOpen(false)}
              >
                Продолжить текущий
              </button>
              <button
                className="button primary"
                onClick={() => {
                  commitSelection([]);
                  setResult(null);
                  setError("");
                  setPage("overview");
                  setResetOpen(false);
                }}
              >
                Начать заново
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
