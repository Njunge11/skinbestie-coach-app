export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border bg-gray-100 p-6 shadow-sm animate-pulse"
        >
          {/* Title skeleton */}
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-6"></div>

          {/* Value skeleton */}
          <div className="h-9 bg-gray-200 rounded w-1/2 mb-2"></div>

          {/* Trend skeleton */}
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}
