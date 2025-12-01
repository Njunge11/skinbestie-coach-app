"use client";

import { useState } from "react";
import { X, Package, Hand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProductForm,
  type ProductFormData,
} from "@/components/routine/product-form";
import { Button } from "@/components/ui/button";

interface AddStepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOfDay: "morning" | "evening";
  onAdd: (data: ProductFormData) => void;
}

type Step = "select-type" | "fill-form";
type StepType = "product" | "instruction_only";

export function AddStepModal({
  open,
  onOpenChange,
  timeOfDay,
  onAdd,
}: AddStepModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select-type");
  const [stepType, setStepType] = useState<StepType | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    stepType: "product",
    stepName: undefined,
    routineStep: "",
    productName: "",
    productUrl: null,
    instructions: null,
    productPurchaseInstructions: null,
    frequency: "daily",
    days: undefined,
  });

  // Reset state when modal opens or closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Modal is closing - reset to initial state
      setCurrentStep("select-type");
      setStepType(null);
      setFormData({
        stepType: "product",
        stepName: undefined,
        routineStep: "",
        productName: "",
        productUrl: null,
        instructions: null,
        productPurchaseInstructions: null,
        frequency: "daily",
        days: undefined,
      });
    }
    onOpenChange(open);
  };

  const handleStepTypeSelect = (type: StepType) => {
    setStepType(type);
    setFormData({
      ...formData,
      stepType: type,
    });
    setCurrentStep("fill-form");
  };

  const handleSave = () => {
    const stepType = formData.stepType || "product";

    // Validate based on step type (same logic as ProductItem)
    let isValid = false;

    if (stepType === "product") {
      // Product type: routineStep, productName, and frequency are required
      isValid =
        formData.routineStep !== undefined &&
        formData.routineStep.trim() !== "" &&
        formData.productName !== undefined &&
        formData.productName.trim() !== "" &&
        formData.frequency !== undefined &&
        formData.frequency.trim() !== "";
    } else {
      // Instruction-only type: only frequency is required
      isValid =
        formData.frequency !== undefined && formData.frequency.trim() !== "";
    }

    // Validate days are selected when frequency is not daily
    const needsDays = formData.frequency !== "daily";
    let daysValid = true;

    if (needsDays) {
      const match = formData.frequency?.match(/^(\d+)x per week$/);
      if (match) {
        const requiredDays = parseInt(match[1], 10);
        daysValid =
          formData.days !== undefined && formData.days.length === requiredDays;
      } else if (formData.frequency === "specific_days") {
        daysValid = formData.days !== undefined && formData.days.length > 0;
      }
    }

    // Only submit if validation passes
    if (isValid && daysValid) {
      onAdd(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep("select-type");
    setStepType(null);
    setFormData({
      stepType: "product",
      stepName: undefined,
      routineStep: "",
      productName: "",
      productUrl: null,
      instructions: null,
      productPurchaseInstructions: null,
      frequency: "daily",
      days: undefined,
    });
    onOpenChange(false);
  };

  const handleBack = () => {
    setCurrentStep("select-type");
    setStepType(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === "select-type"
              ? "Add a New Step"
              : `Add ${stepType === "product" ? "Product" : "Non-Product"} Step`}
          </DialogTitle>
        </DialogHeader>

        {currentStep === "select-type" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the type of step you want to add
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Product Step Card */}
              <button
                onClick={() => handleStepTypeSelect("product")}
                className="flex flex-col items-start p-6 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-accent transition-all text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">Product Step</h3>
                <p className="text-sm text-muted-foreground">
                  Add a step that uses a skincare product like cleanser, serum,
                  moisturise, or sunscreen.
                </p>
              </button>

              {/* Non-Product Step Card */}
              <button
                onClick={() => handleStepTypeSelect("instruction_only")}
                className="flex flex-col items-start p-6 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-accent transition-all text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Hand className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-base mb-2">
                  Non-Product Step
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add an action or instruction like washing face, patting dry,
                  waiting, or steaming.
                </p>
              </button>
            </div>
          </div>
        )}

        {currentStep === "fill-form" && (
          <div className="space-y-4">
            <ProductForm
              data={formData}
              onChange={setFormData}
              onSave={handleSave}
              onCancel={handleBack}
              saveLabel="Add"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
