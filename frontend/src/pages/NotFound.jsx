import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">

      <div className="text-center">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <FileQuestion size={36} />
        </div>

        <h1 className="mt-6 text-4xl font-bold text-slate-900">
          404
        </h1>

        <p className="mt-2 text-slate-500">
          The page you're looking for doesn't exist.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Back to Dashboard
        </Link>

      </div>

    </div>
  );
}

export default NotFound;