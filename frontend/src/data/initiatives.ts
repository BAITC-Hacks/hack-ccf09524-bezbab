import type { MetricKey } from "../types/city";

export interface Initiative {
  id: string;
  category: MetricKey;
  title: string;
  description: string;
  cost: number;
  gain: number;
  district: string;
  risk: string;
}
export const districtNames: Record<string, string> = {
  yesil: "Есиль",
  almaty: "Алматы",
  saryarka: "Сарыарка",
  baikonyr: "Байконур",
};
export const categories: {
  key: MetricKey;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    key: "transport",
    label: "Транспорт",
    short: "Транспорт",
    color: "#5e88c7",
  },
  {
    key: "greenery",
    label: "Озеленение",
    short: "Озеленение",
    color: "#398769",
  },
  {
    key: "social",
    label: "Социальная инфраструктура",
    short: "Соц. объекты",
    color: "#b08ace",
  },
  {
    key: "safety",
    label: "Безопасность",
    short: "Безопасность",
    color: "#d3a357",
  },
  {
    key: "service",
    label: "Городской сервис",
    short: "Сервисы",
    color: "#63a3ac",
  },
];
export const initiatives: Initiative[] = [
  {
    id: "t1",
    category: "transport",
    title: "Умные светофоры",
    description: "Адаптивные перекрёстки на самых загруженных улицах.",
    cost: 60000000,
    gain: 16,
    district: "almaty",
    risk: "Эффект зависит от качества настройки транспортных потоков.",
  },
  {
    id: "t2",
    category: "transport",
    title: "Новые автобусные маршруты",
    description: "Свяжите жилые кварталы с центром и социальными объектами.",
    cost: 100000000,
    gain: 24,
    district: "saryarka",
    risk: "Потребуются постоянные расходы на обслуживание автобусов.",
  },
  {
    id: "t3",
    category: "transport",
    title: "Выделенные полосы",
    description: "Быстрый общественный транспорт и доступные пересадки.",
    cost: 150000000,
    gain: 32,
    district: "yesil",
    risk: "На время строительства возможны заторы.",
  },
  {
    id: "g1",
    category: "greenery",
    title: "Зелёные дворы",
    description: "Деревья, тень и небольшие сады рядом с домом.",
    cost: 40000000,
    gain: 16,
    district: "almaty",
    risk: "Молодым деревьям нужен полив и несколько лет для роста.",
  },
  {
    id: "g2",
    category: "greenery",
    title: "Парк у дома",
    description: "Новый районный парк с прогулочными и велодорожками.",
    cost: 80000000,
    gain: 25,
    district: "saryarka",
    risk: "Нужно заложить дальнейшие расходы на содержание парка.",
  },
  {
    id: "g3",
    category: "greenery",
    title: "Зелёный пояс",
    description: "Масштабное озеленение и непрерывные пешеходные маршруты.",
    cost: 140000000,
    gain: 34,
    district: "yesil",
    risk: "Результат появится постепенно, по мере роста растений.",
  },
  {
    id: "s1",
    category: "social",
    title: "Доступные дворы",
    description: "Безбарьерные входы и площадки для жителей всех возрастов.",
    cost: 50000000,
    gain: 16,
    district: "baikonyr",
    risk: "Точечные улучшения не устранят дефицит школ и поликлиник.",
  },
  {
    id: "s2",
    category: "social",
    title: "Центр для жителей",
    description: "Кружки, спорт и пространство для районных сообществ.",
    cost: 110000000,
    gain: 26,
    district: "almaty",
    risk: "Для работы центра понадобятся специалисты.",
  },
  {
    id: "s3",
    category: "social",
    title: "Новая поликлиника",
    description: "Первичная медицинская помощь ближе к жилым кварталам.",
    cost: 180000000,
    gain: 36,
    district: "baikonyr",
    risk: "Строительство займёт время и потребует медицинского персонала.",
  },
  {
    id: "b1",
    category: "safety",
    title: "Освещённые улицы",
    description: "LED-освещение на тёмных участках и во дворах.",
    cost: 40000000,
    gain: 15,
    district: "saryarka",
    risk: "Освещение не заменяет комплексные меры безопасности.",
  },
  {
    id: "b2",
    category: "safety",
    title: "Безопасный путь в школу",
    description: "Переходы, островки безопасности и снижение скорости.",
    cost: 70000000,
    gain: 23,
    district: "almaty",
    risk: "Потребуется контроль соблюдения скоростного режима.",
  },
  {
    id: "b3",
    category: "safety",
    title: "Безопасные кварталы",
    description: "Комплексное обновление освещения и общественных пространств.",
    cost: 120000000,
    gain: 31,
    district: "baikonyr",
    risk: "Комплексный проект потребует координации нескольких служб.",
  },
  {
    id: "c1",
    category: "service",
    title: "Чистый район",
    description: "Новые контейнеры и понятный график вывоза отходов.",
    cost: 30000000,
    gain: 15,
    district: "almaty",
    risk: "Качество результата зависит от регулярности вывоза.",
  },
  {
    id: "c2",
    category: "service",
    title: "Сервисы без очередей",
    description: "Единое окно обращений и отслеживание городских заявок.",
    cost: 60000000,
    gain: 23,
    district: "baikonyr",
    risk: "Нужно сохранить доступ к услугам для жителей без интернета.",
  },
  {
    id: "c3",
    category: "service",
    title: "Умные городские службы",
    description: "Датчики, диспетчеризация и быстрое устранение аварий.",
    cost: 100000000,
    gain: 31,
    district: "saryarka",
    risk: "Система потребует технической поддержки и защиты данных.",
  },
];
