"use client";

import { useState } from "react";
import { Check, X, Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Goal, GoalFormData } from "../types";

interface GoalItemProps {
  goal: Goal;
  index: number;
  onToggle: (id: string) => Promise<void>;
  onEdit: (id: string, data: GoalFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function GoalItem({
  goal,
  index,
  onToggle,
  onEdit,
  onDelete,
}: GoalItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<GoalFormData>({
    name: goal.name,
    description: goal.description,
    timeframe: goal.timeframe,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleStartEdit = () => {
    setEditData({
      name: goal.name,
      description: goal.description,
      timeframe: goal.timeframe,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editData.name.trim()) {
      onEdit(goal.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <Input
          placeholder="Goal name"
          value={editData.name}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="font-medium"
        />
        <Textarea
          placeholder="Description (optional)"
          value={editData.description}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={2}
          className="text-sm resize-none"
        />
        <Input
          placeholder="Timeframe (e.g., 12 weeks)"
          value={editData.timeframe}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, timeframe: e.target.value }))
          }
          className="text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-gray-200 hover:border-gray-300 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
          </div>
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <button
          onClick={() => onToggle(goal.id)}
          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
            goal.complete
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-300 hover:border-gray-400"
          }`}
          aria-label={goal.complete ? "Mark as incomplete" : "Mark as complete"}
        >
          {goal.complete && <Check className="w-4 h-4 text-white" />}
        </button>

        <button onClick={handleStartEdit} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-semibold ${
                goal.complete ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {goal.name}
            </h4>
            {goal.timeframe && (
              <Badge variant="secondary" className="font-normal">
                {goal.timeframe}
              </Badge>
            )}
          </div>
          {goal.description && (
            <p
              className={`text-sm ${
                goal.complete ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {goal.description}
            </p>
          )}
        </button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(goal.id)}
          className="h-10 w-10 p-0"
          aria-label="Delete goal"
        >
          <Trash2 className="w-6 h-6 text-gray-500 hover:text-red-600" />
        </Button>
      </div>
    </div>
  );
}
