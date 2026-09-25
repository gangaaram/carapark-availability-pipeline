import os
import time
import requests
import functions_framework


# ============================================================
# CONFIGURATION
# ============================================================

CACHE_DURATION = 300  # 5 minutes


# ============================================================
# POSTAL CODE CACHE
# ============================================================

# Format:
#
# {
#     "560133": {
#         "data": {...},
#         "timestamp": 1234567890
#     }
# }

postal_cache = {}


# ============================================================
# CORS RESPONSE
# ============================================================

def cors_response(body, status=200):

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }

    return body, status, headers


# ============================================================
# ONEMAP AUTHENTICATION
# ============================================================

def get_onemap_token():

    email = os.environ.get("ONEMAP_EMAIL")
    password = os.environ.get("ONEMAP_PASSWORD")

    if not email or not password:

        raise Exception(
            "ONEMAP_EMAIL or ONEMAP_PASSWORD is not configured."
        )


    url = (
        "https://www.onemap.gov.sg/"
        "api/auth/post/getToken"
    )


    response = requests.post(

        url,

        json={
            "email": email,
            "password": password
        },

        headers={
            "Content-Type": "application/json"
        },

        timeout=30
    )


    print(
        "OneMap authentication status:",
        response.status_code
    )


    # --------------------------------------------------------
    # Don't print credentials or token
    # --------------------------------------------------------

    print(
        "OneMap authentication completed."
    )


    response.raise_for_status()


    data = response.json()


    token = data.get("access_token")


    if not token:

        raise Exception(
            "OneMap did not return an access token."
        )


    return token


# ============================================================
# SEARCH POSTAL CODE
# ============================================================

@functions_framework.http
def search_postal_code_function(request):


    # ========================================================
    # 1. CORS PREFLIGHT
    # ========================================================

    if request.method == "OPTIONS":

        return cors_response(
            "",
            204
        )


    # ========================================================
    # 2. ONLY ALLOW POST
    # ========================================================

    if request.method != "POST":

        return cors_response(

            {
                "status": "error",
                "message": "Only POST requests are allowed."
            },

            405
        )


    # ========================================================
    # MAIN LOGIC
    # ========================================================

    try:


        # ====================================================
        # 3. GET REQUEST BODY
        # ====================================================

        request_json = request.get_json(
            silent=True
        )


        if not request_json:

            return cors_response(

                {
                    "status": "error",
                    "message": (
                        "Request body must contain JSON."
                    )
                },

                400
            )


        postal_code = request_json.get(
            "postal_code"
        )


        if not postal_code:

            return cors_response(

                {
                    "status": "error",
                    "message": "postal_code is required."
                },

                400
            )


        postal_code = str(
            postal_code
        ).strip()


        # ====================================================
        # 4. VALIDATE POSTAL CODE
        # ====================================================

        if (
            not postal_code.isdigit()
            or len(postal_code) != 6
        ):

            return cors_response(

                {
                    "status": "error",
                    "message": (
                        "Postal code must be a "
                        "6-digit number."
                    )
                },

                400
            )


        # ====================================================
        # 5. CHECK CACHE
        # ====================================================

        current_time = time.time()


        cached_entry = postal_cache.get(
            postal_code
        )


        if cached_entry:

            cache_age = (
                current_time
                - cached_entry["timestamp"]
            )


            # -----------------------------------------------
            # CACHE IS STILL VALID
            # -----------------------------------------------

            if cache_age < CACHE_DURATION:

                print(
                    f"Returning cached result for "
                    f"{postal_code}. "
                    f"Cache age: {cache_age:.1f}s"
                )


                cached_data = (
                    cached_entry["data"]
                )


                return cors_response(

                    {
                        **cached_data,
                        "cached": True
                    },

                    200
                )


            # -----------------------------------------------
            # CACHE EXPIRED
            # -----------------------------------------------

            else:

                print(
                    f"Cache expired for "
                    f"{postal_code}."
                )


                # Remove expired entry
                del postal_cache[
                    postal_code
                ]


        # ====================================================
        # 6. GET ONEMAP TOKEN
        # ====================================================

        print(
            f"Searching OneMap for "
            f"postal code {postal_code}"
        )


        token = get_onemap_token()


        # ====================================================
        # 7. SEARCH POSTAL CODE
        # ====================================================

        search_url = (

            "https://www.onemap.gov.sg/"
            "api/common/elastic/search"

        )


        params = {

            "searchVal":
                postal_code,

            "returnGeom":
                "Y",

            "getAddrDetails":
                "Y",

            "pageNum":
                1

        }


        headers = {

            "Authorization":
                token

        }


        response = requests.get(

            search_url,

            params=params,

            headers=headers,

            timeout=30

        )


        print(
            "OneMap search status:",
            response.status_code
        )


        response.raise_for_status()


        data = response.json()


        # ====================================================
        # 8. CHECK RESULTS
        # ====================================================

        results = data.get(
            "results",
            []
        )


        if not results:

            return cors_response(

                {
                    "status": "error",
                    "message": "Postal code not found."
                },

                404
            )


        # ====================================================
        # 9. GET FIRST RESULT
        # ====================================================

        result = results[0]


        address = result.get(
            "ADDRESS"
        )


        x = result.get(
            "X"
        )


        y = result.get(
            "Y"
        )


        if not x or not y:

            return cors_response(

                {
                    "status": "error",
                    "message": (
                        "OneMap returned "
                        "no coordinates."
                    )
                },

                400
            )


        # ====================================================
        # 10. CONVERT SVY21 → WGS84
        # ====================================================

        convert_url = (

            "https://www.onemap.gov.sg/"
            "api/common/convert/3414to4326"

        )


        convert_params = {

            "X":
                x,

            "Y":
                y

        }


        convert_response = requests.get(

            convert_url,

            params=convert_params,

            headers=headers,

            timeout=30

        )


        print(
            "OneMap conversion status:",
            convert_response.status_code
        )


        convert_response.raise_for_status()


        coordinates = (
            convert_response.json()
        )


        latitude = coordinates.get(
            "latitude"
        )


        longitude = coordinates.get(
            "longitude"
        )


        if (
            latitude is None
            or longitude is None
        ):

            raise Exception(

                "OneMap coordinate conversion "
                "did not return latitude/longitude."

            )


        # ====================================================
        # 11. BUILD RESULT
        # ====================================================

        result_data = {

            "status":
                "success",

            "postal_code":
                postal_code,

            "address":
                address,

            "x":
                float(x),

            "y":
                float(y),

            "latitude":
                float(latitude),

            "longitude":
                float(longitude)

        }


        # ====================================================
        # 12. SAVE TO CACHE
        # ====================================================

        postal_cache[
            postal_code
        ] = {

            "data":
                result_data,

            "timestamp":
                time.time()

        }


        print(
            f"Cached postal code "
            f"{postal_code} for "
            f"{CACHE_DURATION} seconds."
        )


        # ====================================================
        # 13. RETURN RESULT
        # ====================================================

        return cors_response(

            {
                **result_data,
                "cached": False
            },

            200
        )


    # ========================================================
    # ONEMAP HTTP ERROR
    # ========================================================

    except requests.exceptions.HTTPError as e:

        print(
            "OneMap HTTP error:",
            str(e)
        )


        return cors_response(

            {
                "status": "error",
                "message": str(e)
            },

            400
        )


    # ========================================================
    # GENERAL ERROR
    # ========================================================

    except Exception as e:

        print(
            "Error:",
            str(e)
        )


        return cors_response(

            {
                "status": "error",
                "message": str(e)
            },

            500
        )
