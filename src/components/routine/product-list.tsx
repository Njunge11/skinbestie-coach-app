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
import { Button } from "@/components/ui/button";
import { ProductItem, Product } from "./product-item";
import { ProductForm, ProductFormData } from "./product-form";

interface ProductListProps {
  products: Product[];
  timeOfDay: "morning" | "evening";
  onAdd: (data: ProductFormData) => Promise<void> | void;
  onUpdate: (id: string, data: ProductFormData) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onReorder: (reorderedProducts: Product[]) => Promise<void> | void;
}

export function ProductList({
  products,
  timeOfDay,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: ProductListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductFormData>({
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

  const handleAdd = () => {
    // Validate all required fields
    if (
      newProduct.routineStep &&
      newProduct.routineStep.trim() &&
      newProduct.productName.trim() &&
      newProduct.instructions.trim() &&
      newProduct.frequency.trim()
    ) {
      onAdd(newProduct);

      setNewProduct({
        routineStep: "",
        productName: "",
        productUrl: "",
        instructions: "",
        frequency: "Daily",
        days: undefined,
      });
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewProduct({
      routineStep: "",
      productName: "",
      productUrl: "",
      instructions: "",
      frequency: "Daily",
      days: undefined,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((item) => item.id === active.id);
      const newIndex = products.findIndex((item) => item.id === over.id);
      const reorderedProducts = arrayMove(products, oldIndex, newIndex);

      onReorder(reorderedProducts);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          timeOfDay === "morning" ? "bg-amber-100" : "bg-indigo-100"
        }`}>
          {timeOfDay === "morning" ? "☀️" : "🌙"}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {timeOfDay === "morning" ? "Morning" : "Evening"}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {products.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                index={index}
                onEdit={onUpdate}
                onDelete={onDelete}
              />
            ))}

            {products.length === 0 && !isAdding && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-gray-400">No routine set</p>
              </div>
            )}

            {isAdding ? (
              <ProductForm
                data={newProduct}
                onChange={setNewProduct}
                onSave={handleAdd}
                onCancel={handleCancel}
                saveLabel="Add"
              />
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {products.length === 0 ? "Add Step" : "Add Another Step"}
              </Button>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
