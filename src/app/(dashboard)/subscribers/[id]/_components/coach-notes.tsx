"use client";

import { useState } from "react";
import { Plus, Check, X, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: number;
  content: string;
  timestamp: string;
  author: string;
}

// Dummy data
const initialNotes: Note[] = [
  {
    id: 1,
    content:
      "Client mentioned increased stress at work. May be affecting skin barrier. Recommended adding calming ingredients.",
    timestamp: "2025-10-14T10:30:00",
    author: "Dr. Smith",
  },
  {
    id: 2,
    content:
      "Great progress on hyperpigmentation. Client very happy with results. Continue current routine.",
    timestamp: "2025-10-10T14:15:00",
    author: "Dr. Smith",
  },
  {
    id: 3,
    content:
      "Started tretinoin 0.025%. Advised to use only 2x per week initially to build tolerance.",
    timestamp: "2025-10-05T09:00:00",
    author: "Dr. Smith",
  },
];

export function CoachNotes() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");

  const handleStartAdding = () => {
    setNewNoteContent("");
    setIsAdding(true);
  };

  const handleCancelAdding = () => {
    setIsAdding(false);
    setNewNoteContent("");
  };

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      const newNote: Note = {
        id: Date.now(),
        content: newNoteContent.trim(),
        timestamp: new Date().toISOString(),
        author: "Dr. Smith",
      };
      setNotes([newNote, ...notes]);
      setIsAdding(false);
      setNewNoteContent("");
    }
  };

  const handleStartEditing = (note: Note) => {
    setEditingId(note.id);
    setEditNoteContent(note.content);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditNoteContent("");
  };

  const handleSaveEdit = (id: number) => {
    if (editNoteContent.trim()) {
      setNotes(
        notes.map((note) =>
          note.id === id ? { ...note, content: editNoteContent.trim() } : note
        )
      );
      setEditingId(null);
      setEditNoteContent("");
    }
  };

  const handleDeleteNote = (id: number) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

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
    <Card className="xl:sticky xl:top-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Coach Notes</CardTitle>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartAdding}
            aria-label="Add note"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {isAdding && (
          <div className="space-y-2 pb-4 border-b border-border">
            <Textarea
              placeholder="Add a note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNote}>
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelAdding}>
                <X className="w-4 h-4 mr-2" />
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
            {notes.map((note, index) => (
              <div
                key={note.id}
                className="relative pl-4 border-l-2 border-border"
              >
                {/* Note content */}
                <div className="flex-1 min-w-0 pb-4">
                  {editingId === note.id ? (
                    <div className="space-y-2">
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
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditing}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(note.timestamp)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditing(note)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-7 w-7 p-0 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
