"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBooking } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CancelBookingModalProps {
  eventUuid: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CancelBookingModal({
  eventUuid,
  isOpen,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const result = await cancelBooking(uuid);
      if (result.success) {
        return result.message;
      }
      throw new Error(result.error);
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onSuccess(message || "Meeting canceled successfully");
      onClose();
    },
  });

  const handleCancel = () => {
    if (eventUuid) {
      cancelMutation.mutate(eventUuid);
    }
  };

  return (
    <Dialog open={isOpen && !!eventUuid} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Meeting</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this meeting? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cancelMutation.isPending}
          >
            Keep Meeting
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Canceling..." : "Yes, Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
