import { ACTIONS, BUDGET, CATEGORIES, DISTRICTS } from "./data.mjs";
import { analyze, costOf, decodeSelections, encodeSelections, evaluate, findBestScenario, findBestSingleChange, getAction, getDistrict, previewGain, validateSelections } from "./engine.mjs";

const selections = {};
let bestScenario;
let singleAdvice;
let currentResult;
let resultVersion = 0;
const storageKey = "bezbab-city-scenarios-v1";
const maxSaved = 6;
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const round = (value) => Math.round(value * 10) / 10;
const signed = (value) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(round(value))}`;
const categoryOf = (id) => CATEGORIES.find((category) => category.id === id);
const isComplete = (choice) => Boolean(choice?.actionId && choice?.districtId);
const mean = (metrics) => CATEGORIES.reduce((sum, category) => sum + metrics[category.id], 0) / CATEGORIES.length;

function metricRows(metrics, before) {
  return CATEGORIES.map((category) => {
    const change = before ? round(metrics[category.id] - before[category.id]) : 0;
    const badge = change > 0 ? `<em class="metric-delta">+${change}</em>` : "";
    const ghost = change > 0 ? `<b style="left:${before[category.id]}%;width:${change}%;background:${category.color}"></b>` : "";
    return `<div class="metric-row"><span>${category.label}</span><div class="metric-track"><i style="width:${before ? before[category.id] : metrics[category.id]}%;background:${category.color}"></i>${ghost}</div><strong>${Math.round(metrics[category.id])}${badge}</strong></div>`;
  }).join("");
}

function districtCards(districts, target, compareWithBaseline = false) {
  target.innerHTML = districts.map((district, index) => {
    const before = compareWithBaseline ? getDistrict(district.id).metrics : null;
    const summary = before
      ? `<p class="district-summary">Средняя оценка ${round(mean(before))} → <strong>${round(mean(district.metrics))}</strong> <span>${signed(mean(district.metrics) - mean(before))} п.</span></p>`
      : `<p class="district-summary">Средняя оценка <strong>${round(mean(district.metrics))}</strong></p>`;
    return `<article class="district-card"><div class="district-top"><span class="district-index">0${index + 1} / РАЙОН</span><span class="district-pop">${Math.round(district.population / 1000)} тыс. жителей</span></div><h3>${district.name}</h3>${summary}<div class="metrics">${metricRows(district.metrics, before)}</div></article>`;
  }).join("");
}

function renderDecisions() {
  $("#decision-cards").innerHTML = CATEGORIES.map((category, index) => `<article class="decision-card" data-category="${category.id}">
    <div class="decision-header"><span class="decision-index">0${index + 1}</span><span class="category-icon" style="color:${category.color}">${category.icon}</span><div><span class="decision-kicker">НАПРАВЛЕНИЕ 0${index + 1}</span><h3>${category.label}</h3></div><span class="chosen-cost" id="cost-${category.id}">Не выбрано</span></div>
    <div class="decision-body"><p>Выберите мероприятие</p><div class="action-options" role="group" aria-label="${category.label}: мероприятие">${ACTIONS[category.id].map((action) => `<button class="action-option" type="button" data-category="${category.id}" data-action="${action.id}" aria-pressed="false"><span class="action-main"><strong>${action.name}</strong><small>${action.description}</small></span><span class="action-foot"><span class="action-cost">${action.cost} ед.</span><em class="action-gain" data-gain></em></span></button>`).join("")}</div>
    <label class="district-label" for="district-${category.id}">Район внедрения <select id="district-${category.id}" data-category="${category.id}"><option value="">Выберите район</option>${DISTRICTS.map((district) => `<option value="${district.id}">${district.name}</option>`).join("")}</select></label></div>
  </article>`).join("");
}

function updateLivePreview(completed, cost) {
  const box = $("#live-score");
  if (completed !== CATEGORIES.length || cost > BUDGET) { box.hidden = true; return; }
  const preview = evaluate(selections);
  box.hidden = !preview.valid;
  if (preview.valid) box.innerHTML = `<span>Прогноз Score</span><strong>${preview.score}</strong><small>${signed(preview.delta)} п. к исходному ${preview.baseline}</small>`;
}

function updateState() {
  resultVersion += 1;
  currentResult = null;
  const cost = costOf(selections);
  const completed = CATEGORIES.filter((category) => isComplete(selections[category.id])).length;
  $("#spent").textContent = cost;
  $("#remaining").textContent = `Осталось ${BUDGET - cost} ед.`;
  $("#remaining").classList.toggle("danger", cost > BUDGET);
  $("#budget-fill").style.width = `${Math.min(100, cost / BUDGET * 100)}%`;
  $("#budget-fill").classList.toggle("over", cost > BUDGET);
  $("#selection-progress").innerHTML = CATEGORIES.map((category) => {
    const choice = selections[category.id];
    const action = getAction(category.id, choice?.actionId);
    const district = getDistrict(choice?.districtId);
    const detail = isComplete(choice) ? `${action.cost} ед. · ${district.name}` : action ? "нужен район" : district ? "нужно мероприятие" : "—";
    return `<div class="progress-line"><span class="progress-dot ${isComplete(choice) ? "done" : ""}"></span><span>${category.label}</span><strong>${detail}</strong></div>`;
  }).join("");
  $("#calculate-button").disabled = completed !== CATEGORIES.length || cost > BUDGET;
  $("#validation-message").textContent = cost > BUDGET ? `Бюджет превышен на ${cost - BUDGET} ед. Выберите более доступное мероприятие.` : completed === CATEGORIES.length ? "Пять решений готовы. Можно рассчитать сценарий." : `Выбрано ${completed} из ${CATEGORIES.length} решений.`;
  CATEGORIES.forEach((category) => {
    const choice = selections[category.id];
    const action = getAction(category.id, choice?.actionId);
    const district = getDistrict(choice?.districtId);
    const costWithout = cost - (action?.cost ?? 0);
    $(`#cost-${category.id}`).textContent = action ? `${action.cost} ед.` : "Не выбрано";
    $(`.decision-card[data-category="${category.id}"]`).classList.toggle("complete", isComplete(choice));
    document.querySelectorAll(`[data-category="${category.id}"].action-option`).forEach((button) => {
      const option = getAction(category.id, button.dataset.action);
      const active = option.id === action?.id;
      const shortfall = costWithout + option.cost - BUDGET;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("unaffordable", !active && shortfall > 0);
      button.title = !active && shortfall > 0 ? `Не хватает ${shortfall} ед. бюджета` : "";
      button.querySelector("[data-gain]").textContent = district ? `≈ +${previewGain(category.id, option.id, district.id)} п.` : "";
    });
    const select = $(`#district-${category.id}`);
    select.value = choice?.districtId ?? "";
    [...select.options].forEach((item) => {
      const target = getDistrict(item.value);
      if (!target) return;
      const baseline = target.metrics[category.id];
      item.textContent = action ? `${target.name} — сейчас ${baseline}, эффект ≈ +${previewGain(category.id, action.id, target.id)} п.` : `${target.name} — сейчас ${baseline} из 100`;
    });
  });
  updateLivePreview(completed, cost);
  // Ссылка в адресной строке не должна указывать на другой сценарий.
  if (location.hash.startsWith("#s=") && location.hash !== `#s=${encodeSelections(selections)}`) history.replaceState(null, "", location.pathname + location.search);
  $("#results").hidden = true;
}

