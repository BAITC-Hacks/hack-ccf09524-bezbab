import { BUDGET, CONFLICTS, DECISIONS_REQUIRED, DIRECTIONS, DISTRICTS, EVENTS, INDICATORS, MAX_PER_DIRECTION, MEASURES, SCORE_RULES, SYNERGIES } from "./data.mjs";
import { BASELINE, changesBetween, costOf, decodeDecisions, encodeDecisions, evaluate, getDistrict, getMeasure, realizedShare, robustness, sameDecision, scoreOf, stressTest, validate } from "./engine.mjs";
import { bestSingleChange, percentile } from "./optimizer.mjs";
import { analyze, explanationFacts, fmt, signed } from "./explain.mjs";
import { histogram, pareto } from "./charts.mjs";
import { buildSlides } from "./report.mjs";

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const directionOf = (measure) => DIRECTIONS.find((direction) => direction.id === measure.direction);
const decisionText = (decision) => `${decision.measureId} ${getMeasure(decision.measureId).name}${decision.districtId ? ` · ${getDistrict(decision.districtId).name}` : " · весь город"}`;
const storageKey = "bezbab-akim-teams-v2";

let decisions = [];
let space = null;
let current = null;
let llm = { available: false };

/* ---------- Оптимизатор в фоновом потоке ---------- */

const pending = new Map();
let nextId = 1;
let worker = null;
try {
  worker = new Worker(new URL("./optimizer.worker.mjs", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    const task = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) task?.reject(new Error(data.error)); else task?.resolve(data.result);
  };
  worker.onerror = () => { worker = null; pending.forEach((task) => task.reject(new Error("worker"))); pending.clear(); };
} catch { worker = null; }

async function runOptimizer(type, payload = {}) {
  if (worker) {
    try {
      return await new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, type, ...payload });
      });
    } catch { /* запасной путь ниже — расчёт в основном потоке */ }
  }
  const optimizer = await import("./optimizer.mjs");
  return type === "space" ? optimizer.analyzeSpace() : optimizer.reallocate(payload.decisions, payload.eventId);
}

/* ---------- Исходное состояние города ---------- */

function metricRows(metrics, before) {
  return DIRECTIONS.map((direction) => {
    const rows = INDICATORS.filter((indicator) => indicator.direction === direction.id).map((indicator) => {
      const value = metrics[indicator.id];
      const was = before ? before[indicator.id] : value;
      const change = Math.round((value - was) * 100) / 100;
      const critical = value < SCORE_RULES.criticalThreshold;
      const ghost = change > 0 ? `<b style="left:${was}%;width:${change}%;background:${direction.color}"></b>` : "";
      const drop = change < 0 ? `<b class="drop" style="left:${value}%;width:${-change}%"></b>` : "";
      return `<div class="metric-row${critical ? " critical" : ""}" title="${esc(indicator.meaning)}"><span>${indicator.id} · ${indicator.name}</span><div class="metric-track"><i style="width:${Math.min(was, value)}%;background:${direction.color}"></i>${ghost}${drop}<u></u></div><strong>${fmt(value, 1)}${change ? `<em class="metric-delta${change < 0 ? " negative" : ""}">${signed(change, 2)}</em>` : ""}</strong></div>`;
    }).join("");
    return `<div class="metric-group"><span class="metric-group-label" style="color:${direction.color}">${direction.icon} ${direction.label}</span>${rows}</div>`;
  }).join("");
}

function districtCards(target, after = null) {
  target.innerHTML = DISTRICTS.map((district, index) => {
    const now = after ? after.find((item) => item.id === district.id) : { score: BASELINE.districtScores[index], metrics: district.metrics };
    const baseScore = BASELINE.districtScores[index];
    const weakest = after ? current.result.components.weakestDistrictId === district.id : BASELINE.weakestIndex === index;
    const summary = after
      ? `<p class="district-summary">Оценка ${fmt(baseScore)} → <strong>${fmt(now.score)}</strong> <span class="${now.score - baseScore < 0 ? "negative" : ""}">${signed(now.score - baseScore)}</span></p>`
      : `<p class="district-summary">Оценка района <strong>${fmt(baseScore)}</strong></p>`;
    return `<article class="district-card${weakest ? " weakest" : ""}"><div class="district-top"><span>${String(index + 1).padStart(2, "0")} / РАЙОН</span><span class="district-pop">${Math.round(district.share * 100)}% жителей</span></div><h3>${district.name}${weakest ? ' <em class="weak-badge">слабейший</em>' : ""}</h3>${after ? "" : `<p class="district-profile">${district.profile}</p>`}${summary}<div class="metrics">${metricRows(now.metrics, after ? district.metrics : null)}</div></article>`;
  }).join("");
}

