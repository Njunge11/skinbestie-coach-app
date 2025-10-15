import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardGreeting from "./dashboard-greeting";
import { TrendingUp, TrendingDown } from "lucide-react";
import { BookingsTable } from "./_components/bookings-table";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name?.split(" ")[0] || "User";

  // Mock data - replace with real data later
  const stats = [
    {
      title: "Active Subscribers",
      value: "248",
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Routine Completion Rate",
      value: "87%",
      trend: { value: 5, isPositive: true },
    },
    {
      title: "Goal Achievement Rate",
      value: "73%",
      trend: { value: 3, isPositive: false },
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting name={userName} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <div key={index} className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-md font-medium">{stat.title}</h3>
            <p className="mt-6 text-3xl font-bold">{stat.value}</p>
            {stat.trend.value !== 0 && (
              <div
                className={`mt-2 flex items-center gap-1 text-xs ${
                  stat.trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="font-medium">
                  {stat.trend.isPositive ? "+" : "-"}
                  {Math.abs(stat.trend.value)}% vs previous month
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <BookingsTable />
    </div>
  );
}
