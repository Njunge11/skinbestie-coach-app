import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeSurveysRepo } from "../surveys.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";

describe("Surveys Repository - Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeSurveysRepo>;

  // Test UUIDs
  const adminId = "450e8400-e29b-41d4-a716-446655440000";
  const survey1Id = "850e8400-e29b-41d4-a716-446655440001";
  const question1Id = "950e8400-e29b-41d4-a716-446655440001";
  const question2Id = "950e8400-e29b-41d4-a716-446655440002";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const submission1Id = "a50e8400-e29b-41d4-a716-446655440001";

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    repo = makeSurveysRepo({ db });

    // Seed admin user
    await db.insert(schema.admins).values({
      id: adminId,
      email: "admin@example.com",
      passwordSet: true,
      role: "admin",
    });

    // Seed user profile
    await db.insert(schema.userProfiles).values({
      id: user1Id,
      firstName: "Test",
      lastName: "User",
      email: "user@example.com",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("createSurvey", () => {
    it("creates survey with all required fields", async () => {
      const survey = await repo.createSurvey({
        title: "Week 4 Check-in",
        description: "How is your routine going?",
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
      });

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe("Week 4 Check-in");
      expect(survey.description).toBe("How is your routine going?");
      expect(survey.status).toBe("draft");
      expect(survey.createdBy).toBe(adminId);
      expect(survey.updatedBy).toBe(adminId);
      expect(survey.createdAt).toBeInstanceOf(Date);
      expect(survey.updatedAt).toBeInstanceOf(Date);
    });

    it("creates survey without description (nullable)", async () => {
      const survey = await repo.createSurvey({
        title: "Simple Survey",
        description: null,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      expect(survey.title).toBe("Simple Survey");
      expect(survey.description).toBeNull();
      expect(survey.status).toBe("published");
    });
  });

  describe("getSurveyWithQuestions", () => {
    it("returns survey with questions ordered by order field", async () => {
      // Create survey
      await db.insert(schema.surveys).values({
        id: survey1Id,
        title: "Test Survey",
        description: "Description",
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Create questions (inserted out of order)
      await db.insert(schema.surveyQuestions).values([
        {
          id: question2Id,
          surveyId: survey1Id,
          questionText: "Question 2",
          questionType: "freehand",
          isRequired: false,
          order: 2,
        },
        {
          id: question1Id,
          surveyId: survey1Id,
          questionText: "Question 1",
          questionType: "yes_no",
          isRequired: true,
          order: 1,
        },
      ]);

      const result = await repo.getSurveyWithQuestions(survey1Id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(survey1Id);
      expect(result!.title).toBe("Test Survey");
      expect(result!.questions).toHaveLength(2);
      // Should be ordered by order field
      expect(result!.questions[0].questionText).toBe("Question 1");
      expect(result!.questions[0].order).toBe(1);
      expect(result!.questions[1].questionText).toBe("Question 2");
      expect(result!.questions[1].order).toBe(2);
    });

    it("returns survey with empty questions array when no questions exist", async () => {
      await db.insert(schema.surveys).values({
        id: survey1Id,
        title: "Empty Survey",
        description: null,
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
      });

      const result = await repo.getSurveyWithQuestions(survey1Id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(survey1Id);
      expect(result!.questions).toEqual([]);
    });

    it("returns null when survey does not exist", async () => {
      const result = await repo.getSurveyWithQuestions(
        "850e8400-e29b-41d4-a716-446655440099",
      );

      expect(result).toBeNull();
    });
  });

  describe("addQuestions", () => {
    beforeEach(async () => {
      // Create survey for question tests
      await db.insert(schema.surveys).values({
        id: survey1Id,
        title: "Test Survey",
        description: null,
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
      });
    });

    it("adds multiple questions to survey", async () => {
      const questions = await repo.addQuestions(survey1Id, [
        {
          questionText: "Are you seeing improvements?",
          questionType: "yes_no",
          helperText: null,
          isRequired: true,
          order: 1,
        },
        {
          questionText: "What changes have you noticed?",
          questionType: "freehand",
          helperText: "Please be specific",
          isRequired: false,
          order: 2,
        },
      ]);

      expect(questions).toHaveLength(2);
      expect(questions[0].questionText).toBe("Are you seeing improvements?");
      expect(questions[0].questionType).toBe("yes_no");
      expect(questions[0].isRequired).toBe(true);
      expect(questions[1].questionText).toBe("What changes have you noticed?");
      expect(questions[1].questionType).toBe("freehand");
      expect(questions[1].helperText).toBe("Please be specific");
    });

    it("adds single question to survey", async () => {
      const questions = await repo.addQuestions(survey1Id, [
        {
          questionText: "Single question",
          questionType: "yes_no",
          helperText: null,
          isRequired: true,
          order: 1,
        },
      ]);

      expect(questions).toHaveLength(1);
      expect(questions[0].questionText).toBe("Single question");
    });
  });

  describe("submitSurveyResponses", () => {
    beforeEach(async () => {
      // Create survey with questions
      await db.insert(schema.surveys).values({
        id: survey1Id,
        title: "Test Survey",
        description: null,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      await db.insert(schema.surveyQuestions).values([
        {
          id: question1Id,
          surveyId: survey1Id,
          questionText: "Are you happy?",
          questionType: "yes_no",
          isRequired: true,
          order: 1,
        },
        {
          id: question2Id,
          surveyId: survey1Id,
          questionText: "Why?",
          questionType: "freehand",
          isRequired: false,
          order: 2,
        },
      ]);
    });

    it("creates submission and stores all responses", async () => {
      const result = await repo.submitSurveyResponses(
        survey1Id,
        user1Id,
        [
          {
            questionId: question1Id,
            yesNoAnswer: true,
            freehandAnswer: null,
          },
          {
            questionId: question2Id,
            yesNoAnswer: null,
            freehandAnswer: "My skin is better!",
          },
        ],
        db,
      );

      expect(result.submissionId).toBeDefined();
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.responsesCount).toBe(2);

      // Verify submission was created
      const submissions = await db
        .select()
        .from(schema.surveySubmissions)
        .where(eq(schema.surveySubmissions.id, result.submissionId));

      expect(submissions).toHaveLength(1);
      expect(submissions[0].surveyId).toBe(survey1Id);
      expect(submissions[0].userProfileId).toBe(user1Id);

      // Verify responses were created
      const responses = await db
        .select()
        .from(schema.surveyResponses)
        .where(eq(schema.surveyResponses.submissionId, result.submissionId));

      expect(responses).toHaveLength(2);
    });

    it("allows same user to submit survey multiple times", async () => {
      // First submission
      const result1 = await repo.submitSurveyResponses(
        survey1Id,
        user1Id,
        [
          {
            questionId: question1Id,
            yesNoAnswer: false,
            freehandAnswer: null,
          },
        ],
        db,
      );

      // Second submission
      const result2 = await repo.submitSurveyResponses(
        survey1Id,
        user1Id,
        [
          {
            questionId: question1Id,
            yesNoAnswer: true,
            freehandAnswer: null,
          },
        ],
        db,
      );

      expect(result1.submissionId).not.toBe(result2.submissionId);

      // Verify two submissions exist
      const submissions = await db
        .select()
        .from(schema.surveySubmissions)
        .where(eq(schema.surveySubmissions.surveyId, survey1Id));

      expect(submissions).toHaveLength(2);
    });
  });

  describe("getUserSubmissions", () => {
    beforeEach(async () => {
      // Create survey with questions
      await db.insert(schema.surveys).values({
        id: survey1Id,
        title: "Test Survey",
        description: null,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      await db.insert(schema.surveyQuestions).values([
        {
          id: question1Id,
          surveyId: survey1Id,
          questionText: "Are you happy?",
          questionType: "yes_no",
          isRequired: true,
          order: 1,
        },
      ]);
    });

    it("returns user submissions ordered by newest first", async () => {
      // Create first submission
      await db.insert(schema.surveySubmissions).values({
        id: submission1Id,
        surveyId: survey1Id,
        userProfileId: user1Id,
        submittedAt: new Date("2025-11-01T10:00:00Z"),
      });

      await db.insert(schema.surveyResponses).values({
        submissionId: submission1Id,
        questionId: question1Id,
        userProfileId: user1Id,
        yesNoAnswer: false,
        freehandAnswer: null,
      });

      // Create second submission (newer)
      const submission2Id = "a50e8400-e29b-41d4-a716-446655440002";
      await db.insert(schema.surveySubmissions).values({
        id: submission2Id,
        surveyId: survey1Id,
        userProfileId: user1Id,
        submittedAt: new Date("2025-11-05T10:00:00Z"),
      });

      await db.insert(schema.surveyResponses).values({
        submissionId: submission2Id,
        questionId: question1Id,
        userProfileId: user1Id,
        yesNoAnswer: true,
        freehandAnswer: null,
      });

      const result = await repo.getUserSubmissions(survey1Id, user1Id);

      expect(result).toHaveLength(2);
      // Newest first
      expect(result[0].submissionId).toBe(submission2Id);
      expect(result[0].submittedAt).toEqual(new Date("2025-11-05T10:00:00Z"));
      expect(result[0].responses[0].yesNoAnswer).toBe(true);

      expect(result[1].submissionId).toBe(submission1Id);
      expect(result[1].submittedAt).toEqual(new Date("2025-11-01T10:00:00Z"));
      expect(result[1].responses[0].yesNoAnswer).toBe(false);
    });

    it("returns empty array when user has no submissions", async () => {
      const result = await repo.getUserSubmissions(survey1Id, user1Id);

      expect(result).toEqual([]);
    });
  });
});
