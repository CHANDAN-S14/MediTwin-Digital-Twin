import {
  Search,
  Download,
  Plus,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
  actionText = "Add New",
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {action && (
        <button
          onClick={action}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Plus size={17} />
          {actionText}
        </button>
      )}
    </div>
  );
}

export function SearchBox({ placeholder = "Search..." }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <Search size={17} className="text-slate-400" />

      <input
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        placeholder={placeholder}
      />
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Online: "bg-emerald-50 text-emerald-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Navigating: "bg-blue-50 text-blue-700",
    Collecting: "bg-teal-50 text-teal-700",
    Charging: "bg-amber-50 text-amber-700",
    Pending: "bg-amber-50 text-amber-700",
    Queued: "bg-slate-100 text-slate-600",
    Warning: "bg-amber-50 text-amber-700",
    Critical: "bg-red-50 text-red-700",
    Offline: "bg-red-50 text-red-700",
    Maintenance: "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const styles = {
    RED: "bg-red-50 text-red-600",
    YELLOW: "bg-yellow-50 text-yellow-700",
    WHITE: "bg-slate-100 text-slate-700",
    BLUE: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
        styles[category] || "bg-slate-100 text-slate-600"
      }`}
    >
      {category}
    </span>
  );
}

export function SectionCard({ title, description, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-slate-100 p-5">
          {title && (
            <h2 className="font-bold text-slate-900">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export function EmptyState({ message = "No data available" }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
      {message}
    </div>
  );
}

export function TableAction() {
  return (
    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
      <MoreHorizontal size={18} />
    </button>
  );
}