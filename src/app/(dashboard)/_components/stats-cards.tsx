import { getWeeklyStats } from "../actions";
import { TrendingUp, TrendingDown } from "lucide-react";

export async function StatsCards() {
  const stats = await getWeeklyStats();

  const cards = [
    {
      title: "Total Subscribers",
      value: stats.totalSubscribers.current.toString(),
      trend: stats.totalSubscribers.trend,
      isPositive: stats.totalSubscribers.isPositive,
    },
    {
      title: "Active Routines",
      value: stats.activeRoutines.current.toString(),
      trend: stats.activeRoutines.trend,
      isPositive: stats.activeRoutines.isPositive,
    },
    {
      title: "Weekly Active Users",
      value: stats.weeklyActiveUsers.current.toString(),
      trend: stats.weeklyActiveUsers.trend,
      isPositive: stats.weeklyActiveUsers.isPositive,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((stat, index) => (
        <div key={index} className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-md font-medium">{stat.title}</h3>
          <p className="mt-6 text-3xl font-bold">{stat.value}</p>
          {stat.trend !== 0 && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs ${
                stat.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {stat.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="font-medium">
                {stat.isPositive ? "+" : ""}
                {stat.trend}% vs previous week
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
