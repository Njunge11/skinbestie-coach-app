"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductList } from "@/components/routine/product-list";
import type { Product } from "@/components/routine/product-item";
import type { ProductFormData } from "@/components/routine/product-form";
import { EditTemplateDialog } from "./edit-template-dialog";
import {
  updateTemplate,
  deleteTemplate,
  createTemplateProduct,
  updateTemplateProduct,
  deleteTemplateProduct,
  reorderTemplateProducts,
} from "../template-actions/actions";

interface Template {
  id: string;
  name: string;
  description: string | null;
  morningProducts: number;
  eveningProducts: number;
  updatedAt: Date;
  createdAt: Date;
}

interface TemplateDetails {
  morning: Product[];
  evening: Product[];
}

interface TemplateListProps {
  templates: Template[];
  templateDetails: Record<string, TemplateDetails>;
  onCreateClick: () => void;
}

export function TemplateList({ templates, templateDetails, onCreateClick }: TemplateListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const router = useRouter();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleUpdateTemplate = async (data: { name: string; description: string | null }) => {
    if (!editingTemplate) return;

    const result = await updateTemplate(editingTemplate.id, data);

    if (result.success) {
      setEditingTemplate(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplateId) return;

    const result = await deleteTemplate(deletingTemplateId);

    if (result.success) {
      setDeletingTemplateId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 mb-1">No templates yet</p>
          <p className="text-xs text-gray-400 mb-6">
            Create your first routine template to get started
          </p>
          <Button variant="outline" onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => {
        const isExpanded = expandedId === template.id;
        const details = templateDetails[template.id];
        const totalProducts = template.morningProducts + template.eveningProducts;

        return (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
              onClick={() => toggleExpand(template.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>
                      {template.morningProducts} morning · {template.eveningProducts} evening
                      {totalProducts === 1 ? " product" : " products"}
                    </span>
                    <span>·</span>
                    <span>Updated {formatDate(template.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingTemplateId(template.id);
                    }}
                    className="px-2 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && details && (
              <CardContent className="border-t pt-6">
                <div className="space-y-6">
                  {/* Morning Routine */}
                  <ProductList
                    products={details.morning}
                    timeOfDay="morning"
                    onAdd={async (data: ProductFormData) => {
                      const result = await createTemplateProduct(template.id, {
                        ...data,
                        timeOfDay: "morning",
                      });
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onUpdate={async (id: string, data: ProductFormData) => {
                      const result = await updateTemplateProduct(id, data);
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onDelete={async (id: string) => {
                      const result = await deleteTemplateProduct(id);
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onReorder={async (reorderedProducts: Product[]) => {
                      const productIds = reorderedProducts.map((p) => p.id);
                      const result = await reorderTemplateProducts(
                        template.id,
                        "morning",
                        productIds
                      );
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                  />

                  {/* Evening Routine */}
                  <ProductList
                    products={details.evening}
                    timeOfDay="evening"
                    onAdd={async (data: ProductFormData) => {
                      const result = await createTemplateProduct(template.id, {
                        ...data,
                        timeOfDay: "evening",
                      });
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onUpdate={async (id: string, data: ProductFormData) => {
                      const result = await updateTemplateProduct(id, data);
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onDelete={async (id: string) => {
                      const result = await deleteTemplateProduct(id);
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    onReorder={async (reorderedProducts: Product[]) => {
                      const productIds = reorderedProducts.map((p) => p.id);
                      const result = await reorderTemplateProducts(
                        template.id,
                        "evening",
                        productIds
                      );
                      if (result.success) {
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Edit Template Dialog */}
      <EditTemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
        onUpdate={handleUpdateTemplate}
      />

      {/* Delete Template Confirmation Dialog */}
      <Dialog open={!!deletingTemplateId} onOpenChange={(open) => !open && setDeletingTemplateId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              This will permanently delete the template and all associated products.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplateId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteTemplate}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
