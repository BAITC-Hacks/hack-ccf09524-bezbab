"""Interactive city map template for district-level analytics.

This script creates a lightweight, interactive city map in HTML using Plotly.
It is intentionally simple and designed to be extended with real city data later:
- district polygons
- optional overlay for air quality / road congestion / service density
- optional school and sensor markers
- no PNG export; the output is an interactive HTML dashboard ready for browser use

The code is deliberately simple so future data ingestion can be plugged in without
reworking the entire visualisation layer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import plotly.graph_objects as go


Point = Tuple[float, float]
Polygon = List[Point]


def build_districts() -> Dict[str, Polygon]:
    """Return a stylized city divided into districts.

    These polygons are intentionally abstract. Later they can be replaced by
    GeoJSON or real district boundaries without changing the rendering logic.
    """
    return {
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


def build_sensors() -> List[dict]:
    """Example air-quality sensors."""
    return [
        {"name": "AQ_01", "position": (2.0, 2.5), "value": 72, "unit": "AQI"},
        {"name": "AQ_02", "position": (4.5, 9.5), "value": 58, "unit": "AQI"},
        {"name": "AQ_03", "position": (8.0, 2.5), "value": 80, "unit": "AQI"},
        {"name": "AQ_04", "position": (10.2, 9.0), "value": 64, "unit": "AQI"},
        {"name": "AQ_05", "position": (14.5, 8.0), "value": 71, "unit": "AQI"},
        {"name": "AQ_06", "position": (15.5, 2.8), "value": 85, "unit": "AQI"},
    ]


def build_schools() -> List[dict]:
    """Example schools or service points."""
    return [
        {"name": "School_1", "position": (2.5, 4.0), "count": 18},
        {"name": "School_2", "position": (4.5, 10.0), "count": 12},
        {"name": "School_3", "position": (9.5, 3.0), "count": 20},
        {"name": "School_4", "position": (13.0, 9.2), "count": 15},
    ]


def build_traffic_points() -> List[dict]:
    """Example congestion / road points."""
    return [
        {"name": "Road_1", "position": (2.5, 5.2), "value": 82, "unit": "traffic"},
        {"name": "Road_2", "position": (6.8, 3.1), "value": 72, "unit": "traffic"},
        {"name": "Road_3", "position": (8.8, 7.7), "value": 68, "unit": "traffic"},
        {"name": "Road_4", "position": (12.8, 4.3), "value": 79, "unit": "traffic"},
        {"name": "Road_5", "position": (14.3, 10.4), "value": 56, "unit": "traffic"},
    ]


def district_to_shape(district_name: str, polygon: Polygon, fill_color: str, metric_value: float | None = None) -> dict:
    """Build a Plotly shape for a district polygon."""
    text_value = f"{metric_value:.0f}" if metric_value is not None else ""
    return {
        "type": "path",
        "path": " M " + " L ".join(f"{x} {y}" for x, y in polygon) + " Z",
        "xref": "x",
        "yref": "y",
        "fillcolor": fill_color,
        "line": {"color": "#334155", "width": 2},
        "opacity": 0.7,
        "label": district_name,
        "customdata": [district_name, text_value],
    }


def build_figure(
    district_metrics: Dict[str, float] | None = None,
    show_sensors: bool = True,
    show_schools: bool = True,
    show_traffic: bool = True,
) -> go.Figure:
    """Create an interactive HTML map with district overlays."""
    districts = build_districts()
    district_palette = {
        "Есиль": "#dbeafe",
        "Алматы": "#bfdbfe",
        "Сарыарка": "#c7d2fe",
        "Байконур": "#e0e7ff",
        "Нура": "#f3e8ff",
    }

    fig = go.Figure()

    for district_name, polygon in districts.items():
        fill_color = district_palette.get(district_name, "#e5e7eb")
        if district_metrics and district_name in district_metrics:
            metric = district_metrics[district_name]
            # Simple quality-based color shading for district fill.
            if metric >= 75:
                fill_color = "#86efac"
            elif metric >= 60:
                fill_color = "#fcd34d"
            elif metric >= 45:
                fill_color = "#fbbf24"
            else:
                fill_color = "#fca5a5"

        fig.add_shape(
            type="path",
            path=" M " + " L ".join(f"{x} {y}" for x, y in polygon) + " Z",
            xref="x",
            yref="y",
            fillcolor=fill_color,
            line={"color": "#334155", "width": 2},
            opacity=0.8,
            label={"text": district_name},
        )

        centroid_x = sum(x for x, _ in polygon) / len(polygon)
        centroid_y = sum(y for _, y in polygon) / len(polygon)
        if district_metrics and district_name in district_metrics:
            fig.add_annotation(
                x=centroid_x,
                y=centroid_y,
                text=f"{district_metrics[district_name]:.0f}",
                showarrow=False,
                font={"size": 12, "color": "#111827"},
                bgcolor="rgba(255,255,255,0.7)",
                bordercolor="rgba(0,0,0,0.1)",
                borderwidth=1,
            )

        fig.add_annotation(
            x=polygon[0][0] + 0.5,
            y=polygon[0][1] + 0.5,
            text=district_name,
            showarrow=False,
            font={"size": 11, "color": "#0f172a", "family": "Arial"},
        )

    if show_sensors:
        sensors = build_sensors()
        sensor_values = [item["value"] for item in sensors]
        min_value = min(sensor_values)
        max_value = max(sensor_values)

        for sensor in sensors:
            x, y = sensor["position"]
            value = sensor["value"]
            raw = (value - min_value) / (max_value - min_value + 1e-9)
            color = "#ef4444" if raw < 0.45 else "#f59e0b" if raw < 0.75 else "#22c55e"
            fig.add_trace(
                go.Scatter(
                    x=[x],
                    y=[y],
                    mode="markers+text",
                    text=[sensor["name"]],
                    textposition="top center",
                    marker={
                        "size": 16,
                        "color": color,
                        "line": {"color": "#1f2937", "width": 1},
                    },
                    hovertemplate=(
                        f"<b>{sensor['name']}</b><br>"
                        f"Value: {value}<br>"
                        f"Unit: {sensor['unit']}<extra></extra>"
                    ),
                    showlegend=False,
                )
            )

    if show_schools:
        schools = build_schools()
        for school in schools:
            x, y = school["position"]
            fig.add_trace(
                go.Scatter(
                    x=[x],
                    y=[y],
                    mode="markers+text",
                    text=[school["name"]],
                    textposition="top center",
                    marker={
                        "symbol": "square",
                        "size": 14,
                        "color": "#10b981",
                        "line": {"color": "#064e3b", "width": 1},
                    },
                    hovertemplate=(
                        f"<b>{school['name']}</b><br>"
                        f"Count: {school['count']}<extra></extra>"
                    ),
                    showlegend=False,
                )
            )

    if show_traffic:
        traffic = build_traffic_points()
        for point in traffic:
            x, y = point["position"]
            fig.add_trace(
                go.Scatter(
                    x=[x],
                    y=[y],
                    mode="markers",
                    marker={
                        "size": 12,
                        "color": point["value"],
                        "colorscale": [[0, "#22c55e"], [0.5, "#fbbf24"], [1, "#ef4444"]],
                        "line": {"color": "#1f2937", "width": 1},
                        "showscale": True,
                        "colorbar": {"title": "Traffic"},
                    },
                    hovertemplate=(
                        f"<b>{point['name']}</b><br>"
                        f"Value: {point['value']}<br>"
                        f"Unit: {point['unit']}<extra></extra>"
                    ),
                    showlegend=False,
                )
            )

    fig.update_xaxes(range=[-1, 18], showgrid=False, zeroline=False, visible=False)
    fig.update_yaxes(range=[-1, 13], showgrid=False, zeroline=False, visible=False)
    fig.update_layout(
        title="Interactive city map template",
        template="plotly_white",
        width=1100,
        height=800,
        margin={"l": 20, "r": 20, "t": 60, "b": 20},
        dragmode="pan",
        hovermode="closest",
    )
    return fig


def save_interactive_map(
    output_path: str | Path,
    district_metrics: Dict[str, float] | None = None,
    show_sensors: bool = True,
    show_schools: bool = True,
    show_traffic: bool = True,
) -> Path:
    """Save the map as an interactive HTML file."""
    output_path = Path(output_path)
    if output_path.suffix.lower() != ".html":
        output_path = output_path / "city_map_interactive.html"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig = build_figure(
        district_metrics=district_metrics,
        show_sensors=show_sensors,
        show_schools=show_schools,
        show_traffic=show_traffic,
    )
    fig.write_html(output_path, include_plotlyjs="cdn")
    return output_path


if __name__ == "__main__":
    district_metrics = {
        "Есиль": 78,
        "Алматы": 68,
        "Сарыарка": 60,
        "Байконур": 71,
        "Нура": 52,
    }

    output = save_interactive_map(
        output_path=Path(__file__).resolve().parent / "output",
        district_metrics=district_metrics,
        show_sensors=True,
        show_schools=True,
        show_traffic=True,
    )
    print(f"Interactive map saved to: {output}")
