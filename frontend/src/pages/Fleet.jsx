import {
  Bot,
  Battery,
  MapPin,
  Gauge,
  Wrench,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
  StatusBadge,
  ProgressBar,
} from "./PageUI";

const robots = [
  {
    id: "MB-01",
    name: "MediBot Alpha",
    status: "Navigating",
    battery: 86,
    speed: "1.2 m/s",
    location: "ICU Corridor",
    task: "TASK-1021",
  },
  {
    id: "MB-02",
    name: "MediBot Beta",
    status: "Collecting",
    battery: 72,
    speed: "0.8 m/s",
    location: "Laboratory",
    task: "TASK-1022",
  },
  {
    id: "MB-03",
    name: "MediBot Gamma",
    status: "Charging",
    battery: 94,
    speed: "0 m/s",
    location: "Charging Station",
    task: "None",
  },
];

function Fleet() {
  return (
    <div>
      <PageHeader
        title="Robot Fleet"
        description="Monitor autonomous waste collection robots."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {robots.map((robot) => (
          <SectionCard key={robot.id}>

            <div className="p-6">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <Bot size={28} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      {robot.name}
                    </h2>

                    <p className="text-xs text-slate-400">
                      {robot.id}
                    </p>
                  </div>

                </div>

                <StatusBadge status={robot.status} />

              </div>

              <div className="mt-6">

                <div className="mb-2 flex justify-between">

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Battery size={15} />
                    Battery
                  </div>

                  <span className="text-xs font-bold">
                    {robot.battery}%
                  </span>

                </div>

                <ProgressBar value={robot.battery} />

              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-50 p-3">
                  <Gauge size={16} className="text-slate-400" />

                  <p className="mt-2 text-[10px] text-slate-400">
                    Speed
                  </p>

                  <p className="text-sm font-bold">
                    {robot.speed}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <MapPin size={16} className="text-slate-400" />

                  <p className="mt-2 text-[10px] text-slate-400">
                    Location
                  </p>

                  <p className="truncate text-sm font-bold">
                    {robot.location}
                  </p>
                </div>

              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <Wrench size={16} className="text-slate-400" />

                <span className="text-xs text-slate-500">
                  Current task:
                </span>

                <span className="text-xs font-bold text-slate-700">
                  {robot.task}
                </span>
              </div>

            </div>

          </SectionCard>
        ))}

      </div>
    </div>
  );
}

export default Fleet;