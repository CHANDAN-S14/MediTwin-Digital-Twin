import {
  AlertTriangle,
  BatteryWarning,
  PackageX,
  CheckCircle2,
  Bell,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
} from "./PageUI";

const alerts = [
  {
    title: "RED compartment almost full",
    description: "MediBot Alpha compartment reached 82% capacity.",
    time: "2 minutes ago",
    type: "Critical",
    icon: PackageX,
  },
  {
    title: "Robot battery below threshold",
    description: "MediBot Beta battery has fallen below 75%.",
    time: "8 minutes ago",
    type: "Warning",
    icon: BatteryWarning,
  },
  {
    title: "Collection completed",
    description: "TASK-1018 completed successfully.",
    time: "14 minutes ago",
    type: "Success",
    icon: CheckCircle2,
  },
];

function Alerts() {
  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Monitor system warnings, robot events and operational issues."
      />

      <SectionCard>

        <div className="divide-y divide-slate-100">

          {alerts.map((alert, index) => {

            const Icon = alert.icon;

            return (
              <div
                key={index}
                className="flex gap-4 p-5 transition hover:bg-slate-50"
              >

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    alert.type === "Critical"
                      ? "bg-red-50 text-red-600"
                      : alert.type === "Warning"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="flex-1">

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <h3 className="font-semibold text-slate-800">
                      {alert.title}
                    </h3>

                    <span className="text-xs text-slate-400">
                      {alert.time}
                    </span>

                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {alert.description}
                  </p>

                </div>

              </div>
            );
          })}

        </div>

      </SectionCard>
    </div>
  );
}

export default Alerts;