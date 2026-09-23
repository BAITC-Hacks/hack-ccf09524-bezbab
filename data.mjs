export const BUDGET = 100;

export const CATEGORIES = [
  { id: "transport", label: "Транспорт", icon: "↗", color: "#d8613b" },
  { id: "green", label: "Озеленение", icon: "✳", color: "#528d68" },
  { id: "social", label: "Социальная инфраструктура", icon: "⌂", color: "#6675b5" },
  { id: "safety", label: "Безопасность", icon: "◇", color: "#c18b41" },
  { id: "service", label: "Городской сервис", icon: "◉", color: "#648e9c" },
];

// Синтетические данные: 0 — низкое качество, 100 — высокое.
export const DISTRICTS = [
  { id: "saryarka", name: "Сарыарка", population: 42000, metrics: { transport: 48, green: 43, social: 65, safety: 56, service: 51 } },
  { id: "esil", name: "Есиль", population: 35000, metrics: { transport: 68, green: 61, social: 58, safety: 63, service: 70 } },
  { id: "almaty", name: "Алматы", population: 53000, metrics: { transport: 42, green: 52, social: 46, safety: 49, service: 44 } },
];

export const ACTIONS = {
  transport: [
    { id: "bus", name: "Выделенные автобусные полосы", cost: 24, gain: 19, description: "Снижает задержки общественного транспорта." },
    { id: "signals", name: "Умные светофоры", cost: 18, gain: 14, description: "Сокращает заторы на ключевых перекрёстках." },
    { id: "walk", name: "Безопасные пешие маршруты", cost: 12, gain: 9, description: "Повышает доступность коротких поездок." },
  ],
  green: [
    { id: "park", name: "Новый районный парк", cost: 25, gain: 21, description: "Увеличивает площадь доступных зелёных зон." },
    { id: "trees", name: "Озеленение улиц", cost: 16, gain: 14, description: "Создаёт тень и улучшает пешеходную среду." },
    { id: "yards", name: "Зелёные дворы", cost: 10, gain: 8, description: "Быстро улучшает ближайшее окружение домов." },
  ],
  social: [
    { id: "clinic", name: "Районная поликлиника", cost: 28, gain: 22, description: "Повышает доступность базовой медицины." },
    { id: "hub", name: "Общественный центр", cost: 19, gain: 15, description: "Даёт жителям пространство для услуг и занятий." },
    { id: "school", name: "Модернизация школы", cost: 14, gain: 11, description: "Улучшает условия обучения без нового строительства." },
  ],
  safety: [
    { id: "lighting", name: "Освещение улиц", cost: 17, gain: 16, description: "Улучшает безопасность вечерних маршрутов." },
    { id: "crossings", name: "Безопасные переходы", cost: 15, gain: 13, description: "Снижает риск дорожных происшествий." },
    { id: "response", name: "Быстрое реагирование", cost: 11, gain: 8, description: "Ускоряет обработку инцидентов." },
  ],
  service: [
    { id: "portal", name: "Единый портал обращений", cost: 15, gain: 15, description: "Делает заявки жителей прозрачнее." },
    { id: "repair", name: "Сервис ремонта улиц", cost: 20, gain: 18, description: "Ускоряет устранение городских дефектов." },
    { id: "feedback", name: "Обратная связь по районам", cost: 9, gain: 8, description: "Помогает находить локальные проблемы." },
  ],
};
