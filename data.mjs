// Синтетический датасет хакатона. Все показатели 0–100, больше — лучше.
// Проблемы (пробки, смог) уже «перевёрнуты»: 100 = проблемы нет.

export const BUDGET = 100;
export const DECISIONS_REQUIRED = 5;
export const MAX_PER_DIRECTION = 2;
export const HORIZON = 8; // кварталов, то есть 2 условных года

export const SCORE_RULES = {
  averageWeight: 0.7, // доля средневзвешенной по населению оценки города
  weakestWeight: 0.3, // доля оценки самого слабого района
  criticalThreshold: 40, // значение строго ниже — критическое
  criticalPenalty: 1, // штраф за каждую пару «район × показатель»
};

export const DIRECTIONS = [
  { id: "transport", label: "Транспорт", icon: "↗", color: "#d8613b" },
  { id: "ecology", label: "Экология", icon: "✳", color: "#528d68" },
  { id: "social", label: "Соцсфера", icon: "⌂", color: "#6675b5" },
  { id: "safety", label: "Безопасность", icon: "◇", color: "#b07a2a" },
  { id: "service", label: "Сервисы", icon: "◉", color: "#4f8193" },
];

export const INDICATORS = [
  { id: "T1", direction: "transport", name: "Разгрузка дорог", weight: 0.1, meaning: "100 — нет пробок в час пик, 0 — стоит всё" },
  { id: "T2", direction: "transport", name: "Доступность общественного транспорта", weight: 0.1, meaning: "100 — все жители в 500 м от остановки с интервалом ≤10 мин" },
  { id: "E1", direction: "ecology", name: "Озеленение", weight: 0.09, meaning: "100 — ≥20 м² зелени на жителя" },
  { id: "E2", direction: "ecology", name: "Качество воздуха", weight: 0.11, meaning: "100 — зимой AQI ≤50, 0 — хронический смог" },
  { id: "S1", direction: "social", name: "Школы и детсады", weight: 0.11, meaning: "100 — 100% нормативной потребности, без второй смены" },
  { id: "S2", direction: "social", name: "Поликлиники и первичная медпомощь", weight: 0.11, meaning: "100 — норматив на жителя выполнен полностью" },
  { id: "B1", direction: "safety", name: "Безопасность улиц", weight: 0.09, meaning: "100 — освещение и камеры везде, минимум происшествий" },
  { id: "B2", direction: "safety", name: "Безопасность дорожного движения", weight: 0.09, meaning: "100 — минимум ДТП с пострадавшими" },
  { id: "C1", direction: "service", name: "Надёжность ЖКХ", weight: 0.1, meaning: "100 — нет аварий отопления и воды за год" },
  { id: "C2", direction: "service", name: "Скорость решения обращений", weight: 0.1, meaning: "100 — все обращения закрыты в срок" },
];

export const DISTRICTS = [
  { id: "esil", name: "Есиль", share: 0.27, profile: "Богатый, но с пробками на мостах и переполненными школами.", metrics: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 } },
  { id: "almaty", name: "Алматы", share: 0.24, profile: "Старое ЖКХ и пробки.", metrics: { T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 } },
  { id: "saryarka", name: "Сарыарка", share: 0.2, profile: "Смог от частного сектора, слабое озеленение.", metrics: { T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 } },
  { id: "baikonur", name: "Байконур", share: 0.13, profile: "Середняк без ярких перекосов.", metrics: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 } },
  { id: "nura", name: "Нура", share: 0.16, profile: "Главный аутсайдер по соцсфере и транспорту.", metrics: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 } },
];