function setChoice(categoryId, patch) {
  const previous = selections[categoryId] ?? {};
  const candidate = { ...selections, [categoryId]: { ...previous, ...patch } };
  if (costOf(candidate) > BUDGET) {
    $("#validation-message").textContent = `Недостаточно бюджета для этого мероприятия: нужно ещё ${costOf(candidate) - BUDGET} ед. Выберите более доступное.`;
    return;
  }
  selections[categoryId] = candidate[categoryId];
  updateState();
}

function applySelections(next) {
  CATEGORIES.forEach((category) => { selections[category.id] = { ...next[category.id] }; });
  updateState();
}

function renderImpacts(result) {
  $("#impact-list").innerHTML = result.impacts.map((impact) => {
    const category = categoryOf(impact.categoryId);
    const other = categoryOf(impact.otherId);
    const action = getAction(impact.categoryId, impact.actionId);
    const district = getDistrict(impact.districtId);
    const efficiency = round(impact.direct / impact.cost * 10);
    return `<div class="impact-row"><span class="category-icon" style="color:${category.color}">${category.icon}</span><div class="impact-main"><strong>${escapeHtml(action.name)}</strong><span>${category.label} · район ${district.name}</span></div><div class="impact-numbers"><span><b>+${impact.direct}</b> ${category.label.toLowerCase()}</span><span>+${impact.indirect} ${other.label.toLowerCase()} (побочно)</span></div><div class="impact-cost"><b>${impact.cost} ед.</b><span>${efficiency} п. на 10 ед.</span></div></div>`;
  }).join("");
}

