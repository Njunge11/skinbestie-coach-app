// Type definitions for testing
import type { SurveysService } from "../surveys.service";
import type { Mock } from "vitest";

// Mock service type with all methods properly typed
export type MockSurveysService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof SurveysService]: SurveysService[K] extends (...args: any[]) => any
    ? Mock
    : never;
};
