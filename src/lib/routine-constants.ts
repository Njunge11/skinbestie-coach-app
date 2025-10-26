export const ROUTINE_STEPS = [
  "Cleanser",
  "Makeup Remover / Micellar Water",
  "Toner / Essence",
  "Serum / Treatment",
  "Eye Cream",
  "Moisturizer / Cream",
  "Sunscreen (SPF)",
  "Exfoliant / Peel",
  "Mask",
  "Spot Treatment",
  "Facial Oil",
  "Overnight Mask / Sleeping Pack",
  "Lip Care",
  "Neck / Décolletage Care",
];

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "2x per week", label: "2x per week" },
  { value: "3x per week", label: "3x per week" },
] as const;

export const DAYS_OF_WEEK = [
  { value: "Monday", label: "Mon" },
  { value: "Tuesday", label: "Tue" },
  { value: "Wednesday", label: "Wed" },
  { value: "Thursday", label: "Thu" },
  { value: "Friday", label: "Fri" },
  { value: "Saturday", label: "Sat" },
  { value: "Sunday", label: "Sun" },
];

// Helper function to get display label for a frequency value
export function getFrequencyLabel(value: string): string {
  const frequency = FREQUENCIES.find(f => f.value === value);
  return frequency?.label || value;
}
