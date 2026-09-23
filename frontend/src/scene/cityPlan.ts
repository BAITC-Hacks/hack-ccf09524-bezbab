import type { Initiative } from "../data/initiatives";
export const districtLayout = [
  { id: "saryarka", x: -19, z: -17, color: "#789eb2" },
  { id: "baikonyr", x: 19, z: -17, color: "#ac91b3" },
  { id: "yesil", x: -19, z: 17, color: "#728bcc" },
  { id: "almaty", x: 19, z: 17, color: "#cda077" },
  { id: "nura", x: -19, z: 49, color: "#77a88c" },
];
export const visualDescriptions: Record<string, string> = {
  M1: "Выделенная полоса, остановки и автобус в выбранном районе.",
  M2: "Адаптивные светофоры на перекрёстках всех пяти районов.",
  M3: "Эстакада ЛРТ с рельсами, станцией и поездом.",
  M4: "Парк с деревьями, дорожками и фонтаном.",
  M5: "Современный тепловой узел для перехода на чистое топливо.",
  M6: "Ветрозащитные полосы деревьев во всех районах.",
  M7: "Новая школа и детсад на свободном участке.",
  M8: "Поликлиника с медицинским крестом.",
  M9: "Спортивная площадка с разметкой и воротами.",
  M10: "Фонари и камеры вдоль улиц.",
  M11: "Переходы, знаки и ограждения возле школы.",
  M12: "Информационный терминал платформы обращений в каждом районе.",
  M13: "Обновлённый узел и участки тепло- и водосетей.",
  M14: "Пункты аварийных бригад и служебные машины во всех районах.",
};
export function visualPlan(selection: Initiative[]) {
  return selection.flatMap((item) =>
    (item.scope === "city"
      ? districtLayout
      : districtLayout.filter((d) => d.id === item.district)
    ).map((location) => ({
      ...item,
      location,
      visualDescription: visualDescriptions[item.id],
    })),
  );
}
