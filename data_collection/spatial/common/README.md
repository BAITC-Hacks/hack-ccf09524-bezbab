# City map visualization template

This folder contains a minimal visualisation scaffold for future city analytics.

## Files

- `city_map_template.py` — simple district map with optional overlays for sensors, schools, congestion points, etc.

## How to run

```bash
python data_collection/spatial/common/city_map_template.py
```

The script creates an image under:

```text
data_collection/spatial/common/output/district_city_map.png
```

## Planned extension points

- Replace the abstract district polygons with real GIS polygons or GeoJSON.
- Replace the fake sensor list with real AQI, traffic, or weather data.
- Add more point layers: roads, schools, hospitals, traffic cameras, intervention points.
- Add a second view for heat maps or district-level score coloring.

## Data model idea

For each feature, keep a simple structure like:

```python
{
    "name": "AQ_01",
    "position": (x, y),
    "value": 72,
    "layer": "air_quality",
}
```

This keeps the rendering logic independent from the source data and makes it easy to add CSV/JSON ingestion later.
