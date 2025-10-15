interface DashboardGreetingProps {
  name: string;
}
export default function DashboardGreeting({ name }: DashboardGreetingProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {greeting}, {name}
      </h1>
      <p className="mt-2 text-muted-foreground text-lg">
        Manage your clients efficiently
      </p>
    </div>
  );
}
