"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "text" | "select";
  placeholder?: string;
  options?: FilterOption[];
  columnSpan?: number; // For grid layout control
}

interface TableFiltersProps<TFilters> {
  filters: FilterConfig[];
  values: TFilters;
  onChange: (id: string, value: string) => void;
}

export function TableFilters<TFilters extends Record<string, string>>({
  filters,
  values,
  onChange,
}: TableFiltersProps<TFilters>) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {filters.map((filter) => {
          if (filter.type === "text") {
            return (
              <div key={filter.id}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {filter.label}
                </label>
                <Input
                  placeholder={filter.placeholder}
                  value={values[filter.id as keyof TFilters] as string}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  className="w-full"
                />
              </div>
            );
          }

          if (filter.type === "select") {
            return (
              <div key={filter.id}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {filter.label}
                </label>
                <Select
                  value={values[filter.id as keyof TFilters] as string}
                  onValueChange={(value) => onChange(filter.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
