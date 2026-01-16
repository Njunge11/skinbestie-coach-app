"use client";

import { useState } from "react";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { type ProductFormData } from "@/components/routine/product-form";
import { ProductItem } from "@/components/routine/product-item";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AddRoutineModal } from "./add-routine-modal";
import { AddStepModal } from "./add-step-modal";
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
} from "../types";

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
  onSaveAsTemplate?: () => Promise<void>;
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
  onSaveAsTemplate,
}: RoutineSectionProps) {
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [isEditRoutineOpen, setIsEditRoutineOpen] = useState(false);
  const [isDeleteRoutineOpen, setIsDeleteRoutineOpen] = useState(false);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [addStepTimeOfDay, setAddStepTimeOfDay] = useState<
    "morning" | "evening"
  >("morning");

  // Split products into morning and evening
  const morningProducts = products.filter((p) => p.timeOfDay === "morning");
  const eveningProducts = products.filter((p) => p.timeOfDay === "evening");

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

  const handleAddStep = (data: ProductFormData) => {
    // Convert ProductFormData to RoutineProductFormData for onAddProduct
    const routineProductData: RoutineProductFormData = {
      stepType: data.stepType || "product",
      stepName: data.stepName,
      routineStep: data.routineStep || undefined,
      productName: data.productName || "",
      productUrl: data.productUrl || "",
      instructions: data.instructions,
      productPurchaseInstructions: data.productPurchaseInstructions || "",
      frequency: data.frequency || "daily",
      days: data.days,
    };
    onAddProduct(addStepTimeOfDay, routineProductData);
  };

  const handleEdit = (id: string, data: ProductFormData) => {
    // Convert ProductFormData to RoutineProductFormData
    const routineProductData: RoutineProductFormData = {
      stepType: data.stepType || "product",
      stepName: data.stepName,
      routineStep: data.routineStep,
      productName: data.productName,
      productUrl: data.productUrl || "",
      instructions: data.instructions,
      productPurchaseInstructions: data.productPurchaseInstructions || "",
      frequency: data.frequency || "daily",
      days: data.days,
    };
    onUpdateProduct(id, routineProductData);
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

  const handleDeleteRoutine = () => {
    onDeleteRoutine();
    setIsDeleteRoutineOpen(false);
  };

  const openAddStepModal = (timeOfDay: "morning" | "evening") => {
    setAddStepTimeOfDay(timeOfDay);
    setIsAddStepOpen(true);
  };

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
              {routine.status === "published" && !routine.savedAsTemplate && (
                <div className="flex items-center gap-2 mr-2">
                  <Switch
                    id="save-template"
                    onCheckedChange={(checked) => {
                      if (checked && onSaveAsTemplate) {
                        onSaveAsTemplate();
                      }
                    }}
                  />
                  <label
                    htmlFor="save-template"
                    className="text-xs font-medium text-gray-700 cursor-pointer"
                  >
                    Save as Template
                  </label>
                </div>
              )}
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
                    <ProductItem
                      key={product.id}
                      product={product}
                      index={index}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}

                  {morningProducts.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-400">No routine set</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openAddStepModal("morning")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {morningProducts.length === 0
                      ? "Add Step"
                      : "Add Another Step"}
                  </Button>
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
                    <ProductItem
                      key={product.id}
                      product={product}
                      index={index}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}

                  {eveningProducts.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-400">No routine set</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openAddStepModal("evening")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {eveningProducts.length === 0
                      ? "Add Step"
                      : "Add Another Step"}
                  </Button>
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

      <AddStepModal
        open={isAddStepOpen}
        onOpenChange={setIsAddStepOpen}
        timeOfDay={addStepTimeOfDay}
        onAdd={handleAddStep}
      />
    </>
  );
}
