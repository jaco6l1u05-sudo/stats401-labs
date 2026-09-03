from datetime import datetime, timezone
from pathlib import Path
import time

import pandas as pd
import requests


url = "https://earthquake.usgs.gov/fdsnws/event/1/query"

headers = {
    "User-Agent": "STATS401-Lab3-Earthquake-Data/1.0"
}

records = []
limit = 500

for offset in range(1, 1001, limit):

    params = {
        "format": "geojson",
        "starttime": "2026-08-01",
        "endtime": "2026-12-31",
        "eventtype": "earthquake",
        "orderby": "time-asc",
        "limit": limit,
        "offset": offset
    }

    print("Requesting records starting at offset:", offset)

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException as error:
        print("Request failed:", error)
        continue

    data = response.json()
    earthquakes = data.get("features", [])

    for earthquake in earthquakes:
        properties = earthquake["properties"]
        coordinates = earthquake["geometry"]["coordinates"]
        time_utc = datetime.fromtimestamp(
            properties["time"] / 1000,
            tz=timezone.utc
        )

        records.append({
            "id": earthquake["id"],
            "time_utc": time_utc.isoformat(),
            "place": properties["place"],
            "magnitude": properties["mag"],
            "depth_km": coordinates[2],
            "longitude": coordinates[0],
            "latitude": coordinates[1],
            "tsunami": properties["tsunami"],
            "felt_reports": properties["felt"],
            "significance": properties["sig"]
        })

    print("Total records collected:", len(records))

    if len(records) >= 1000:
        break

    time.sleep(1)


if not records:
    raise SystemExit("No earthquake records were collected. Check the network connection and try again.")

df = pd.DataFrame(records[:1000])

output_path = Path(__file__).resolve().parents[1] / "data" / "earthquakes.csv"
df.to_csv(output_path, index=False)

print(df.head())
print(df.shape)
print(f"Saved to {output_path}")
