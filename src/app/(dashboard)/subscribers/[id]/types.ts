// Import types from repositories (single source of truth)
import type { Goal as GoalRepo } from "./goal-actions/goals.repo";
import type { GoalsTemplate as GoalsTemplateRepo } from "./goal-actions/goals-template.repo";
import type { Routine as RoutineRepo } from "./routine-info-actions/routine.repo";
import type { RoutineProduct as RoutineProductRepo } from "./routine-actions/routine.repo";
import type {
  ProgressPhoto,
  CoachNote as CoachNoteBase,
} from "@/lib/db/schema";

// Re-export repository types for component use
export type Goal = GoalRepo;
export type GoalsTemplate = GoalsTemplateRepo;
export type Routine = RoutineRepo;
export type RoutineProduct = RoutineProductRepo;

// Photo DTO derived from schema
export type Photo = Pick<
  ProgressPhoto,
  "id" | "weekNumber" | "uploadedAt" | "feedback" | "imageUrl"
>;

// Type aliases matching database enums for type safety
export type Frequency =
  | "daily"
  | "2x per week"
  | "3x per week"
  | "4x per week"
  | "5x per week"
  | "6x per week"
  | "specific_days";
export type TimeOfDay = "morning" | "evening";

// Profile Tag DTO
export interface ProfileTag {
  id: string;
  userProfileId: string;
  tag: string;
  createdAt: Date;
}

// Client DTO - view model for component display
// NOTE: This is a computed view model, not directly from schema
export interface Client {
  id: string;
  name: string;
  nickname: string | null;
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
  tags: ProfileTag[];
  createdAt: Date;
}

// Form data types (user input, not stored directly)
export interface EditableClientData {
  occupation: string;
  bio: string;
}

export interface GoalFormData {
  description: string;
  isPrimaryGoal?: boolean;
}

export interface RoutineFormData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
}

export interface RoutineProductFormData {
  routineStep: string;
  productName: string;
  productUrl: string;
  instructions: string;
  productPurchaseInstructions?: string | null;
  frequency: Frequency;
  days?: string[];
}

// CoachNote DTO derived from schema
export type CoachNote = Pick<
  CoachNoteBase,
  "id" | "userProfileId" | "adminId" | "content" | "createdAt" | "updatedAt"
>;

export type RoutineStatus = "not_started" | "ongoing" | "complete";
