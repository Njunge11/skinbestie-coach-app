export const ROUTINE_STEPS = [
  "Cleanse",
  "Treat",
  "Protect",
  "Moisturise",
  "Eye cream",
  "Toner",
  "Essence",
  "Pimple patch",
  "Lip care",
] as const;

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "1x per week", label: "1x per week" },
  { value: "2x per week", label: "2x per week" },
  { value: "3x per week", label: "3x per week" },
  { value: "4x per week", label: "4x per week" },
  { value: "5x per week", label: "5x per week" },
  { value: "6x per week", label: "6x per week" },
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
  const frequency = FREQUENCIES.find((f) => f.value === value);
  return frequency?.label || value;
}
