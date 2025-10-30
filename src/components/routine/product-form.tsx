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
import type { Frequency } from "@/app/(dashboard)/subscribers/[id]/types";

export interface ProductFormData {
  routineStep: string;
  productName: string;
  productUrl: string | null;
  instructions: string;
  productPurchaseInstructions?: string | null;
  frequency: Frequency;
  days: string[] | undefined;
}

interface ProductFormProps {
  data: ProductFormData;
  onChange: (data: ProductFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}

export function ProductForm({
  data,
  onChange,
  onSave,
  onCancel,
  saveLabel = "Add",
}: ProductFormProps) {
  const [openRoutineStep, setOpenRoutineStep] = useState(false);

  return (
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
              {data.routineStep || "Select routine step..."}
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

      <div className="space-y-2">
        <label htmlFor="product-name" className="text-sm font-medium">
          Product Name
        </label>
        <Input
          id="product-name"
          placeholder="Product name"
          value={data.productName}
          onChange={(e) => onChange({ ...data, productName: e.target.value })}
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
          onChange={(e) => onChange({ ...data, productUrl: e.target.value })}
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
          value={data.instructions}
          onChange={(e) => onChange({ ...data, instructions: e.target.value })}
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
          value={data.productPurchaseInstructions || ""}
          onChange={(e) =>
            onChange({ ...data, productPurchaseInstructions: e.target.value })
          }
          rows={2}
          className="text-sm resize-none mt-2"
        />
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">Frequency</label>
        <Select
          value={data.frequency}
          onValueChange={(value) =>
            onChange({
              ...data,
              frequency: value as Frequency,
              days: value === "daily" ? undefined : data.days || [],
            })
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

      {data.frequency !== "daily" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = data.days?.includes(day.value);
              const maxDays = data.frequency === "2x per week" ? 2 : 3;
              const canSelect =
                isSelected || (data.days?.length || 0) < maxDays;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
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
            Select {data.frequency === "2x per week" ? "2" : "3"} days
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={onSave}>
          {saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
