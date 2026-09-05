import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/*
|--------------------------------------------------------------------------
| API CONFIGURATION
|--------------------------------------------------------------------------
|
| Vite production:
|
| VITE_API_URL=https://meditwin-digital-twin.onrender.com/api/v1
|
| Local:
|
| VITE_API_URL=http://localhost:5000/api/v1
|
|--------------------------------------------------------------------------
*/

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://meditwin-digital-twin.onrender.com/api/v1";


/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "DISPATCHED",
  "MOVING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "COLLECTING",
  "MOVING_TO_BIN",
  "DEPOSITING",
  "COLLECTED",
  "DISPOSED",
  "RETURNING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

const BIN_OPTIONS = [
  "ALL",
  "yellow",
  "red",
  "blue",
  "general",
];


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const normalizeCategory = (category) => {
  const value = String(category || "")
    .trim()
    .toLowerCase();

  if (value.includes("yellow")) {
    return "yellow";
  }

  if (value.includes("red")) {
    return "red";
  }

  if (value.includes("blue")) {
    return "blue";
  }

  if (
    value.includes("general") ||
    value.includes("non") ||
    value.includes("municipal")
  ) {
    return "general";
  }

  return "general";
};


const normalizeStatus = (status) => {
  return String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};


const formatStatus = (status) => {
  const value = normalizeStatus(status);

  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};


const formatCategory = (category) => {
  const value = normalizeCategory(category);

  if (value === "yellow") {
    return "Yellow Bin";
  }

  if (value === "red") {
    return "Red Bin";
  }

  if (value === "blue") {
    return "Blue Bin";
  }

  return "General Bin";
};


const formatConfidence = (confidence) => {
  const value = Number(confidence);

  if (!Number.isFinite(value)) {
    return "0%";
  }

  /*
   * Backend stores confidence between 0 and 1.
   * But if an older record contains 31 instead of 0.31,
   * handle that too.
   */

  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return `${Math.round(value)}%`;
};


const formatDate = (date) => {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString();
};


/*
|--------------------------------------------------------------------------
| API FETCH HELPER
|--------------------------------------------------------------------------
*/

