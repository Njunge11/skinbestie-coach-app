"use client";

import { useState } from "react";
import { Check, X, Trash2, GripVertical, ChevronsUpDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoutineProduct, RoutineProductFormData, Frequency } from "../types";
import { getFrequencyLabel, ROUTINE_STEPS, FREQUENCIES, DAYS_OF_WEEK } from "@/lib/routine-constants";

interface RoutineItemProps {
  product: RoutineProduct;
  index: number;
  onEdit: (id: string, data: RoutineProductFormData) => void;
  onDelete: (id: string) => void;
}

export function RoutineItem({
  product,
  index,
  onEdit,
  onDelete,
}: RoutineItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [openRoutineStep, setOpenRoutineStep] = useState(false);
  const [editData, setEditData] = useState<RoutineProductFormData>({
    routineStep: product.routineStep,
    productName: product.productName,
    productUrl: product.productUrl || "",
    instructions: product.instructions,
    frequency: product.frequency,
    days: product.days ?? undefined,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleStartEdit = () => {
    setEditData({
      routineStep: product.routineStep,
      productName: product.productName,
      productUrl: product.productUrl || "",
      instructions: product.instructions,
      frequency: product.frequency,
      days: product.days ?? undefined,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validate all required fields
    if (
      editData.routineStep &&
      editData.routineStep.trim() &&
      editData.productName.trim() &&
      editData.instructions.trim() &&
      editData.frequency.trim()
    ) {
      onEdit(product.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <Popover open={openRoutineStep} onOpenChange={setOpenRoutineStep}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openRoutineStep}
              className="w-full justify-between font-normal"
            >
              {editData.routineStep || "Select routine step..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search routine step..." />
              <CommandList>
                <CommandEmpty>No routine step found.</CommandEmpty>
                <CommandGroup>
                  {ROUTINE_STEPS.map((step) => (
                    <CommandItem
                      key={step}
                      value={step}
                      onSelect={() => {
                        setEditData((prev) => ({ ...prev, routineStep: step }));
                        setOpenRoutineStep(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          editData.routineStep === step ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {step}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Input
          placeholder="Product name"
          value={editData.productName}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, productName: e.target.value }))
          }
          className="font-medium"
        />

        <Input
          placeholder="Product URL (optional)"
          value={editData.productUrl || ""}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, productUrl: e.target.value }))
          }
          type="url"
          className="text-sm"
        />

        <Textarea
          placeholder="Instructions (e.g., Apply to damp skin, massage gently)"
          value={editData.instructions}
          onChange={(e) =>
            setEditData((prev) => ({ ...prev, instructions: e.target.value }))
          }
          rows={2}
          className="text-sm resize-none"
        />

        <Select
          value={editData.frequency}
          onValueChange={(value) =>
            setEditData((prev) => ({
              ...prev,
              frequency: value as Frequency,
              days: value === "daily" ? undefined : prev.days || [],
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((freq) => (
              <SelectItem key={freq.value} value={freq.value}>
                {freq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {editData.frequency !== "daily" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = editData.days?.includes(day.value);
                const maxDays = editData.frequency === "2x per week" ? 2 : 3;
                const canSelect = isSelected || (editData.days?.length || 0) < maxDays;

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      setEditData((prev) => {
                        const currentDays = prev.days || [];
                        if (isSelected) {
                          return {
                            ...prev,
                            days: currentDays.filter((d) => d !== day.value),
                          };
                        } else if (canSelect) {
                          return {
                            ...prev,
                            days: [...currentDays, day.value],
                          };
                        }
                        return prev;
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!canSelect && !isSelected}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Select {editData.frequency === "2x per week" ? "2" : "3"} days
            </p>
          </div>
        )}

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

        <button onClick={handleStartEdit} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="font-normal">
              {product.routineStep}
            </Badge>
            {product.frequency && (
              <Badge variant="outline" className="font-normal">
                {getFrequencyLabel(product.frequency)}
                {product.days && product.days.length > 0 && (
                  <span className="ml-1">• {product.days.join(", ")}</span>
                )}
              </Badge>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">
            {product.productUrl ? (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {product.productName}
              </a>
            ) : (
              product.productName
            )}
          </h4>
          {product.instructions && (
            <p className="text-sm text-gray-600">{product.instructions}</p>
          )}
        </button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(product.id)}
          className="h-10 w-10 p-0"
          aria-label="Delete step"
        >
          <Trash2 className="w-6 h-6 text-gray-500 hover:text-red-600" />
        </Button>
      </div>
    </div>
  );
}
