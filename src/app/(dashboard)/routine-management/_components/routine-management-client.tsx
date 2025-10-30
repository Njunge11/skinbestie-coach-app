"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TemplateList } from "./template-list";
import { CreateTemplateDialog } from "./create-template-dialog";
import { createTemplate } from "../template-actions/actions";
import type { Product } from "@/components/routine/product-item";

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

interface RoutineManagementClientProps {
  templates: Template[];
  templateDetails: Record<string, TemplateDetails>;
  adminId: string;
}

export function RoutineManagementClient({
  templates,
  templateDetails,
  adminId,
}: RoutineManagementClientProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();

  const totalProducts = templates.reduce(
    (sum, t) => sum + t.morningProducts + t.eveningProducts,
    0,
  );

  const handleCreateTemplate = async (data: {
    name: string;
    description: string | null;
  }) => {
    const result = await createTemplate(adminId, data);

    if (result.success) {
      setShowCreateDialog(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Routine Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage reusable routine templates
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          + Create Template
        </button>
      </div>

      {templates.length > 0 && (
        <p className="text-sm font-bold text-gray-600">
          {templates.length} Templates · {totalProducts} Total Products
        </p>
      )}

      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateTemplate}
      />
    </div>
  );
}
