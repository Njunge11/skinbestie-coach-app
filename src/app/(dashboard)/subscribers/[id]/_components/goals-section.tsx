"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GoalItem } from "./goal-item";
import type { Goal, GoalFormData, GoalsTemplate } from "../types";

interface GoalsSectionProps {
  goals: Goal[];
  template: GoalsTemplate | null;
  onAddGoal: (data: GoalFormData) => Promise<void>;
  onUpdateGoal: (id: string, data: GoalFormData) => Promise<void>;
  onToggleGoal: (id: string) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onReorderGoals: (goals: Goal[]) => Promise<void>;
  onPublishToggle?: () => Promise<void>;
  showMainFocus?: boolean;
  showCheckbox?: boolean;
}

export function GoalsSection({
  goals,
  template,
  onAddGoal,
  onUpdateGoal,
  onToggleGoal,
  onDeleteGoal,
  onReorderGoals,
  onPublishToggle,
  showMainFocus = false,
  showCheckbox = false,
}: GoalsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalData, setNewGoalData] = useState<GoalFormData>({
    description: "",
    isPrimaryGoal: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = goals.findIndex((goal) => goal.id === active.id);
      const newIndex = goals.findIndex((goal) => goal.id === over.id);
      const reorderedGoals = arrayMove(goals, oldIndex, newIndex);

      onReorderGoals(reorderedGoals);
    }
  };

  const handleStartAdding = () => {
    setNewGoalData({ description: "", isPrimaryGoal: false });
    setIsAdding(true);
  };

  const handleSaveNew = () => {
    if (newGoalData.description.trim()) {
      onAddGoal(newGoalData);
      setIsAdding(false);
      setNewGoalData({ description: "", isPrimaryGoal: false });
    }
  };

  const handleCancelNew = () => {
    setIsAdding(false);
    setNewGoalData({ description: "", isPrimaryGoal: false });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Skin Goals</CardTitle>
          {template && (
            <Badge
              variant={
                template.status === "published" ? "default" : "secondary"
              }
            >
              {template.status === "published" ? "Published" : "Unpublished"}
            </Badge>
          )}
        </div>
        {template && onPublishToggle && (
          <Button
            size="sm"
            variant={template.status === "published" ? "outline" : "default"}
            onClick={onPublishToggle}
          >
            {template.status === "published" ? "Unpublish" : "Publish"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {goals.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-gray-500 mb-1">No goals set yet</p>
            <p className="text-xs text-gray-400 mb-6">
              Add goals to track outcomes
            </p>
            <Button variant="outline" onClick={handleStartAdding}>
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={goals.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {goals.map((goal, index) => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    index={index}
                    onToggle={onToggleGoal}
                    onEdit={onUpdateGoal}
                    onDelete={onDeleteGoal}
                    showCheckbox={showCheckbox}
                    showMainFocus={showMainFocus}
                  />
                ))}

                {isAdding ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label
                          htmlFor="new-goal"
                          className="text-sm font-medium"
                        >
                          Goal Description
                        </label>
                        <Textarea
                          id="new-goal"
                          placeholder="Enter the clients goal"
                          value={newGoalData.description}
                          onChange={(e) =>
                            setNewGoalData({
                              ...newGoalData,
                              description: e.target.value,
                            })
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
                              htmlFor="new-goal-primary"
                              className="text-sm font-medium"
                            >
                              Make this the main focus
                            </Label>
                            <p className="text-xs text-gray-500">
                              Mark this as the top priority goal to work on
                            </p>
                          </div>
                          <Switch
                            id="new-goal-primary"
                            checked={newGoalData.isPrimaryGoal ?? false}
                            onCheckedChange={(checked) =>
                              setNewGoalData({
                                ...newGoalData,
                                isPrimaryGoal: checked,
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNew}
                          disabled={!newGoalData.description.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelNew}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : goals.length > 0 ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartAdding}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Goal
                  </Button>
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
