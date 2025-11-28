"use client";

import { useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProductForm, ProductFormData } from "./product-form";
import { getFrequencyLabel } from "@/lib/routine-constants";
import type {
  Frequency,
  TimeOfDay,
  StepType,
} from "@/app/(dashboard)/subscribers/[id]/types";

export interface Product {
  id: string;
  stepType: StepType;
  stepName?: string | null;
  routineStep?: string | null;
  productName?: string | null;
  productUrl: string | null;
  instructions: string | null;
  productPurchaseInstructions?: string | null;
  frequency: Frequency;
  days: string[] | null;
  timeOfDay: TimeOfDay;
  order: number;
}

interface ProductItemProps {
  product: Product;
  index: number;
  onEdit: (id: string, data: ProductFormData) => void;
  onDelete: (id: string) => void;
}

export function ProductItem({
  product,
  index,
  onEdit,
  onDelete,
}: ProductItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ProductFormData>({
    stepType: product.stepType,
    stepName: product.stepName || undefined,
    routineStep: product.routineStep || undefined,
    productName: product.productName || undefined,
    productUrl: product.productUrl,
    instructions: product.instructions,
    productPurchaseInstructions: product.productPurchaseInstructions || null,
    frequency: product.frequency,
    days: product.days || undefined,
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
      stepType: product.stepType,
      stepName: product.stepName || undefined,
      routineStep: product.routineStep || undefined,
      productName: product.productName || undefined,
      productUrl: product.productUrl,
      instructions: product.instructions,
      productPurchaseInstructions: product.productPurchaseInstructions || null,
      frequency: product.frequency,
      days: product.days || undefined,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const stepType = editData.stepType || "product";

    // Validate based on step type
    let isValid = false;

    if (stepType === "product") {
      // Product type: routineStep, productName, and frequency are required
      isValid =
        editData.routineStep !== undefined &&
        editData.routineStep.trim() !== "" &&
        editData.productName !== undefined &&
        editData.productName.trim() !== "" &&
        editData.frequency !== undefined &&
        editData.frequency.trim() !== "";
    } else {
      // Instruction-only type: instructions and frequency are required
      isValid =
        editData.instructions !== undefined &&
        editData.instructions !== null &&
        editData.instructions.trim() !== "" &&
        editData.frequency !== undefined &&
        editData.frequency.trim() !== "";
    }

    // Validate days are selected when frequency is not daily
    const needsDays = editData.frequency !== "daily";
    let daysValid = true;

    if (needsDays) {
      const match = editData.frequency?.match(/^(\d+)x per week$/);
      if (match) {
        const requiredDays = parseInt(match[1], 10);
        daysValid =
          editData.days !== undefined && editData.days.length === requiredDays;
      } else if (editData.frequency === "specific_days") {
        daysValid = editData.days !== undefined && editData.days.length > 0;
      }
    }

    if (isValid && daysValid) {
      onEdit(product.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    // Determine the step title based on step type
    const stepTitle =
      product.stepType === "product"
        ? product.productName || "Product Step"
        : product.stepName || product.routineStep || "Non-Product Step";

    return (
      <ProductForm
        data={editData}
        onChange={setEditData}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel="Save"
        isEditMode={true}
        stepNumber={index + 1}
        stepTitle={stepTitle}
      />
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
        "flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-gray-300 cursor-pointer",
        isDragging && "opacity-50 cursor-grabbing",
      )}
    >
      {/* Drag Handle - Visual indicator */}
      <div className="text-gray-400">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Priority Badge - Hidden on mobile */}
      <div className="hidden md:flex w-7 h-7 rounded-full bg-primary items-center justify-center">
        <span className="text-sm font-semibold text-primary-foreground">
          {index + 1}
        </span>
      </div>

      {/* Product Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {product.stepType === "product" && product.routineStep && (
            <Badge variant="secondary" className="font-normal">
              {product.routineStep}
            </Badge>
          )}
          {product.stepType === "instruction_only" && (
            <Badge
              variant="secondary"
              className="font-normal bg-blue-100 text-blue-700 border-blue-200"
            >
              No Product
            </Badge>
          )}
          {product.frequency && (
            <Badge variant="outline" className="font-normal">
              {getFrequencyLabel(product.frequency)}
              {product.days && product.days.length > 0 && (
                <span className="ml-1">• {product.days.join(", ")}</span>
              )}
            </Badge>
          )}
        </div>
        {product.stepType === "product" && product.productName && (
          <h4 className="font-semibold text-gray-900 mb-1">
            {product.productName}
          </h4>
        )}
        {product.stepType === "instruction_only" &&
          (product.stepName || product.routineStep) && (
            <h4 className="font-semibold text-gray-900 mb-1">
              {product.stepName || product.routineStep}
            </h4>
          )}
        {product.instructions && (
          <p className="text-sm text-gray-600">{product.instructions}</p>
        )}
      </div>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(product.id);
        }}
        className="h-10 w-10 p-0"
        aria-label="Delete step"
      >
        <Trash2 className="w-6 h-6 text-gray-500 hover:text-red-600" />
      </Button>
    </div>
  );
}
