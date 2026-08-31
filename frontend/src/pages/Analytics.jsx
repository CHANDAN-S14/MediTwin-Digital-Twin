import {
  BarChart3,
  TrendingUp,
  Bot,
  Package,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
  ProgressBar,
} from "./PageUI";

const wasteData = [
  { day: "Mon", value: 58 },
  { day: "Tue", value: 72 },
  { day: "Wed", value: 64 },
  { day: "Thu", value: 88 },
  { day: "Fri", value: 76 },
  { day: "Sat", value: 92 },
  { day: "Sun", value: 68 },
];

const categories = [
  ["RED", 82],
  ["YELLOW", 64],
  ["WHITE", 48],
  ["BLUE", 31],
];

function Analytics() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Monitor waste generation, robot performance and system efficiency."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        {[
          ["Total Waste", "5.87 ton", Package],
          ["AI Predictions", "1,240", BarChart3],
          ["Robot Utilization", "87%", Bot],
          ["Efficiency", "+18.6%", TrendingUp],
        ].map(([title, value, Icon]) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Icon size={20} />
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {title}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {value}
            </h2>
          </div>
        ))}

      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        <SectionCard
          title="Waste Collection Trend"
          description="Waste collected during the last 7 days"
        >
          <div className="flex h-72 items-end gap-4 p-6">

            {wasteData.map((item) => (
              <div
                key={item.day}
                className="flex h-full flex-1 flex-col justify-end"
              >

                <div
                  className="rounded-t-lg bg-teal-500 transition-all hover:bg-teal-600"
                  style={{
                    height: `${item.value * 2}px`,
                  }}
                />

                <span className="mt-3 text-center text-xs text-slate-400">
                  {item.day}
                </span>

              </div>
            ))}

          </div>
        </SectionCard>

        <SectionCard
          title="Waste by Category"
          description="Current segregation distribution"
        >
          <div className="space-y-6 p-6">

            {categories.map(([name, value]) => (
              <div key={name}>

                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {name}
                  </span>

                  <span className="text-sm font-bold text-slate-800">
                    {value}%
                  </span>
                </div>

                <ProgressBar value={value} />

              </div>
            ))}

          </div>
        </SectionCard>

      </div>
    </div>
  );
}

export default Analytics;