function renderResult(result) {
  const version = ++resultVersion;
  currentResult = result;
  const analysis = analyze(result);
  $("#final-score").textContent = result.score;
  $("#score-change").textContent = `${signed(result.delta)} п. к исходному уровню`;
  $("#baseline-score").textContent = result.baseline;
  $("#after-score").textContent = result.score;
  $("#baseline-fill").style.width = `${result.baseline}%`;
  $("#after-fill").style.width = `${result.score}%`;
  $("#score-details").textContent = `Бюджет: ${result.cost} из ${result.budget} ед. · Разрыв между районами: ${result.baselineGap} → ${result.gap} п.${result.equityPenalty > 0 ? ` · Штраф за неравномерность: −${result.equityPenalty}` : ""}`;
  $("#strengths-list").innerHTML = analysis.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  $("#risks-list").innerHTML = analysis.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  renderImpacts(result);
  districtCards(result.districts, $("#district-results-grid"), true);
  $("#results").hidden = false;
  $("#advisor-copy").textContent = "Сравниваем допустимые комбинации решений...";
  $("#apply-advice").disabled = true;
  singleAdvice = findBestSingleChange(selections);
  $("#apply-single-advice").disabled = !singleAdvice;
  if (singleAdvice) {
    const before = getAction(singleAdvice.categoryId, singleAdvice.from.actionId);
    const after = getAction(singleAdvice.categoryId, singleAdvice.to.actionId);
    const district = getDistrict(singleAdvice.to.districtId);
    const gain = round(singleAdvice.result.score - result.score);
    const instruction = before.id === after.id
      ? `перенесите «${after.name}» в район ${district.name}`
      : `замените «${before.name}» на «${after.name}» в районе ${district.name}`;
    $("#single-advice-copy").textContent = `Один шаг: ${instruction}. Score вырастет на ${gain} п. до ${singleAdvice.result.score}; стоимость сценария — ${singleAdvice.result.cost} ед.`;
  } else {
    $("#single-advice-copy").textContent = "Одной заменой улучшить этот сценарий не удалось.";
  }
  $("#comparison-output").textContent = "";
  renderSavedScenarios();
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });

  // Вычисление отложено, чтобы результат отрисовался до полного перебора.
  setTimeout(() => {
    if (version !== resultVersion) return;
    bestScenario ??= findBestScenario();
    if (version !== resultVersion) return;
    const improvement = round(bestScenario.result.score - result.score);
    if (improvement > 0) {
      const changed = CATEGORIES.filter((category) => JSON.stringify(bestScenario.selections[category.id]) !== JSON.stringify(selections[category.id])).length;
      $("#advisor-copy").textContent = `Мы проверили все допустимые сочетания. Можно получить ${bestScenario.result.score} из 100 (+${improvement} п. к вашему сценарию) при расходе ${bestScenario.result.cost} ед., изменив ${changed} из ${CATEGORIES.length} решений. Это математический максимум данной модели, а не прогноз реального города.`;
      $("#apply-advice").disabled = false;
    } else {
      $("#advisor-copy").textContent = "Вы нашли один из лучших сценариев по правилам этой модели. Измените выбор, чтобы проверить другие компромиссы.";
    }
  }, 50);
}

function calculate() {
  const errors = validateSelections(selections);
  if (errors.length) { $("#validation-message").textContent = errors.join(" "); return; }
  renderResult(evaluate(selections));
}

document.addEventListener("click", (event) => {
  const option = event.target.closest(".action-option");
  if (option) setChoice(option.dataset.category, { actionId: option.dataset.action });
});
document.addEventListener("change", (event) => {
  if (event.target.matches("select[data-category]")) setChoice(event.target.dataset.category, { districtId: event.target.value });
});
$("#calculate-button").addEventListener("click", calculate);
$("#reset-button").addEventListener("click", () => {
  CATEGORIES.forEach((category) => delete selections[category.id]);
  history.replaceState(null, "", location.pathname + location.search);
  updateState();
  window.scrollTo({ top: $("#decisions").offsetTop, behavior: "smooth" });
});
$("#apply-advice").addEventListener("click", () => {
  if (!bestScenario) return;
  applySelections(bestScenario.selections);
  renderResult(bestScenario.result);
});
$("#apply-single-advice").addEventListener("click", () => {
  if (!singleAdvice) return;
  applySelections(singleAdvice.selections);
  renderResult(singleAdvice.result);
});

function readSavedScenarios() {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(items) ? items.filter((item) => item && typeof item.id === "string" && item.selections && evaluate(item.selections).valid).slice(-maxSaved) : [];
  } catch { return []; }
}

function writeSavedScenarios(items) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items.slice(-maxSaved)));
    return true;
  } catch { return false; }
}

