import type { IJournalsRepository } from "./journals.repo";
import { createJournalsRepository } from "./journals.repo";
import type {
  CreateJournalRequest,
  UpdateJournalRequest,
  JournalResponse,
} from "./journals.types";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Types for Lexical JSON structure
type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
  [key: string]: unknown;
};

type LexicalContent = {
  root?: LexicalNode;
  [key: string]: unknown;
};

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const DEFAULT_LEXICAL_CONTENT = {
  root: {
    children: [],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
};

export type ListJournalsResponse = {
  journals: Array<
    JournalResponse & {
      preview: string;
      content: object | null;
    }
  >;
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
};

/**
 * Helper function to look up userProfileId from userId
 */
async function getUserProfileId(userId: string): Promise<string | null> {
  const [userProfile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return userProfile?.id || null;
}

export interface IJournalsService {
  createJournal(
    userId: string,
    data: CreateJournalRequest,
  ): Promise<ServiceResult<JournalResponse>>;
  updateJournal(
    id: string,
    userId: string,
    data: UpdateJournalRequest,
  ): Promise<ServiceResult<JournalResponse>>;
  deleteJournal(id: string, userId: string): Promise<ServiceResult<void>>;
  getJournal(
    id: string,
    userId?: string,
  ): Promise<ServiceResult<JournalResponse>>;
  listJournals(params: {
    userProfileId: string;
    cursor?: string;
    limit: number;
  }): Promise<ServiceResult<ListJournalsResponse>>;
}

export function createJournalsService(
  repository: IJournalsRepository = createJournalsRepository(),
): IJournalsService {
  return {
    async createJournal(
      userId: string,
      data: CreateJournalRequest,
    ): Promise<ServiceResult<JournalResponse>> {
      try {
        console.error(
          "[createJournal] Starting - userId:",
          userId,
          "data:",
          JSON.stringify(data),
        );

        // Look up userProfileId from userId
        const userProfileId = await getUserProfileId(userId);
        console.error(
          "[createJournal] Looked up userProfileId:",
          userProfileId,
        );

        if (!userProfileId) {
          console.error(
            "[createJournal] User profile not found for userId:",
            userId,
          );
          return {
            success: false,
            error: "User profile not found",
          };
        }

        // Apply default content if not provided
        const content =
          data.content && Object.keys(data.content).length > 0
            ? data.content
            : DEFAULT_LEXICAL_CONTENT;
        console.error(
          "[createJournal] Content prepared, using default:",
          !data.content || Object.keys(data.content).length === 0,
        );

        const journalData = {
          userProfileId,
          title: data.title ?? "Untitled Journal Entry",
          content,
          public: data.public ?? false,
        };
        console.error(
          "[createJournal] Calling repository.createJournal with:",
          JSON.stringify({
            userProfileId: journalData.userProfileId,
            title: journalData.title,
            public: journalData.public,
            contentKeys: Object.keys(journalData.content),
          }),
        );

        const journal = await repository.createJournal(journalData);
        console.error(
          "[createJournal] Successfully created journal:",
          journal.id,
        );

        return { success: true, data: journal };
      } catch (error) {
        console.error("[createJournal] Error creating journal:", error);
        console.error(
          "[createJournal] Error stack:",
          error instanceof Error ? error.stack : "No stack trace",
        );
        console.error("[createJournal] Error details:", {
          name: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          success: false,
          error: "Failed to create journal entry",
        };
      }
    },

    async updateJournal(
      id: string,
      userId: string,
      data: UpdateJournalRequest,
    ): Promise<ServiceResult<JournalResponse>> {
      try {
        // Look up userProfileId from userId
        const userProfileId = await getUserProfileId(userId);

        if (!userProfileId) {
          return {
            success: false,
            error: "User profile not found",
          };
        }

        // First, check if journal exists
        const existingJournal = await repository.findJournalById(id);

        if (!existingJournal) {
          return {
            success: false,
            error: "Journal not found",
          };
        }

        // Check if user owns the journal
        if (existingJournal.userProfileId !== userProfileId) {
          return {
            success: false,
            error: "Unauthorized to update journal",
          };
        }

        // Update the journal
        const updatedJournal = await repository.updateJournal(id, data);

        if (!updatedJournal) {
          return {
            success: false,
            error: "Failed to update journal entry",
          };
        }

        return { success: true, data: updatedJournal };
      } catch (error) {
        console.error("Error updating journal:", error);
        return {
          success: false,
          error: "Failed to update journal entry",
        };
      }
    },

    async deleteJournal(
      id: string,
      userId: string,
    ): Promise<ServiceResult<void>> {
      try {
        // Look up userProfileId from userId
        const userProfileId = await getUserProfileId(userId);

        if (!userProfileId) {
          return {
            success: false,
            error: "User profile not found",
          };
        }

        // First, check if journal exists
        const existingJournal = await repository.findJournalById(id);

        if (!existingJournal) {
          return {
            success: false,
            error: "Journal not found",
          };
        }

        // Check if user owns the journal
        if (existingJournal.userProfileId !== userProfileId) {
          return {
            success: false,
            error: "Unauthorized to delete journal",
          };
        }

        // Delete the journal
        const deleted = await repository.deleteJournal(id);

        if (!deleted) {
          return {
            success: false,
            error: "Failed to delete journal entry",
          };
        }

        return { success: true, data: undefined };
      } catch (error) {
        console.error("Error deleting journal:", error);
        return {
          success: false,
          error: "Failed to delete journal entry",
        };
      }
    },

    async getJournal(
      id: string,
      userId?: string,
    ): Promise<ServiceResult<JournalResponse>> {
      try {
        // Look up userProfileId from userId if provided
        let userProfileId: string | undefined = undefined;
        if (userId) {
          const profileId = await getUserProfileId(userId);
          if (!profileId) {
            return {
              success: false,
              error: "User profile not found",
            };
          }
          userProfileId = profileId;
        }

        // First, check if journal exists
        const journal = await repository.findJournalById(id);

        if (!journal) {
          return {
            success: false,
            error: "Journal not found",
          };
        }

        // Check privacy: public journals can be viewed by anyone,
        // private journals only by the owner
        if (!journal.public) {
          if (!userProfileId || journal.userProfileId !== userProfileId) {
            return {
              success: false,
              error: "Unauthorized to view this journal",
            };
          }
        }

        return { success: true, data: journal };
      } catch (error) {
        console.error("Error retrieving journal:", error);
        return {
          success: false,
          error: "Failed to retrieve journal entry",
        };
      }
    },

    async listJournals(params: {
      userProfileId: string;
      cursor?: string;
      limit: number;
    }): Promise<ServiceResult<ListJournalsResponse>> {
      try {
        const { userProfileId, cursor, limit } = params;

        // Decode cursor if provided
        let decodedCursor: { lastModified: Date; id: string } | undefined =
          undefined;

        if (cursor) {
          try {
            const decoded = JSON.parse(
              Buffer.from(cursor, "base64").toString(),
            );
            decodedCursor = {
              lastModified: new Date(decoded.lastModified),
              id: decoded.id,
            };
          } catch {
            return {
              success: false,
              error: "Invalid cursor format",
            };
          }
        }

        // Fetch journals from repository
        const journals = await repository.findJournalsByUserProfileId({
          userProfileId,
          cursor: decodedCursor,
          limit,
        });

        // Generate previews and set content
        const journalsWithPreview = journals.map((journal, index) => {
          const preview = extractPreviewFromLexical(journal.content);

          return {
            ...journal,
            content: (index === 0 ? journal.content : null) as object | null, // Only first has content
            preview,
          };
        }) as Array<
          JournalResponse & {
            preview: string;
            content: object | null;
          }
        >;

        // Calculate pagination
        const hasMore = journals.length === limit;
        const nextCursor =
          hasMore && journals.length > 0
            ? Buffer.from(
                JSON.stringify({
                  lastModified: journals[journals.length - 1].lastModified,
                  id: journals[journals.length - 1].id,
                }),
              ).toString("base64")
            : null;

        return {
          success: true,
          data: {
            journals: journalsWithPreview,
            pagination: {
              nextCursor,
              hasMore,
              limit,
            },
          },
        };
      } catch (error) {
        console.error("Error listing journals:", error);
        return {
          success: false,
          error: "Failed to retrieve journals",
        };
      }
    },
  };
}

/**
 * Extract plain text from Lexical JSON and truncate to 100 characters
 */
function extractPreviewFromLexical(content: object): string {
  try {
    const lexical = content as LexicalContent;
    const texts: string[] = [];

    // Recursively extract text nodes
    function extractText(node: LexicalNode) {
      if (!node) return;

      if (node.type === "text" && node.text) {
        texts.push(node.text);
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(extractText);
      }
    }

    if (lexical.root) {
      extractText(lexical.root);
    }

    const fullText = texts.join(" ");

    // Truncate to 100 characters
    if (fullText.length > 100) {
      return fullText.substring(0, 97) + "...";
    }

    return fullText;
  } catch {
    return "";
  }
}

// Alias for backwards compatibility with tests
export const makeJournalsService = createJournalsService;
