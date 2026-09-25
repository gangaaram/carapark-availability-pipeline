```python
import functions_framework
import requests

from datetime import datetime, timezone
from google.cloud import bigquery


API_URL = "https://api.data.gov.sg/v1/transport/carpark-availability"

PROJECT_ID = "radiant-clone-480213-i6"
DATASET_ID = "Carpark"
TABLE_ID = "carpark_availability"


client = bigquery.Client(
    project=PROJECT_ID
)


@functions_framework.http
def ingest_carpark_data(request):
    try:
        response = requests.get(
            API_URL,
            timeout=30
        )
        response.raise_for_status()

        data = response.json()

        items = data.get("items", [])

        if not items:
            return {
                "status": "error",
                "message": "No data returned from API"
            }, 500

        carpark_data = items[0].get(
            "carpark_data",
            []
        )

        if not carpark_data:
            return {
                "status": "error",
                "message": "No carpark data found",
                "items_count": len(items),
                "first_item": items[0]
            }, 500

        rows = []

        ingestion_timestamp = datetime.now(
            timezone.utc
        )

        for carpark in carpark_data:
            carpark_number = carpark.get(
                "carpark_number"
            )
            update_datetime = carpark.get(
                "update_datetime"
            )
            carpark_info = carpark.get(
                "carpark_info",
                []
            )

            for lot in carpark_info:
                row = {
                    "carpark_number": carpark_number,
                    "update_datetime": update_datetime,
                    "lot_type": lot.get("lot_type"),
                    "lots_available": int(
                        lot.get("lots_available", 0)
                    ),
                    "total_lots": int(
                        lot.get("total_lots", 0)
                    ),
                    "ingestion_timestamp":
                        ingestion_timestamp.isoformat()
                }

                rows.append(row)

        if not rows:
            return {
                "status": "error",
                "message": "No rows were created",
                "carparks_found": len(carpark_data)
            }, 500

        table_ref = (
            f"{PROJECT_ID}."
            f"{DATASET_ID}."
            f"{TABLE_ID}"
        )

        errors = client.insert_rows_json(
            table_ref,
            rows
        )

        if errors:
            print("BigQuery errors:")
            print(errors)

            return {
                "status": "error",
                "errors": errors
            }, 500

        return {
            "status": "success",
            "carparks_processed": len(carpark_data),
            "rows_inserted": len(rows),
            "ingestion_timestamp":
                ingestion_timestamp.isoformat(),
            "message": (
                "Data successfully inserted. "
                "BigQuery partition expiration "
                "will automatically remove old data."
            )
        }, 200

    except Exception as e:
        print("Error:")
        print(e)

        return {
            "status": "error",
            "message": str(e)
        }, 500
```
