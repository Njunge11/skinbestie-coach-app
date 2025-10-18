interface DashboardGreetingProps {
  name: string;
}
export default function DashboardGreeting({ name }: DashboardGreetingProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {greeting}, {name}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Manage your clients efficiently
      </p>
    </div>
  );
}
