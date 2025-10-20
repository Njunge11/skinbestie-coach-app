"use client";

import { Copy, ExternalLink } from "lucide-react";
import type { Booking } from "../types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface BookingDetailsDrawerProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onCopyLink: (url: string, message: string) => void;
}

export function BookingDetailsDrawer({
  booking,
  isOpen,
  onClose,
  onCopyLink,
}: BookingDetailsDrawerProps) {
  if (!booking) return null;

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Event Details</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Event Information */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Event Information
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Title</span>
                <span className="text-sm font-medium text-gray-900">
                  {booking.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span
                  className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    booking.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Host</span>
                <span className="text-sm font-medium text-gray-900">
                  {booking.host}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">When</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDateTime(booking.start)}
                </div>
                <div className="text-sm text-gray-900">
                  {formatDateTime(booking.end)} EAT
                </div>
              </div>
            </div>
          </div>

          {/* Invitee */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Invitee</h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Name</div>
                <div className="text-sm text-gray-900">{booking.invitee.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Email</div>
                <div className="text-sm text-gray-900">{booking.invitee.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Timezone</div>
                <div className="text-sm text-gray-900">
                  {booking.invitee.timezone}
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Links</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700">Reschedule URL</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onCopyLink(booking.rescheduleUrl, "Reschedule link copied")
                    }
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Copy link"
                  >
                    <Copy size={16} />
                  </button>
                  <a
                    href={booking.rescheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Open link"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Join Button */}
          {booking.status === "Active" && (
            <div className="pt-4 border-t">
              <Button
                asChild
                className="w-full"
              >
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Now
                </a>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