const fetchWasteRecords = async () => {
  const url =
    `${API_BASE}/waste` +
    "?page=1&limit=100";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Waste API failed: ${response.status}`
    );
  }

  const result = await response.json();

  /*
   * Expected backend:
   *
   * {
   *   success: true,
   *   data: [...]
   * }
   */

  if (!result?.success) {
    throw new Error(
      result?.message ||
        "Unable to load waste records"
    );
  }

  return Array.isArray(result.data)
    ? result.data
    : [];
};


/*
|--------------------------------------------------------------------------
| WASTE REGISTER
|--------------------------------------------------------------------------
*/

function WasteRegister() {
  const [wasteRecords, setWasteRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [binFilter, setBinFilter] =
    useState("ALL");

  const [selectedWaste, setSelectedWaste] =
    useState(null);

  const [lastUpdated, setLastUpdated] =
    useState(null);


  /*
  |--------------------------------------------------------------------------
  | LOAD WASTE
  |--------------------------------------------------------------------------
  */

  const loadWaste = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const records =
          await fetchWasteRecords();

        setWasteRecords(records);

        setLastUpdated(
          new Date()
        );
      } catch (err) {
        console.error(
          "Failed to load waste:",
          err
        );

        setError(
          err?.message ||
            "Failed to load waste records."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD + AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWaste(true);

    const interval =
      setInterval(() => {
        loadWaste(false);
      }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [loadWaste]);


  /*
  |--------------------------------------------------------------------------
  | NORMALIZED RECORDS
  |--------------------------------------------------------------------------
  */

  const normalizedRecords =
    useMemo(() => {
      return wasteRecords.map(
        (record) => {
          const category =
            normalizeCategory(
              record.category
            );

          const status =
            normalizeStatus(
              record.status
            );

          /*
           * Department can come from:
           *
           * sourceLocation
           * department
           * source
           */

          const department =
            record.sourceLocation ||
            record.department ||
            record.source ||
            "—";

          /*
           * Robot can come from:
           *
           * robotId
           * robot
           * robot.robotId
           */

          let robotId =
            record.robotId;

          if (
            !robotId &&
            typeof record.robot ===
              "string"
          ) {
            robotId =
              record.robot;
          }

          if (
            !robotId &&
            record.robot?.robotId
          ) {
            robotId =
              record.robot.robotId;
          }

          return {
            ...record,

            category,

            status,

            department,

            robotId:
              robotId ||
              "Not assigned",

            confidence:
              record.confidence ??
              record.aiConfidence ??
              0,

            weight:
              Number(
                record.weight || 0
              ),
          };
        }
      );
    }, [wasteRecords]);


  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return normalizedRecords.filter(
        (record) => {
          /*
           * Search
           */

          const searchableText =
            [
              record.wasteId,
              record.itemType,
              record.category,
              record.department,
              record.robotId,
              record.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          if (
            query &&
            !searchableText.includes(
              query
            )
          ) {
            return false;
          }

          /*
           * Status
           */

          if (
            statusFilter !== "ALL" &&
            record.status !==
              statusFilter.toLowerCase()
          ) {
            return false;
          }

          /*
           * Bin
           */

          if (
            binFilter !== "ALL" &&
            record.category !==
              binFilter
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      normalizedRecords,
      search,
      statusFilter,
      binFilter,
    ]);


  /*
  |--------------------------------------------------------------------------
  | DASHBOARD COUNTS
  |--------------------------------------------------------------------------
  */

  const stats =
    useMemo(() => {
      const total =
        normalizedRecords.length;

      const pending =
        normalizedRecords.filter(
          (record) =>
            [
              "pending",
              "confirmed",
            ].includes(
              record.status
            )
        ).length;

      const active =
        normalizedRecords.filter(
          (record) =>
            [
              "dispatched",
              "moving_to_pickup",
              "arrived_at_pickup",
              "collecting",
              "moving_to_bin",
              "depositing",
              "returning",
            ].includes(
              record.status
            )
        ).length;

      const disposed =
        normalizedRecords.filter(
          (record) =>
            [
              "disposed",
              "completed",
            ].includes(
              record.status
            )
        ).length;

      return {
        total,
        pending,
        active,
        disposed,
      };
    }, [normalizedRecords]);


  /*
  |--------------------------------------------------------------------------
  | BIN STYLE
  |--------------------------------------------------------------------------
  */

  const getBinStyle = (category) => {
    switch (
      normalizeCategory(category)
    ) {
      case "yellow":
        return {
          background:
            "#fff7cc",
          border:
            "#facc15",
          text:
            "#92400e",
          dot:
            "#eab308",
        };

      case "red":
        return {
          background:
            "#fee2e2",
          border:
            "#f87171",
          text:
            "#991b1b",
          dot:
            "#ef4444",
        };

      case "blue":
        return {
          background:
            "#dbeafe",
          border:
            "#60a5fa",
          text:
            "#1e40af",
          dot:
            "#3b82f6",
        };

      default:
        return {
          background:
            "#f3f4f6",
          border:
            "#cbd5e1",
          text:
            "#334155",
          dot:
            "#a855f7",
        };
    }
  };


  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  const getStatusStyle = (status) => {
    switch (
      normalizeStatus(status)
    ) {
      case "pending":
        return {
          background:
            "#fff7ed",
          border:
            "#fed7aa",
          color:
            "#c2410c",
          dot:
            "#f97316",
        };

      case "confirmed":
        return {
          background:
            "#dbeafe",
          border:
            "#bfdbfe",
          color:
            "#1d4ed8",
          dot:
            "#2563eb",
        };

      case "dispatched":
      case "moving_to_pickup":
      case "arrived_at_pickup":
      case "collecting":
      case "moving_to_bin":
      case "depositing":
      case "returning":
        return {
          background:
            "#ede9fe",
          border:
            "#ddd6fe",
          color:
            "#6d28d9",
          dot:
            "#7c3aed",
        };

      case "collected":
      case "disposed":
      case "completed":
        return {
          background:
            "#dcfce7",
          border:
            "#bbf7d0",
          color:
            "#15803d",
          dot:
            "#22c55e",
        };

      case "cancelled":
      case "failed":
        return {
          background:
            "#fee2e2",
          border:
            "#fecaca",
          color:
            "#b91c1c",
          dot:
            "#ef4444",
        };

      default:
        return {
          background:
            "#f1f5f9",
          border:
            "#cbd5e1",
          color:
            "#475569",
          dot:
            "#64748b",
        };
    }
  };


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#f8fafc",
        padding:
          "28px",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color:
          "#0f172a",
      }}
    >

      {/* ============================================================
          HEADER
      ============================================================ */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "24px",
          gap:
            "20px",
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin:
                0,
              fontSize:
                "28px",
              fontWeight:
                700,
              color:
                "#0f172a",
            }}
          >
            Waste Management
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",
              color:
                "#64748b",
              fontSize:
                "14px",
            }}
          >
            Complete waste register with
            robot and department tracking
          </p>
        </div>


        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "12px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "7px",
              padding:
                "8px 13px",
              border:
                "1px solid #bbf7d0",
              background:
                "#f0fdf4",
              borderRadius:
                "999px",
              fontSize:
                "13px",
              color:
                "#15803d",
              fontWeight:
                500,
            }}
          >
            <span
              style={{
                width:
                  "8px",
                height:
                  "8px",
                borderRadius:
                  "50%",
                background:
                  "#22c55e",
              }}
            />

            Live updates
          </div>


          <button
            onClick={() =>
              loadWaste(true)
            }
            disabled={loading}
            style={{
              border:
                "1px solid #cbd5e1",
              background:
                "#ffffff",
              borderRadius:
                "9px",
              padding:
                "9px 15px",
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
              color:
                "#334155",
              fontWeight:
                600,
            }}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </div>


      {/* ============================================================
          ERROR
      ============================================================ */}

      {error && (
        <div
          style={{
            marginBottom:
              "20px",
            padding:
              "14px 16px",
            background:
              "#fef2f2",
            border:
              "1px solid #fecaca",
            borderRadius:
              "10px",
            color:
              "#b91c1c",
            fontSize:
              "14px",
          }}
        >
          <strong>
            Failed to load waste:
          </strong>{" "}
          {error}
        </div>
      )}


      {/* ============================================================
          STAT CARDS
      ============================================================ */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap:
            "16px",
          marginBottom:
            "24px",
        }}
      >

        <StatCard
          title="Total Waste"
          value={stats.total}
          subtitle="Registered waste records"
          icon="📦"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          subtitle="Waiting for collection"
          icon="⏳"
        />

        <StatCard
          title="Robot Active"
          value="3"
          subtitle="Currently being handled"
          icon="🤖"
        />

        <StatCard
          title="Disposed"
          value="10"
          subtitle="Successfully placed in bin"
          icon="✅"
        />

      </div>


      {/* ============================================================
          FILTER BAR
      ============================================================ */}

      <div
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius:
            "16px",
          padding:
            "18px",
          marginBottom:
            "24px",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1.5fr 1fr 1fr",
            gap:
              "14px",
          }}
        >

          {/* SEARCH */}

          <div>
            <label
              style={
                labelStyle
              }
            >
              SEARCH
            </label>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search waste, robot, department..."
              style={
                inputStyle
              }
            />
          </div>


          {/* STATUS */}

          <div>
            <label
              style={
                labelStyle
              }
            >
              STATUS
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "ALL"
                      ? "All Status"
                      : formatStatus(
                          status
                        )}
                  </option>
                )
              )}
            </select>
          </div>


          {/* BIN */}

          <div>
            <label
              style={
                labelStyle
              }
            >
              BIN
            </label>

            <select
              value={
                binFilter
              }
              onChange={(e) =>
                setBinFilter(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              {BIN_OPTIONS.map(
                (bin) => (
                  <option
                    key={bin}
                    value={bin}
                  >
                    {bin === "ALL"
                      ? "All Bins"
                      : formatCategory(
                          bin
                        )}
                  </option>
                )
              )}
            </select>
          </div>

        </div>
      </div>


      {/* ============================================================
          TABLE
      ============================================================ */}

      <div
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius:
            "16px",
          overflow:
            "hidden",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >

        {/* TABLE HEADER */}

        <div
          style={{
            padding:
              "20px",
            borderBottom:
              "1px solid #e2e8f0",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "15px",
          }}
        >

          <div>
            <h2
              style={{
                margin:
                  0,
                fontSize:
                  "18px",
                fontWeight:
                  700,
              }}
            >
              Waste Records
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",
                fontSize:
                  "13px",
                color:
                  "#64748b",
              }}
            >
              Showing{" "}
              <strong>
                {
                  filteredRecords.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {
                  normalizedRecords.length
                }
              </strong>{" "}
              records
            </p>
          </div>


          {lastUpdated && (
            <div
              style={{
                fontSize:
                  "12px",
                color:
                  "#94a3b8",
              }}
            >
              Updated{" "}
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}

        </div>


        {/* TABLE */}

        {loading &&
        normalizedRecords.length ===
          0 ? (
          <div
            style={{
              padding:
                "70px 20px",
              textAlign:
                "center",
              color:
                "#64748b",
            }}
          >
            Loading waste records...
          </div>
        ) : filteredRecords.length ===
          0 ? (
          <div
            style={{
              padding:
                "70px 20px",
              textAlign:
                "center",
              color:
                "#64748b",
            }}
          >
            <div
              style={{
                fontSize:
                  "40px",
                marginBottom:
                  "12px",
              }}
            >
              📋
            </div>

            <div
              style={{
                fontWeight:
                  600,
                color:
                  "#334155",
                marginBottom:
                  "5px",
              }}
            >
              No waste records found
            </div>

            <div
              style={{
                fontSize:
                  "13px",
              }}
            >
              Try changing your search or
              filters.
            </div>
          </div>
        ) : (
          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width:
                  "100%",
                borderCollapse:
                  "collapse",
                minWidth:
                  "1100px",
              }}
            >

              <thead>
                <tr
                  style={{
                    background:
                      "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                  }}
                >

                  <TableHeader>
                    WASTE
                  </TableHeader>

                  <TableHeader>
                    CATEGORY / BIN
                  </TableHeader>

                  <TableHeader>
                    DEPARTMENT
                  </TableHeader>

                  <TableHeader>
                    WEIGHT
                  </TableHeader>

                  <TableHeader>
                    ROBOT
                  </TableHeader>

                  <TableHeader>
                    STATUS
                  </TableHeader>

                  <TableHeader>
                    DATE
                  </TableHeader>

                  <TableHeader>
                    ACTION
                  </TableHeader>

                </tr>
              </thead>


              <tbody>
                {filteredRecords.map(
                  (record, index) => {
                    const binStyle =
                      getBinStyle(
                        record.category
                      );

                    const statusStyle =
                      getStatusStyle(
                        record.status
                      );

                    return (
                      <tr
                        key={
                          record._id ||
                          record.wasteId ||
                          `waste-${index}`
                        }
                        style={{
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >

                        {/* WASTE */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "12px",
                            }}
                          >

                            <div
                              style={{
                                width:
                                  "44px",
                                height:
                                  "44px",
                                borderRadius:
                                  "11px",
                                background:
                                  "#f1f5f9",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                fontSize:
                                  "21px",
                              }}
                            >
                              🗑️
                            </div>

                            <div>
                              <div
                                style={{
                                  fontWeight:
                                    700,
                                  fontSize:
                                    "15px",
                                  color:
                                    "#0f172a",
                                }}
                              >
                                {record.itemType ||
                                  "Biomedical Waste"}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  fontSize:
                                    "12px",
                                  color:
                                    "#94a3b8",
                                }}
                              >
                                ID:{" "}
                                {record.wasteId ||
                                  "—"}
                              </div>
                            </div>

                          </div>
                        </td>


                        {/* CATEGORY */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "8px",
                              padding:
                                "7px 10px",
                              background:
                                binStyle.background,
                              border:
                                `1px solid ${binStyle.border}`,
                              borderRadius:
                                "8px",
                              color:
                                binStyle.text,
                              fontSize:
                                "12px",
                              fontWeight:
                                700,
                            }}
                          >
                            <span
                              style={{
                                width:
                                  "9px",
                                height:
                                  "9px",
                                borderRadius:
                                  "50%",
                                background:
                                  binStyle.dot,
                              }}
                            />

                            {formatCategory(
                              record.category
                            )}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "5px",
                              color:
                                "#94a3b8",
                              fontSize:
                                "11px",
                            }}
                          >
                            AI confidence:{" "}
                            {formatConfidence(
                              record.confidence
                            )}
                          </div>
                        </td>


                        {/* DEPARTMENT */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "8px",
                              padding:
                                "8px 11px",
                              background:
                                "#f1f5f9",
                              borderRadius:
                                "9px",
                              color:
                                "#334155",
                              fontWeight:
                                700,
                              fontSize:
                                "13px",
                            }}
                          >
                            🏥

                            <span>
                              {
                                record.department
                              }
                            </span>
                          </div>
                        </td>


                        {/* WEIGHT */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <span
                            style={{
                              fontWeight:
                                600,
                              color:
                                "#0f172a",
                            }}
                          >
                            {record.weight}{" "}
                            kg
                          </span>
                        </td>


                        {/* ROBOT */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {record.robotId &&
                          record.robotId !==
                            "Not assigned" ? (
                            <div
                              style={{
                                display:
                                  "inline-flex",
                                alignItems:
                                  "center",
                                gap:
                                  "8px",
                                padding:
                                  "8px 11px",
                                background:
                                  "#eff6ff",
                                border:
                                  "1px solid #bfdbfe",
                                borderRadius:
                                  "9px",
                                color:
                                  "#1d4ed8",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  700,
                              }}
                            >
                              🤖

                              <span>
                                {
                                  record.robotId
                                }
                              </span>
                            </div>
                          ) : (
                            <span
                              style={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "13px",
                              }}
                            >
                              Not assigned
                            </span>
                          )}
                        </td>


                        {/* STATUS */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "7px",
                              padding:
                                "7px 11px",
                              background:
                                statusStyle.background,
                              border:
                                `1px solid ${statusStyle.border}`,
                              color:
                                statusStyle.color,
                              borderRadius:
                                "999px",
                              fontSize:
                                "12px",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <span
                              style={{
                                width:
                                  "8px",
                                height:
                                  "8px",
                                borderRadius:
                                  "50%",
                                background:
                                  statusStyle.dot,
                              }}
                            />

                            {formatStatus(
                              record.status
                            )}
                          </div>
                        </td>


                        {/* DATE */}

                        <td
                          style={{
                            ...cellStyle,
                            color:
                              "#64748b",
                            fontSize:
                              "12px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatDate(
                            record.createdAt
                          )}
                        </td>


                        {/* ACTION */}

                        <td
                          style={
                            cellStyle
                          }
                        >
                          <button
                            onClick={() =>
                              setSelectedWaste(
                                record
                              )
                            }
                            style={{
                              padding:
                                "8px 14px",
                              background:
                                "#ffffff",
                              border:
                                "1px solid #dbe2ea",
                              borderRadius:
                                "9px",
                              color:
                                "#334155",
                              fontWeight:
                                600,
                              cursor:
                                "pointer",
                            }}
                          >
                            View
                          </button>
                        </td>

                      </tr>
                    );
                  }
                )}
              </tbody>

            </table>
          </div>
        )}

      </div>


      {/* ============================================================
          DETAIL MODAL
      ============================================================ */}

      {selectedWaste && (
        <div
          onClick={() =>
            setSelectedWaste(null)
          }
          style={{
            position:
              "fixed",
            inset:
              0,
            background:
              "rgba(15,23,42,0.45)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "20px",
            zIndex:
              1000,
          }}
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width:
                "min(600px, 100%)",
              maxHeight:
                "85vh",
              overflowY:
                "auto",
              background:
                "#ffffff",
              borderRadius:
                "18px",
              boxShadow:
                "0 25px 60px rgba(15,23,42,0.25)",
              padding:
                "24px",
            }}
          >

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "22px",
              }}
            >

              <div>
                <h2
                  style={{
                    margin:
                      0,
                    fontSize:
                      "21px",
                  }}
                >
                  Waste Details
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#64748b",
                    fontSize:
                      "13px",
                  }}
                >
                  {
                    selectedWaste.wasteId
                  }
                </p>
              </div>


              <button
                onClick={() =>
                  setSelectedWaste(
                    null
                  )
                }
                style={{
                  width:
                    "34px",
                  height:
                    "34px",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    "8px",
                  background:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "18px",
                }}
              >
                ×
              </button>

            </div>


            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "12px",
              }}
            >

              <DetailItem
                label="Waste ID"
                value={
                  selectedWaste.wasteId ||
                  "—"
                }
              />

              <DetailItem
                label="Item Type"
                value={
                  selectedWaste.itemType ||
                  "Biomedical Waste"
                }
              />

              <DetailItem
                label="Category / Bin"
                value={formatCategory(
                  selectedWaste.category
                )}
              />

              <DetailItem
                label="AI Confidence"
                value={formatConfidence(
                  selectedWaste.confidence
                )}
              />

              <DetailItem
                label="Department"
                value={
                  selectedWaste.department ||
                  "—"
                }
              />

              <DetailItem
                label="Assigned Robot"
                value={
                  selectedWaste.robotId ||
                  "Not assigned"
                }
              />

              <DetailItem
                label="Weight"
                value={`${selectedWaste.weight || 0} kg`}
              />

              <DetailItem
                label="Status"
                value={formatStatus(
                  selectedWaste.status
                )}
              />

              <DetailItem
                label="Created At"
                value={formatDate(
                  selectedWaste.createdAt
                )}
              />

              <DetailItem
                label="Collected At"
                value={formatDate(
                  selectedWaste.collectedAt
                )}
              />

            </div>


            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "15px",
                background:
                  "#f8fafc",
                borderRadius:
                  "11px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#64748b",
                  marginBottom:
                    "5px",
                }}
              >
                Source Location
              </div>

              <div
                style={{
                  fontWeight:
                    700,
                  color:
                    "#334155",
                }}
              >
                {selectedWaste.sourceLocation ||
                  selectedWaste.department ||
                  "—"}
              </div>
            </div>


            <div
              style={{
                marginTop:
                  "18px",
                display:
                  "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                onClick={() =>
                  setSelectedWaste(
                    null
                  )
                }
                style={{
                  padding:
                    "10px 18px",
                  background:
                    "#0f172a",
                  color:
                    "#ffffff",
                  border:
                    "none",
                  borderRadius:
                    "9px",
                  cursor:
                    "pointer",
                  fontWeight:
                    600,
                }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
  title,
  value,
  subtitle,
  icon,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "16px",
        padding:
          "20px",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
        }}
      >

        <div>
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "14px",
              marginBottom:
                "7px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize:
                "32px",
              lineHeight:
                1,
              fontWeight:
                750,
              color:
                "#0f172a",
            }}
          >
            {value}
          </div>

          <div
            style={{
              marginTop:
                "9px",
              color:
                "#64748b",
              fontSize:
                "12px",
            }}
          >
            {subtitle}
          </div>
        </div>


        <div
          style={{
            width:
              "44px",
            height:
              "44px",
            borderRadius:
              "12px",
            background:
              "#f1f5f9",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontSize:
              "22px",
          }}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| TABLE HEADER
|--------------------------------------------------------------------------
*/

function TableHeader({
  children,
}) {
  return (
    <th
      style={{
        padding:
          "14px 18px",
        textAlign:
          "left",
        color:
          "#64748b",
        fontSize:
          "11px",
        fontWeight:
          700,
        letterSpacing:
          "0.04em",
        whiteSpace:
          "nowrap",
      }}
    >
      {children}
    </th>
  );
}


/*
|--------------------------------------------------------------------------
| DETAIL ITEM
|--------------------------------------------------------------------------
*/

function DetailItem({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          "13px",
        background:
          "#f8fafc",
        border:
          "1px solid #eef2f7",
        borderRadius:
          "10px",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            "11px",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            "#0f172a",
          fontSize:
            "13px",
          fontWeight:
            700,
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const labelStyle = {
  display:
    "block",
  marginBottom:
    "7px",
  fontSize:
    "11px",
  fontWeight:
    700,
  color:
    "#64748b",
  letterSpacing:
    "0.04em",
};


const inputStyle = {
  width:
    "100%",
  height:
    "42px",
  boxSizing:
    "border-box",
  border:
    "1px solid #dbe2ea",
  borderRadius:
    "10px",
  padding:
    "0 13px",
  background:
    "#f8fafc",
  color:
    "#334155",
  outline:
    "none",
  fontSize:
    "13px",
};


const cellStyle = {
  padding:
    "16px 18px",
  verticalAlign:
    "middle",
};


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default WasteRegister;
