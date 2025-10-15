import { SubscribersTable } from "./_components/subscribers-table";

export default function SubscribersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage user profiles from the onboarding flow
        </p>
      </div>

      {/* Table */}
      <SubscribersTable />
    </div>
  );
}
