import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import wasteApi from "../services/api";
import socket, {
  connectDigitalTwin,
  disconnectDigitalTwin,
} from "../services/socket";


/* ============================================================
   HELPERS
============================================================ */

const normalizeCategory = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();

  if (v.includes("yellow")) return "yellow";
  if (v.includes("red")) return "red";
  if (v.includes("blue")) return "blue";
  if (
    v.includes("general") ||
    v.includes("non") ||
    v.includes("municipal")
  ) {
    return "general";
  }

  return v || "general";
};


const normalizeStatus = (value) => {
  return String(value || "pending")
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


const getDepartment = (record) => {
  return (
    record?.sourceLocation ||
    record?.department ||
    record?.sourceDepartment ||
    record?.pickupDepartment ||
    record?.task?.department ||
    record?.taskId?.department ||
    "Not assigned"
  );
};


const getRobotId = (record) => {
  return (
    record?.robotId ||
    record?.robot?.robotId ||
    record?.assignedRobot ||
    record?.assignedRobotId ||
    record?.task?.robotId ||
    record?.taskId?.robotId ||
    "Not assigned"
  );
};


const getCategory = (record) => {
  return normalizeCategory(
    record?.category ||
      record?.expectedCategory ||
      record?.bin ||
      "general"
  );
};


const getConfidence = (record) => {
  const confidence = Number(
    record?.confidence ??
      record?.aiConfidence ??
      0
  );

  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }

  return Math.round(confidence);
};


const getWeight = (record) => {
  const weight = Number(record?.weight ?? 0);

  return Number.isFinite(weight)
    ? weight
    : 0;
};


const getWasteId = (record, index) => {
  return (
    record?.wasteId ||
    record?.id ||
    record?._id ||
    `TEMP-${index + 1}`
  );
};


const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
};


/* ============================================================
   CATEGORY CONFIG
============================================================ */

const CATEGORY_CONFIG = {
  yellow: {
    label: "Yellow Bin",
    dot: "bg-yellow-400",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
  },

  red: {
    label: "Red Bin",
    dot: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
  },

  blue: {
    label: "Blue Bin",
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-800",
  },

  general: {
    label: "General Bin",
    dot: "bg-purple-300",
    bg: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-800",
  },
};


/* ============================================================
   STATUS CONFIG
============================================================ */

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className:
      "bg-yellow-50 text-yellow-700 border-yellow-200",
  },

  confirmed: {
    label: "Confirmed",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
  },

  dispatched: {
    label: "Dispatched",
    className:
      "bg-indigo-50 text-indigo-700 border-indigo-200",
  },

  moving_to_pickup: {
    label: "Moving to Pickup",
    className:
      "bg-purple-50 text-purple-700 border-purple-200",
  },

  arrived_at_pickup: {
    label: "Arrived at Pickup",
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-200",
  },

  collecting: {
    label: "Collecting",
    className:
      "bg-orange-50 text-orange-700 border-orange-200",
  },

  moving_to_bin: {
    label: "Moving to Bin",
    className:
      "bg-indigo-50 text-indigo-700 border-indigo-200",
  },

  depositing: {
    label: "Depositing",
    className:
      "bg-violet-50 text-violet-700 border-violet-200",
  },

  collected: {
    label: "Collected",
    className:
      "bg-green-50 text-green-700 border-green-200",
  },

  disposed: {
    label: "Disposed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
  },

  returning: {
    label: "Returning",
    className:
      "bg-sky-50 text-sky-700 border-sky-200",
  },

  completed: {
    label: "Completed",
    className:
      "bg-green-50 text-green-700 border-green-200",
  },

  cancelled: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-600 border-slate-200",
  },

  failed: {
    label: "Failed",
    className:
      "bg-red-50 text-red-700 border-red-200",
  },
};