function renderBaseline() {
  const b = BASELINE;
  $("#baseline-formula").innerHTML = `<div><p class="eyebrow">ИСХОДНЫЙ SCORE</p><strong>${fmt(b.score)}</strong></div><p class="formula">Score = ${SCORE_RULES.averageWeight} × <b>${fmt(b.average)}</b> <span>средняя оценка по жителям</span> + ${SCORE_RULES.weakestWeight} × <b>${fmt(b.weakest)}</b> <span>слабейший район — ${DISTRICTS[b.weakestIndex].name}</span> − ${SCORE_RULES.criticalPenalty} × <b>${b.critical}</b> <span>критических значения</span></p>`;
  districtCards($("#baseline-grid"));
}

/* ---------- Каталог мероприятий ---------- */

function blocker(measure, districtId) {
  const others = decisions.filter((decision) => decision.measureId !== measure.id);
  const replacing = others.length !== decisions.length;
  if (!replacing && decisions.length >= DECISIONS_REQUIRED) return "Уже выбрано 5 решений — уберите одно";
  const cost = costOf(others) + measure.cost;
  if (cost > BUDGET) return `Не хватает ${cost - BUDGET} ед. бюджета`;
  const sameDirection = others.filter((decision) => getMeasure(decision.measureId).direction === measure.direction).length;
  if (sameDirection >= MAX_PER_DIRECTION) return `Уже ${MAX_PER_DIRECTION} меры направления «${directionOf(measure).label}»`;
  for (const conflict of CONFLICTS) {
    if (!conflict.measures.includes(measure.id)) continue;
    const partnerId = conflict.measures.find((id) => id !== measure.id);
    const partner = others.find((decision) => decision.measureId === partnerId);
    if (!partner) continue;
    if (!conflict.sameDistrict) return `Несовместима с ${partnerId}: ${conflict.reason}`;
    if (partner.districtId === districtId) return `В районе ${getDistrict(districtId).name} уже ${partnerId}: ${conflict.reason}`;
  }
  return null;
}

function relations(measure) {
  const notes = [];
  for (const synergy of SYNERGIES) if (synergy.measures.includes(measure.id)) notes.push(`<span class="rel good" title="${esc(synergy.note)}">+ синергия с ${synergy.measures.find((id) => id !== measure.id)}</span>`);
  for (const conflict of CONFLICTS) if (conflict.measures.includes(measure.id)) notes.push(`<span class="rel bad" title="${esc(conflict.reason)}">× ${conflict.measures.find((id) => id !== measure.id)}${conflict.sameDistrict ? " в том же районе" : ""}</span>`);
  return notes.join("");
}

function renderCatalog() {
  $("#catalog").innerHTML = DIRECTIONS.map((direction) => `<section class="catalog-group" aria-label="${direction.label}">
    <h3 class="catalog-title"><span class="category-icon" style="color:${direction.color}">${direction.icon}</span>${direction.label}<small id="dir-count-${direction.id}"></small></h3>
    <div class="measure-grid">${MEASURES.filter((measure) => measure.direction === direction.id).map((measure) => `<article class="measure-card" data-measure="${measure.id}" style="--accent:${direction.color}">
      <div class="measure-top"><span class="measure-id">${measure.id}</span><span class="scope ${measure.scope}">${measure.scope === "city" ? "Весь город" : "Район"}</span><span class="measure-cost">${measure.cost} ед.</span></div>
      <h4>${measure.name}</h4>
      <p class="measure-meta">Запуск через ${measure.lag} кв. · за 2 года ${Math.round(realizedShare(measure) * 100)}% эффекта</p>
      <div class="effects">${Object.entries(measure.effects).map(([id, value]) => `<span class="effect${value < 0 ? " negative" : ""}" title="${esc(INDICATORS.find((indicator) => indicator.id === id).name)}: полный эффект ${value > 0 ? "+" : ""}${value}, за горизонт ${signed(value * realizedShare(measure))}">${id} ${signed(value * realizedShare(measure))}</span>`).join("")}</div>
      <div class="relations">${relations(measure)}</div>
      <div class="measure-actions">${measure.scope === "city"
        ? `<button type="button" class="place-button" data-measure="${measure.id}" data-district=""><span>Добавить</span><em></em></button>`
        : DISTRICTS.map((district) => `<button type="button" class="place-button" data-measure="${measure.id}" data-district="${district.id}"><span>${district.name}</span><em></em></button>`).join("")}</div>
    </article>`).join("")}</div></section>`).join("");
}

