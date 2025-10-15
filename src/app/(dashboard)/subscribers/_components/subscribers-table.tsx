"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { TableFilters, type FilterConfig } from "@/components/ui/table-filters";
import type { UserProfile } from "@/lib/db/schema";
import type { UserProfileFilters } from "../schemas";
import { getUserProfiles } from "../actions";

export function SubscribersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read state from URL query params
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const searchQuery = searchParams.get("search") || "";
  const completionStatus = (searchParams.get("status") || "all") as UserProfileFilters["completionStatus"];
  const subscriptionStatus = (searchParams.get("subscription") || "all") as UserProfileFilters["subscriptionStatus"];
  const dateRange = (searchParams.get("dateRange") || "all") as UserProfileFilters["dateRange"];

  // Pagination state derived from URL
  const pagination: PaginationState = {
    pageIndex: page,
    pageSize: pageSize,
  };

  // Filter state derived from URL
  const filters: UserProfileFilters = {
    searchQuery,
    completionStatus,
    subscriptionStatus,
    dateRange,
  };

  // Fetch user profiles with server-side filtering and pagination
  const {
    data,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["user-profiles", filters, pagination],
    queryFn: async () => {
      const result = await getUserProfiles(
        filters,
        { page: pagination.pageIndex, pageSize: pagination.pageSize },
        { sortBy: "createdAt", sortOrder: "desc" }
      );
      return result.success ? result.data : null;
    },
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getProgressSteps = (completedSteps: string[] | null) => {
    const steps = completedSteps || [];
    const total = 6;
    return {
      completed: steps.length,
      total,
      percentage: Math.round((steps.length / total) * 100),
    };
  };

  // Define table columns
  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {row.original.firstName} {row.original.lastName}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "phoneNumber",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.getValue("phoneNumber")}
        </span>
      ),
    },
    {
      accessorKey: "completedSteps",
      header: "Progress",
      cell: ({ row }) => {
        const progress = getProgressSteps(row.original.completedSteps);
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {progress.completed}/{progress.total}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "isCompleted",
      header: "Status",
      cell: ({ row }) => {
        const isCompleted = row.getValue("isCompleted") as boolean;
        return (
          <span
            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
              isCompleted
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isCompleted ? "Completed" : "Incomplete"}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date Joined",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {formatDate(row.getValue("createdAt"))}
        </span>
      ),
    },
  ];

  // Define filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: "searchQuery",
      label: "Search",
      type: "text",
      placeholder: "Search by name or email...",
      columnSpan: 2,
    },
    {
      id: "completionStatus",
      label: "Completion Status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "completed", label: "Completed" },
        { value: "incomplete", label: "Incomplete" },
      ],
    },
    {
      id: "subscriptionStatus",
      label: "Subscription",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "subscribed", label: "Subscribed" },
        { value: "not_subscribed", label: "Not Subscribed" },
      ],
    },
    {
      id: "dateRange",
      label: "Date Range",
      type: "select",
      options: [
        { value: "all", label: "All time" },
        { value: "recent", label: "Last 7 days" },
        { value: "this_month", label: "This month" },
        { value: "last_30_days", label: "Last 30 days" },
      ],
    },
  ];

  // Update URL query params
  const updateQueryParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === "all" || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleFilterChange = (id: string, value: string) => {
    // Map filter IDs to query param keys
    const paramMap: Record<string, string> = {
      searchQuery: "search",
      completionStatus: "status",
      subscriptionStatus: "subscription",
      dateRange: "dateRange",
    };

    updateQueryParams({
      [paramMap[id] || id]: value,
      page: 0, // Reset to first page when filtering
    });
  };

  const handlePaginationChange = (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
    const newPagination = typeof updater === "function" ? updater(pagination) : updater;

    updateQueryParams({
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    });
  };

  const handleRowClick = (profile: UserProfile) => {
    router.push(`/subscribers/${profile.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TableFilters
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.profiles || []}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.totalCount || 0}
        isLoading={isLoading || isRefetching}
        emptyMessage="No subscribers found"
        onRowClick={handleRowClick}
      />
    </div>
  );
}
