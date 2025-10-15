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
  id: number;
  name: string;
  description: string;
  timeframe: string;
  complete: boolean;
}

export interface Photo {
  id: number;
  date: string;
  month: string;
  feedback: string;
  image: string;
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

export interface RoutineProduct {
  id: number;
  routineStep: string;
  productName: string;
  instructions: string;
  frequency: string;
  days?: string[]; // For 2x or 3x per week
  timeOfDay: "morning" | "evening";
}

export interface RoutineProductFormData {
  routineStep: string;
  productName: string;
  instructions: string;
  frequency: string;
  days?: string[];
}
