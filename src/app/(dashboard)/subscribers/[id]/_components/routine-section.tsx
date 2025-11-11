"use client";

import { useState } from "react";
import {
  Plus,
  Check,
  ChevronsUpDown,
  Trash2,
  CalendarDays,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RoutineItem } from "./routine-item";
import { AddRoutineModal } from "./add-routine-modal";
import { EditRoutineDialog } from "./edit-routine-dialog";
import { DeleteRoutineDialog } from "./delete-routine-dialog";
import {
  getRoutineStatus,
  formatRoutineStatus,
  formatRoutineDateRange,
} from "../utils/routine-status";
import type {
  Routine,
  RoutineProduct,
  RoutineProductFormData,
  RoutineFormData,
  Frequency,
} from "../types";
import {
  ROUTINE_STEPS,
  FREQUENCIES,
  DAYS_OF_WEEK,
} from "@/lib/routine-constants";

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface RoutineSectionProps {
  routine: Routine | null;
  products: RoutineProduct[];
  templates: Template[];
  onCreateFromTemplate: (
    templateId: string,
    routineName: string,
    startDate: Date,
    endDate: Date | null,
  ) => Promise<void>;
  onCreateBlank: (
    routineName: string,
    startDate: Date,
    endDate: Date | null,
  ) => Promise<void>;
  onUpdateRoutine: (data: RoutineFormData) => Promise<void>;
  onPublishRoutine: () => Promise<void>;
  onDeleteRoutine: () => Promise<void>;
  onAddProduct: (
    timeOfDay: "morning" | "evening",
    data: RoutineProductFormData,
  ) => Promise<void>;
  onUpdateProduct: (id: string, data: RoutineProductFormData) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onReorderProducts: (
    timeOfDay: "morning" | "evening",
    reorderedProducts: RoutineProduct[],
  ) => Promise<void>;
}

