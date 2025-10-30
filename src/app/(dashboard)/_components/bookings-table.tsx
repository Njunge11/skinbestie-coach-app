"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { RefreshCw, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { TableFilters, type FilterConfig } from "@/components/ui/table-filters";
import { toast } from "sonner";
import type { Booking, BookingFilters } from "../types";
import { fetchBookings } from "../actions";
import { BookingDetailsDrawer } from "./booking-details-drawer";
import { InviteBookingModal } from "./invite-booking-modal";
import { CancelBookingModal } from "./cancel-booking-modal";

export function BookingsTable() {
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Filter state
  const [filters, setFilters] = useState<BookingFilters>({
    dateFilter: "upcoming",
    statusFilter: "all",
    searchQuery: "",
  });

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [cancelEventUuid, setCancelEventUuid] = useState<string | null>(null);

  // Fetch bookings with filters (only date and status filters trigger API calls)
  const {
    data: allBookingsData = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["bookings", filters.dateFilter, filters.statusFilter],
    queryFn: async () => {
      const result = await fetchBookings({
        dateFilter: filters.dateFilter,
        statusFilter: filters.statusFilter,
      });
      return result.success ? result.data : [];
    },
  });

  // Apply client-side filters (search)
  const filteredData = allBookingsData.filter((booking: Booking) => {
    // Filter by search query (client name or email)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch =
        booking.invitee.name.toLowerCase().includes(query) ||
        booking.invitee.email.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Get paginated data for current page
  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  // Define table columns
  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "start",
      header: "When",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm text-gray-900">
            {formatDateTime(row.original.start)}
          </div>
          <div className="text-sm text-gray-500">
            {formatDateTime(row.original.end)} EAT
          </div>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-900">
          {row.getValue("title")}
        </span>
      ),
    },
    {
      accessorKey: "invitee.name",
      header: "Client",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.invitee.name}
        </span>
      ),
    },
    {
      accessorKey: "invitee.email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.invitee.email}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                status === "Active" ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-sm text-gray-700">{status}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelectedBooking(row.original)}
              >
                View
              </DropdownMenuItem>
              {row.original.meetingUrl && row.original.status === "Active" && (
                <DropdownMenuItem
                  onClick={() => window.open(row.original.meetingUrl, "_blank")}
                >
                  Join Meeting
                </DropdownMenuItem>
              )}
              {row.original.status === "Active" && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setCancelEventUuid(row.original.uuid)}
                >
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Define filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: "searchQuery",
      label: "Search",
      type: "text",
      placeholder: "Search by client name or email...",
    },
    {
      id: "dateFilter",
      label: "Date Range",
      type: "select",
      options: [
        { value: "upcoming", label: "Upcoming" },
        { value: "today", label: "Today" },
        { value: "next7days", label: "Next 7 days" },
        { value: "all", label: "All dates" },
      ],
    },
    {
      id: "statusFilter",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "canceled", label: "Canceled" },
      ],
    },
  ];

  const handleFilterChange = (id: string, value: string) => {
    setFilters((prev) => ({ ...prev, [id]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Meetings</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              size={18}
              className={isRefetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>
          <Button onClick={() => setShowInviteModal(true)}>
            Invite to book
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TableFilters
        filters={filterConfig}
        values={filters as unknown as Record<string, string>}
        onChange={handleFilterChange}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={filteredData.length}
        isLoading={isLoading}
        emptyMessage="No bookings found"
      />

      {/* Modals */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onCopyLink={copyToClipboard}
      />

      <InviteBookingModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onCopyLink={copyToClipboard}
      />

      <CancelBookingModal
        eventUuid={cancelEventUuid}
        isOpen={!!cancelEventUuid}
        onClose={() => setCancelEventUuid(null)}
        onSuccess={(message) => toast.success(message)}
      />
    </div>
  );
}