function updateCatalog() {
  const baseScore = scoreOf(decisions);
  for (const button of document.querySelectorAll(".place-button")) {
    const measure = getMeasure(button.dataset.measure);
    const districtId = button.dataset.district || null;
    const chosen = decisions.find((decision) => decision.measureId === measure.id);
    const active = chosen && (chosen.districtId ?? null) === districtId;
    const reason = active ? null : blocker(measure, districtId);
    const next = [...decisions.filter((decision) => decision.measureId !== measure.id), { measureId: measure.id, districtId }];
    const delta = active ? baseScore - scoreOf(decisions.filter((decision) => decision.measureId !== measure.id)) : scoreOf(next) - baseScore;
    button.classList.toggle("active", Boolean(active));
    button.disabled = Boolean(reason);
    button.title = active ? "Нажмите, чтобы убрать" : reason ?? (chosen ? "Перенести в этот район" : "Добавить в сценарий");
    button.setAttribute("aria-pressed", String(Boolean(active)));
    button.querySelector("em").textContent = reason ? "—" : `${active ? "✓ " : ""}${signed(delta)}`;
    button.querySelector("em").classList.toggle("negative", !reason && delta < 0);
  }
  for (const card of document.querySelectorAll(".measure-card")) card.classList.toggle("chosen", decisions.some((decision) => decision.measureId === card.dataset.measure));
  for (const direction of DIRECTIONS) {
    const count = decisions.filter((decision) => getMeasure(decision.measureId).direction === direction.id).length;
    $(`#dir-count-${direction.id}`).textContent = `${count} / ${MAX_PER_DIRECTION}`;
  }
}

function updatePanel() {
  const cost = costOf(decisions);
  $("#spent").textContent = cost;
  $("#remaining").textContent = `Осталось ${BUDGET - cost} ед.${BUDGET - cost > 0 ? " — это резерв на события" : ""}`;
  $("#budget-fill").style.width = `${Math.min(100, cost)}%`;
  $("#slot-count").textContent = `${decisions.length} / ${DECISIONS_REQUIRED}`;
  $("#slots").innerHTML = Array.from({ length: DECISIONS_REQUIRED }, (_, index) => {
    const decision = decisions[index];
    if (!decision) return `<li class="slot empty"><span>Решение ${index + 1}</span><small>выберите меру в каталоге</small></li>`;
    const measure = getMeasure(decision.measureId);
    return `<li class="slot" style="--accent:${directionOf(measure).color}"><div><strong>${measure.id} · ${esc(measure.name)}</strong><small>${decision.districtId ? getDistrict(decision.districtId).name : "весь город"} · ${measure.cost} ед.</small></div><button type="button" class="slot-remove" data-remove="${measure.id}" aria-label="Убрать ${measure.id}">×</button></li>`;
  }).join("");
  const errors = validate(decisions);
  const ready = decisions.length === DECISIONS_REQUIRED && !errors.length;
  $("#calculate-button").disabled = !ready;
  $("#validation-message").textContent = ready ? "Сценарий допустим. Можно рассчитывать." : decisions.length < DECISIONS_REQUIRED ? `Выбрано ${decisions.length} из ${DECISIONS_REQUIRED}. Нужно ровно ${DECISIONS_REQUIRED} решений.` : errors.join(" ");
  const live = $("#live-score");
  live.hidden = !ready;
  if (ready) {
    const score = scoreOf(decisions);
    const rank = space ? percentile(space.sorted, score) : null;
    live.innerHTML = `<span>Прогноз Score</span><strong>${fmt(score)}</strong><small>${signed(score - BASELINE.score)} к исходному ${fmt(BASELINE.score)}${rank ? ` · лучше ${fmt(rank.share * 100, 1)}% сценариев` : ""}</small>`;
  }
}

function setDecisions(next, { keepResults = false } = {}) {
  decisions = next.map((decision) => ({ measureId: decision.measureId, districtId: decision.districtId ?? null }));
  if (location.hash.startsWith("#s=") && location.hash !== `#s=${encodeDecisions(decisions)}`) history.replaceState(null, "", location.pathname + location.search);
  updateCatalog();
  updatePanel();
  if (!keepResults) { $("#results").hidden = true; current = null; }
}

