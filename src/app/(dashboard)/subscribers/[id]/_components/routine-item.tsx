"use client";

import { useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ProductForm,
  type ProductFormData,
} from "@/components/routine/product-form";
import type { RoutineProduct, RoutineProductFormData } from "../types";
import { getFrequencyLabel } from "@/lib/routine-constants";

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
  const [editData, setEditData] = useState<ProductFormData>({
    routineStep: product.routineStep,
    productName: product.productName,
    productUrl: product.productUrl || null,
    instructions: product.instructions,
    productPurchaseInstructions: product.productPurchaseInstructions || null,
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
      productUrl: product.productUrl || null,
      instructions: product.instructions,
      productPurchaseInstructions: product.productPurchaseInstructions || null,
      frequency: product.frequency,
      days: product.days ?? undefined,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validate all required fields (ProductForm handles validation)
    const isValid =
      editData.routineStep &&
      editData.routineStep.trim() &&
      editData.productName.trim() &&
      editData.frequency.trim();

    // Validate days are selected when frequency is not daily
    const needsDays = editData.frequency !== "daily";
    let daysValid = true;

    if (needsDays) {
      const match = editData.frequency.match(/^(\d+)x per week$/);
      if (match) {
        const requiredDays = parseInt(match[1], 10);
        daysValid =
          editData.days !== undefined && editData.days.length === requiredDays;
      } else if (editData.frequency === "specific_days") {
        daysValid = editData.days !== undefined && editData.days.length > 0;
      }
    }

    if (isValid && daysValid) {
      // Convert ProductFormData back to RoutineProductFormData for onEdit
      const routineProductData: RoutineProductFormData = {
        routineStep: editData.routineStep,
        productName: editData.productName,
        productUrl: editData.productUrl || "",
        instructions: editData.instructions,
        productPurchaseInstructions: editData.productPurchaseInstructions || "",
        frequency: editData.frequency,
        days: editData.days,
      };
      onEdit(product.id, routineProductData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ProductForm
        data={editData}
        onChange={setEditData}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel="Save"
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
