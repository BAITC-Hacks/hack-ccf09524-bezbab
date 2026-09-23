import { useEffect, useRef, useState } from "react";
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
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cityBudget, districts } from "./data/mockCityData";
import { categories, districtNames, initiatives } from "./data/initiatives";
import type { Initiative } from "./data/initiatives";
import type { MetricKey } from "./types/city";
import {
  analyzeScenario,
  localAnalysis,
  projectDistricts,
  qualityScore,
  restoreSelection,
  selectInitiative,
  spentTotal,
} from "./lib/simulation";
import type { Analysis } from "./lib/simulation";
import "./App.css";
import { CityMap } from "./components/CityMap";
const icons = {
  transport: Bus,
  greenery: Leaf,
  social: Users,
  safety: ShieldCheck,
  service: Building2,
};
const money = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value / 1000000);
const average = (values: import("./types/city").DistrictMetrics) =>
  Math.round(Object.values(values).reduce((a, b) => a + b, 0) / 5);

export default function App() {
  const [selection, setSelection] = useState<Initiative[]>(restoreSelection);
  const [page, setPage] = useState<"overview" | "decisions" | "result">(
    "overview",
  );
  const [category, setCategory] = useState<MetricKey>("transport");
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
  const active = projected.find((d) => d.id === activeDistrict)!;
  function commitSelection(next: Initiative[]) {
    setSelection(next);
    try {
      localStorage.setItem(
        "akim-scenario-v1",
        JSON.stringify(next.map((i) => i.id)),
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
  function choose(item: Initiative) {
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
            selection,
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
    { id: "decisions", icon: SlidersHorizontal, label: "Мои решения" },
    { id: "result", icon: BarChart3, label: "Результаты" },
  ] as const;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("overview");
          }}
        >
          <span className="brand-mark">
            <Building2 size={24} />
          </span>
          <span>
            АКИМ<span className="brand-sub">НА 5 ЧАСОВ</span>
          </span>
        </a>
        <div className="workspace-label">ГОРОДСКОЙ ШТАБ</div>
        <nav aria-label="Основная навигация">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "decisions" && (
                <span className="nav-count">{selection.length}/5</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-mission">
          <span className="small-icon">
            <Flag size={19} />
          </span>
          <h3>Ваш город. Ваши решения.</h3>
          <p>Пять шагов, чтобы сделать жизнь в Астане лучше.</p>
          <div className="mission-dots">
            {categories.map((c) => (
              <span
                key={c.key}
                className={
                  selection.some((i) => i.category === c.key) ? "done" : ""
                }
              />
            ))}
          </div>
          <small>{selection.length} из 5 решений принято</small>
        </div>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Как играть
            <ChevronRight size={16} />
          </button>
          <div className="team">
            <span className="avatar">BB</span>
            <div>
              <strong>BEZ BAB</strong>
              <small>Команда участника</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Симулятор <ChevronRight size={14} />
            <span>{nav.find((n) => n.id === page)?.label}</span>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span className="live-dot" />
              Хакатон · демо
            </span>
            <button
              className="icon-button"
              aria-label="Правила симулятора"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small">BB</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> АСТАНА · СИМУЛЯТОР УПРАВЛЕНИЯ
              </div>
              <h1>
                {page === "overview"
                  ? "Большие перемены начинаются с вас."
                  : page === "decisions"
                    ? "Пять решений. Один город."
                    : "Будущее, которое вы выбрали."}
              </h1>
              <p>
                {page === "overview"
                  ? "Изучите город, расставьте приоритеты и создайте свой сценарий развития."
                  : page === "decisions"
                    ? "Выберите по одной инициативе в каждом направлении. Каждый тенге имеет значение."
                    : "Оцените влияние ваших решений на качество городской жизни."}
              </p>
            </div>
            <button
              className="button secondary reset"
              onClick={() => setResetOpen(true)}
              disabled={busy}
            >
              <RotateCcw size={15} />
              Новый сценарий
            </button>
          </div>
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
                500 <span>млн ₸</span>
              </div>
              <div className="stat-foot">Единый старт для каждой команды</div>
            </section>
            <section className="stat-card">
              <div className="stat-label">
                <span>Доступно для решений</span>
                <span className="tiny-dot" />
              </div>
              <div className="stat-number green">
                {money(cityBudget.total - spent)} <span>млн ₸</span>
              </div>
              <div className="budget-track">
                <span
                  style={{ width: `${(spent / cityBudget.total) * 100}%` }}
                />
              </div>
              <div className="stat-foot">
                Распределено {money(spent)} из 500 млн ₸
              </div>
            </section>
            <section className="stat-card">
              <div className="stat-label">
                <span>Качество жизни</span>
                <Leaf size={18} />
              </div>
              <div className="stat-number">
                {forecast}
                <span> / 100</span>
                {selection.length > 0 && (
                  <b className="growth">+{(forecast - baseScore).toFixed(1)}</b>
                )}
              </div>
              <div className="stat-foot">
                {selection.length
                  ? "Прогноз модели по вашим решениям"
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
                {categories.map((c) => (
                  <span
                    key={c.key}
                    className={
                      selection.some((i) => i.category === c.key) ? "done" : ""
                    }
                  />
                ))}
              </div>
              <div className="stat-foot">
                {selection.length === 5
                  ? "Всё готово для анализа сценария"
                  : "Все направления одинаково важны"}
              </div>
            </section>
          </div>
          {page === "overview" && (
            <>
              <div className="overview-grid">
                <section className="panel map-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Город в деталях</h2>
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
                      {average(active.metrics)}
                    </span>
                  </div>
                  <div className="population">
                    <Users size={15} />
                    {new Intl.NumberFormat("ru-RU").format(
                      active.population,
                    )}{" "}
                    жителей<span>Условные данные</span>
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
                  <h2>Четыре района. Разные потребности.</h2>
                  <p>
                    Сбалансированное развитие начинается с внимания к каждому.
                  </p>
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
                        {average(d.metrics)}
                        <small>/100</small>
                      </span>
                    </div>
                    <h3>{districtNames[d.id]}</h3>
                    <p>{Math.round(d.population / 1000)} тыс. жителей</p>
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
                  <Sparkles size={25} />
                </div>
                <div>
                  <h2>Каким станет город — решать вам.</h2>
                  <p>
                    Распределите бюджет между пятью направлениями и оцените
                    результат.
                  </p>
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
            <div className="decisions-layout">
              <section className="panel decision-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Приоритеты развития</h2>
                    <p>Одно решение на каждое направление</p>
                  </div>
                  <span className="chip">{selection.length} / 5</span>
                </div>
                <div
                  className="category-tabs"
                  role="tablist"
                  aria-label="Направления"
                >
                  {categories.map((c) => {
                    const Icon = icons[c.key];
                    return (
                      <button
                        key={c.key}
                        role="tab"
                        aria-selected={category === c.key}
                        className={category === c.key ? "active" : ""}
                        onClick={() => setCategory(c.key)}
                      >
                        <Icon size={19} />
                        <span>{c.short}</span>
                        {selection.some((i) => i.category === c.key) && (
                          <Check size={12} className="tab-check" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="decision-intro">
                  <span className="eyebrow">
                    НАПРАВЛЕНИЕ{" "}
                    {categories.findIndex((c) => c.key === category) + 1} ИЗ 5
                  </span>
                  <h2>{categories.find((c) => c.key === category)?.label}</h2>
                  <p>
                    Основной эффект получит указанный район. Остальные районы
                    также почувствуют улучшение.
                  </p>
                </div>
                <div className="initiative-list">
                  {initiatives
                    .filter((i) => i.category === category)
                    .map((item) => {
                      const selected = selection.some((i) => i.id === item.id);
                      const available =
                        cityBudget.total -
                        spent +
                        (selection.find((i) => i.category === category)?.cost ||
                          0);
                      const disabled = item.cost > available;
                      return (
                        <button
                          className={`initiative ${selected ? "selected" : ""}`}
                          key={item.id}
                          onClick={() => choose(item)}
                          disabled={disabled || busy}
                          aria-pressed={selected}
                        >
                          <span className="radio">
                            {selected && <Check size={13} />}
                          </span>
                          <span className="initiative-body">
                            <span className="initiative-title">
                              {item.title}
                            </span>
                            <span className="initiative-description">
                              {item.description}
                            </span>
                            <span className="initiative-tags">
                              <span>
                                <MapPin size={12} />
                                {districtNames[item.district]}
                              </span>
                              <span className="impact">
                                +{item.gain} к показателю
                              </span>
                            </span>
                          </span>
                          <span className="initiative-price">
                            {money(item.cost)}
                            <small>млн ₸</small>
                            {disabled && <em>Не хватает бюджета</em>}
                          </span>
                        </button>
                      );
                    })}
                </div>
                <div className="decision-footer">
                  <span>
                    <ShieldCheck size={16} />
                    Бюджет защищён от перерасхода
                  </span>
                  <button
                    className="button secondary"
                    onClick={() =>
                      setCategory(
                        categories[
                          (categories.findIndex((c) => c.key === category) +
                            1) %
                            5
                        ].key,
                      )
                    }
                  >
                    Следующее направление
                    <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <aside className="scenario-panel panel">
                <div className="panel-heading">
                  <h2>Ваш сценарий</h2>
                  <span className="small-icon">
                    <Flag size={17} />
                  </span>
                </div>
                <div className="scenario-list">
                  {categories.map((c) => {
                    const item = selection.find((i) => i.category === c.key);
                    const Icon = icons[c.key];
                    return (
                      <button key={c.key} onClick={() => setCategory(c.key)}>
                        <span
                          className={`scenario-check ${item ? "checked" : ""}`}
                        >
                          {item ? <Check size={15} /> : <Icon size={15} />}
                        </span>
                        <span>
                          <small>{c.short}</small>
                          <strong>
                            {item ? item.title : "Решение не выбрано"}
                          </strong>
                        </span>
                        {item && (
                          <b>
                            {money(item.cost)}
                            <small>млн ₸</small>
                          </b>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="scenario-total">
                  <span>Общие инвестиции</span>
                  <strong>
                    {money(spent)} <small>млн ₸</small>
                  </strong>
                </div>
                <div className="analysis-hint">
                  <Sparkles size={19} />
                  <p>
                    {import.meta.env.VITE_ANALYSIS_URL
                      ? "AI оценит сильные стороны и компромиссы вашего сценария."
                      : "Демо-режим: прозрачный локальный расчёт. AI-сервис пока не подключён."}
                  </p>
                </div>
                <button
                  className="button primary full"
                  disabled={selection.length !== 5 || busy}
                  onClick={analyze}
                >
                  <Sparkles size={17} />
                  {busy ? "Анализируем сценарий…" : "Оценить сценарий"}
                  <ArrowRight size={16} />
                </button>
                <p className="analysis-caption">
                  {selection.length < 5
                    ? `Осталось выбрать решений: ${5 - selection.length}`
                    : "Можно вернуться и изменить любой выбор"}
                </p>
                {error && (
                  <div className="error" role="alert">
                    {error}
                    <button
                      className="button secondary"
                      onClick={() => {
                        setResult(localAnalysis(selection));
                        setPage("result");
                      }}
                    >
                      Локальный расчёт
                    </button>
                  </div>
                )}
              </aside>
            </div>
          )}
          {page === "result" &&
            (result ? (
              <div className="results-layout">
                <section className="result-hero">
                  <span className="chip">
                    <Sparkles size={14} />
                    {result.source === "ai"
                      ? "AI-анализ завершён"
                      : "Локальная модель · демо"}
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
                    {(result.score - baseScore).toFixed(1)} к исходной оценке{" "}
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
              Вы — аким условной Астаны. У вас 500 млн ₸ и пять направлений
              развития.
            </p>
            <ol>
              <li>Изучите исходные показатели четырёх районов.</li>
              <li>Выберите одну инициативу в каждом направлении.</li>
              <li>
                Следите за бюджетом. Инициативу можно заменить или отменить.
              </li>
              <li>Оцените сценарий и сравните его с исходным городом.</li>
            </ol>
            <div className="notice">
              Все данные синтетические. Индекс модели — среднее пяти
              показателей, взвешенное по населению районов. Основной район
              получает полный эффект инициативы, остальные — 35% с округлением.
              Показатели ограничены 100 баллами.
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
              500 млн ₸.
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
                  setCategory("transport");
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
