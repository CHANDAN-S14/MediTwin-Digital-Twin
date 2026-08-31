import React, { useCallback, useEffect, useMemo, useState } from "react";
import { waste as wasteApi } from "../services/api.js";

let socket = null;

try {
  // Socket.IO is optional. The page still works with polling if it is unavailable.
  // eslint-disable-next-line global-require
  const socketModule = await import("socket.io-client");
  const io = socketModule.io;

  if (io) {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000";

    socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
} catch {
  socket = null;
}

const REFRESH_INTERVAL = 3000;

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },

  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },

  DISPATCHED: {
    label: "Robot Dispatched",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },

  MOVING_TO_PICKUP: {
    label: "Robot Going to Pickup",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },

  ARRIVED_AT_PICKUP: {
    label: "Robot Arrived",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },

  COLLECTING: {
    label: "Collecting",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },

  MOVING_TO_BIN: {
    label: "Moving to Bin",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },

  DEPOSITING: {
    label: "Depositing",
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },

  COLLECTED: {
    label: "Collected",
    className: "bg-green-100 text-green-700 border-green-200",
  },

  DISPOSED: {
    label: "Disposed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },

  RETURNING: {
    label: "Robot Returning",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },

  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },

  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },

  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const BIN_CONFIG = {
  yellow: {
    label: "Yellow Bin",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "🟡",
  },

  red: {
    label: "Red Bin",
    className: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
  },

  blue: {
    label: "Blue Bin",
    className: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵",
  },

  general: {
    label: "General Bin",
    className: "bg-slate-100 text-slate-800 border-slate-300",
    icon: "⚪",
  },
};

function normalizeCategory(category) {
  if (!category) return "general";

  const value = String(category).toLowerCase().trim();

  if (value.includes("yellow")) return "yellow";
  if (value.includes("red")) return "red";
  if (value.includes("blue")) return "blue";

  if (
    value.includes("general") ||
    value.includes("non") ||
    value.includes("municipal")
  ) {
    return "general";
  }

  return value;
}

function getWasteStatus(item) {
  return (
    item?.status ||
    item?.collectionStatus ||
    item?.taskStatus ||
    "PENDING"
  )
    .toString()
    .toUpperCase();
}

function getWasteId(item) {
  return item?._id || item?.id || item?.wasteId;
}

function getRobotId(item) {
  return (
    item?.robotId ||
    item?.robot?.robotId ||
    item?.assignedRobotId ||
    item?.task?.robotId ||
    null
  );
}

function getDepartment(item) {
  return item?.department || item?.sourceDepartment || "—";
}

function getCategory(item) {
  return normalizeCategory(
    item?.category ||
      item?.expectedCategory ||
      item?.classification ||
      item?.wasteCategory ||
      "general"
  );
}

