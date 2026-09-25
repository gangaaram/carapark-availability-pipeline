import time

import functions_framework
from google.cloud import bigquery
from flask import jsonify


# =====================================================
# CONFIGURATION
# =====================================================

PROJECT_ID = "radiant-clone-480213-i6"


# =====================================================
# BIGQUERY QUERY
# =====================================================

QUERY = """
WITH latest_ingestion AS (

    SELECT
        MAX(ingestion_timestamp) AS ingestion_timestamp

    FROM
        `radiant-clone-480213-i6.Carpark.carpark_availability`
)

SELECT
    a.update_datetime,
    a.lot_type,
    a.lots_available,
    a.total_lots,
    i.car_park_no,
    i.address,
    i.x_coord,
    i.y_coord

FROM
    `radiant-clone-480213-i6.Carpark.carpark_availability` AS a

LEFT JOIN
    `radiant-clone-480213-i6.Carpark.carpark_static_information` AS i

ON
    a.carpark_number = i.car_park_no

WHERE
    a.ingestion_timestamp = (
        SELECT ingestion_timestamp
        FROM latest_ingestion
    )
"""


# =====================================================
# BIGQUERY CLIENT
# =====================================================

client = bigquery.Client(
    project=PROJECT_ID
)


# =====================================================
# CACHE
# =====================================================

CACHE_DURATION = 50  # seconds

cached_data = None
cache_timestamp = 0


# =====================================================
# CLOUD FUNCTION
# =====================================================

@functions_framework.http
def get_carpark_data(request):

    global cached_data
    global cache_timestamp

    # =================================================
    # CORS
    # =================================================

    # Handle browser preflight request
    if request.method == "OPTIONS":

        response = jsonify({
            "status": "ok"
        })

        response.headers[
            "Access-Control-Allow-Origin"
        ] = "*"

        response.headers[
            "Access-Control-Allow-Methods"
        ] = "GET, OPTIONS"

        response.headers[
            "Access-Control-Allow-Headers"
        ] = "Content-Type"

        return response


    try:

        # =============================================
        # CHECK CACHE
        # =============================================

        current_time = time.time()

        if (
            cached_data is not None
            and current_time - cache_timestamp < CACHE_DURATION
        ):

            print("Returning cached data.")

            response = jsonify({

                "status": "success",

                "count": len(cached_data),

                "data": cached_data,

                "cached": True

            })

            response.headers[
                "Access-Control-Allow-Origin"
            ] = "*"

            response.headers[
                "Cache-Control"
            ] = "public, max-age=50"

            return response, 200


        # =============================================
        # RUN BIGQUERY QUERY
        # =============================================

        print(
            "Cache expired. Querying latest "
            "BigQuery ingestion."
        )


        # ---------------------------------------------
        # BigQuery safety limit
        # ---------------------------------------------

        job_config = bigquery.QueryJobConfig(

            maximum_bytes_billed=
                100 * 1024 * 1024

        )


        query_job = client.query(

            QUERY,

            job_config=job_config

        )


        results = query_job.result()


        # =============================================
        # CONVERT RESULTS TO JSON
        # =============================================

        rows = []


        for row in results:

            rows.append({

                "update_datetime":
                    row.update_datetime,

                "lot_type":
                    row.lot_type,

                "lots_available":
                    row.lots_available,

                "total_lots":
                    row.total_lots,

                "car_park_no":
                    row.car_park_no,

                "address":
                    row.address,

                "x_coord":
                    row.x_coord,

                "y_coord":
                    row.y_coord

            })


        # =============================================
        # UPDATE CACHE
        # =============================================

        cached_data = rows

        cache_timestamp = time.time()


        print(
            f"BigQuery returned {len(rows)} rows "
            "from the latest ingestion."
        )


        # =============================================
        # RESPONSE
        # =============================================

        response = jsonify({

            "status": "success",

            "count": len(rows),

            "data": rows,

            "cached": False

        })


        # =============================================
        # CORS
        # =============================================

        response.headers[
            "Access-Control-Allow-Origin"
        ] = "*"


        # =============================================
        # BROWSER / PROXY CACHE
        # =============================================

        response.headers[
            "Cache-Control"
        ] = "public, max-age=50"


        return response, 200


    # =================================================
    # ERROR HANDLING
    # =================================================

    except Exception as e:

        print("Error:")
        print(e)


        response = jsonify({

            "status": "error",

            "message": str(e)

        })


        response.headers[
            "Access-Control-Allow-Origin"
        ] = "*"


        return response, 500
