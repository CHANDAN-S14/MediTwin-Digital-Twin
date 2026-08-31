import {
  ClipboardList,
  Clock,
  MapPin,
  Bot,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
  StatusBadge,
  CategoryBadge,
  ProgressBar,
} from "./PageUI";

const tasks = [
  {
    id: "TASK-1021",
    location: "ICU",
    category: "RED",
    robot: "MediBot Alpha",
    status: "Navigating",
    progress: 72,
  },
  {
    id: "TASK-1022",
    location: "Laboratory",
    category: "YELLOW",
    robot: "MediBot Beta",
    status: "Collecting",
    progress: 86,
  },
  {
    id: "TASK-1023",
    location: "Ward 3",
    category: "WHITE",
    robot: "MediBot Gamma",
    status: "Queued",
    progress: 15,
  },
];

function Tasks() {
  return (
    <div>
      <PageHeader
        title="Collection Tasks"
        description="Manage and monitor autonomous waste collection tasks."
      />

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">

        {tasks.map((task) => (
          <SectionCard key={task.id}>

            <div className="p-5">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-xs font-semibold text-teal-600">
                    {task.id}
                  </p>

                  <h2 className="mt-1 font-bold text-slate-900">
                    Waste Collection
                  </h2>
                </div>

                <StatusBadge status={task.status} />

              </div>

              <div className="mt-6 space-y-4">

                <div className="flex items-center gap-3">
                  <MapPin size={17} className="text-slate-400" />

                  <div>
                    <p className="text-xs text-slate-400">
                      Location
                    </p>

                    <p className="text-sm font-semibold text-slate-700">
                      {task.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Bot size={17} className="text-slate-400" />

                  <div>
                    <p className="text-xs text-slate-400">
                      Assigned Robot
                    </p>

                    <p className="text-sm font-semibold text-slate-700">
                      {task.robot}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <ClipboardList size={17} className="text-slate-400" />

                  <div>
                    <p className="text-xs text-slate-400">
                      Waste Category
                    </p>

                    <CategoryBadge category={task.category} />
                  </div>
                </div>

              </div>

              <div className="mt-6">

                <div className="mb-2 flex justify-between">
                  <span className="text-xs text-slate-500">
                    Task progress
                  </span>

                  <span className="text-xs font-bold text-slate-700">
                    {task.progress}%
                  </span>
                </div>

                <ProgressBar value={task.progress} />

              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} />
                Estimated completion: 4 min
              </div>

            </div>

          </SectionCard>
        ))}

      </div>
    </div>
  );
}

export default Tasks;