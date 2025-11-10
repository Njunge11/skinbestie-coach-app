import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { journals } from "@/lib/db/schema";

// Type for Lexical JSON content structure
type LexicalContent = {
  root?: {
    children?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

// Drizzle-zod generated schemas
export const insertJournalSchema = createInsertSchema(journals);
export const selectJournalSchema = createSelectSchema(journals);

// Request schema for creating a journal (omit auto-generated fields)
// Frontend sends userId (auth user id), we'll look up userProfileId internally
// Make fields with defaults optional, but add validation rules
export const createJournalRequestSchema = insertJournalSchema
  .omit({
    id: true,
    userProfileId: true, // We'll look this up from userId
    createdAt: true,
    lastModified: true,
  })
  .extend({
    userId: z.string().uuid(), // Frontend sends userId instead
  })
  .partial({
    title: true,
    content: true,
    public: true,
  })
  .refine(
    (data) => {
      // If title is provided, it must not be an empty string
      if (data.title !== undefined && data.title.trim() === "") {
        return false;
      }
      return true;
    },
    { message: "Title cannot be an empty string", path: ["title"] },
  )
  .refine(
    (data) => {
      // If content is provided, it must have a valid Lexical structure
      if (data.content !== undefined && typeof data.content === "object") {
        const content = data.content as LexicalContent;
        // Basic Lexical validation: must have a root object
        if (!content.root || typeof content.root !== "object") {
          return false;
        }
      }
      return true;
    },
    {
      message: "Content must be a valid Lexical JSON structure",
      path: ["content"],
    },
  );

// Request schema for updating a journal (all fields optional except userId)
export const updateJournalRequestSchema = insertJournalSchema
  .omit({
    id: true,
    userProfileId: true, // We'll look this up from userId
    createdAt: true,
    lastModified: true,
  })
  .extend({
    userId: z.string().uuid(), // Frontend sends userId for authorization
  })
  .partial({
    title: true,
    content: true,
    public: true,
  })
  .refine(
    (data) => {
      // If title is provided, it must not be an empty string
      if (data.title !== undefined && data.title.trim() === "") {
        return false;
      }
      return true;
    },
    { message: "Title cannot be an empty string", path: ["title"] },
  )
  .refine(
    (data) => {
      // If content is provided, it must have a valid Lexical structure
      if (data.content !== undefined && typeof data.content === "object") {
        const content = data.content as LexicalContent;
        // Basic Lexical validation: must have a root object
        if (!content.root || typeof content.root !== "object") {
          return false;
        }
      }
      return true;
    },
    {
      message: "Content must be a valid Lexical JSON structure",
      path: ["content"],
    },
  );

// TypeScript types
export type CreateJournalRequest = z.infer<typeof createJournalRequestSchema>;
export type UpdateJournalRequest = z.infer<typeof updateJournalRequestSchema>;
export type JournalResponse = z.infer<typeof selectJournalSchema>;
