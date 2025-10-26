"use client";

import * as React from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { RoutineProduct, RoutineProductFormData } from "../types";
import { Button } from "@/components/ui/button";

export function SortableRoutineItem({
  product,
  onEdit,
  onDelete,
  children,
}: {
  product: RoutineProduct;
  onEdit: (id: string, data: RoutineProductFormData) => void;
  onDelete: (id: string) => void;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children ?? (
        <div className="flex items-center gap-3 p-3 rounded-md border bg-white">
          <span className="cursor-grab select-none">⋮⋮</span>
          <div className="flex-1">
            <div className="text-sm font-medium">{product.routineStep}</div>
            <div className="text-xs text-muted-foreground">
              {product.productName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onEdit(product.id, {
                  routineStep: product.routineStep,
                  productName: product.productName,
                  productUrl: product.productUrl,
                  instructions: product.instructions,
                  frequency: product.frequency,
                  days: product.days,
                })
              }
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => onDelete(product.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
