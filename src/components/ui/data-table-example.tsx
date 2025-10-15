/**
 * EXAMPLE: How to use DataTable and TableFilters with ANY data type
 *
 * This example shows how to use the generic components for a Subscriber table.
 * The EXACT same components work for Bookings, Accounts, Orders, etc.
 */

import { useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { TableFilters, type FilterConfig } from "./table-filters";

// 1. Define your data type
interface Subscriber {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
  plan: "free" | "pro" | "enterprise";
  joinedDate: Date;
}

// 2. Define your filter type
interface SubscriberFilters {
  searchQuery: string;
  statusFilter: string;
  planFilter: string;
}

export function SubscribersTableExample() {
  // 3. Set up pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // 4. Set up filter state
  const [filters, setFilters] = useState<SubscriberFilters>({
    searchQuery: "",
    statusFilter: "all",
    planFilter: "all",
  });

  // 5. Define your columns
  const columns: ColumnDef<Subscriber>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "plan",
      header: "Plan",
    },
  ];

  // 6. Define your filter config
  const filterConfig: FilterConfig[] = [
    {
      id: "searchQuery",
      label: "Search",
      type: "text",
      placeholder: "Search subscribers...",
      columnSpan: 2,
    },
    {
      id: "statusFilter",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      id: "planFilter",
      label: "Plan",
      type: "select",
      options: [
        { value: "all", label: "All Plans" },
        { value: "free", label: "Free" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
  ];

  // Mock data (replace with useQuery in real implementation)
  const mockData: Subscriber[] = [];
  const totalCount = mockData.length;

  // 7. Use the generic components!
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscribers</h1>

      {/* Generic TableFilters - works with ANY filter config */}
      <TableFilters
        filters={filterConfig}
        values={filters}
        onChange={(id, value) =>
          setFilters((prev) => ({ ...prev, [id]: value }))
        }
      />

      {/* Generic DataTable - works with ANY data type */}
      <DataTable
        columns={columns}
        data={mockData}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={totalCount}
        isLoading={false}
        emptyMessage="No subscribers found"
      />
    </div>
  );
}

/**
 * KEY POINTS:
 *
 * 1. DataTable<T> is fully generic - pass ANY data type
 * 2. TableFilters<T> is fully generic - pass ANY filter shape
 * 3. You only define:
 *    - Your columns (what to display)
 *    - Your filter config (what filters to show)
 * 4. The components handle:
 *    - Pagination logic
 *    - Table rendering
 *    - Filter UI
 *    - Loading states
 *    - Empty states
 *
 * REUSABILITY: 100%
 * To create a new table: ~50 lines of code instead of 400+
 */
