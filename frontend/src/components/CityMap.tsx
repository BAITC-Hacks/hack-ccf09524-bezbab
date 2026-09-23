import { useState } from "react";
import { Compass, Minus, Plus } from "lucide-react";
import { districtNames } from "../data/initiatives";
import type { DistrictMetrics } from "../types/city";
import type { projectDistricts } from "../lib/simulation";
const average = (values: DistrictMetrics) =>
  Math.round(Object.values(values).reduce((a, b) => a + b, 0) / 5);
export function CityMap({
  active,
  onSelect,
  projected,
}: {
  active: string;
  onSelect: (id: string) => void;
  projected: ReturnType<typeof projectDistricts>;
}) {
  const [zoom, setZoom] = useState(1);
  const areas = [
    {
      id: "saryarka",
      d: "M105 62L269 34 327 127 290 203 183 218 83 174Z",
      x: 191,
      y: 129,
    },
    {
      id: "baikonyr",
      d: "M279 34L430 58 490 126 412 211 300 203 337 127Z",
      x: 381,
      y: 132,
    },
    {
      id: "almaty",
      d: "M500 133L626 181 667 300 562 355 444 281 420 220Z",
      x: 545,
      y: 251,
    },
    {
      id: "yesil",
      d: "M177 230L292 217 408 224 431 291 552 365 452 427 269 401 156 327Z",
      x: 323,
      y: 322,
    },
  ];
  return (
    <div className="city-map">
      <svg
        viewBox="0 0 740 450"
        aria-label="Схематическая карта районов Астаны"
      >
        <defs>
          <pattern
            id="blocks"
            width="42"
            height="34"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-23)"
          >
            <rect x="4" y="4" width="32" height="24" rx="3" fill="#e1e7df" />
            <path d="M0 0H42V34" fill="none" stroke="#fff" strokeWidth="4" />
          </pattern>
          <pattern
            id="parks"
            width="70"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="25" cy="20" r="12" fill="#dce8d7" />
            <circle cx="49" cy="37" r="17" fill="#e1ebdc" />
          </pattern>
        </defs>
        <rect width="740" height="450" fill="#eef0e8" />
        <rect width="740" height="450" fill="url(#parks)" opacity=".5" />
        <g
          transform={`translate(${370 - 370 * zoom} ${225 - 225 * zoom}) scale(${zoom})`}
        >
          <path
            d="M-30 318L782 39M27-10L380 477M201-10L659 459M-20 139L764 335"
            stroke="#d8dfd6"
            strokeWidth="14"
          />
          <path
            d="M-30 318L782 39M27-10L380 477M201-10L659 459M-20 139L764 335"
            stroke="#fff"
            strokeWidth="9"
          />
          {areas.map((area) => (
            <g
              key={area.id}
              className="map-area"
              tabIndex={0}
              role="button"
              aria-label={`Район ${districtNames[area.id]}`}
              aria-pressed={active === area.id}
              onClick={() => onSelect(area.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(area.id);
                }
              }}
            >
              <path
                d={area.d}
                fill="url(#blocks)"
                stroke="#b3c6b8"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <path
                d={area.d}
                fill={active === area.id ? "#287a5c" : "#96b99b"}
                opacity={active === area.id ? ".21" : ".09"}
                stroke={active === area.id ? "#287a5c" : "none"}
                strokeWidth="3"
              />
              <rect
                x={area.x - 60}
                y={area.y - 23}
                width="120"
                height="47"
                rx="9"
                fill={active === area.id ? "#246b50" : "#fff"}
                stroke={active === area.id ? "#246b50" : "#e0e6dd"}
              />
              <text
                x={area.x - 44}
                y={area.y + 5}
                fill={active === area.id ? "#fff" : "#37493e"}
                fontSize="13"
                fontWeight="600"
              >
                {districtNames[area.id]}
              </text>
              <text
                x={area.x + 43}
                y={area.y + 5}
                fill={active === area.id ? "#d1efab" : "#377452"}
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
              >
                {average(projected.find((d) => d.id === area.id)!.metrics)}
              </text>
            </g>
          ))}
          <path
            d="M-30 220C85 196 75 282 167 241S264 227 305 238 382 196 426 227 451 340 526 328 642 357 770 385"
            fill="none"
            stroke="#aecfd4"
            strokeWidth="22"
          />
          <path
            d="M-30 220C85 196 75 282 167 241S264 227 305 238 382 196 426 227 451 340 526 328 642 357 770 385"
            fill="none"
            stroke="#c9e2e4"
            strokeWidth="15"
          />
          <text
            x="91"
            y="286"
            fill="#779da4"
            fontSize="12"
            transform="rotate(-21 91 286)"
          >
            река Есиль
          </text>
          <path
            d="M374 295L374 270M368 281L380 281M370 295L378 295"
            stroke="#426e59"
            strokeWidth="2"
          />
          <circle cx="374" cy="266" r="6" fill="#e4c480" stroke="#8a7d55" />
          <text x="387" y="284" fill="#577162" fontSize="10">
            Байтерек
          </text>
        </g>
      </svg>
      <span className="map-caption">
        <span className="live-dot" /> Астана · 4 условных района
      </span>
      <div className="map-controls">
        <button
          aria-label="Приблизить карту"
          onClick={() => setZoom(Math.min(1.5, zoom + 0.15))}
          disabled={zoom >= 1.5}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Отдалить карту"
          onClick={() => setZoom(Math.max(1, zoom - 0.15))}
          disabled={zoom <= 1}
        >
          <Minus size={17} />
        </button>
        <button aria-label="Сбросить масштаб" onClick={() => setZoom(1)}>
          <Compass size={18} />
        </button>
      </div>
      <span className="map-note">
        Схематическая карта · синтетические данные
      </span>
    </div>
  );
}
