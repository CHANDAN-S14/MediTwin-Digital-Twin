import { useState } from "react";
import {
  Play,
  CheckCircle2,
  BrainCircuit,
  Bot,
  Trash2,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
} from "./PageUI";

const steps = [
  ["Waste Detected", Trash2],
  ["AI Classification", BrainCircuit],
  ["Task Created", CheckCircle2],
  ["Robot Assigned", Bot],
  ["Waste Collected", PackageCheck],
  ["Waste Segregated", PackageCheck],
];

function GuidedRun() {
  const [step, setStep] = useState(-1);

  const start = () => {
    setStep(0);

    let current = 0;

    const interval = setInterval(() => {
      current++;

      if (current >= steps.length) {
        clearInterval(interval);
        return;
      }

      setStep(current);
    }, 1200);
  };

  const reset = () => {
    setStep(-1);
  };

  return (
    <div>
      <PageHeader
        title="Guided Demo"
        description="Demonstrate the complete MediTwin waste-management workflow."
      />

      <SectionCard>

        <div className="p-6">

          <div className="rounded-2xl bg-slate-50 p-6 text-center">

            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
              Demo Mode
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Autonomous Waste Management
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              Watch how MediTwin detects, classifies, collects and segregates
              biomedical waste automatically.
            </p>

            <div className="mt-6 flex justify-center gap-3">

              <button
                onClick={start}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Play size={17} />
                Start Demo
              </button>

              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={17} />
                Reset
              </button>

            </div>

          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {steps.map(([name, Icon], index) => {

              const active = index <= step;

              return (
                <div
                  key={name}
                  className={`rounded-2xl border p-5 transition-all duration-500 ${
                    active
                      ? "border-teal-200 bg-teal-50"
                      : "border-slate-200 bg-white"
                  }`}
                >

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      active
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-4 font-bold text-slate-800">
                    {index + 1}. {name}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {active ? "Completed" : "Waiting"}
                  </p>

                </div>
              );
            })}

          </div>

          {step === steps.length - 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-700">
              <CheckCircle2 size={24} />

              <div>
                <p className="font-bold">
                  Demo Completed Successfully
                </p>

                <p className="text-xs">
                  Waste has been collected, segregated and logged.
                </p>
              </div>
            </div>
          )}

        </div>

      </SectionCard>
    </div>
  );
}

export default GuidedRun;