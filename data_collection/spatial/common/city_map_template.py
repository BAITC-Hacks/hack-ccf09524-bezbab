"""Simple template for district-level city map visualization.

This script draws a stylized city map divided into districts. It is intentionally
simple and easy to extend:
- district polygon layer
- optional metric overlay (air quality / congestion / service density)
- optional school/sensor markers
- save to PNG for later use in dashboards or reports

The goal is to keep the geometry and rendering logic straightforward so that
future data ingestion can be plugged in without reworking the whole app.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import matplotlib.pyplot as plt
from matplotlib import patches


Point = Tuple[float, float]
Polygon = List[Point]


def build_districts() -> Dict[str, Polygon]:
    """Return a simple district map as polygons.

    The coordinates are intentionally abstract: they represent a stylized city,
    not a precise GIS geometry. In the future these can be replaced by GeoJSON
    polygons from a real city boundary layer.
    """
    districts = {
        "Есиль": [
            (0.0, 0.0),
            (7.0, 0.0),
            (7.0, 5.5),
            (5.1, 5.5),
            (4.8, 7.0),
            (0.0, 7.0),
        ],
        "Алматы": [
            (7.0, 0.0),
            (14.0, 0.0),
            (14.0, 5.5),
            (7.0, 5.5),
        ],
        "Сарыарка": [
            (0.0, 7.0),
            (5.5, 7.0),
            (5.5, 12.0),
            (0.0, 12.0),
        ],
        "Байконур": [
            (5.5, 7.0),
            (12.0, 7.0),
            (12.0, 12.0),
            (5.5, 12.0),
        ],
        "Нура": [
            (12.0, 5.5),
            (17.0, 5.5),
            (17.0, 12.0),
            (12.0, 12.0),
        ],
    }
    return districts


def build_sensors() -> List[dict]:
    """Return example air-quality sensor points.

    Each sensor has a position, a value, and a label. Later this routine can be
    replaced by a CSV or GeoJSON reader.
    """
    return [
        {"name": "AQ_01", "position": (2.0, 2.5), "value": 72},
        {"name": "AQ_02", "position": (4.5, 9.5), "value": 58},
        {"name": "AQ_03", "position": (8.0, 2.5), "value": 80},
        {"name": "AQ_04", "position": (10.2, 9.0), "value": 64},
        {"name": "AQ_05", "position": (14.5, 8.0), "value": 71},
        {"name": "AQ_06", "position": (15.5, 2.8), "value": 85},
    ]


def build_schools() -> List[dict]:
    """Return example schools or service points."""
    return [
        {"name": "School_1", "position": (2.5, 4.0), "count": 18},
        {"name": "School_2", "position": (4.5, 10.0), "count": 12},
        {"name": "School_3", "position": (9.5, 3.0), "count": 20},
        {"name": "School_4", "position": (13.0, 9.2), "count": 15},
    ]


def draw_districts(
    ax,
    districts: Dict[str, Polygon],
    district_metrics: Dict[str, float] | None = None,
    district_palette: Dict[str, str] | None = None,
) -> None:
    """Draw district polygons and optionally color them by a district metric."""
    if district_palette is None:
        district_palette = {
            "Есиль": "#dbeafe",
            "Алматы": "#bfdbfe",
            "Сарыарка": "#c7d2fe",
            "Байконур": "#e0e7ff",
            "Нура": "#f3e8ff",
        }

    for district_name, polygon in districts.items():
        poly = patches.Polygon(
            polygon,
            closed=True,
            facecolor=district_palette.get(district_name, "#e5e7eb"),
            edgecolor="#334155",
            linewidth=1.5,
            alpha=0.95,
        )
        ax.add_patch(poly)

        # Optional district metric overlay with simple text label.
        if district_metrics and district_name in district_metrics:
            centroid = (
                sum(point[0] for point in polygon) / len(polygon),
                sum(point[1] for point in polygon) / len(polygon),
            )
            ax.text(
                centroid[0],
                centroid[1],
                f"{district_metrics[district_name]:.0f}",
                ha="center",
                va="center",
                fontsize=10,
                color="#0f172a",
                fontweight="bold",
            )

        ax.text(
            polygon[0][0] + 0.6,
            polygon[0][1] + 0.6,
            district_name,
            fontsize=10,
            color="#0f172a",
            fontweight="bold",
        )

    ax.set_xlim(-1, 18)
    ax.set_ylim(-1, 13)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title("City district map template")
    ax.set_frame_on(False)


def draw_sensor_overlay(ax, sensors: Iterable[dict]) -> None:
    """Plot sensors as colored circles sized by value."""
    values = [item["value"] for item in sensors]
    min_value = min(values)
    max_value = max(values)

    for sensor in sensors:
        x, y = sensor["position"]
        normalized = (sensor["value"] - min_value) / (max_value - min_value + 1e-9)
        color = plt.cm.get_cmap("YlOrRd")(normalized)
        ax.scatter(
            x,
            y,
            s=120,
            color=color,
            edgecolors="#1f2937",
            linewidth=0.7,
            alpha=0.85,
            zorder=5,
        )
        ax.text(x + 0.18, y + 0.18, sensor["name"], fontsize=8, color="#111827")


def draw_school_overlay(ax, schools: Iterable[dict]) -> None:
    """Plot schools or service points as markers."""
    for school in schools:
        x, y = school["position"]
        ax.scatter(
            x,
            y,
            marker="s",
            s=90,
            color="#10b981",
            edgecolors="#064e3b",
            linewidth=0.8,
            zorder=6,
        )
        ax.text(x + 0.20, y + 0.20, school["name"], fontsize=8, color="#065f46")


def save_map(
    output_path: str | Path,
    district_metrics: Dict[str, float] | None = None,
    show_sensors: bool = True,
    show_schools: bool = True,
    filename: str = "district_city_map.png",
) -> Path:
    """Create and save a city map image.

    output_path may be a directory or a full file path. The routine normalizes
    both cases for convenience.
    """
    output_path = Path(output_path)
    if output_path.suffix:
        final_path = output_path
    else:
        final_path = output_path / filename

    final_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(12, 9), dpi=160)
    districts = build_districts()
    draw_districts(ax, districts, district_metrics)

    if show_sensors:
        draw_sensor_overlay(ax, build_sensors())
    if show_schools:
        draw_school_overlay(ax, build_schools())

    fig.tight_layout()
    fig.savefig(final_path, bbox_inches="tight")
    plt.close(fig)
    return final_path


if __name__ == "__main__":
    # Example district-level metadata. Replace them with your real scores later.
    district_metrics = {
        "Есиль": 78,
        "Алматы": 68,
        "Сарыарка": 60,
        "Байконур": 71,
        "Нура": 52,
    }

    output = save_map(
        output_path=Path(__file__).resolve().parent / "output",
        district_metrics=district_metrics,
        show_sensors=True,
        show_schools=True,
    )
    print(f"Saved map to: {output}")
