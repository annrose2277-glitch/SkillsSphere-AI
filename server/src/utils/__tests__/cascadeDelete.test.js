import assert from "node:assert/strict";
import test, { mock } from "node:test";
import fs from "fs";
import mongoose from "mongoose";
import User from "../../database/models/User.js";
import Resume from "../../database/models/Resume.js";
import MatchResult from "../../database/models/MatchResult.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import JobApplication from "../../database/models/JobApplication.js";
import CoverLetter from "../../database/models/CoverLetter.js";
import InterviewSession from "../../database/models/InterviewSession.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";
import ClassroomSession from "../../database/models/ClassroomSession.js";
import JobPosting from "../../database/models/JobPosting.js";
import Notification from "../../database/models/Notification.js";
import { cascadeDeleteUser } from "../cascadeDelete.js";

test("cascadeDeleteUser sweeps all physical files and databases", async () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    profilePic: "http://localhost:5000/uploads/avatars/user-avatar.jpg",
  };

  const mockResume = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    file: {
      path: "src/uploads/resumes/resume.pdf"
    }
  };

  const mockInterviewSession = {
    _id: new mongoose.Types.ObjectId(),
    userId: userId,
    answers: [
      {
        audioPath: "src/uploads/interviews/audio.webm"
      }
    ]
  };

  const mockJobPosting = {
    _id: new mongoose.Types.ObjectId(),
    recruiter: userId,
  };

  // Mock Mongoose Transaction / Session
  const mockSession = {
    startTransaction: mock.fn(),
    commitTransaction: mock.fn(),
    abortTransaction: mock.fn(),
    endSession: mock.fn(),
  };
  mock.method(mongoose, "startSession", async () => mockSession);

  mock.method(User, "findById", async () => mockUser);
  mock.method(User, "findByIdAndDelete", async () => mockUser);

  mock.method(Resume, "find", () => ({
    session: mock.fn(async () => [mockResume])
  }));
  mock.method(Resume, "deleteMany", async () => ({ deletedCount: 1 }));

  mock.method(MatchResult, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(MatchResult, "updateMany", async () => ({}));
  mock.method(LearningProgress, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(JobApplication, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(CoverLetter, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(InterviewSession, "find", () => ({
    session: mock.fn(async () => [mockInterviewSession])
  }));
  mock.method(InterviewSession, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(InterviewSession, "updateMany", async () => ({}));
  mock.method(AnalysisHistory, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(ClassroomSession, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(ClassroomSession, "updateMany", async () => ({}));
  mock.method(Notification, "deleteMany", async () => ({}));

  mock.method(JobPosting, "find", () => ({
    session: mock.fn(async () => [mockJobPosting])
  }));
  mock.method(JobPosting, "deleteMany", async () => ({ deletedCount: 1 }));

  // Mock File System operations
  const unlinkedFiles = [];
  mock.method(fs, "existsSync", () => true);
  mock.method(fs, "unlinkSync", (filePath) => {
    unlinkedFiles.push(filePath);
  });

  // Execute utility
  await cascadeDeleteUser(userId);

  // Assertions
  assert.equal(mongoose.startSession.mock.calls.length, 1);
  assert.equal(mockSession.startTransaction.mock.calls.length, 1);
  assert.equal(mockSession.commitTransaction.mock.calls.length, 1);
  assert.equal(unlinkedFiles.length, 3, "Should unlink 3 physical files");
});