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
  name: string;
  description: string;
  timeframe: string;
  complete: boolean;
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
  productUrl?: string;
  instructions: string;
  frequency: string;
  days?: string[]; // For 2x or 3x per week
  timeOfDay: "morning" | "evening";
}

export interface RoutineProductFormData {
  routineStep: string;
  productName: string;
  productUrl?: string;
  instructions: string;
  frequency: string;
  days?: string[];
}

export interface CoachNote {
  id: string;
  userProfileId: string;
  adminId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
