import { ACTIONS, BUDGET, CATEGORIES, DISTRICTS } from "./data.mjs";
import { analyze, costOf, evaluate, findBestScenario, findBestSingleChange, getAction, getDistrict, validateSelections } from "./engine.mjs";

const selections = {};
let bestScenario;
let singleAdvice;
let currentResult;
let resultVersion = 0;
const storageKey = "bezbab-city-scenarios-v1";
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function metricRows(metrics) {
  return CATEGORIES.map((category) => `<div class="metric-row"><span>${category.label}</span><div class="metric-track"><i style="width:${metrics[category.id]}%;background:${category.color}"></i></div><strong>${Math.round(metrics[category.id])}</strong></div>`).join("");
}

function districtCards(districts, target) {
  target.innerHTML = districts.map((district, index) => `<article class="district-card"><div class="district-top"><span class="district-index">0${index + 1} / РАЙОН</span><span class="district-pop">${Math.round(district.population / 1000)} тыс. жителей</span></div><h3>${district.name}</h3><div class="metrics">${metricRows(district.metrics)}</div></article>`).join("");
}

function renderDecisions() {
  $("#decision-cards").innerHTML = CATEGORIES.map((category, index) => `<article class="decision-card" data-category="${category.id}">
    <div class="decision-header"><span class="decision-index">0${index + 1}</span><span class="category-icon" style="color:${category.color}">${category.icon}</span><div><span class="decision-kicker">НАПРАВЛЕНИЕ 0${index + 1}</span><h3>${category.label}</h3></div><span class="chosen-cost" id="cost-${category.id}">Не выбрано</span></div>
    <div class="decision-body"><p>Выберите мероприятие</p><div class="action-options" role="group" aria-label="${category.label}: мероприятие">${ACTIONS[category.id].map((action) => `<button class="action-option" type="button" data-category="${category.id}" data-action="${action.id}" aria-pressed="false"><span class="action-main"><strong>${action.name}</strong><small>${action.description}</small></span><span class="action-cost">${action.cost} ед.</span></button>`).join("")}</div>
    <label class="district-label" for="district-${category.id}">Район внедрения <select id="district-${category.id}" data-category="${category.id}"><option value="">Выберите район</option>${DISTRICTS.map((district) => `<option value="${district.id}">${district.name}</option>`).join("")}</select></label></div>
  </article>`).join("");
}

