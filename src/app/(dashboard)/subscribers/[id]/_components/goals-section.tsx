"use client";

import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoalItem } from "./goal-item";
import type { Goal, GoalFormData } from "../types";

interface GoalsSectionProps {
  goals: Goal[];
  onAddGoal: (data: GoalFormData) => Promise<void>;
  onUpdateGoal: (id: string, data: GoalFormData) => Promise<void>;
  onToggleGoal: (id: string) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onReorderGoals: (goals: Goal[]) => Promise<void>;
}

export function GoalsSection({
  goals,
  onAddGoal,
  onUpdateGoal,
  onToggleGoal,
  onDeleteGoal,
  onReorderGoals,
}: GoalsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalData, setNewGoalData] = useState<GoalFormData>({
    name: "",
    description: "",
    timeframe: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      console.log("🎯 DRAG END - Calculating new order");
      const oldIndex = goals.findIndex((goal) => goal.id === active.id);
      const newIndex = goals.findIndex((goal) => goal.id === over.id);
      const reorderedGoals = arrayMove(goals, oldIndex, newIndex);

      console.log("🎯 Calling parent handler (onReorderGoals)");
      // Parent handler updates state optimistically (before server call)
      onReorderGoals(reorderedGoals);
      console.log("🎯 Parent handler called (not awaited)");
    }
  };

  const handleStartAdding = () => {
    setNewGoalData({ name: "", description: "", timeframe: "" });
    setIsAdding(true);
  };

  const handleSaveNew = () => {
    if (
      newGoalData.name.trim() &&
      newGoalData.description.trim() &&
      newGoalData.timeframe.trim()
    ) {
      onAddGoal(newGoalData);
      setIsAdding(false);
      setNewGoalData({ name: "", description: "", timeframe: "" });
    }
  };

  const handleCancelNew = () => {
    setIsAdding(false);
    setNewGoalData({ name: "", description: "", timeframe: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skin Goals</CardTitle>
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
                  />
                ))}

                {isAdding ? (
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <Input
                  placeholder="Goal name"
                  value={newGoalData.name}
                  onChange={(e) =>
                    setNewGoalData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="font-medium"
                  autoFocus
                />
                <Textarea
                  placeholder="Description"
                  value={newGoalData.description}
                  onChange={(e) =>
                    setNewGoalData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="text-sm resize-none"
                />
                <Input
                  placeholder="Timeframe (e.g., 12 weeks)"
                  value={newGoalData.timeframe}
                  onChange={(e) =>
                    setNewGoalData((prev) => ({
                      ...prev,
                      timeframe: e.target.value,
                    }))
                  }
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNew}>
                    <Check className="w-4 h-4 mr-2" />
                    Add Goal
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelNew}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleStartAdding}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Goal
              </Button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
