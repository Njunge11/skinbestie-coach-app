"use client";

import { useCallback, useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { SubscriberTableRow } from "../userProfiles.repo";
import type { UserProfileFilters } from "../schemas";
import { getUserProfiles } from "../actions";

export function SubscribersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read state from URL query params
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const urlSearchQuery = searchParams.get("search") || "";
  const completionStatus = (searchParams.get("status") ||
    "all") as UserProfileFilters["completionStatus"];
  const subscriptionStatus = (searchParams.get("subscription") ||
    "all") as UserProfileFilters["subscriptionStatus"];
  const dateRange = (searchParams.get("dateRange") ||
    "all") as UserProfileFilters["dateRange"];

  // Update URL query params (defined early so useEffect can use it)
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
    [pathname, router, searchParams],
  );

  // CANONICAL PATTERN: Local state for instant input feedback
  const [localSearchQuery, setLocalSearchQuery] = useState(urlSearchQuery);

  // CANONICAL PATTERN: Debounced state for the query key
  const [debouncedSearchQuery] = useDebounce(localSearchQuery, 500);

  // Sync URL params to local state when URL changes (browser back/forward)
  useEffect(() => {
    setLocalSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  // Sync debounced state to URL params (for shareable URLs)
  useEffect(() => {
    if (debouncedSearchQuery !== urlSearchQuery) {
      updateQueryParams({
        search: debouncedSearchQuery,
        page: 0, // Reset to first page
      });
    }
  }, [debouncedSearchQuery, urlSearchQuery, updateQueryParams]);

  // Pagination state derived from URL
  const pagination: PaginationState = {
    pageIndex: page,
    pageSize: pageSize,
  };

  // Filter state using DEBOUNCED search (canonical pattern)
  const filters: UserProfileFilters = {
    searchQuery: debouncedSearchQuery, // ← Use debounced, not URL
    completionStatus,
    subscriptionStatus,
    dateRange,
  };

  // Fetch user profiles with server-side filtering and pagination
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ["user-profiles", filters, pagination],
    queryFn: async () => {
      const result = await getUserProfiles(
        filters,
        { page: pagination.pageIndex, pageSize: pagination.pageSize },
        { sortBy: "createdAt", sortOrder: "desc" },
      );
      return result.success ? result.data : null;
    },
    placeholderData: keepPreviousData, // Show old results while loading new ones
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
  const columns: ColumnDef<SubscriberTableRow>[] = [
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
                className="bg-primary h-2 rounded-full"
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
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isCompleted ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="text-sm text-gray-700">
              {isCompleted ? "Complete" : "Incomplete"}
            </span>
          </div>
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
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/subscribers/${row.original.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value); // Instant update, debounce handles the rest
  };

  const handleCompletionStatusChange = (value: string) => {
    updateQueryParams({
      status: value,
      page: 0,
    });
  };

  const handleSubscriptionStatusChange = (value: string) => {
    updateQueryParams({
      subscription: value,
      page: 0,
    });
  };

  const handleDateRangeChange = (value: string) => {
    updateQueryParams({
      dateRange: value,
      page: 0,
    });
  };

  const handlePaginationChange = (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const newPagination =
      typeof updater === "function" ? updater(pagination) : updater;

    updateQueryParams({
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    });
  };

  const handleRowClick = (profile: SubscriberTableRow) => {
    router.push(`/subscribers/${profile.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Custom Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Search
            </label>
            <Input
              placeholder="Search by name or email..."
              value={localSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Completion Status
            </label>
            <Select
              value={completionStatus}
              onValueChange={handleCompletionStatusChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Subscription
            </label>
            <Select
              value={subscriptionStatus}
              onValueChange={handleSubscriptionStatusChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="not_subscribed">Not Subscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Date Range
            </label>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="recent">Last 7 days</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