/* ---------- Результаты ---------- */

function summaryText(result, analysis) {
  const top = [...result.decisions].sort((a, b) => b.exactContribution - a.exactContribution);
  const c = result.components;
  return `<p>Сценарий меняет Astana Quality of Life Score с <b>${fmt(result.baseline)}</b> до <b>${fmt(result.score)}</b> (${signed(result.delta)} п.) при расходе ${result.cost} из ${BUDGET} ед. Основной рост дают ${top.slice(0, 2).map((decision) => `${decision.measureId} (${signed(decision.contribution)})`).join(" и ")}; средняя оценка по жителям ${fmt(c.baselineAverage)} → ${fmt(c.average)}, слабейший район ${fmt(c.baselineWeakest)} → ${fmt(c.weakest)}, критических значений ${c.baselineCritical} → ${c.critical}.</p><p>${esc(analysis.risks[0] ?? "Существенных рисков модель не видит.")}</p>`;
}

function renderContributions(result) {
  const max = Math.max(...result.decisions.map((decision) => Math.abs(decision.exactContribution)), 0.01);
  $("#contributions").innerHTML = [...result.decisions].sort((a, b) => b.exactContribution - a.exactContribution).map((decision) => {
    const measure = getMeasure(decision.measureId);
    const direction = directionOf(measure);
    const width = Math.abs(decision.exactContribution) / max * 100;
    return `<div class="contribution-row"><div class="contribution-label"><strong>${measure.id} · ${esc(measure.name)}</strong><span>${direction.label} · ${decision.districtId ? getDistrict(decision.districtId).name : "весь город"} · ${measure.cost} ед. · ${Math.round(decision.realized * 100)}% эффекта за 2 года</span></div><div class="contribution-bar"><i class="${decision.exactContribution < 0 ? "negative" : ""}" style="width:${width}%;background:${direction.color}"></i></div><div class="contribution-value"><b>${signed(decision.contribution)}</b><span>${fmt(decision.exactContribution / measure.cost * 10)} п. на 10 ед.</span></div></div>`;
  }).join("") + `<p class="contribution-total">Сумма вкладов: <b>${signed(result.decisions.reduce((sum, decision) => sum + decision.exactContribution, 0))}</b> = изменение Score ${signed(result.delta)}${result.synergies.length ? ` · синергии (${result.synergies.map((synergy) => synergy.measures.join("+")).join(", ")}) распределены между участниками поровну` : ""}.</p>`;
}

function alternativeCard(title, note, option, key) {
  const diff = changesBetween(decisions, option.decisions);
  return `<div class="alt-card"><p class="alt-title">${title}</p><strong>${fmt(option.score)}</strong><span>${option.cost} ед. · ${diff ? `изменить ${diff} из 5` : "это ваш сценарий"}</span><p>${note}</p><ul>${option.decisions.map((decision) => `<li class="${decisions.some((item) => sameDecision(item, decision)) ? "" : "new"}">${esc(decisionText(decision))}</li>`).join("")}</ul>${diff ? `<button type="button" class="outline-button" data-apply-alt="${key}">Применить ↗</button>` : ""}</div>`;
}

