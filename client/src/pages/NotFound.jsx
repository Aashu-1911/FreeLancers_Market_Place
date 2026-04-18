import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Page not found</h2>
      <p className="mt-3 text-slate-600">The route you requested does not exist.</p>
      <Link
        to="/home"
        className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to home
      </Link>
    </section>
  );
}

export default NotFound;