function updateState() {
  resultVersion += 1;
  currentResult = null;
  const cost = costOf(selections);
  const completed = CATEGORIES.filter((category) => selections[category.id]?.actionId && selections[category.id]?.districtId).length;
  $("#spent").textContent = cost;
  $("#remaining").textContent = `Осталось ${BUDGET - cost} ед.`;
  $("#remaining").classList.toggle("danger", cost > BUDGET);
  $("#budget-fill").style.width = `${Math.min(100, cost / BUDGET * 100)}%`;
  $("#budget-fill").classList.toggle("over", cost > BUDGET);
  $("#selection-progress").innerHTML = CATEGORIES.map((category) => `<div class="progress-line"><span class="progress-dot ${selections[category.id]?.actionId && selections[category.id]?.districtId ? "done" : ""}"></span><span>${category.label}</span><strong>${selections[category.id]?.actionId && selections[category.id]?.districtId ? "Готово" : "—"}</strong></div>`).join("");
  $("#calculate-button").disabled = completed !== 5 || cost > BUDGET;
  $("#validation-message").textContent = cost > BUDGET ? `Бюджет превышен на ${cost - BUDGET} ед. Выберите более доступное мероприятие.` : completed === 5 ? "Пять решений готовы. Можно рассчитать сценарий." : `Выбрано ${completed} из 5 решений.`;
  CATEGORIES.forEach((category) => {
    const selected = selections[category.id]?.actionId;
    const action = getAction(category.id, selected);
    $(`#cost-${category.id}`).textContent = action ? `${action.cost} ед.` : "Не выбрано";
    document.querySelectorAll(`[data-category="${category.id}"].action-option`).forEach((button) => {
      const active = button.dataset.action === selected;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $(`#district-${category.id}`).value = selections[category.id]?.districtId ?? "";
  });
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

function renderResult(result) {
  const version = ++resultVersion;
  currentResult = result;
  const analysis = analyze(result);
  $("#final-score").textContent = result.score;
  $("#score-change").textContent = `+${result.delta} пункта к исходному уровню`;
  $("#baseline-score").textContent = result.baseline;
  $("#after-score").textContent = result.score;
  $("#baseline-fill").style.width = `${result.baseline}%`;
  $("#after-fill").style.width = `${result.score}%`;
  $("#strengths-list").innerHTML = analysis.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  $("#risks-list").innerHTML = analysis.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  districtCards(result.districts, $("#district-results-grid"));
  $("#results").hidden = false;
  $("#advisor-copy").textContent = "Сравниваем допустимые комбинации решений...";
  $("#apply-advice").disabled = true;
  singleAdvice = findBestSingleChange(selections);
  $("#apply-single-advice").disabled = !singleAdvice;
  if (singleAdvice) {
    const before = getAction(singleAdvice.categoryId, singleAdvice.from.actionId);
    const after = getAction(singleAdvice.categoryId, singleAdvice.to.actionId);
    const district = getDistrict(singleAdvice.to.districtId);
    const gain = Math.round((singleAdvice.result.score - result.score) * 10) / 10;
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
    const improvement = Math.round((bestScenario.result.score - result.score) * 10) / 10;
    if (improvement > 0) {
      $("#advisor-copy").textContent = `Мы проверили все допустимые сочетания. Можно получить ${bestScenario.result.score} из 100 (+${improvement} п. к вашему сценарию) при расходе ${bestScenario.result.cost} ед. Это математический максимум данной модели, а не прогноз реального города.`;
      $("#apply-advice").disabled = false;
    } else {
      $("#advisor-copy").textContent = "Вы нашли один из лучших сценариев по правилам этой модели. Измените выбор, чтобы проверить другие компромиссы.";
    }
  }, 50);
}

document.addEventListener("click", (event) => {
  const option = event.target.closest(".action-option");
  if (option) setChoice(option.dataset.category, { actionId: option.dataset.action });
});
document.addEventListener("change", (event) => {
  if (event.target.matches("select[data-category]")) setChoice(event.target.dataset.category, { districtId: event.target.value });
});
$("#calculate-button").addEventListener("click", () => {
  const errors = validateSelections(selections);
  if (errors.length) { $("#validation-message").textContent = errors.join(" "); return; }
  renderResult(evaluate(selections));
});
$("#reset-button").addEventListener("click", () => { CATEGORIES.forEach((category) => delete selections[category.id]); updateState(); window.scrollTo({ top: $("#decisions").offsetTop, behavior: "smooth" }); });
$("#apply-advice").addEventListener("click", () => {
  if (!bestScenario) return;
  CATEGORIES.forEach((category) => { selections[category.id] = { ...bestScenario.selections[category.id] }; });
  updateState();
  renderResult(bestScenario.result);
});
$("#apply-single-advice").addEventListener("click", () => {
  if (!singleAdvice) return;
  CATEGORIES.forEach((category) => { selections[category.id] = { ...singleAdvice.selections[category.id] }; });
  updateState();
  renderResult(singleAdvice.result);
});

function readSavedScenarios() {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(items) ? items.filter((item) => item && typeof item.id === "string" && item.selections && evaluate(item.selections).valid).slice(-5) : [];
  } catch { return []; }
}

function renderSavedScenarios() {
  const items = readSavedScenarios();
  $("#saved-scenarios").innerHTML = items.length ? items.map((item) => {
    const result = evaluate(item.selections);
    return `<div class="saved-row"><div><strong>${escapeHtml(item.name)}</strong><span>Score ${result.score} · ${result.cost} ед.</span></div><button type="button" data-compare="${escapeHtml(item.id)}">Сравнить ↗</button></div>`;
  }).join("") : '<p class="empty-scenarios">Пока нет сохранённых сценариев.</p>';
}

$("#save-scenario").addEventListener("click", () => {
  if (!currentResult?.valid) return;
  const items = readSavedScenarios();
  const item = { id: String(Date.now()), name: `Сценарий ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`, selections: structuredClone(selections) };
  try {
    localStorage.setItem(storageKey, JSON.stringify([...items, item].slice(-5)));
    renderSavedScenarios();
    $("#comparison-output").textContent = "Сценарий сохранён в этом браузере.";
  } catch { $("#comparison-output").textContent = "Браузер не разрешил сохранить сценарий локально."; }
});

$("#saved-scenarios").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-compare]");
  if (!button || !currentResult?.valid) return;
  const saved = readSavedScenarios().find((item) => item.id === button.dataset.compare);
  if (!saved) return;
  const previous = evaluate(saved.selections);
  const scoreDifference = Math.round((currentResult.score - previous.score) * 10) / 10;
  const costDifference = currentResult.cost - previous.cost;
  const changed = CATEGORIES.filter((category) => JSON.stringify(saved.selections[category.id]) !== JSON.stringify(selections[category.id])).map((category) => category.label.toLowerCase());
  const verdict = scoreDifference === 0 ? "даёт такой же Score" : `${scoreDifference > 0 ? "лучше" : "хуже"} на ${Math.abs(scoreDifference)} п.`;
  $("#comparison-output").innerHTML = `<strong>Текущий сценарий ${verdict}</strong><span>Разница в расходах: ${costDifference >= 0 ? "+" : ""}${costDifference} ед. Изменены направления: ${changed.length ? escapeHtml(changed.join(", ")) : "нет"}.</span>`;
});

districtCards(DISTRICTS, $("#baseline-grid"));
renderDecisions();
updateState();