function renderAdvisor() {
  const result = current.result;
  const single = bestSingleChange(decisions);
  current.single = single;
  $("#single-advice").innerHTML = single
    ? `<div><p class="alt-title">Один шаг</p><p>${single.from.measureId === single.to.measureId ? `Перенесите ${single.to.measureId} в район ${getDistrict(single.to.districtId).name}` : `Замените ${esc(decisionText(single.from))} на ${esc(decisionText(single.to))}`}: Score ${fmt(result.score)} → <b>${fmt(single.score)}</b> (${signed(single.gain)}), расход ${single.cost} ед.</p></div><button type="button" class="outline-button" id="apply-single">Применить ↗</button>`
    : `<div><p class="alt-title">Один шаг</p><p>Ни одна замена одного решения не повышает Score — сценарий локально оптимален.</p></div>`;
  if (!space) { $("#advisor-status").textContent = "Оптимизатор проверяет все допустимые наборы…"; return; }
  $("#advisor-status").textContent = `Проверено ${space.count.toLocaleString("ru-RU")} допустимых наборов за ${(space.elapsedMs / 1000).toFixed(1)} с`;
  const a = space.alternatives;
  current.alternatives = a;
  $("#alternatives").innerHTML = [
    alternativeCard("Максимум Score", "Глобальный оптимум модели — доказан Z3.", a.best, "best"),
    alternativeCard("Экономный", `Почти максимум, но оставляет ${BUDGET - a.economical.cost} ед. резерва.`, a.economical, "economical"),
    alternativeCard("Устойчивый к событиям", `Лучший средний Score в стресс-тесте: ${fmt(a.resilient.stressAverage)}.`, a.resilient, "resilient"),
    alternativeCard("Помощь отстающим", `Максимальная оценка слабейшего района: ${fmt(a.weakest.weakest)}.`, a.weakest, "weakest"),
  ].join("");
  $("#core").innerHTML = `<p class="alt-title">Ядро лучших решений <span>как часто решение встречается в ${space.topSize.toLocaleString("ru-RU")} лучших наборах</span></p><div class="core-list">${space.core.map((item) => `<div class="core-item"><span>${esc(decisionText(item))}</span><div class="core-bar"><i style="width:${item.share * 100}%"></i></div><b>${Math.round(item.share * 100)}%</b></div>`).join("")}</div>`;
}

function renderStress() {
  const { stress, result } = current;
  $("#stress-list").innerHTML = stress.map((item) => {
    const event = EVENTS.find((entry) => entry.id === item.eventId);
    const status = item.covered
      ? `<span class="status good">✓ Покрыто резервом (${item.responseCost} из ${result.remaining} ед.)</span>`
      : `<span class="status ${item.loss > 0.5 ? "bad" : "warn"}">${item.loss > 0.5 ? "▲" : "●"} Потеря ${fmt(item.loss)} п. · не хватает ${item.shortfall} ед.</span>`;
    return `<div class="stress-row"><div><strong>${event.name}</strong><span>${getDistrict(event.districtId).name} · ${Object.entries(event.shocks).map(([id, value]) => `${id} ${value}`).join(", ")} · ликвидация ${event.responseCost} ед.${item.mitigatedBy ? ` · удар смягчён мерой ${item.mitigatedBy}` : ""}</span><small>${event.text}</small></div>${status}${item.covered ? "" : `<button type="button" class="outline-button" data-realloc="${event.id}">Перераспределить</button>`}</div>`;
  }).join("");
}

async function showReallocation(eventId) {
  if (!current) return;
  const scenario = current;
  const event = EVENTS.find((entry) => entry.id === eventId);
  if (!event) return;
  const requestId = (scenario.reallocRequestId ?? 0) + 1;
  scenario.reallocRequestId = requestId;
  $("#realloc-output").innerHTML = `<p>Ищем наборы, на которые хватит денег вместе с ликвидацией (≤ ${BUDGET - event.responseCost} ед.)…</p>`;
  let answer;
  try {
    answer = await runOptimizer("reallocate", { decisions: scenario.result.decisions, eventId });
  } catch {
    if (current === scenario && scenario.reallocRequestId === requestId) $("#realloc-output").textContent = "Не удалось рассчитать перераспределение. Попробуйте ещё раз.";
    return;
  }
  if (current !== scenario || scenario.reallocRequestId !== requestId) return;
  const hit = current.stress.find((item) => item.eventId === eventId);
  current.realloc = answer;
  const plural = (n) => (n === 1 ? "изменение" : n < 5 ? "изменения" : "изменений");
  $("#realloc-output").innerHTML = `<p class="alt-title">«${event.name}»: цена перестройки</p><p>Не реагировать — Score упадёт до ${fmt(hit.scoreAfter)}. Перераспределить бюджет, чтобы оплатить ликвидацию (${event.responseCost} ед.):</p><div class="realloc-options">${answer.options.map((option, index) => `<div class="realloc-option"><b>${option.changes} ${plural(option.changes)}</b><span>Score ${fmt(option.score)} · ${option.cost} ед. + ${event.responseCost} на событие</span><small>${option.decisions.filter((decision) => !decisions.some((item) => sameDecision(item, decision))).map((decision) => esc(decisionText(decision))).join("; ") || "без изменений"}</small><button type="button" class="text-link" data-realloc-apply="${index}">Применить</button></div>`).join("")}</div>`;
}

