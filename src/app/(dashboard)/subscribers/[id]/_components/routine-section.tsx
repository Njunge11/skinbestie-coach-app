"use client";

import { useState } from "react";
import { Plus, Check, X, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { RoutineItem } from "./routine-item";
import type { RoutineProduct, RoutineProductFormData } from "../types";

const ROUTINE_STEPS = [
  "Cleanser",
  "Makeup Remover / Micellar Water",
  "Toner / Essence",
  "Serum / Treatment",
  "Eye Cream",
  "Moisturizer / Cream",
  "Sunscreen (SPF)",
  "Exfoliant / Peel",
  "Mask",
  "Spot Treatment",
  "Facial Oil",
  "Overnight Mask / Sleeping Pack",
  "Lip Care",
  "Neck / Décolletage Care",
];

const FREQUENCIES = ["Daily", "2x per week", "3x per week"];

const DAYS_OF_WEEK = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

interface RoutineSectionProps {
  products: RoutineProduct[];
  onAddProduct: (
    timeOfDay: "morning" | "evening",
    data: RoutineProductFormData
  ) => Promise<void>;
  onUpdateProduct: (id: string, data: RoutineProductFormData) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onReorderProducts: (
    timeOfDay: "morning" | "evening",
    reorderedProducts: RoutineProduct[]
  ) => Promise<void>;
}

export function RoutineSection({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onReorderProducts,
}: RoutineSectionProps) {
  // Split products into morning and evening
  const morningProducts = products.filter((p) => p.timeOfDay === "morning");
  const eveningProducts = products.filter((p) => p.timeOfDay === "evening");

  const [addingTo, setAddingTo] = useState<"morning" | "evening" | null>(null);
  const [openRoutineStep, setOpenRoutineStep] = useState(false);
  const [newProduct, setNewProduct] = useState<RoutineProductFormData>({
    routineStep: "",
    productName: "",
    productUrl: "",
    instructions: "",
    frequency: "Daily",
    days: undefined,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAdd = (timeOfDay: "morning" | "evening") => {
    // Validate all required fields
    if (
      newProduct.routineStep &&
      newProduct.routineStep.trim() &&
      newProduct.productName.trim() &&
      newProduct.instructions.trim() &&
      newProduct.frequency.trim()
    ) {
      onAddProduct(timeOfDay, newProduct);

      setNewProduct({
        routineStep: "",
        productName: "",
        productUrl: "",
        instructions: "",
        frequency: "Daily",
        days: undefined,
      });
      setAddingTo(null);
    }
  };

  const handleEdit = (
    id: string,
    data: RoutineProductFormData
  ) => {
    onUpdateProduct(id, data);
  };

  const handleDelete = (id: string) => {
    onDeleteProduct(id);
  };

  const handleDragEnd = (event: DragEndEvent, timeOfDay: "morning" | "evening") => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentProducts = timeOfDay === "morning" ? morningProducts : eveningProducts;
      const oldIndex = currentProducts.findIndex((item) => item.id === active.id);
      const newIndex = currentProducts.findIndex((item) => item.id === over.id);
      const reorderedProducts = arrayMove(currentProducts, oldIndex, newIndex);

      onReorderProducts(timeOfDay, reorderedProducts);
    }
  };

  const handleCancel = () => {
    setAddingTo(null);
    setNewProduct({
      routineStep: "",
      productName: "",
      productUrl: "",
      instructions: "",
      frequency: "Daily",
      days: undefined,
    });
  };

  const renderAddForm = (timeOfDay: "morning" | "evening") => (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <Popover open={openRoutineStep} onOpenChange={setOpenRoutineStep}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openRoutineStep}
            className="w-full justify-between font-normal"
          >
            {newProduct.routineStep || "Select routine step..."}
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
                      setNewProduct((prev) => ({ ...prev, routineStep: step }));
                      setOpenRoutineStep(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        newProduct.routineStep === step ? "opacity-100" : "opacity-0"
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
        value={newProduct.productName}
        onChange={(e) =>
          setNewProduct((prev) => ({ ...prev, productName: e.target.value }))
        }
        className="font-medium"
      />

      <Input
        placeholder="Product URL (optional)"
        value={newProduct.productUrl}
        onChange={(e) =>
          setNewProduct((prev) => ({ ...prev, productUrl: e.target.value }))
        }
        type="url"
        className="text-sm"
      />

      <Textarea
        placeholder="Instructions (e.g., Apply to damp skin, massage gently)"
        value={newProduct.instructions}
        onChange={(e) =>
          setNewProduct((prev) => ({ ...prev, instructions: e.target.value }))
        }
        rows={2}
        className="text-sm resize-none"
      />

      <Select
        value={newProduct.frequency}
        onValueChange={(value) =>
          setNewProduct((prev) => ({
            ...prev,
            frequency: value,
            days: value === "Daily" ? undefined : prev.days || [],
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCIES.map((freq) => (
            <SelectItem key={freq} value={freq}>
              {freq}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {newProduct.frequency !== "Daily" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = newProduct.days?.includes(day.value);
              const maxDays = newProduct.frequency === "2x per week" ? 2 : 3;
              const canSelect = isSelected || (newProduct.days?.length || 0) < maxDays;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    setNewProduct((prev) => {
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
            Select {newProduct.frequency === "2x per week" ? "2" : "3"} days
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleAdd(timeOfDay)}>
          <Check className="w-4 h-4 mr-2" />
          Add
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Routine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Morning Routine */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              ☀️
            </div>
            <span className="text-sm font-medium text-gray-900">Morning</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, "morning")}
          >
            <SortableContext
              items={morningProducts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {morningProducts.map((product, index) => (
                  <RoutineItem
                    key={product.id}
                    product={product}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}

                {morningProducts.length === 0 && addingTo !== "morning" && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400">No routine set</p>
                  </div>
                )}

                {addingTo === "morning" ? (
                  renderAddForm("morning")
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAddingTo("morning")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {morningProducts.length === 0 ? "Add Step" : "Add Another Step"}
                  </Button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Evening Routine */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              🌙
            </div>
            <span className="text-sm font-medium text-gray-900">Evening</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, "evening")}
          >
            <SortableContext
              items={eveningProducts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {eveningProducts.map((product, index) => (
                  <RoutineItem
                    key={product.id}
                    product={product}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}

                {eveningProducts.length === 0 && addingTo !== "evening" && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400">No routine set</p>
                  </div>
                )}

                {addingTo === "evening" ? (
                  renderAddForm("evening")
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAddingTo("evening")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {eveningProducts.length === 0 ? "Add Step" : "Add Another Step"}
                  </Button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </CardContent>
    </Card>
  );
}