/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const config =
    STATUS_CONFIG[normalized] || {
      label: formatStatus(normalized),
      className:
        "bg-slate-50 text-slate-700 border-slate-200",
    };

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        px-3
        py-1.5
        rounded-full
        border
        text-xs
        font-semibold
        whitespace-nowrap
        ${config.className}
      `}
    >
      <span className="w-2 h-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}


/* ============================================================
   BIN BADGE
============================================================ */

function BinBadge({ category }) {
  const normalized = normalizeCategory(category);

  const config =
    CATEGORY_CONFIG[normalized] ||
    CATEGORY_CONFIG.general;

  return (
    <div
      className={`
        inline-flex
        items-center
        gap-2
        px-3
        py-1.5
        rounded-lg
        border
        ${config.bg}
        ${config.border}
        ${config.text}
      `}
    >
      <span
        className={`
          w-3
          h-3
          rounded-full
          ${config.dot}
        `}
      />

      <span className="text-xs font-semibold">
        {config.label}
      </span>
    </div>
  );
}


/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function WasteRegister() {
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [binFilter, setBinFilter] =
    useState("ALL");

  const [selectedWaste, setSelectedWaste] =
    useState(null);

  const [socketOnline, setSocketOnline] =
    useState(false);


  /* ==========================================================
     LOAD WASTE
  ========================================================== */

  const loadWaste = async () => {
    try {
      setError("");

      const response =
        await wasteApi.list({
          page: 1,
          limit: 100,
        });

      const data =
        response?.data?.data ??
        response?.data ??
        [];

      setRecords(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load waste:",
        err
      );

      setError(
        err?.message ||
          "Unable to load waste records."
      );
    } finally {
      setLoading(false);
    }
  };


  /* ==========================================================
     INITIAL LOAD + POLLING
  ========================================================== */

  useEffect(() => {
    loadWaste();

    const interval = setInterval(
      loadWaste,
      5000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);


  /* ==========================================================
     SOCKET CONNECTION
  ========================================================== */

  useEffect(() => {
    try {
      connectDigitalTwin();
      setSocketOnline(true);
    } catch (err) {
      console.warn(
        "Socket connection failed:",
        err
      );

      setSocketOnline(false);
    }


    const refreshWaste = (payload) => {
      console.log(
        "♻️ Waste live update:",
        payload
      );

      /*
       * Reload from MongoDB.
       *
       * This is important because the
       * socket payload may contain only
       * partial robot/task information.
       *
       * MongoDB remains the source of truth.
       */
      loadWaste();
    };


    const handleConnect = () => {
      console.log(
        "🟢 Waste Register socket connected"
      );

      setSocketOnline(true);
    };


    const handleDisconnect = () => {
      console.log(
        "🔴 Waste Register socket disconnected"
      );

      setSocketOnline(false);
    };


    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );


    /* Waste events */

    socket.on(
      "waste:update",
      refreshWaste
    );

    socket.on(
      "waste:updated",
      refreshWaste
    );

    socket.on(
      "collection:update",
      refreshWaste
    );

    socket.on(
      "collection:completed",
      refreshWaste
    );

    socket.on(
      "task:update",
      refreshWaste
    );


    /* Robot events */

    socket.on(
      "robot:status",
      refreshWaste
    );

    socket.on(
      "robot-status",
      refreshWaste
    );

    socket.on(
      "robotStatus",
      refreshWaste
    );

    socket.on(
      "digital-twin:update",
      refreshWaste
    );

    socket.on(
      "digitalTwin:update",
      refreshWaste
    );


    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "waste:update",
        refreshWaste
      );

      socket.off(
        "waste:updated",
        refreshWaste
      );

      socket.off(
        "collection:update",
        refreshWaste
      );

      socket.off(
        "collection:completed",
        refreshWaste
      );

      socket.off(
        "task:update",
        refreshWaste
      );

      socket.off(
        "robot:status",
        refreshWaste
      );

      socket.off(
        "robot-status",
        refreshWaste
      );

      socket.off(
        "robotStatus",
        refreshWaste
      );

      socket.off(
        "digital-twin:update",
        refreshWaste
      );

      socket.off(
        "digitalTwin:update",
        refreshWaste
      );

      disconnectDigitalTwin();
    };
  }, []);


  /* ==========================================================
     NORMALIZED RECORDS
  ========================================================== */

  const normalizedRecords = useMemo(() => {
    return records.map(
      (record, index) => ({
        ...record,

        displayWasteId:
          getWasteId(
            record,
            index
          ),

        displayCategory:
          getCategory(record),

        displayDepartment:
          getDepartment(record),

        displayRobot:
          getRobotId(record),

        displayStatus:
          normalizeStatus(
            record?.status
          ),

        displayWeight:
          getWeight(record),

        displayConfidence:
          getConfidence(record),

        displayDate:
          record?.createdAt ||
          record?.updatedAt ||
          record?.collectedAt,
      })
    );
  }, [records]);


  /* ==========================================================
     FILTER RECORDS
  ========================================================== */

  const filteredRecords = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return normalizedRecords.filter(
      (record) => {
        const matchesSearch =
          !query ||
          String(
            record.displayWasteId
          )
            .toLowerCase()
            .includes(query) ||
          String(
            record.itemType || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            record.displayRobot
          )
            .toLowerCase()
            .includes(query) ||
          String(
            record.displayDepartment
          )
            .toLowerCase()
            .includes(query) ||
          String(
            record.displayCategory
          )
            .toLowerCase()
            .includes(query);


        const matchesStatus =
          statusFilter === "ALL" ||
          record.displayStatus ===
            normalizeStatus(
              statusFilter
            );


        const matchesBin =
          binFilter === "ALL" ||
          record.displayCategory ===
            binFilter;


        return (
          matchesSearch &&
          matchesStatus &&
          matchesBin
        );
      }
    );
  }, [
    normalizedRecords,
    search,
    statusFilter,
    binFilter,
  ]);


  /* ==========================================================
     STATISTICS
  ========================================================== */

  const statistics = useMemo(() => {
    const total =
      normalizedRecords.length;

    const pending =
      normalizedRecords.filter(
        (record) =>
          [
            "pending",
            "confirmed",
            "dispatched",
            "moving_to_pickup",
            "arrived_at_pickup",
            "collecting",
            "moving_to_bin",
            "depositing",
          ].includes(
            record.displayStatus
          )
      ).length;


    const activeRobots =
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
            record.displayStatus
          )
      ).length;


    const disposed =
      normalizedRecords.filter(
        (record) =>
          [
            "disposed",
            "completed",
          ].includes(
            record.displayStatus
          )
      ).length;


    return {
      total,
      pending,
      activeRobots,
      disposed,
    };
  }, [normalizedRecords]);


  /* ==========================================================
     EXPORT
  ========================================================== */

  const handleExport = async () => {
    try {
      /*
       * If your api.js has exportWaste(),
       * use it.
       */
      if (
        typeof wasteApi.export ===
        "function"
      ) {
        await wasteApi.export();
        return;
      }


      if (
        typeof wasteApi.exportWaste ===
        "function"
      ) {
        await wasteApi.exportWaste();
        return;
      }


      /*
       * Frontend fallback CSV.
       */

      const header = [
        "Waste ID",
        "Category",
        "Department",
        "Robot",
        "Weight (kg)",
        "Status",
        "AI Confidence",
        "Date",
      ];


      const rows =
        normalizedRecords.map(
          (record) => [
            record.displayWasteId,
            record.displayCategory,
            record.displayDepartment,
            record.displayRobot,
            record.displayWeight,
            record.displayStatus,
            `${record.displayConfidence}%`,
            record.displayDate
              ? new Date(
                  record.displayDate
                ).toISOString()
              : "",
          ]
        );


      const csv = [
        header,
        ...rows,
      ]
        .map((row) =>
          row
            .map((value) =>
              `"${String(
                value ?? ""
              ).replace(
                /"/g,
                '""'
              )}"`
            )
            .join(",")
        )
        .join("\n");


      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        "meditwin-waste-register.csv";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        "Export failed:",
        err
      );

      alert(
        "Unable to export waste records."
      );
    }
  };


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />

            <p className="text-slate-500">
              Loading waste records...
            </p>
          </div>
        </div>
      </div>
    );
  }


  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Waste Management
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Complete biomedical waste register
              with robot tracking
            </p>
          </div>


          <div className="flex items-center gap-3">

            <div
              className={`
                px-3
                py-2
                rounded-full
                text-xs
                font-semibold
                border
                ${
                  socketOnline
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                }
              `}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-current mr-2" />

              {socketOnline
                ? "LIVE"
                : "OFFLINE"}
            </div>


            <button
              onClick={handleExport}
              className="
                px-4
                py-2.5
                bg-slate-900
                text-white
                rounded-lg
                text-sm
                font-semibold
                hover:bg-slate-800
                transition
              "
            >
              Export CSV
            </button>

          </div>

        </div>
      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}


      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        {/* Total */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Waste
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {statistics.total}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Registered waste records
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
              📦
            </div>
          </div>
        </div>


        {/* Pending */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Pending
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {statistics.pending}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Waiting for collection
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
              ⏳
            </div>
          </div>
        </div>


        {/* Robot */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Robot Active
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {statistics.activeRobots}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Currently being handled
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
              🤖
            </div>
          </div>
        </div>


        {/* Disposed */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Disposed
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {statistics.disposed}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Successfully placed in bin
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
              ✅
            </div>
          </div>
        </div>

      </div>


      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Search */}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search waste, robot, department..."
              className="
                w-full
                px-4
                py-3
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                outline-none
                focus:ring-2
                focus:ring-blue-200
                focus:border-blue-400
                text-sm
              "
            />
          </div>


          {/* Status */}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="
                w-full
                px-4
                py-3
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                outline-none
                text-sm
              "
            >
              <option value="ALL">
                All Status
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="confirmed">
                Confirmed
              </option>

              <option value="dispatched">
                Dispatched
              </option>

              <option value="moving_to_pickup">
                Moving to Pickup
              </option>

              <option value="collecting">
                Collecting
              </option>

              <option value="moving_to_bin">
                Moving to Bin
              </option>

              <option value="depositing">
                Depositing
              </option>

              <option value="collected">
                Collected
              </option>

              <option value="disposed">
                Disposed
              </option>

              <option value="returning">
                Returning
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="failed">
                Failed
              </option>
            </select>
          </div>


          {/* Bin */}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
              Bin
            </label>

            <select
              value={binFilter}
              onChange={(e) =>
                setBinFilter(
                  e.target.value
                )
              }
              className="
                w-full
                px-4
                py-3
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                outline-none
                text-sm
              "
            >
              <option value="ALL">
                All Bins
              </option>

              <option value="yellow">
                Yellow Bin
              </option>

              <option value="red">
                Red Bin
              </option>

              <option value="blue">
                Blue Bin
              </option>

              <option value="general">
                General Bin
              </option>
            </select>
          </div>

        </div>
      </div>


      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Table Header */}

        <div className="px-5 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Waste Records
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredRecords.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {normalizedRecords.length}
              </span>{" "}
              records
            </p>
          </div>


          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full" />

            Live updates enabled
          </div>

        </div>


        {/* Empty */}

        {filteredRecords.length === 0 ? (
          <div className="py-20 text-center">

            <div className="text-5xl mb-4">
              🗑️
            </div>

            <h3 className="font-semibold text-slate-800">
              No waste records found
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Try changing your search or filters.
            </p>

          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead className="bg-slate-50 border-b border-slate-200">

                <tr>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Waste
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Category / Bin
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Department
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Weight
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Robot
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Status
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Date
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filteredRecords.map(
                  (record, index) => (

                    <tr
                      key={
                        record._id ||
                        record.wasteId ||
                        `${record.displayWasteId}-${index}`
                      }
                      className="hover:bg-slate-50 transition"
                    >

                      {/* ====================================
                          WASTE
                      ==================================== */}

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-3">

                          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                            🗑️
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {record.itemType ||
                                "Biomedical Waste"}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              ID:{" "}
                              {record.displayWasteId}
                            </p>

                          </div>

                        </div>

                      </td>


                      {/* ====================================
                          CATEGORY
                      ==================================== */}

                      <td className="px-5 py-5">

                        <BinBadge
                          category={
                            record.displayCategory
                          }
                        />

                        <p className="text-xs text-slate-400 mt-1">
                          AI confidence:{" "}
                          <span className="font-medium">
                            {
                              record.displayConfidence
                            }
                            %
                          </span>
                        </p>

                      </td>


                      {/* ====================================
                          DEPARTMENT
                      ==================================== */}

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-2">

                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            🏥
                          </div>

                          <div>

                            <p
                              className={`
                                font-semibold
                                text-sm
                                ${
                                  record.displayDepartment ===
                                  "Not assigned"
                                    ? "text-slate-400"
                                    : "text-slate-800"
                                }
                              `}
                            >
                              {
                                record.displayDepartment
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              Pickup location
                            </p>

                          </div>

                        </div>

                      </td>


                      {/* ====================================
                          WEIGHT
                      ==================================== */}

                      <td className="px-5 py-5">

                        <span className="font-semibold text-slate-800">
                          {
                            record.displayWeight
                          }{" "}
                          kg
                        </span>

                      </td>


                      {/* ====================================
                          ROBOT
                      ==================================== */}

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-2">

                          <div
                            className={`
                              w-9
                              h-9
                              rounded-lg
                              flex
                              items-center
                              justify-center
                              ${
                                record.displayRobot !==
                                "Not assigned"
                                  ? "bg-purple-50"
                                  : "bg-slate-100"
                              }
                            `}
                          >
                            🤖
                          </div>

                          <div>

                            <p
                              className={`
                                text-sm
                                font-semibold
                                ${
                                  record.displayRobot !==
                                  "Not assigned"
                                    ? "text-slate-800"
                                    : "text-slate-400"
                                }
                              `}
                            >
                              {
                                record.displayRobot
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              Assigned robot
                            </p>

                          </div>

                        </div>

                      </td>


                      {/* ====================================
                          STATUS
                      ==================================== */}

                      <td className="px-5 py-5">

                        <StatusBadge
                          status={
                            record.displayStatus
                          }
                        />

                      </td>


                      {/* ====================================
                          DATE
                      ==================================== */}

                      <td className="px-5 py-5">

                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(
                            record.displayDate
                          )}
                        </span>

                      </td>


                      {/* ====================================
                          ACTION
                      ==================================== */}

                      <td className="px-5 py-5">

                        <button
                          onClick={() =>
                            setSelectedWaste(
                              record
                            )
                          }
                          className="
                            px-4
                            py-2
                            border
                            border-slate-200
                            rounded-lg
                            text-sm
                            font-semibold
                            text-slate-700
                            hover:bg-slate-50
                            transition
                          "
                        >
                          View
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedWaste && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/40
            flex
            items-center
            justify-center
            p-5
          "
          onClick={() =>
            setSelectedWaste(null)
          }
        >

          <div
            className="
              bg-white
              rounded-2xl
              shadow-2xl
              w-full
              max-w-2xl
              max-h-[90vh]
              overflow-y-auto
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Modal header */}

            <div className="p-6 border-b border-slate-200 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Waste Details
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {
                    selectedWaste.displayWasteId
                  }
                </p>

              </div>


              <button
                onClick={() =>
                  setSelectedWaste(null)
                }
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-slate-100
                  hover:bg-slate-200
                  text-slate-600
                "
              >
                ✕
              </button>

            </div>


            {/* Modal content */}

            <div className="p-6 space-y-5">

              {/* Category */}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Waste Category
                </p>

                <BinBadge
                  category={
                    selectedWaste.displayCategory
                  }
                />
              </div>


              {/* Department + Robot */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">

                  <p className="text-xs font-semibold text-blue-500 uppercase">
                    Department
                  </p>

                  <p className="text-lg font-bold text-blue-900 mt-2">
                    {
                      selectedWaste.displayDepartment
                    }
                  </p>

                </div>


                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">

                  <p className="text-xs font-semibold text-purple-500 uppercase">
                    Assigned Robot
                  </p>

                  <p className="text-lg font-bold text-purple-900 mt-2">
                    {
                      selectedWaste.displayRobot
                    }
                  </p>

                </div>

              </div>


              {/* Status */}

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">

                <div>

                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Current Status
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        selectedWaste.displayStatus
                      }
                    />
                  </div>

                </div>


                <div className="text-right">

                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Weight
                  </p>

                  <p className="text-lg font-bold text-slate-900 mt-2">
                    {
                      selectedWaste.displayWeight
                    }{" "}
                    kg
                  </p>

                </div>

              </div>


              {/* Other information */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>

                  <p className="text-xs text-slate-400">
                    Waste ID
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {
                      selectedWaste.displayWasteId
                    }
                  </p>

                </div>


                <div>

                  <p className="text-xs text-slate-400">
                    Item Type
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {
                      selectedWaste.itemType ||
                      "Biomedical Waste"
                    }
                  </p>

                </div>


                <div>

                  <p className="text-xs text-slate-400">
                    AI Confidence
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {
                      selectedWaste.displayConfidence
                    }
                    %
                  </p>

                </div>


                <div>

                  <p className="text-xs text-slate-400">
                    Created
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {formatDate(
                      selectedWaste.createdAt
                    )}
                  </p>

                </div>

              </div>


              {/* Raw debugging information */}

              <details className="border border-slate-200 rounded-xl">

                <summary className="cursor-pointer p-4 text-sm font-semibold text-slate-600">
                  Technical Record
                </summary>

                <pre className="p-4 bg-slate-950 text-green-300 text-xs overflow-auto rounded-b-xl">
                  {JSON.stringify(
                    selectedWaste,
                    null,
                    2
                  )}
                </pre>

              </details>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
