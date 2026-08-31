import {
  User,
  Bell,
  Shield,
  Server,
  Save,
} from "lucide-react";

import {
  PageHeader,
  SectionCard,
} from "./PageUI";

function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure MediTwin system preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">

        <SectionCard
          title="Profile"
          description="Manage administrator information"
        >
          <div className="space-y-4 p-5">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700">
                A
              </div>

              <div>
                <p className="font-bold text-slate-800">
                  Hospital Administrator
                </p>

                <p className="text-xs text-slate-400">
                  Administrator account
                </p>
              </div>

            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                Name
              </span>

              <input
                defaultValue="Hospital Administrator"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                Email
              </span>

              <input
                defaultValue="admin@hospital.com"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </label>

          </div>
        </SectionCard>

        <SectionCard
          title="System Configuration"
          description="MediTwin platform configuration"
        >
          <div className="space-y-3 p-5">

            {[
              [Server, "Backend Connection", "Connected"],
              [Shield, "Security", "Enabled"],
              [Bell, "Notifications", "Enabled"],
              [User, "Role Management", "Configured"],
            ].map(([Icon, title, status]) => (
              <div
                key={title}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600">
                    <Icon size={18} />
                  </div>

                  <span className="text-sm font-semibold text-slate-700">
                    {title}
                  </span>

                </div>

                <span className="text-xs font-semibold text-emerald-600">
                  {status}
                </span>

              </div>
            ))}

          </div>
        </SectionCard>

      </div>

      <button className="mt-6 flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">
        <Save size={17} />
        Save Changes
      </button>

    </div>
  );
}

export default Settings;