function renderSavedScenarios() {
  const items = readSavedScenarios();
  const bestScore = Math.max(...items.map((item) => evaluate(item.selections).score));
  $("#saved-scenarios").innerHTML = items.length ? items.map((item) => {
    const result = evaluate(item.selections);
    const leader = items.length > 1 && result.score === bestScore ? '<em class="saved-leader">лучший</em>' : "";
    return `<div class="saved-row"><div><strong>${escapeHtml(item.name)} ${leader}</strong><span>Score ${result.score} · ${result.cost} ед.</span></div><div class="saved-actions"><button type="button" data-compare="${escapeHtml(item.id)}">Сравнить</button><button type="button" data-load="${escapeHtml(item.id)}">Открыть</button><button type="button" data-delete="${escapeHtml(item.id)}" aria-label="Удалить ${escapeHtml(item.name)}">Удалить</button></div></div>`;
  }).join("") : '<p class="empty-scenarios">Пока нет сохранённых сценариев.</p>';
}

function compareWith(saved) {
  const previous = evaluate(saved.selections);
  const scoreDifference = round(currentResult.score - previous.score);
  const costDifference = currentResult.cost - previous.cost;
  const verdict = scoreDifference === 0 ? "такой же Score" : `${scoreDifference > 0 ? "лучше" : "хуже"} на ${Math.abs(scoreDifference)} п.`;
  const costText = costDifference === 0 ? "расходы те же" : `расходы ${costDifference > 0 ? "больше" : "меньше"} на ${Math.abs(costDifference)} ед.`;
  const rows = CATEGORIES.filter((category) => JSON.stringify(saved.selections[category.id]) !== JSON.stringify(selections[category.id])).map((category) => {
    const describe = (choice) => `${getAction(category.id, choice.actionId).name}, ${getDistrict(choice.districtId).name}`;
    return `<li><b>${category.label}:</b> ${escapeHtml(describe(saved.selections[category.id]))} → ${escapeHtml(describe(selections[category.id]))}</li>`;
  });
  $("#comparison-output").innerHTML = `<strong>Текущий сценарий против «${escapeHtml(saved.name)}»: ${verdict}</strong><span>${costText[0].toUpperCase() + costText.slice(1)}; изменено направлений: ${rows.length}.</span>${rows.length ? `<ul>${rows.join("")}</ul>` : ""}`;
}

$("#save-scenario").addEventListener("click", () => {
  if (!currentResult?.valid) return;
  const items = readSavedScenarios();
  const duplicate = items.find((item) => encodeSelections(item.selections) === encodeSelections(selections));
  if (duplicate) { $("#comparison-output").textContent = `Этот сценарий уже сохранён как «${duplicate.name}».`; return; }
  const name = `Сценарий ${items.length + 1} · ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  const item = { id: String(Date.now()), name, selections: structuredClone(selections) };
  const saved = writeSavedScenarios([...items, item]);
  renderSavedScenarios();
  $("#comparison-output").textContent = saved
    ? `Сценарий сохранён в этом браузере.${items.length >= maxSaved ? ` Хранятся последние ${maxSaved}.` : ""}`
    : "Браузер не разрешил сохранить сценарий локально.";
});

$("#saved-scenarios").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const items = readSavedScenarios();
  const id = button.dataset.compare ?? button.dataset.load ?? button.dataset.delete;
  const saved = items.find((item) => item.id === id);
  if (!saved) return;
  if (button.dataset.delete) {
    writeSavedScenarios(items.filter((item) => item.id !== id));
    renderSavedScenarios();
    $("#comparison-output").textContent = `«${saved.name}» удалён.`;
  } else if (button.dataset.load) {
    applySelections(saved.selections);
    calculate();
  } else if (currentResult?.valid) {
    compareWith(saved);
  }
});

$("#share-scenario").addEventListener("click", async () => {
  if (!currentResult?.valid) return;
  const url = `${location.origin}${location.pathname}#s=${encodeSelections(selections)}`;
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    $("#comparison-output").textContent = location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "Локальная ссылка скопирована. На другом компьютере сначала запустите проект, затем откройте эту ссылку с адресом своего локального сервера."
      : "Ссылка на сценарий скопирована. При открытии восстановятся те же решения и Score.";
  } catch {
    $("#comparison-output").textContent = `Скопируйте ссылку из адресной строки: ${url}`;
  }
});

// Хэш читается до первой отрисовки, иначе updateState сочтёт его устаревшим.
const shared = decodeSelections(new URLSearchParams(location.hash.slice(1)).get("s"));
districtCards(DISTRICTS, $("#baseline-grid"));
renderDecisions();
if (shared) {
  applySelections(shared);
  calculate();
} else {
  updateState();
}