async function requestLlm() {
  if (!llm.available || !current) return;
  const version = current.version;
  $("#ai-badge").textContent = `LLM · ${llm.model} · пишет…`;
  try {
    const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: current.facts }) });
    const data = await response.json();
    if (current?.version !== version) return;
    if (!response.ok || !data.text) throw new Error(data.error ?? "no text");
    if (data.verified) {
      $("#ai-text").innerHTML = data.text.split(/\n{2,}/).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
      $("#ai-badge").textContent = `LLM · ${data.model ?? llm.model} · числа найдены в фактах`;
    } else {
      $("#ai-badge").textContent = `Правила модели (в ответе LLM были несверенные числа: ${data.unverified.slice(0, 3).join(", ")})`;
    }
  } catch {
    if (current?.version === version) $("#ai-badge").textContent = "Правила модели (LLM недоступен)";
  }
}

function renderSpaceParts() {
  if (!current) return;
  const { result } = current;
  if (space) {
    current.rank = percentile(space.sorted, result.exactScore);
    $("#score-rank").textContent = `${current.rank.rank.toLocaleString("ru-RU")} из ${current.rank.total.toLocaleString("ru-RU")} · топ ${fmt(Math.max(0.01, (1 - current.rank.share) * 100), 2)}%`;
    $("#hist-count").textContent = space.count.toLocaleString("ru-RU");
    $("#histogram").innerHTML = histogram(space.histogram, { you: result.exactScore, best: space.best.score, baseline: BASELINE.score });
    $("#pareto").innerHTML = pareto(space.pareto, { you: result.exactScore, youCost: result.cost, baseline: BASELINE.score });
  } else {
    $("#histogram").innerHTML = $("#pareto").innerHTML = '<p class="chart-wait">Оптимизатор перебирает все наборы…</p>';
  }
  current.analysis = analyze(result, { stress: current.stress, robust: current.robust, space, rank: current.rank });
  current.facts = explanationFacts(result, { stress: current.stress, robust: current.robust, space, rank: current.rank });
  const list = (items) => items.map((item) => `<li>${esc(item)}</li>`).join("");
  $("#strengths-list").innerHTML = list(current.analysis.strengths);
  $("#risks-list").innerHTML = list(current.analysis.risks);
  $("#consequences-list").innerHTML = list(current.analysis.consequences);
  $("#tradeoffs-list").innerHTML = list(current.analysis.tradeoffs);
  renderAdvisor();
}

function renderResult() {
  const result = evaluate(decisions);
  if (!result.valid) { $("#validation-message").textContent = result.errors.join(" "); return; }
  current = { version: Date.now(), result, robust: robustness(decisions), stress: stressTest(decisions), rank: null };
  const c = result.components;
  $("#final-score").textContent = fmt(result.score);
  $("#score-change").textContent = `${signed(result.delta)} п. к исходным ${fmt(result.baseline)}`;
  $("#score-formula").innerHTML = `${SCORE_RULES.averageWeight} × ${fmt(c.average)} + ${SCORE_RULES.weakestWeight} × ${fmt(c.weakest)} (${getDistrict(c.weakestDistrictId).name}) − ${c.critical} = <b>${fmt(result.score)}</b>`;
  $("#score-robust").textContent = `${fmt(current.robust.p10)} – ${fmt(current.robust.p90)}`;
  const covered = current.stress.filter((item) => item.covered).length;
  const worst = Math.max(...current.stress.map((item) => item.loss));
  $("#score-stress").textContent = `покрыто ${covered} из ${current.stress.length}${worst > 0 ? ` · худшее −${fmt(worst)}` : ""}`;
  $("#score-rank").textContent = "считаем…";
  renderContributions(result);
  districtCards($("#district-results-grid"), result.after);
  renderStress();
  $("#realloc-output").innerHTML = "";
  renderSpaceParts();
  $("#ai-text").innerHTML = summaryText(result, current.analysis);
  $("#ai-badge").textContent = llm.available ? `LLM · ${llm.model}` : "Правила модели";
  $("#results").hidden = false;
  renderLeaderboard();
  $("#comparison-output").textContent = "";
  requestLlm();
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- Команды ---------- */

function readTeams() {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(items) ? items.filter((item) => item && typeof item.name === "string" && decodeDecisions(item.code)) : [];
  } catch { return []; }
}
function writeTeams(items) {
  try { localStorage.setItem(storageKey, JSON.stringify(items.slice(-12))); return true; } catch { return false; }
}

