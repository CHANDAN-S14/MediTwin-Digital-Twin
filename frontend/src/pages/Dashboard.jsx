import {
  Package,
  BrainCircuit,
  ClipboardCheck,
  Bot,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Progress from "../components/ui/Progress";
import Viewport from "../components/three/Viewport";

const robots = [
  {
    id: "MB-01",
    name: "MediBot Alpha",
    status: "Navigating",
    battery: 86,
    task: "TASK-1021",
  },
  {
    id: "MB-02",
    name: "MediBot Beta",
    status: "Collecting",
    battery: 72,
    task: "TASK-1022",
  },
  {
    id: "MB-03",
    name: "MediBot Gamma",
    status: "Charging",
    battery: 94,
    task: "No active task",
  },
];

function Dashboard() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning 👋
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening across your hospital operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

        <StatCard
          title="Total Waste"
          value="248 kg"
          icon={Package}
          trend="+12.4%"
        />

        <StatCard
          title="AI Classified"
          value="221 kg"
          icon={BrainCircuit}
          trend="+8.2%"
        />

        <StatCard
          title="Active Tasks"
          value="12"
          icon={ClipboardCheck}
          trend="+3"
        />

        <StatCard
          title="Active Robots"
          value="2 / 3"
          icon={Bot}
          trend="Online"
        />

        <StatCard
          title="Completed"
          value="37"
          icon={CheckCircle2}
          trend="+14%"
        />

        <StatCard
          title="Critical Alerts"
          value="2"
          icon={AlertTriangle}
          trend="Attention"
        />

      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">

        <Card className="overflow-hidden">

          <div className="flex items-center justify-between border-b border-slate-100 p-5">

            <div>
              <h2 className="font-bold text-slate-900">
                Live Robot Digital Twin
              </h2>

              <p className="text-xs text-slate-500">
                Real-time robot visualization
              </p>
            </div>

            <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              LIVE
            </span>

          </div>

          <div className="h-[420px] bg-slate-50">
            <Viewport />
          </div>

        </Card>

        <Card>

          <div className="p-5">
            <h2 className="font-bold text-slate-900">
              Robot Fleet
            </h2>

            <p className="text-xs text-slate-500">
              Current robot status
            </p>
          </div>

          <div className="space-y-3 px-5 pb-5">

            {robots.map((robot) => (
              <div
                key={robot.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Bot
                        size={22}
                        className="text-teal-600"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {robot.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {robot.id}
                      </p>
                    </div>

                  </div>

                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700">
                    {robot.status}
                  </span>

                </div>

                <div className="mt-4">

                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-slate-500">
                      Battery
                    </span>

                    <span className="font-semibold">
                      {robot.battery}%
                    </span>
                  </div>

                  <Progress value={robot.battery} />

                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Task:{" "}
                  <span className="font-medium text-slate-600">
                    {robot.task}
                  </span>
                </p>

              </div>
            ))}

          </div>

        </Card>

      </div>

    </div>
  );
}

export default Dashboard;