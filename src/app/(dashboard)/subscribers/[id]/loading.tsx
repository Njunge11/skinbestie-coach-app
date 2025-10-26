import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Profile Header Skeleton - matches actual ProfileHeader */}
      <Card className="overflow-hidden py-0">
        {/* Gradient Header */}
        <div className="h-24 xl:h-32 bg-gradient-to-r from-gray-300 to-gray-400 animate-pulse" />

        <CardContent className="pt-0">
          <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-6 -mt-12 xl:-mt-16 pb-6">
            {/* Avatar Circle */}
            <div className="w-24 h-24 xl:w-32 xl:h-32 flex-shrink-0 rounded-full bg-gray-300 ring-4 ring-white animate-pulse" />

            <div className="flex-1 pt-0 xl:pt-20 w-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {/* Name */}
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  {/* Occupation */}
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                </div>

                {/* Desktop action buttons */}
                <div className="hidden xl:flex gap-2">
                  <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>

              {/* Contact info with bullets */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4 xl:mb-0">
                <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded-full w-28 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
              </div>

              {/* Mobile action buttons */}
              <div className="flex xl:hidden gap-2 pt-4 border-t border-border">
                <div className="h-9 flex-1 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 flex-1 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 flex-1 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        {/* Main Content (Left Column) */}
        <div className="flex-1 space-y-6">
          {/* Compliance Section Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>

          {/* Goals Section Skeleton - matches actual GoalsSection */}
          <Card>
            <CardHeader>
              <CardTitle>Skin Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-2">
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
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Coach Notes - matches actual CoachNotes */}
        <div className="w-full xl:w-80">
          <Card className="xl:sticky xl:top-20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Coach Notes</CardTitle>
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative pl-4 border-l-2 border-border pb-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
