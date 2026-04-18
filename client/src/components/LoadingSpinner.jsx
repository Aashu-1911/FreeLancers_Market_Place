import { useLoading } from "../context/LoadingContext.jsx";

function LoadingSpinner() {
  const { isLoading } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20">
      <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-700">Loading...</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
