// Type aliases matching database enums for type safety
export type Frequency = "daily" | "2x per week" | "3x per week" | "specific_days";
export type TimeOfDay = "morning" | "evening";

export interface Client {
  id: string;
  name: string;
  age: number;
  email: string;
  mobile: string;
  occupation: string;
  bio: string;
  skinType: string;
  concerns: string[];
  planWeeks: number;
  currentWeek: number;
  startDate: string;
  hasRoutine: boolean;
}

export interface Goal {
  id: string;
  userProfileId: string;
  name: string;
  description: string;
  timeframe: string;
  complete: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  weekNumber: number;
  uploadedAt: Date;
  feedback: string | null;
  imageUrl: string;
}

export interface EditableClientData {
  occupation: string;
  bio: string;
}

export interface GoalFormData {
  name: string;
  description: string;
  timeframe: string;
}

export interface Routine {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: "draft" | "published";
}

export interface RoutineFormData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
}

export type RoutineStatus = "not_started" | "ongoing" | "complete";

export interface RoutineProduct {
  id: string;
  routineId: string;
  routineStep: string;
  productName: string;
  productUrl: string | null;
  instructions: string;
  frequency: Frequency;
  days: string[] | null; // For 2x or 3x per week
  timeOfDay: TimeOfDay;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutineProductFormData {
  routineStep: string;
  productName: string;
  productUrl: string | null;
  instructions: string;
  frequency: Frequency;
  days: string[] | null;
}

export interface CoachNote {
  id: string;
  userProfileId: string;
  adminId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
