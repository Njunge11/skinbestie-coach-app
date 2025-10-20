"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { generateBookingLink, fetchEventTypes } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyLink: (url: string, message: string) => void;
}

export function InviteBookingModal({
  isOpen,
  onClose,
  onCopyLink,
}: InviteBookingModalProps) {
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Fetch event types
  const { data: eventTypes } = useQuery({
    queryKey: ["eventTypes"],
    queryFn: async () => {
      const result = await fetchEventTypes();
      if (result.success && result.data) {
        setSelectedEventType(result.data[0] || "");
        return result.data;
      }
      return [];
    },
  });

  // Generate booking link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async (eventType: string) => {
      const result = await generateBookingLink(eventType);
      if (result.success && result.data) {
        return result.data.link;
      }
      throw new Error(result.error);
    },
    onSuccess: (link) => {
      setGeneratedLink(link);
    },
  });

  const handleClose = () => {
    setGeneratedLink(null);
    onClose();
  };

  const handleGenerateLink = () => {
    if (selectedEventType) {
      generateLinkMutation.mutate(selectedEventType);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Book</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event Type
              </label>
              <Select
                value={selectedEventType}
                onValueChange={setSelectedEventType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event type" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {eventTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerateLink}
              disabled={generateLinkMutation.isPending || !selectedEventType}
              className="w-full"
            >
              {generateLinkMutation.isPending ? "Generating..." : "Generate Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                One-time Booking URL
              </label>
              <div className="bg-gray-50 p-3 rounded-lg text-sm break-all border border-gray-200 text-gray-700">
                {generatedLink}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onCopyLink(generatedLink, "Booking link copied")}
                className="flex-1"
              >
                <Copy size={16} className="mr-2" /> Copy
              </Button>
              <Button
                asChild
                className="flex-1"
              >
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} className="mr-2" /> Open
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