function getWeight(item) {
  const value = item?.weight;

  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return `${value} kg`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || "Pending",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function BinBadge({ category }) {
  const config = BIN_CONFIG[normalizeCategory(category)] || BIN_CONFIG.general;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${config.className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function StatCard({ title, value, icon, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function WasteRegister() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedWaste, setSelectedWaste] = useState(null);

  const loadWaste = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await wasteApi.list();

      /*
       * Your api.js unwraps:
       *
       * { success: true, data: [...] }
       *
       * into [...]
       *
       * But this also supports APIs that return { items: [...] }.
       */
      let data = response;

      if (Array.isArray(response)) {
        data = response;
      } else if (Array.isArray(response?.items)) {
        data = response.items;
      } else if (Array.isArray(response?.records)) {
        data = response.records;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else {
        data = [];
      }

      setRecords(data);
      setError("");
    } catch (err) {
      console.error("Unable to load waste records:", err);
      setError(err?.message || "Unable to load waste records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWaste(true);

    const interval = setInterval(() => {
      loadWaste(false);
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [loadWaste]);

  /*
   * Real-time Digital Twin events.
   *
   * Different backend implementations sometimes use slightly different event
   * names, so we listen to the common names used by the robot simulator.
   */
  useEffect(() => {
    if (!socket) return undefined;

    const refresh = () => {
      loadWaste(false);
    };

    const events = [
      "robot:status",
      "robot-status",
      "robotStatus",
      "digital-twin:update",
      "digitalTwin:update",
      "waste:update",
      "waste:updated",
      "collection:update",
      "collection:completed",
      "task:update",
    ];

    events.forEach((eventName) => {
      socket.on(eventName, refresh);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, refresh);
      });
    };
  }, [loadWaste]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((item) => {
      const status = getWasteStatus(item);
      const category = getCategory(item);
      const robotId = getRobotId(item);
      const department = getDepartment(item);

      const matchesSearch =
        !query ||
        String(
          item?.name ||
            item?.itemName ||
            item?.wasteId ||
            item?._id ||
            ""
        )
          .toLowerCase()
          .includes(query) ||
        String(category).toLowerCase().includes(query) ||
        String(robotId || "")
          .toLowerCase()
          .includes(query) ||
        String(department).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" || category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [records, search, statusFilter, categoryFilter]);

  const statistics = useMemo(() => {
    let pending = 0;
    let active = 0;
    let disposed = 0;
    let total = records.length;

    records.forEach((item) => {
      const status = getWasteStatus(item);

      if (
        ["PENDING", "CONFIRMED"].includes(status)
      ) {
        pending += 1;
      }

      if (
        [
          "DISPATCHED",
          "MOVING_TO_PICKUP",
          "ARRIVED_AT_PICKUP",
          "COLLECTING",
          "MOVING_TO_BIN",
          "DEPOSITING",
          "RETURNING",
        ].includes(status)
      ) {
        active += 1;
      }

      if (
        ["DISPOSED", "COMPLETED"].includes(status)
      ) {
        disposed += 1;
      }
    });

    return {
      total,
      pending,
      active,
      disposed,
    };
  }, [records]);

  const handleRefresh = () => {
    loadWaste(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                ♻️
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  Waste Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Track biomedical waste from AI classification to robot
                  collection and final bin disposal.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* FLOW */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">
              Waste Collection Flow
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              The status below updates as the Digital Twin simulation
              progresses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["1", "AI Scan", "🔍"],
              ["2", "Human Confirm", "✓"],
              ["3", "Robot Pickup", "🤖"],
              ["4", "Correct Bin", "🗑️"],
              ["5", "Completed", "✅"],
            ].map(([number, title, icon]) => (
              <div
                key={number}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
                  {icon}
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Step {number}
                  </p>

                  <p className="text-xs font-semibold text-slate-700">
                    {title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STATISTICS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Waste"
            value={statistics.total}
            icon="📦"
            description="Registered waste records"
          />

          <StatCard
            title="Pending"
            value={statistics.pending}
            icon="⏳"
            description="Waiting for collection"
          />

          <StatCard
            title="Robot Active"
            value={statistics.active}
            icon="🤖"
            description="Currently being handled"
          />

          <StatCard
            title="Disposed"
            value={statistics.disposed}
            icon="✅"
            description="Successfully placed in bin"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>

              <div>
                <p className="font-semibold">
                  Unable to load waste records
                </p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search waste, robot, category..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="DISPATCHED">Robot Dispatched</option>
                <option value="MOVING_TO_PICKUP">
                  Moving to Pickup
                </option>
                <option value="ARRIVED_AT_PICKUP">
                  Arrived at Pickup
                </option>
                <option value="COLLECTING">Collecting</option>
                <option value="MOVING_TO_BIN">Moving to Bin</option>
                <option value="DEPOSITING">Depositing</option>
                <option value="DISPOSED">Disposed</option>
                <option value="COMPLETED">Completed</option>
                <option value="RETURNING">Returning</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bin
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Bins</option>
                <option value="yellow">Yellow Bin</option>
                <option value="red">Red Bin</option>
                <option value="blue">Blue Bin</option>
                <option value="general">General Bin</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Waste Records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing {filteredRecords.length} of {records.length} records
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live updates enabled
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

                <p className="text-sm font-medium text-slate-600">
                  Loading waste records...
                </p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 text-5xl">📦</div>

              <h3 className="font-semibold text-slate-800">
                No waste records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Scan and confirm biomedical waste from the Scanner page.
                Once a robot is dispatched, its collection progress will
                appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Waste
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category / Bin
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Department
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Weight
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Robot
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((item) => {
                    const id = getWasteId(item);
                    const category = getCategory(item);
                    const robotId = getRobotId(item);
                    const status = getWasteStatus(item);

                    return (
                      <tr
                        key={id || `${item?.createdAt}-${Math.random()}`}
                        className="transition hover:bg-slate-50"
                      >
                        {/* WASTE */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                              🗑️
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {item?.name ||
                                  item?.itemName ||
                                  item?.wasteType ||
                                  "Biomedical Waste"}
                              </p>

                              <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                                ID: {item?.wasteId || item?._id || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-5 py-4">
                          <BinBadge category={category} />

                          {item?.confidence !== undefined &&
                            item?.confidence !== null && (
                              <p className="mt-1 text-xs text-slate-400">
                                AI confidence:{" "}
                                {Math.round(Number(item.confidence) * 100)}%
                              </p>
                            )}
                        </td>

                        {/* DEPARTMENT */}
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            {getDepartment(item)}
                          </span>
                        </td>

                        {/* WEIGHT */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-slate-700">
                            {getWeight(item)}
                          </span>
                        </td>

                        {/* ROBOT */}
                        <td className="px-5 py-4">
                          {robotId ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                                🤖
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {robotId}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Collection robot
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>

                        {/* DATE */}
                        <td className="px-5 py-4">
                          <span className="text-xs text-slate-500">
                            {formatDate(
                              item?.createdAt || item?.updatedAt
                            )}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedWaste(item)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedWaste && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedWaste(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Waste Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Collection and disposal information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWaste(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* STATUS */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Current Status
                </p>

                <StatusBadge status={getWasteStatus(selectedWaste)} />
              </div>

              {/* DETAILS */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Waste ID
                  </p>

                  <p className="mt-1 break-all text-sm font-medium text-slate-800">
                    {selectedWaste?.wasteId ||
                      selectedWaste?._id ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Department
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {getDepartment(selectedWaste)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </p>

                  <div className="mt-1">
                    <BinBadge category={getCategory(selectedWaste)} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Weight
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {getWeight(selectedWaste)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned Robot
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {getRobotId(selectedWaste) || "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(selectedWaste?.createdAt)}
                  </p>
                </div>
              </div>

              {/* ROBOT FLOW */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Robot Collection Progress
                </p>

                <div className="space-y-2">
                  {[
                    ["DISPATCHED", "Robot dispatched"],
                    ["MOVING_TO_PICKUP", "Robot travelling to waste"],
                    ["ARRIVED_AT_PICKUP", "Robot arrived at waste"],
                    ["COLLECTING", "Waste being collected"],
                    ["MOVING_TO_BIN", "Robot travelling to correct bin"],
                    ["DEPOSITING", "Waste being deposited"],
                    ["RETURNING", "Robot returning to station"],
                    ["IDLE", "Robot ready"],
                  ].map(([stepStatus, label], index) => {
                    const currentStatus = getWasteStatus(selectedWaste);

                    const statusOrder = [
                      "DISPATCHED",
                      "MOVING_TO_PICKUP",
                      "ARRIVED_AT_PICKUP",
                      "COLLECTING",
                      "MOVING_TO_BIN",
                      "DEPOSITING",
                      "RETURNING",
                    ];

                    const currentIndex =
                      statusOrder.indexOf(currentStatus);

                    const stepIndex =
                      statusOrder.indexOf(stepStatus);

                    const completed =
                      currentStatus === "DISPOSED" ||
                      currentStatus === "COMPLETED" ||
                      (stepIndex !== -1 &&
                        currentIndex >= stepIndex);

                    return (
                      <div
                        key={stepStatus}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            completed
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {completed ? "✓" : index + 1}
                        </div>

                        <p
                          className={`text-sm ${
                            completed
                              ? "font-semibold text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DIGITAL TWIN */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>

                  <div>
                    <p className="font-semibold text-indigo-900">
                      Digital Twin Simulation
                    </p>

                    <p className="mt-1 text-xs leading-5 text-indigo-700">
                      The robot simulation represents the collection route:
                      pickup location → correct biomedical waste bin →
                      disposal → return to charging station.
                    </p>
                  </div>
                </div>
              </div>

              {/* CLOSE */}
              <button
                type="button"
                onClick={() => setSelectedWaste(null)}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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