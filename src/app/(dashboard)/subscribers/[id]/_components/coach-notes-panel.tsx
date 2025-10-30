"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CoachNote } from "../types";

interface CoachNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notes: CoachNote[];
  adminId: string;
  onAddNote: (adminId: string, content: string) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export function CoachNotesPanel({
  isOpen,
  onClose,
  notes,
  adminId,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: CoachNotesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");

  // Loading states to prevent double-clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartAdding = () => {
    setNewNoteContent("");
    setIsAdding(true);
  };

  const handleCancelAdding = () => {
    setIsAdding(false);
    setNewNoteContent("");
  };

  const handleAddNote = async () => {
    if (newNoteContent.trim() && !isSubmitting) {
      setIsSubmitting(true);
      const content = newNoteContent.trim();

      // Close form IMMEDIATELY for instant feedback
      setIsAdding(false);
      setNewNoteContent("");

      // Call server action in background
      try {
        await onAddNote(adminId, content);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleStartEditing = (note: CoachNote) => {
    setEditingId(note.id);
    setEditNoteContent(note.content);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditNoteContent("");
  };

  const handleSaveEdit = async (id: string) => {
    if (editNoteContent.trim() && !isSubmitting) {
      setIsSubmitting(true);
      const content = editNoteContent.trim();

      // Close edit mode IMMEDIATELY for instant feedback
      setEditingId(null);
      setEditNoteContent("");

      // Fire and forget - don't await
      onUpdateNote(id, content).finally(() => {
        setIsSubmitting(false);
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return; // Prevent double-click
    setDeletingId(id);
    // Fire and forget - don't await
    onDeleteNote(id).finally(() => {
      setDeletingId(null);
    });
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month}, ${year} ${hours}:${minutes}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Coach Notes</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {/* Add Note Button */}
          {!isAdding && (
            <Button
              onClick={handleStartAdding}
              className="w-full mb-4"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          )}

          {/* Add Note Form */}
          {isAdding && (
            <div className="space-y-2 pb-4 mb-4 border-b border-border">
              <Textarea
                placeholder="Add a note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                className="resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isSubmitting || !newNoteContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAdding}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Notes Timeline */}
          {notes.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground mb-1">No notes yet</p>
              <p className="text-xs text-muted-foreground/70 text-center">
                Add notes to track observations and changes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id}>
                  {editingId === note.id ? (
                    <div className="space-y-2 pb-4 pl-1 pt-1">
                      <Textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={isSubmitting || !editNoteContent.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditing}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-4 border-l-2 border-border pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleStartEditing(note)}
                            className="w-full text-left"
                          >
                            <p className="text-sm text-foreground leading-relaxed">
                              {note.content}
                            </p>
                          </button>
                          <div className="text-xs text-muted-foreground mt-2">
                            {formatTimestamp(note.createdAt)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="h-6 w-6 p-0 hover:text-destructive flex-shrink-0"
                          aria-label="Delete note"
                        >
                          <Trash2
                            className={
                              deletingId === note.id
                                ? "w-3 h-3 animate-pulse"
                                : "w-3 h-3"
                            }
                          />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
