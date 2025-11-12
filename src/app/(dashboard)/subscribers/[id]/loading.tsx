import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="space-y-6">
        {/* Profile Header Skeleton - matches actual ProfileHeader */}
        <Card
          className="overflow-hidden"
          style={{ backgroundColor: "var(--color-skinbestie-primary-light)" }}
        >
          <CardContent className="py-6">
            <div className="flex flex-row items-start gap-4 xl:gap-6">
              {/* Avatar Circle */}
              <div className="w-20 h-20 flex-shrink-0 rounded-full bg-gray-300 animate-pulse" />

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    {/* Name */}
                    <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>

                  {/* Desktop action buttons */}
                  <div className="hidden xl:flex gap-2">
                    <div className="h-9 w-28 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Contact info with bullets */}
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>

                {/* Mobile/Tablet buttons */}
                <div className="flex xl:hidden gap-2 pt-4 mt-4 border-t">
                  <div className="h-9 flex-1 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 flex-1 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tags Skeleton */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mt-2 animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Input row */}
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            {/* Tags display */}
            <div className="flex flex-wrap gap-2">
              <div className="h-7 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-7 bg-gray-200 rounded-full w-32 animate-pulse"></div>
              <div className="h-7 bg-gray-200 rounded-full w-28 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        {/* Skin Profile Section Skeleton */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Full Width (No Sidebar) */}
        <div className="space-y-6">
          {/* Compliance Section Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 4 Stats Cards - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card
                    key={i}
                    className={
                      i === 1
                        ? "bg-gradient-to-b from-gray-300 to-gray-400"
                        : ""
                    }
                  >
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* AM/PM Split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-muted/50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gray-300 rounded-md animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-step Details */}
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                            <div className="h-5 bg-gray-200 rounded w-12 animate-pulse"></div>
                          </div>
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Goals Section Skeleton - matches actual GoalsSection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Skin Goals</CardTitle>
                  <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="h-9 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 p-4 space-y-2"
                  >
                    <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Routine Section Skeleton - matches actual RoutineSection */}
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="h-7 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Morning/Evening sections */}
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Progress Photos Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Progress Photos</CardTitle>
                <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating Coach Notes Button Skeleton */}
        <div className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-gray-300 shadow-lg animate-pulse z-30" />
      </div>
    </div>
  );
}