function renderLeaderboard() {
  const rows = readTeams().map((item) => ({ ...item, result: evaluate(decodeDecisions(item.code)) })).sort((a, b) => b.result.exactScore - a.result.exactScore);
  if (!rows.length) { $("#leaderboard").innerHTML = '<p class="empty-scenarios">Пока нет сохранённых сценариев.</p>'; return; }
  $("#leaderboard").innerHTML = `<table><thead><tr><th>#</th><th>Команда</th><th>Score</th><th>Расход</th><th>Место среди всех</th><th></th></tr></thead><tbody>${rows.map((row, index) => {
    const rank = space ? percentile(space.sorted, row.result.exactScore) : null;
    return `<tr><td>${index + 1}</td><td><strong>${esc(row.name)}</strong><small>${esc(row.code)}</small></td><td><b>${fmt(row.result.score)}</b></td><td>${row.result.cost} ед.</td><td>${rank ? `топ ${fmt(Math.max(0.01, (1 - rank.share) * 100), 2)}%` : "…"}</td><td class="row-actions"><button type="button" data-team-compare="${esc(row.id)}">Сравнить</button><button type="button" data-team-open="${esc(row.id)}">Открыть</button><button type="button" data-team-delete="${esc(row.id)}">Удалить</button></td></tr>`;
  }).join("")}</tbody></table>`;
}

function compareWith(team) {
  const theirs = decodeDecisions(team.code);
  const other = evaluate(theirs);
  const diff = current.result.exactScore - other.exactScore;
  const added = decisions.filter((decision) => !theirs.some((item) => sameDecision(item, decision)));
  const removed = theirs.filter((decision) => !decisions.some((item) => sameDecision(item, decision)));
  const districtsDiff = current.result.after.map((district) => `${district.name} ${signed(district.score - other.after.find((item) => item.id === district.id).score)}`).join(", ");
  $("#comparison-output").innerHTML = `<strong>Текущий сценарий против «${esc(team.name)}»: ${Math.abs(diff) < 0.005 ? "одинаковый Score" : `${diff > 0 ? "лучше" : "хуже"} на ${fmt(Math.abs(diff))} п.`}</strong><span>Расход: ${current.result.cost} против ${other.cost} ед. Разница по районам: ${districtsDiff}.</span>${added.length ? `<span>Только у вас: ${added.map((d) => esc(decisionText(d))).join("; ")}.</span><span>Только у них: ${removed.map((d) => esc(decisionText(d))).join("; ")}.</span>` : "<span>Наборы решений совпадают.</span>"}`;
}

function parseCode(text) {
  const raw = String(text ?? "").trim();
  try {
    return decodeURIComponent(raw.includes("#s=") ? raw.slice(raw.indexOf("#s=") + 3) : raw);
  } catch { return ""; }
}

/* ---------- События интерфейса ---------- */

document.addEventListener("click", (event) => {
  const place = event.target.closest(".place-button");
  if (place && !place.disabled) {
    const measureId = place.dataset.measure;
    const districtId = place.dataset.district || null;
    const chosen = decisions.find((decision) => decision.measureId === measureId);
    if (chosen && (chosen.districtId ?? null) === districtId) setDecisions(decisions.filter((decision) => decision.measureId !== measureId));
    else if (chosen) setDecisions(decisions.map((decision) => (decision.measureId === measureId ? { measureId, districtId } : decision)));
    else setDecisions([...decisions, { measureId, districtId }]);
    return;
  }
  const remove = event.target.closest("[data-remove]");
  if (remove) { setDecisions(decisions.filter((decision) => decision.measureId !== remove.dataset.remove)); return; }
  const alt = event.target.closest("[data-apply-alt]");
  if (alt && current?.alternatives) { setDecisions(current.alternatives[alt.dataset.applyAlt].decisions); renderResult(); return; }
  if (event.target.closest("#apply-single") && current?.single) { setDecisions(current.single.decisions); renderResult(); return; }
  const realloc = event.target.closest("[data-realloc]");
  if (realloc) { showReallocation(realloc.dataset.realloc); return; }
  const reallocApply = event.target.closest("[data-realloc-apply]");
  if (reallocApply && current?.realloc) { setDecisions(current.realloc.options[Number(reallocApply.dataset.reallocApply)].decisions); renderResult(); return; }
  const teamButton = event.target.closest("[data-team-compare],[data-team-open],[data-team-delete]");
  if (teamButton) {
    const teams = readTeams();
    const id = teamButton.dataset.teamCompare ?? teamButton.dataset.teamOpen ?? teamButton.dataset.teamDelete;
    const team = teams.find((item) => item.id === id);
    if (!team) return;
    if (teamButton.dataset.teamDelete) { writeTeams(teams.filter((item) => item.id !== id)); renderLeaderboard(); $("#comparison-output").textContent = `«${team.name}» удалена из таблицы.`; }
    else if (teamButton.dataset.teamOpen) { setDecisions(decodeDecisions(team.code)); renderResult(); }
    else if (current) compareWith(team);
  }
});

