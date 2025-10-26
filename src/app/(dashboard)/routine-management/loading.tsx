import { Card, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routine Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage reusable routine templates
          </p>
        </div>
        <div className="w-full md:w-auto h-10 bg-gray-200 rounded-md animate-pulse md:w-44"></div>
      </div>

      {/* Stats Line */}
      <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>

      {/* Template Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Template name and chevron */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  </div>

                  {/* Description */}
                  <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>

                  {/* Product counts and date */}
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-9 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
