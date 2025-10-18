"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Routine, RoutineFormData } from "../types";

interface EditRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Routine | null;
  onUpdate: (data: RoutineFormData) => Promise<void>;
}

export function EditRoutineDialog({
  open,
  onOpenChange,
  routine,
  onUpdate,
}: EditRoutineDialogProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when routine changes
  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setStartDate(new Date(routine.startDate).toISOString().split("T")[0]);
      setEndDate(
        routine.endDate ? new Date(routine.endDate).toISOString().split("T")[0] : ""
      );
    }
  }, [routine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !startDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onUpdate({
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating routine:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (routine) {
      setName(routine.name);
      setStartDate(new Date(routine.startDate).toISOString().split("T")[0]);
      setEndDate(
        routine.endDate ? new Date(routine.endDate).toISOString().split("T")[0] : ""
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Routine Info</DialogTitle>
            <DialogDescription>
              Update the routine details for this subscriber.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Routine Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Winter Acne Treatment Routine"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-startDate">Start Date *</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endDate">End Date (Optional)</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for an ongoing routine
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !startDate}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
