import {
  ShieldCheck,
  Bot,
  BrainCircuit,
  Trash2,
  ClipboardCheck,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
} from "./PageUI";

const logs = [
  {
    action: "Waste classified",
    description: "AI classified W-1021 as RED waste.",
    user: "AI Vision Model",
    time: "10:42:21",
    icon: BrainCircuit,
  },
  {
    action: "Task assigned",
    description: "TASK-1021 assigned to MediBot Alpha.",
    user: "Fleet Manager",
    time: "10:42:35",
    icon: Bot,
  },
  {
    action: "Waste collected",
    description: "MediBot Alpha collected waste from ICU.",
    user: "MediBot Alpha",
    time: "10:48:10",
    icon: Trash2,
  },
  {
    action: "Task completed",
    description: "TASK-1021 completed successfully.",
    user: "System",
    time: "10:51:42",
    icon: ClipboardCheck,
  },
];

function AuditLog() {
  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Complete traceability of waste management operations."
      />

      <SectionCard>

        <div className="p-6">

          <div className="mb-6 flex items-center gap-3 rounded-xl bg-teal-50 p-4">
            <ShieldCheck
              size={22}
              className="text-teal-600"
            />

            <div>
              <p className="text-sm font-bold text-teal-800">
                Traceability Active
              </p>

              <p className="text-xs text-teal-600">
                All waste and robot operations are being recorded.
              </p>
            </div>
          </div>

          <div className="space-y-6">

            {logs.map((log, index) => {

              const Icon = log.icon;

              return (
                <div
                  key={index}
                  className="relative flex gap-4"
                >

                  {index !== logs.length - 1 && (
                    <div className="absolute left-5 top-11 h-10 w-px bg-slate-200" />
                  )}

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-teal-600">
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {log.action}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {log.description}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {log.user} · {log.time}
                    </p>
                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </SectionCard>
    </div>
  );
}

export default AuditLog;