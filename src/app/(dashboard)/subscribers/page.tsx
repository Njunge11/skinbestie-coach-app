import { SubscribersTable } from "./_components/subscribers-table";

export default function SubscribersPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
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
    </div>
  );
}