export function RoutineSection({
  routine,
  products,
  templates,
  onCreateFromTemplate,
  onCreateBlank,
  onUpdateRoutine,
  onPublishRoutine,
  onDeleteRoutine,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onReorderProducts,
}: RoutineSectionProps) {
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [isEditRoutineOpen, setIsEditRoutineOpen] = useState(false);
  const [isDeleteRoutineOpen, setIsDeleteRoutineOpen] = useState(false);

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
    productPurchaseInstructions: "",
    frequency: "daily",
    days: undefined,
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
        productPurchaseInstructions: "",
        frequency: "daily",
        days: undefined,
      });
      setAddingTo(null);
    }
  };

  const handleEdit = (id: string, data: RoutineProductFormData) => {
    onUpdateProduct(id, data);
  };

  const handleDelete = (id: string) => {
    onDeleteProduct(id);
  };

  const handleDragEnd = (
    event: DragEndEvent,
    timeOfDay: "morning" | "evening",
  ) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentProducts =
        timeOfDay === "morning" ? morningProducts : eveningProducts;
      const oldIndex = currentProducts.findIndex(
        (item) => item.id === active.id,
      );
      const newIndex = currentProducts.findIndex((item) => item.id === over.id);
      const reorderedProducts = arrayMove(currentProducts, oldIndex, newIndex);

      // Parent handler updates state optimistically (before server call)
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
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  };

  const handleDeleteRoutine = () => {
    onDeleteRoutine();
    setIsDeleteRoutineOpen(false);
  };

  const renderAddForm = (timeOfDay: "morning" | "evening") => (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Routine Step</label>
        <Popover open={openRoutineStep} onOpenChange={setOpenRoutineStep}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openRoutineStep}
              className="w-full justify-between font-normal mt-2"
            >
              {newProduct.routineStep || "Select routine step..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
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
                        setNewProduct((prev) => ({
                          ...prev,
                          routineStep: step,
                        }));
                        setOpenRoutineStep(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          newProduct.routineStep === step
                            ? "opacity-100"
                            : "opacity-0",
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
      </div>

      <div className="space-y-2">
        <label htmlFor="product-name" className="text-sm font-medium">
          Product Name
        </label>
        <Input
          id="product-name"
          placeholder="Product name"
          value={newProduct.productName}
          onChange={(e) =>
            setNewProduct((prev) => ({ ...prev, productName: e.target.value }))
          }
          className="font-medium mt-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="product-url" className="text-sm font-medium">
          Product URL (optional)
        </label>
        <Input
          id="product-url"
          placeholder="Product URL (optional)"
          value={newProduct.productUrl || ""}
          onChange={(e) =>
            setNewProduct((prev) => ({ ...prev, productUrl: e.target.value }))
          }
          type="url"
          className="text-sm mt-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="instructions" className="text-sm font-medium">
          Instructions
        </label>
        <Textarea
          id="instructions"
          placeholder="e.g., Apply to damp skin, massage gently"
          value={newProduct.instructions}
          onChange={(e) =>
            setNewProduct((prev) => ({ ...prev, instructions: e.target.value }))
          }
          rows={2}
          className="text-sm resize-none mt-2"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="product-purchase-instructions"
          className="text-sm font-medium"
        >
          Purchase Instructions (optional)
        </label>
        <p className="text-xs text-gray-500">
          Where to buy this product or any special purchasing notes
        </p>
        <Textarea
          id="product-purchase-instructions"
          placeholder="e.g., Available at Sephora, Use code SAVE10 for discount"
          value={newProduct.productPurchaseInstructions || ""}
          onChange={(e) =>
            setNewProduct((prev) => ({
              ...prev,
              productPurchaseInstructions: e.target.value,
            }))
          }
          rows={2}
          className="text-sm resize-none mt-2"
        />
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">Frequency</label>
        <Select
          value={newProduct.frequency}
          onValueChange={(value) =>
            setNewProduct((prev) => ({
              ...prev,
              frequency: value as Frequency,
              days: value === "daily" ? undefined : prev.days || [],
            }))
          }
        >
          <SelectTrigger className="mt-2">
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
      </div>

      {newProduct.frequency !== "daily" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = newProduct.days?.includes(day.value);
              const maxDays = newProduct.frequency === "2x per week" ? 2 : 3;
              const canSelect =
                isSelected || (newProduct.days?.length || 0) < maxDays;

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
                    !canSelect &&
                      !isSelected &&
                      "opacity-50 cursor-not-allowed",
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

      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={() => handleAdd(timeOfDay)}>
          Add
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  // Empty state when no routine exists
  if (!routine) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Current Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-gray-500 mb-1">No routine set yet</p>
              <p className="text-xs text-gray-400 mb-6">
                Create a routine to track skincare products
              </p>
              <Button
                variant="outline"
                onClick={() => setIsAddRoutineOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Routine
              </Button>
            </div>
          </CardContent>
        </Card>

        <AddRoutineModal
          open={isAddRoutineOpen}
          onOpenChange={setIsAddRoutineOpen}
          templates={templates}
          onCreateFromTemplate={onCreateFromTemplate}
          onCreateBlank={onCreateBlank}
        />
      </>
    );
  }

  // Routine exists - show routine header and products
  const status = getRoutineStatus(routine);
  const statusLabel = formatRoutineStatus(status);
  const dateRange = formatRoutineDateRange(routine);

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          {/* Routine Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                {routine.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{dateRange}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={status === "ongoing" ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
                {routine.status === "draft" && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200"
                  >
                    Draft
                  </Badge>
                )}
                {routine.status === "published" && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Published
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditRoutineOpen(true)}
              >
                Edit
              </Button>
              {routine.status === "draft" && (
                <Button variant="default" size="sm" onClick={onPublishRoutine}>
                  Publish
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteRoutineOpen(true)}
                className="h-9 w-9 p-0"
                aria-label="Delete routine"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
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
                      {morningProducts.length === 0
                        ? "Add Step"
                        : "Add Another Step"}
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
                      {eveningProducts.length === 0
                        ? "Add Step"
                        : "Add Another Step"}
                    </Button>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditRoutineDialog
        open={isEditRoutineOpen}
        onOpenChange={setIsEditRoutineOpen}
        routine={routine}
        onUpdate={onUpdateRoutine}
      />

      <DeleteRoutineDialog
        open={isDeleteRoutineOpen}
        onOpenChange={setIsDeleteRoutineOpen}
        onConfirm={handleDeleteRoutine}
        routineName={routine.name}
      />
    </>
  );
}
