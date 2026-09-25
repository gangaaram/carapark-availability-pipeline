import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    useMap
  } from "react-leaflet";
  
  import { useEffect } from "react";
  
  import proj4 from "proj4";
  
  import "leaflet/dist/leaflet.css";
  
  
  // =====================================================
  // COORDINATE SYSTEMS
  // =====================================================
  
  // Singapore SVY21
  
  const SVY21 =
    "+proj=tmerc " +
    "+lat_0=1.36666666666667 " +
    "+lon_0=103.833333333333 " +
    "+k=1 " +
    "+x_0=28001.642 " +
    "+y_0=38744.572 " +
    "+ellps=WGS84 " +
    "+units=m " +
    "+no_defs";
  
  
  const WGS84 =
    "EPSG:4326";
  
  
  // =====================================================
  // SVY21 → WGS84
  // =====================================================
  
  function svy21ToWgs84(
    x,
    y
  ) {
  
    const [
      longitude,
      latitude
    ] = proj4(
      SVY21,
      WGS84,
      [
        x,
        y
      ]
    );
  
  
    return {
      latitude,
      longitude
    };
  
  }
  
  
  // =====================================================
  // DISTANCE CALCULATION
  // =====================================================
  
  // Calculates distance between two WGS84
  // latitude/longitude coordinates.
  //
  // Returns distance in kilometres.
  
  function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
  ) {
  
    const earthRadius = 6371;
  
  
    const dLat =
      (
        (lat2 - lat1) *
        Math.PI
      ) / 180;
  
  
    const dLon =
      (
        (lon2 - lon1) *
        Math.PI
      ) / 180;
  
  
    const a =
      Math.sin(dLat / 2) ** 2 +
  
      Math.cos(
        lat1 * Math.PI / 180
      ) *
  
      Math.cos(
        lat2 * Math.PI / 180
      ) *
  
      Math.sin(dLon / 2) ** 2;
  
  
    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );
  
  
    return earthRadius * c;
  
  }
  
  
  // =====================================================
  // MAP CONTROLLER
  // =====================================================
  
  function MapController({
    userLocation,
    postalLocation,
    nearestCarpark
  }) {
  
    const map =
      useMap();
  
  
    useEffect(() => {
  
      // =================================================
      // POSTAL CODE SEARCH
      // =================================================
  
      if (postalLocation) {
  
        const latitude =
          Number(
            postalLocation.latitude
          );
  
  
        const longitude =
          Number(
            postalLocation.longitude
          );
  
  
        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
  
          map.flyTo(
            [
              latitude,
              longitude
            ],
            16,
            {
              duration: 1.5
            }
          );
  
        }
  
  
        return;
  
      }
  
  
      // =================================================
      // NEAREST TO ME
      // =================================================
  
      if (
        userLocation &&
        nearestCarpark
      ) {
  
        const bounds = [
  
          [
            userLocation.latitude,
            userLocation.longitude
          ],
  
          [
            nearestCarpark.latitude,
            nearestCarpark.longitude
          ]
  
        ];
  
  
        map.fitBounds(
          bounds,
          {
            padding: [
              50,
              50
            ]
          }
        );
  
      }
  
  
    }, [
      userLocation,
      postalLocation,
      nearestCarpark,
      map
    ]);
  
  
    return null;
  
  }
  
  
  // =====================================================
  // MAIN MAP
  // =====================================================
  
  function CarparkMap({
    carparks,
    userLocation,
    postalLocation,
    nearestMode
  }) {
  
  
    // ===================================================
    // CONVERT CARPARK COORDINATES
    // ===================================================
  
    const convertedCarparks =
      carparks
        .map(carpark => {
  
          const x =
            parseFloat(
              carpark.x_coord
            );
  
  
          const y =
            parseFloat(
              carpark.y_coord
            );
  
  
          if (
            Number.isNaN(x) ||
            Number.isNaN(y)
          ) {
  
            return null;
  
          }
  
  
          const {
            latitude,
            longitude
          } =
            svy21ToWgs84(
              x,
              y
            );
  
  
          return {
  
            ...carpark,
  
            latitude,
  
            longitude
  
          };
  
        })
        .filter(Boolean);
  
  
    // ===================================================
    // FIND NEAREST CARPARK TO USER
    // ===================================================
  
    let nearestCarpark = null;
  
  
    if (
      nearestMode &&
      userLocation &&
      convertedCarparks.length > 0
    ) {
  
      nearestCarpark =
        convertedCarparks
          .map(carpark => ({
  
            ...carpark,
  
            distance:
              calculateDistance(
  
                userLocation.latitude,
  
                userLocation.longitude,
  
                carpark.latitude,
  
                carpark.longitude
  
              )
  
          }))
          .sort(
            (
              a,
              b
            ) =>
              a.distance -
              b.distance
          )[0];
  
    }
  
  
    // ===================================================
    // SINGAPORE CENTRE
    // ===================================================
  
    const singapore = [
      1.3521,
      103.8198
    ];
  
  
    // ===================================================
    // POSTAL CODE LOCATION
    // ===================================================
  
    let postalMarker = null;
  
  
    if (postalLocation) {
  
      const latitude =
        Number(
          postalLocation.latitude
        );
  
  
      const longitude =
        Number(
          postalLocation.longitude
        );
  
  
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
  
        postalMarker = {
  
          latitude,
  
          longitude
  
        };
  
      }
  
    }
  
  
    // ===================================================
    // RENDER
    // ===================================================
  
    return (
  
      <MapContainer
  
        center={singapore}
  
        zoom={12}
  
        style={{
          height: "100%",
          width: "100%"
        }}
  
      >
  
  
        {/* =============================================
            OPENSTREETMAP
        ============================================== */}
  
        <TileLayer
  
          url="
            https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
          "
  
          attribution="
            &copy; OpenStreetMap contributors
          "
  
        />
  
  
        {/* =============================================
            POSTAL CODE LOCATION
        ============================================== */}
  
        {postalMarker && (
  
          <CircleMarker
  
            center={[
              postalMarker.latitude,
              postalMarker.longitude
            ]}
  
            radius={12}
  
            pathOptions={{
  
              color: "white",
  
              weight: 3,
  
              fillColor: "#7c3aed",
  
              fillOpacity: 1
  
            }}
  
          >
  
            <Popup>
  
              <div>
  
                <h3>
                  📍 Search Location
                </h3>
  
  
                <p>
  
                  <strong>
                    Postal Code:
                  </strong>
  
                  {" "}
  
                  {
                    postalLocation.postal_code ||
                    "N/A"
                  }
  
                </p>
  
  
                {postalLocation.address && (
  
                  <p>
  
                    <strong>
                      Address:
                    </strong>
  
                    <br />
  
                    {
                      postalLocation.address
                    }
  
                  </p>
  
                )}
  
              </div>
  
            </Popup>
  
          </CircleMarker>
  
        )}
  
  
        {/* =============================================
            USER LOCATION
        ============================================== */}
  
        {userLocation && (
  
          <CircleMarker
  
            center={[
              userLocation.latitude,
              userLocation.longitude
            ]}
  
            radius={10}
  
            pathOptions={{
  
              color: "white",
  
              weight: 3,
  
              fillColor: "#2563eb",
  
              fillOpacity: 1
  
            }}
  
          >
  
            <Popup>
  
              <strong>
                📍 You are here
              </strong>
  
            </Popup>
  
          </CircleMarker>
  
        )}
  
  
        {/* =============================================
            CARPARK MARKERS
        ============================================== */}
  
        {convertedCarparks.map(
          (
            carpark,
            index
          ) => {
  
  
            const available =
              Number(
                carpark.lots_available
              );
  
  
            const total =
              Number(
                carpark.total_lots
              );
  
  
            const percentage =
              total > 0
  
                ? (
                    available /
                    total
                  ) * 100
  
                : 0;
  
  
            // -----------------------------------------
            // Marker colour
            // -----------------------------------------
  
            let markerColor;
  
  
            if (
              percentage >= 50
            ) {
  
              markerColor =
                "#16a34a";
  
            }
  
            else if (
              percentage >= 20
            ) {
  
              markerColor =
                "#f59e0b";
  
            }
  
            else {
  
              markerColor =
                "#dc2626";
  
            }
  
  
            // -----------------------------------------
            // Is nearest to user?
            // -----------------------------------------
  
            const isNearest =
              nearestCarpark &&
  
              nearestCarpark
                .car_park_no ===
                carpark.car_park_no;
  
  
            // -----------------------------------------
            // Distance from postal code
            // -----------------------------------------
  
            let postalDistance = null;
  
  
            if (
              postalMarker
            ) {
  
              postalDistance =
                calculateDistance(
  
                  postalMarker.latitude,
  
                  postalMarker.longitude,
  
                  carpark.latitude,
  
                  carpark.longitude
  
                );
  
            }
  
  
            return (
  
              <CircleMarker
  
                key={
                  `${carpark.car_park_no}-${index}`
                }
  
                center={[
                  carpark.latitude,
                  carpark.longitude
                ]}
  
                radius={
  
                  isNearest
  
                    ? 12
  
                    : postalMarker &&
                      postalDistance !== null &&
                      postalDistance ===
                        Math.min(
                          ...convertedCarparks.map(
                            cp =>
                              calculateDistance(
  
                                postalMarker.latitude,
  
                                postalMarker.longitude,
  
                                cp.latitude,
  
                                cp.longitude
  
                              )
                          )
                        )
  
                      ? 12
  
                      : 7
  
                }
  
                pathOptions={{
  
                  color:
  
                    isNearest
  
                      ? "#2563eb"
  
                      : postalMarker &&
                        postalDistance !== null &&
                        postalDistance ===
                          Math.min(
                            ...convertedCarparks.map(
                              cp =>
                                calculateDistance(
  
                                  postalMarker.latitude,
  
                                  postalMarker.longitude,
  
                                  cp.latitude,
  
                                  cp.longitude
  
                                )
                            )
                          )
  
                        ? "#7c3aed"
  
                        : "white",
  
                  weight:
  
                    isNearest
  
                      ? 4
  
                      : postalMarker &&
                        postalDistance !== null &&
                        postalDistance ===
                          Math.min(
                            ...convertedCarparks.map(
                              cp =>
                                calculateDistance(
  
                                  postalMarker.latitude,
  
                                  postalMarker.longitude,
  
                                  cp.latitude,
  
                                  cp.longitude
  
                                )
                            )
                          )
  
                        ? 4
  
                        : 1,
  
                  fillColor:
                    markerColor,
  
                  fillOpacity:
                    0.85
  
                }}
  
              >
  
                <Popup>
  
                  <div>
  
  
                    {/* =================================
                        CARPARK NAME
                    ================================== */}
  
                    <h3>
  
                      {
                        carpark.car_park_no
                      }
  
                    </h3>
  
  
                    {/* =================================
                        ADDRESS
                    ================================== */}
  
                    <p>
  
                      {
                        carpark.address ||
                        "Address unavailable"
                      }
  
                    </p>
  
  
                    <hr />
  
  
                    {/* =================================
                        AVAILABILITY
                    ================================== */}
  
                    <p>
  
                      <strong>
                        Available:
                      </strong>
  
                      {" "}
  
                      {available}
  
                      {" / "}
  
                      {total}
  
                    </p>
  
  
                    {/* =================================
                        AVAILABILITY %
                    ================================== */}
  
                    <p>
  
                      <strong>
                        Availability:
                      </strong>
  
                      {" "}
  
                      {
                        percentage.toFixed(1)
                      }%
  
                    </p>
  
  
                    {/* =================================
                        LOT TYPE
                    ================================== */}
  
                    <p>
  
                      <strong>
                        Lot type:
                      </strong>
  
                      {" "}
  
                      {
                        carpark.lot_type
                      }
  
                    </p>
  
  
                    {/* =================================
                        DISTANCE FROM POSTAL CODE
                    ================================== */}
  
                    {postalMarker && (
  
                      <p>
  
                        <strong>
                          📍 Distance from search:
                        </strong>
  
                        {" "}
  
                        {postalDistance < 1
  
                          ? `${(
                              postalDistance *
                              1000
                            ).toFixed(0)} m`
  
                          : `${postalDistance.toFixed(2)} km`
  
                        }
  
                      </p>
  
                    )}
  
  
                    {/* =================================
                        DISTANCE FROM USER
                    ================================== */}
  
                    {isNearest && (
  
                      <p>
  
                        <strong>
                          📍 Distance from you:
                        </strong>
  
                        {" "}
  
                        {
                          nearestCarpark
                            .distance
                            .toFixed(2)
                        }
  
                        {" km"}
  
                      </p>
  
                    )}
  
  
                    {/* =================================
                        UPDATED
                    ================================== */}
  
                    <p>
  
                      <strong>
                        Updated:
                      </strong>
  
                      {" "}
  
                      {
                        carpark.update_datetime
                      }
  
                    </p>
  
  
                  </div>
  
                </Popup>
  
              </CircleMarker>
  
            );
  
          }
  
        )}
  
  
        {/* =============================================
            MAP CONTROLLER
        ============================================== */}
  
        <MapController
  
          userLocation={
            userLocation
          }
  
          postalLocation={
            postalLocation
          }
  
          nearestCarpark={
            nearestCarpark
          }
  
        />
  
  
      </MapContainer>
  
    );
  
  }
  
  
  export default CarparkMap;