import {
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
  ProgressBar,
} from "./PageUI";

const bins = [
  {
    name: "RED",
    description: "Contaminated recyclable waste",
    capacity: 82,
    weight: "41.2 kg",
  },
  {
    name: "YELLOW",
    description: "Infectious / pathological waste",
    capacity: 61,
    weight: "30.5 kg",
  },
  // {
  //   name: "WHITE",
  //   description: "Sharps and metallic waste",
  //   capacity: 47,
  //   weight: "18.7 kg",
  // },
  {
    name: "BLUE",
    description: "Glassware and metallic implants",
    capacity: 35,
    weight: "12.4 kg",
  },
    {
    name: "GENERAL",
    description: "Plastic And Fruit Waste",
    capacity: 40,
    weight: "14.8 kg",
  },
];

function Segregation() {
  return (
    <div>
      <PageHeader
        title="Smart Segregation"
        description="Monitor waste compartments and segregation capacity."
      />

      <div className="grid gap-6 sm:grid-cols-2">

        {bins.map((bin) => (
          <SectionCard key={bin.name}>

            <div className="p-6">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Trash2 size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {bin.name}
                    </h2>

                    <p className="text-xs text-slate-400">
                      Compartment
                    </p>
                  </div>

                </div>

                {bin.capacity >= 80 && (
                  <AlertTriangle
                    size={20}
                    className="text-amber-500"
                  />
                )}

              </div>

              <p className="mt-5 text-sm text-slate-500">
                {bin.description}
              </p>

              <div className="mt-6">

                <div className="mb-2 flex justify-between">
                  <span className="text-xs text-slate-500">
                    Capacity
                  </span>

                  <span className="text-sm font-bold text-slate-800">
                    {bin.capacity}%
                  </span>
                </div>

                <ProgressBar value={bin.capacity} />

              </div>

              <div className="mt-5 flex justify-between rounded-xl bg-slate-50 p-4">

                <div>
                  <p className="text-xs text-slate-400">
                    Current weight
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {bin.weight}
                  </p>
                </div>

                <Package
                  size={20}
                  className="text-slate-400"
                />

              </div>

            </div>

          </SectionCard>
        ))}

      </div>
    </div>
  );
}

export default Segregation;
