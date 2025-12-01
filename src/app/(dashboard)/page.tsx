import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardGreeting from "./dashboard-greeting";
import { BookingsTable } from "./_components/bookings-table";
import { StatsCards } from "./_components/stats-cards";
import { StatsSkeleton } from "./_components/stats-skeleton";
import { Suspense } from "react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name?.split(" ")[0] || "User";

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="space-y-6">
        <DashboardGreeting name={userName} />

        <Suspense fallback={<StatsSkeleton />}>
          <StatsCards />
        </Suspense>

        <BookingsTable />
      </div>
    </div>
  );
}