// scope: "district" — эффект в одном выбранном районе, "city" — во всех пяти.
// lag — через сколько кварталов мера начинает работать; реализуется доля (HORIZON − lag) / HORIZON.
export const MEASURES = [
  { id: "M1", direction: "transport", name: "Выделенные полосы для автобусов", scope: "district", cost: 18, lag: 2, effects: { T1: 6, T2: 9 } },
  { id: "M2", direction: "transport", name: "Умные светофоры (адаптивное управление)", scope: "city", cost: 22, lag: 2, effects: { T1: 4, B2: 3 } },
  { id: "M3", direction: "transport", name: "Линия ЛРТ / расширение", scope: "district", cost: 30, lag: 4, effects: { T1: 16, T2: 20, E2: 4 } },
  { id: "M4", direction: "ecology", name: "Парк / сквер", scope: "district", cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 } },
  { id: "M5", direction: "ecology", name: "Перевод частного сектора на чистое топливо", scope: "district", cost: 25, lag: 3, effects: { E2: 14, C1: 4 } },
  { id: "M6", direction: "ecology", name: "Городская программа озеленения и ветрозащитных полос", scope: "city", cost: 20, lag: 4, effects: { E1: 5, E2: 3 } },
  { id: "M7", direction: "social", name: "Школа + детсад (модульное строительство)", scope: "district", cost: 24, lag: 3, effects: { S1: 16 } },
  { id: "M8", direction: "social", name: "Центр семейного здоровья / поликлиника", scope: "district", cost: 20, lag: 3, effects: { S2: 14 } },
  { id: "M9", direction: "social", name: "Дворовые спорт-хабы", scope: "district", cost: 10, lag: 1, effects: { S1: 3, S2: 3, B1: 3 } },
  { id: "M10", direction: "safety", name: "Освещение и камеры (расширение Safe City)", scope: "district", cost: 12, lag: 1, effects: { B1: 12, B2: 2 } },
  { id: "M11", direction: "safety", name: "Безопасные переходы и школьные зоны", scope: "district", cost: 10, lag: 1, effects: { B2: 12, T1: -2 } },
  { id: "M12", direction: "service", name: "Единая цифровая платформа обращений", scope: "city", cost: 14, lag: 1, effects: { C2: 5 } },
  { id: "M13", direction: "service", name: "Модернизация тепло- и водосетей", scope: "district", cost: 28, lag: 4, effects: { C1: 18, E2: 2 } },
  { id: "M14", direction: "service", name: "Аварийные бригады ЖКХ + раннее оповещение", scope: "city", cost: 16, lag: 1, effects: { C1: 5, C2: 2 } },
];

// Фиксированный бонус, лагом не масштабируется. Даётся в районе первой меры пары.
export const SYNERGIES = [
  { measures: ["M1", "M2"], indicator: "T1", bonus: 2, note: "автобусные полосы работают лучше с адаптивными светофорами" },
  { measures: ["M10", "M12"], indicator: "B1", bonus: 2, note: "жалобы с платформы помогают расставлять камеры и свет" },
  { measures: ["M5", "M6"], indicator: "E2", bonus: 2, note: "чистое топливо и ветрозащитные полосы вместе снижают смог" },
];

// sameDistrict: false — пара запрещена в любых районах.
export const CONFLICTS = [
  { measures: ["M1", "M3"], sameDistrict: false, reason: "либо BRT, либо ЛРТ" },
  { measures: ["M4", "M7"], sameDistrict: true, reason: "конфликт за земельный участок" },
  { measures: ["M5", "M13"], sameDistrict: true, reason: "дублирование программы" },
];

// Расширение для стресс-теста (опциональный пункт задачи). На официальный Score не влияет.
// Событие бьёт по показателям района; ликвидация оплачивается из резерва бюджета.
export const EVENTS = [
  { id: "heat", name: "Авария на теплотрассе зимой", districtId: "almaty", shocks: { C1: -12, C2: -4 }, responseCost: 12, mitigatedBy: ["M13", "M14"], text: "Старые сети Алматы не выдержали морозов: без отопления остались кварталы." },
  { id: "smog", name: "Смоговый эпизод", districtId: "saryarka", shocks: { E2: -10 }, responseCost: 10, mitigatedBy: ["M5", "M6"], text: "Безветренная неделя и печи частного сектора — AQI выше 200." },
  { id: "school", name: "Всплеск набора в первые классы", districtId: "esil", shocks: { S1: -10 }, responseCost: 14, mitigatedBy: ["M7", "M9"], text: "Новые ЖК сдали раньше срока — школы уходят в третью смену." },
  { id: "crash", name: "Серия ДТП у школ", districtId: "nura", shocks: { B2: -12, B1: -3 }, responseCost: 8, mitigatedBy: ["M11", "M10"], text: "Три ДТП с детьми за месяц — прокуратура требует срочных мер." },
];
