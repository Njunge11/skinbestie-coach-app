"use client";

import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
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
import {
  ROUTINE_STEPS,
  FREQUENCIES,
  DAYS_OF_WEEK,
} from "@/lib/routine-constants";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Frequency } from "@/app/(dashboard)/subscribers/[id]/types";

export type StepType = "instruction_only" | "product";

export interface ProductFormData {
  stepType?: StepType;
  stepName?: string;
  routineStep?: string;
  productName?: string;
  productUrl?: string | null;
  instructions?: string | null;
  productPurchaseInstructions?: string | null;
  frequency?: Frequency;
  days?: string[] | undefined;
}

interface ProductFormProps {
  data: ProductFormData;
  onChange: (data: ProductFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  isEditMode?: boolean;
  stepNumber?: number;
  stepTitle?: string;
}

export function ProductForm({
  data,
  onChange,
  onSave,
  onCancel,
  saveLabel = "Add",
  isEditMode = false,
  stepNumber,
  stepTitle,
}: ProductFormProps) {
  const [openRoutineStep, setOpenRoutineStep] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Default to "product" step type if not set
  const stepType = data.stepType || "product";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isEditMode ? "border-gray-300 bg-gray-50 shadow-sm" : "border-gray-200",
      )}
    >
      {/* Edit mode header with step number and title */}
      {isEditMode && stepNumber !== undefined && stepTitle && (
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 mb-1">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary-foreground">
              {stepNumber}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900">{stepTitle}</h4>
        </div>
      )}

      {/* Routine Step - always visible */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Routine Step
          {stepType === "product" && <span className="text-red-500"> *</span>}
          {stepType === "instruction_only" && (
            <span className="text-gray-500 text-xs"> (optional)</span>
          )}
        </label>
        <Popover open={openRoutineStep} onOpenChange={setOpenRoutineStep}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openRoutineStep}
              className="w-full justify-between font-normal mt-2"
            >
              {data.routineStep ||
                (stepType === "product"
                  ? "Select routine step"
                  : "Select routine step (optional)")}
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
                        onChange({ ...data, routineStep: step });
                        setOpenRoutineStep(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          data.routineStep === step
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

      {/* Product-specific fields */}
      {stepType === "product" && (
        <>
          <div className="space-y-2">
            <label htmlFor="product-name" className="text-sm font-medium">
              Product Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="product-name"
              placeholder="Product name"
              value={data.productName || ""}
              onChange={(e) =>
                onChange({ ...data, productName: e.target.value })
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
              value={data.productUrl || ""}
              onChange={(e) =>
                onChange({ ...data, productUrl: e.target.value })
              }
              type="url"
              className="text-sm mt-2"
            />
          </div>
        </>
      )}

      {/* Step Name field - only for instruction-only type */}
      {stepType === "instruction_only" && (
        <div className="space-y-2">
          <label htmlFor="step-name" className="text-sm font-medium">
            Step Name <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <Input
            id="step-name"
            placeholder="e.g., Apply toner"
            value={data.stepName || ""}
            onChange={(e) => onChange({ ...data, stepName: e.target.value })}
            className="font-medium mt-2"
          />
        </div>
      )}

      {/* Instructions field - always visible */}
      <div className="space-y-2">
        <label htmlFor="instructions" className="text-sm font-medium">
          Instructions
          {stepType === "instruction_only" && (
            <span className="text-red-500"> *</span>
          )}
          {stepType === "product" && (
            <span className="text-gray-500 text-xs"> (optional)</span>
          )}
        </label>
        <Textarea
          id="instructions"
          placeholder={
            stepType === "instruction_only"
              ? "e.g., Apply toner to clean skin"
              : "e.g., Apply to damp skin, massage gently"
          }
          value={data.instructions || ""}
          onChange={(e) =>
            onChange({ ...data, instructions: e.target.value || null })
          }
          rows={2}
          className="text-sm resize-none mt-2"
        />
      </div>

      {/* Product-specific: Purchase Instructions */}
      {stepType === "product" && (
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
            value={data.productPurchaseInstructions || ""}
            onChange={(e) =>
              onChange({ ...data, productPurchaseInstructions: e.target.value })
            }
            rows={2}
            className="text-sm resize-none mt-2"
          />
        </div>
      )}

      {/* Frequency - always visible */}
      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Frequency <span className="text-red-500">*</span>
        </label>
        <Select
          value={data.frequency}
          onValueChange={(value) => {
            const newFrequency = value as Frequency;
            let newDays: string[] | undefined = data.days || [];

            // Clear days if switching to daily
            if (newFrequency === "daily") {
              newDays = undefined;
            }
            // If switching to an "Nx per week" frequency, trim days if we have too many
            else {
              const match = newFrequency.match(/^(\d+)x per week$/);
              if (match) {
                const maxDays = parseInt(match[1], 10);
                // If currently selected days exceed new max, keep only first N days
                if (newDays && newDays.length > maxDays) {
                  newDays = newDays.slice(0, maxDays);
                }
              }
            }

            onChange({
              ...data,
              frequency: newFrequency,
              days: newDays,
            });
          }}
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

      {/* Days selector - visible when frequency is not daily */}
      {data.frequency !== "daily" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Days
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {(() => {
              // Extract max days dynamically from frequency string
              const getMaxDays = (frequency: string | undefined): number => {
                if (!frequency) return 7;
                if (frequency === "daily") return 7;
                if (frequency === "specific_days") return 7;
                // Match "2x per week" → 2, "3x per week" → 3, etc.
                const match = frequency.match(/^(\d+)x per week$/);
                return match ? parseInt(match[1], 10) : 7;
              };
              const maxDays = getMaxDays(data.frequency);

              return DAYS_OF_WEEK.map((day) => {
                const isSelected = data.days?.includes(day.value);
                const canSelect =
                  isSelected || (data.days?.length || 0) < maxDays;

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      setHasInteracted(true);
                      const currentDays = data.days || [];
                      if (isSelected) {
                        onChange({
                          ...data,
                          days: currentDays.filter((d) => d !== day.value),
                        });
                      } else if (canSelect) {
                        onChange({
                          ...data,
                          days: [...currentDays, day.value],
                        });
                      }
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                      !canSelect &&
                        !isSelected &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    disabled={!canSelect && !isSelected}
                  >
                    {day.label}
                  </button>
                );
              });
            })()}
          </div>
          {hasInteracted &&
            (() => {
              if (!data.frequency) return null;
              const match = data.frequency.match(/^(\d+)x per week$/);
              if (match) {
                const requiredDays = parseInt(match[1], 10);
                const selectedDays = data.days?.length || 0;
                if (selectedDays !== requiredDays) {
                  return (
                    <p className="text-xs text-red-500">
                      Please select exactly {requiredDays}{" "}
                      {requiredDays === 1 ? "day" : "days"}
                    </p>
                  );
                }
              } else if (data.frequency === "specific_days") {
                const selectedDays = data.days?.length || 0;
                if (selectedDays === 0) {
                  return (
                    <p className="text-xs text-red-500">
                      Please select at least 1 day
                    </p>
                  );
                }
              }
              return null;
            })()}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          size="sm"
          onClick={() => {
            setHasInteracted(true);
            onSave();
          }}
        >
          {saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