$("#calculate-button").addEventListener("click", renderResult);
$("#reset-button").addEventListener("click", () => { setDecisions([]); history.replaceState(null, "", location.pathname + location.search); });
$("#example-button").addEventListener("click", () => setDecisions([
  { measureId: "M7", districtId: "nura" }, { measureId: "M8", districtId: "nura" }, { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null }, { measureId: "M5", districtId: "saryarka" },
]));

$("#save-scenario").addEventListener("click", () => {
  if (!current) return;
  const name = $("#team-name").value.trim() || `Сценарий ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  const code = encodeDecisions(decisions);
  const teams = readTeams();
  const same = teams.find((item) => item.name === name);
  const next = same ? teams.map((item) => (item === same ? { ...item, code } : item)) : [...teams, { id: String(Date.now()), name, code }];
  $("#comparison-output").textContent = writeTeams(next) ? `«${name}» ${same ? "обновлена" : "добавлена"} в таблицу.` : "Браузер не разрешил сохранить данные локально.";
  renderLeaderboard();
});

$("#import-button").addEventListener("click", () => {
  const code = parseCode($("#import-code").value);
  const decoded = decodeDecisions(code);
  if (!decoded) {
    const guess = code.split("_").filter(Boolean).map((part) => ({ measureId: part.split(".")[0], districtId: part.split(".")[1] ?? null }));
    $("#comparison-output").textContent = `Код не принят: ${validate(guess).join(" ") || "неверный формат"}`;
    return;
  }
  const name = $("#import-name").value.trim() || `Команда ${readTeams().length + 1}`;
  if (!writeTeams([...readTeams(), { id: String(Date.now()), name, code: encodeDecisions(decoded) }])) {
    $("#comparison-output").textContent = "Браузер не разрешил сохранить данные локально.";
    return;
  }
  $("#import-code").value = "";
  $("#import-name").value = "";
  renderLeaderboard();
  $("#comparison-output").textContent = `«${name}» добавлена. Score ${fmt(evaluate(decoded).score)}.`;
});

$("#share-scenario").addEventListener("click", async () => {
  if (!current) return;
  const url = `${location.origin}${location.pathname}#s=${encodeDecisions(decisions)}`;
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    $("#comparison-output").textContent = "Ссылка скопирована. Другая команда откроет те же решения и получит тот же Score.";
  } catch {
    $("#comparison-output").textContent = `Скопируйте ссылку: ${url}`;
  }
});

$("#present-button").addEventListener("click", () => {
  if (!current) return;
  $("#slides").innerHTML = buildSlides({ ...current, decisions, space, teamName: $("#team-name").value.trim(), aiText: $("#ai-text").innerText });
  $("#presentation").showModal();
});
$("#close-presentation").addEventListener("click", () => $("#presentation").close());
$("#print-button").addEventListener("click", () => window.print());

/* ---------- Запуск ---------- */

renderBaseline();
renderCatalog();
const shared = decodeDecisions(new URLSearchParams(location.hash.slice(1)).get("s"));
setDecisions(shared ?? []);
if (shared) renderResult();

fetch("/api/status").then((response) => (response.ok ? response.json() : null)).then((status) => {
  if (!status?.llm) return;
  llm = { available: true, model: status.model };
  if (current) requestLlm();
}).catch(() => {});

$("#engine-status").textContent = "Оптимизатор считает…";
runOptimizer("space").then((result) => {
  space = result;
  $("#space-count").textContent = space.count.toLocaleString("ru-RU");
  $("#engine-status").textContent = `Проверено ${space.count.toLocaleString("ru-RU")} сценариев · максимум ${fmt(space.best.score)}`;
  updatePanel();
  renderSpaceParts();
  if (current) renderLeaderboard();
}).catch(() => { $("#engine-status").textContent = "Оптимизатор недоступен"; });
