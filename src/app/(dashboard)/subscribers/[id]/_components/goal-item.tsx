"use client";

import { useState } from "react";
import { Check, Trash2, GripVertical, Star } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Goal, GoalFormData } from "../types";

interface GoalItemProps {
  goal: Goal;
  index: number;
  onToggle: (id: string) => Promise<void>;
  onEdit: (id: string, data: GoalFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showCheckbox?: boolean;
  showMainFocus?: boolean;
}

export function GoalItem({
  goal,
  index,
  onToggle,
  onEdit,
  onDelete,
  showCheckbox = false,
  showMainFocus = false,
}: GoalItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<GoalFormData>({
    description: goal.description,
    isPrimaryGoal: goal.isPrimaryGoal,
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
      description: goal.description,
      isPrimaryGoal: goal.isPrimaryGoal,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editData.description.trim()) {
      onEdit(goal.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor={`edit-goal-${goal.id}`}
              className="text-sm font-medium"
            >
              Goal Description
            </label>
            <Textarea
              id={`edit-goal-${goal.id}`}
              placeholder="Enter what you want to achieve"
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows={2}
              className="resize-none mt-2"
              autoFocus
            />
          </div>
          {showMainFocus && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 mt-4">
              <div className="space-y-0.5">
                <Label
                  htmlFor={`edit-goal-primary-${goal.id}`}
                  className="text-sm font-medium"
                >
                  Make this the main focus
                </Label>
                <p className="text-xs text-gray-500">
                  Mark this as the top priority goal to work on
                </p>
              </div>
              <Switch
                id={`edit-goal-primary-${goal.id}`}
                checked={editData.isPrimaryGoal ?? false}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, isPrimaryGoal: checked })
                }
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editData.description.trim()}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleStartEdit}
      className={cn(
        "flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 cursor-pointer",
        isDragging && "opacity-50 cursor-grabbing",
      )}
    >
      {/* Desktop Layout - Horizontal */}
      <div className="hidden md:flex md:items-center md:gap-3 md:flex-1">
        {/* Drag Handle - Visual indicator */}
        <div className="text-gray-400">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Priority Badge */}
        <Badge className="bg-primary text-white rounded-full w-7 h-7 p-0 flex items-center justify-center">
          {index + 1}
        </Badge>

        {/* Checkbox */}
        {showCheckbox && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(goal.id);
            }}
            className={cn(
              "w-5 h-5 rounded border-2 transition-colors",
              goal.complete
                ? "bg-emerald-500 border-emerald-500"
                : "border-gray-300 hover:border-gray-400",
            )}
            aria-label={
              goal.complete ? "Mark as incomplete" : "Mark as complete"
            }
          >
            {goal.complete && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Goal Content */}
        <div className="flex-1">
          <p
            className={cn(
              "text-sm",
              goal.complete && "line-through text-gray-400",
            )}
          >
            {goal.description}
          </p>
          {showMainFocus && goal.isPrimaryGoal && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 mt-2 w-fit">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-xs font-medium text-primary">
                Main Focus
              </span>
            </div>
          )}
          {goal.completedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Completed {new Date(goal.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Edit Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit();
          }}
        >
          Edit
        </Button>

        {/* Delete Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile Layout - Vertical */}
      <div className="flex md:hidden flex-col gap-3 w-full">
        {/* Top row: Drag handle, checkbox, and delete button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-gray-400">
              <GripVertical className="w-5 h-5" />
            </div>

            {showCheckbox && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(goal.id);
                }}
                className={cn(
                  "w-5 h-5 rounded border-2 transition-colors",
                  goal.complete
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300 hover:border-gray-400",
                )}
                aria-label={
                  goal.complete ? "Mark as incomplete" : "Mark as complete"
                }
              >
                {goal.complete && <Check className="w-3 h-3 text-white" />}
              </button>
            )}
          </div>

          {/* Delete Button - Top right */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal.id);
            }}
            className="text-gray-400 hover:text-red-600 -mr-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Goal Content */}
        <div className="flex-1">
          <p
            className={cn(
              "text-sm",
              goal.complete && "line-through text-gray-400",
            )}
          >
            {goal.description}
          </p>
          {showMainFocus && goal.isPrimaryGoal && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 mt-2 w-fit">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-xs font-medium text-primary">
                Main Focus
              </span>
            </div>
          )}
          {goal.completedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Completed {new Date(goal.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Edit Button - Full width below description */}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit();
          }}
          className="w-full"
        >
          Edit
        </Button>
      </div>
    </div>
  );
}
