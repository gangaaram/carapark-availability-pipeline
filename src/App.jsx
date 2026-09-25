import { useEffect, useMemo, useState } from "react";
import CarparkMap from "./components/CarparkMap";
import "./App.css";



const API_URL =
  "placeholder";

const POSTAL_API_URL =
  "placeholder";




function App() {

  

  const [carparks, setCarparks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);



  const [search, setSearch] = useState("");




  const [postalCode, setPostalCode] = useState("");

  const [postalLocation, setPostalLocation] =
    useState(null);

  const [postalLoading, setPostalLoading] =
    useState(false);

  const [postalError, setPostalError] =
    useState("");


 

  const [availabilityFilter, setAvailabilityFilter] =
    useState("all");


 

  const [nearestMode, setNearestMode] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState(null);


 

  const searchPostalCode = async () => {

  

    if (!/^\d{6}$/.test(postalCode)) {

      setPostalError(
        "Please enter a valid 6-digit postal code."
      );

      return;

    }


  

    setSearch("");

    setNearestMode(false);

    setUserLocation(null);

    setPostalLoading(true);

    setPostalError("");


    try {

      const response = await fetch(
        POSTAL_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            postal_code: postalCode
          })
        }
      );


      const data =
        await response.json();


 

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Postal code not found."
        );

      }



      setPostalLocation(data);


    } catch (error) {

      console.error(error);

      setPostalLocation(null);

      setPostalError(
        error.message ||
        "Unable to search postal code."
      );


    } finally {

      setPostalLoading(false);

    }

  };



  const getDistance = (
    x1,
    y1,
    x2,
    y2
  ) => {

    const dx =
      x1 - x2;

    const dy =
      y1 - y2;

    return Math.sqrt(
      dx * dx +
      dy * dy
    );

  };


  // ===================================================
  // LOAD CARPARK DATA
  // ===================================================

  useEffect(() => {

    async function loadCarparks() {

      try {

        setLoading(true);


        const response =
          await fetch(API_URL);


        if (!response.ok) {

          throw new Error(
            `API returned HTTP ${response.status}`
          );

        }


        const result =
          await response.json();


        if (
          result.status !==
          "success"
        ) {

          throw new Error(
            result.message ||
            "API returned an error"
          );

        }


        console.log(
          "Loaded carparks:",
          result.data
        );


        setCarparks(
          result.data
        );


      } catch (err) {

        console.error(err);

        setError(
          err.message
        );


      } finally {

        setLoading(false);

      }

    }


    loadCarparks();

  }, []);



  const handleSearchChange = (event) => {

    const value =
      event.target.value;


    setSearch(value);


   

    if (value.trim() !== "") {

      setPostalCode("");

      setPostalLocation(null);

      setPostalError("");

      setNearestMode(false);

      setUserLocation(null);

    }

  };




  const filteredCarparks = useMemo(() => {

    let results =
      [...carparks];


   

    if (postalLocation) {

      results =
        carparks

          .map((carpark) => {

            const distance =
              getDistance(

                Number(
                  postalLocation.x
                ),

                Number(
                  postalLocation.y
                ),

                Number(
                  carpark.x_coord
                ),

                Number(
                  carpark.y_coord
                )

              );


            return {

              ...carpark,

              distance

            };

          })

          .sort(
            (a, b) =>
              a.distance -
              b.distance
          )

         

          .slice(
            0,
            10
          );

    }


   

    if (
      search.trim() !== "" &&
      !postalLocation
    ) {

      const searchTerm =
        search.toLowerCase();


      results =
        results.filter(
          (carpark) => {

            const carparkNumber =
              String(
                carpark.car_park_no ||
                ""
              ).toLowerCase();


            const address =
              String(
                carpark.address ||
                ""
              ).toLowerCase();


            return (

              carparkNumber.includes(
                searchTerm
              )

              ||

              address.includes(
                searchTerm
              )

            );

          }
        );

    }



    if (
      availabilityFilter !==
      "all"
    ) {

      results =
        results.filter(
          (carpark) => {

            const available =
              Number(
                carpark.lots_available
              );


            const total =
              Number(
                carpark.total_lots
              );


            if (
              total <= 0
            ) {

              return false;

            }


            const percentage =
              (
                available /
                total
              ) * 100;


          

            if (
              availabilityFilter ===
              "high"
            ) {

              return (
                percentage >= 50
              );

            }


            // -----------------------------------------
            // Medium availability
            // -----------------------------------------

            if (
              availabilityFilter ===
              "medium"
            ) {

              return (
                percentage >= 20 &&
                percentage < 50
              );

            }


            // -----------------------------------------
            // Low availability
            // -----------------------------------------

            if (
              availabilityFilter ===
              "low"
            ) {

              return (
                percentage < 20
              );

            }


            return true;

          }
        );

    }


    return results;


  }, [
    carparks,
    search,
    availabilityFilter,
    postalLocation
  ]);


  

  function findNearestToMe() {

    

    setPostalCode("");

    setPostalLocation(null);

    setPostalError("");


    // -------------------------------------------------
    // Clear normal search
    // -------------------------------------------------

    setSearch("");


    

    if (
      !navigator.geolocation
    ) {

      alert(
        "Geolocation is not supported by your browser."
      );

      return;

    }


    

    navigator.geolocation.getCurrentPosition(

      (position) => {

        const location = {

          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude

        };


        console.log(
          "User location:",
          location
        );


        setUserLocation(
          location
        );


        setNearestMode(
          true
        );

      },


      (error) => {

        console.error(
          error
        );


        alert(
          "Unable to get your location. Please allow location access."
        );

      }

    );

  }


  

  function resetFilters() {

    setSearch("");

    setPostalCode("");

    setPostalLocation(null);

    setPostalError("");

    setAvailabilityFilter(
      "all"
    );

    setNearestMode(
      false
    );

    setUserLocation(
      null
    );

  }


  

  if (loading) {

    return (

      <div className="loading-screen">

        <div className="loading-card">

          <h2>
            Loading carpark data...
          </h2>

          <p>
            Connecting to the Singapore
            carpark data service.
          </p>

        </div>

      </div>

    );

  }


  

  if (error) {

    return (

      <div className="error-screen">

        <div className="error-card">

          <h2>
            Unable to load carpark data
          </h2>

          <p>
            {error}
          </p>

        </div>

      </div>

    );

  }


  

  return (

    <div className="app">


      {/* =============================================
          HEADER
      ============================================== */}

      <header className="header">

        <div className="header-content">

          <div>

            <h1>
              Singapore Carpark Availability
            </h1>

            <p>
              Find available parking spaces
              across Singapore
            </p>

          </div>


          <div className="live-status">

            <span className="live-dot"></span>

            Live Data

          </div>

        </div>

      </header>


      {/* =============================================
          SEARCH / CONTROLS
      ============================================== */}

      <section className="controls">


        {/* =========================================
            ADDRESS / CARPARK SEARCH
        ========================================== */}

        <div className="search-wrapper">

          <input

            type="text"

            placeholder={
              "Search carpark or address..."
            }

            value={
              search
            }

            onChange={
              handleSearchChange
            }

          />

        </div>


        {/* =========================================
            POSTAL CODE SEARCH
        ========================================== */}

        <div className="postal-search">

          <input

            type="text"

            value={
              postalCode
            }

            onChange={
              (e) => {

                const value =
                  e.target.value;


                // -----------------------------------
                // Only allow numbers
                // -----------------------------------

                if (
                  /^\d*$/.test(value)
                ) {

                  setPostalCode(
                    value
                  );

                }


                // -----------------------------------
                // Postal search takes priority
                // Clear address search
                // -----------------------------------

                if (
                  value.trim() !== ""
                ) {

                  setSearch("");

                  setPostalLocation(
                    null
                  );

                  setPostalError("");

                  setNearestMode(
                    false
                  );

                  setUserLocation(
                    null
                  );

                }

              }
            }

            placeholder={
              "Enter postal code"
            }

            maxLength={
              6
            }

            onKeyDown={
              (e) => {

                if (
                  e.key === "Enter"
                ) {

                  searchPostalCode();

                }

              }
            }

          />


          <button

            onClick={
              searchPostalCode
            }

            disabled={
              postalLoading
            }

          >

            {
              postalLoading
                ? "Searching..."
                : "Search"
            }

          </button>

        </div>


        {/* =========================================
            POSTAL ERROR
        ========================================== */}

        {postalError && (

          <div className="postal-error">

            {postalError}

          </div>

        )}


        {/* =========================================
            AVAILABILITY FILTER
        ========================================== */}

        <select

          value={
            availabilityFilter
          }

          onChange={
            (event) =>
              setAvailabilityFilter(
                event.target.value
              )
          }

        >

          <option value="all">
            All availability
          </option>


          <option value="high">
            🟢 High availability
          </option>


          <option value="medium">
            🟡 Medium availability
          </option>


          <option value="low">
            🔴 Low availability
          </option>

        </select>


        {/* =========================================
            NEAREST TO ME
        ========================================== */}

        <button

          className={
            nearestMode
              ? "nearest-button active"
              : "nearest-button"
          }

          onClick={
            findNearestToMe
          }

        >

          📍 Nearest to Me

        </button>


        {/* =========================================
            RESET
        ========================================== */}

        <button

          className="reset-button"

          onClick={
            resetFilters
          }

        >

          Reset

        </button>

      </section>


      {/* =============================================
          SEARCH STATUS
      ============================================== */}

      {postalLocation && (

        <div className="postal-result">

          <strong>
            📍 Showing 10 nearest carparks
          </strong>

          <span>
            {postalLocation.address ||
              `Postal Code ${postalCode}`}
          </span>

        </div>

      )}


      {search.trim() !== "" &&
        !postalLocation && (

        <div className="search-result">

          Showing results for:

          {" "}

          <strong>
            {search}
          </strong>

        </div>

      )}


      {/* =============================================
          SUMMARY
      ============================================== */}

      <section className="summary">


        {/* -----------------------------------------
            CARPARK COUNT
        ------------------------------------------ */}

        <div className="summary-card">

          <span>
            Carparks
          </span>

          <strong>

            {
              filteredCarparks.length
            }

          </strong>

        </div>


        {/* -----------------------------------------
            AVAILABLE LOTS
        ------------------------------------------ */}

        <div className="summary-card">

          <span>
            Available Lots
          </span>

          <strong>

            {
              filteredCarparks

                .reduce(

                  (
                    total,
                    carpark
                  ) =>

                    total +
                    Number(
                      carpark.lots_available ||
                      0
                    ),

                  0

                )

                .toLocaleString()
            }

          </strong>

        </div>


        {/* -----------------------------------------
            TOTAL LOTS
        ------------------------------------------ */}

        <div className="summary-card">

          <span>
            Total Lots
          </span>

          <strong>

            {
              filteredCarparks

                .reduce(

                  (
                    total,
                    carpark
                  ) =>

                    total +
                    Number(
                      carpark.total_lots ||
                      0
                    ),

                  0

                )

                .toLocaleString()
            }

          </strong>

        </div>

      </section>


      {/* =============================================
          MAP
      ============================================== */}

      <main className="map-container">

        <CarparkMap

          carparks={
            filteredCarparks
          }

          userLocation={
            userLocation
          }

          postalLocation={
            postalLocation
          }

          nearestMode={
            nearestMode
          }

        />

      </main>

    </div>

  );

}


export default App;
