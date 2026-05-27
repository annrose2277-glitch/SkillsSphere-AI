import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";
import AppError from "../../../utils/AppError.js";
import * as resumeService from "../../resumes/service.js";
import matchingService from "../../matching/service.js";

describe("Job Service", () => {
  const mockJobId = new mongoose.Types.ObjectId().toString();
  const mockRecruiterId = new mongoose.Types.ObjectId().toString();

  before(() => {
    mongoose.set("bufferCommands", false);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("createJob", () => {
    it("should successfully create a job posting", async () => {
      const mockJobData = { title: "Software Engineer", skills: ["React", "Node"] };

      const mockCreatedJob = { ...mockJobData, recruiter: mockRecruiterId, _id: mockJobId };
      mock.method(JobPosting, "create", () => mockCreatedJob);

      const result = await jobService.createJob(mockJobData, mockRecruiterId);

      assert.equal(JobPosting.create.mock.calls.length, 1);
      assert.deepEqual(JobPosting.create.mock.calls[0].arguments[0], {
        ...mockJobData,
        recruiter: mockRecruiterId,
      });
      assert.deepEqual(result, mockCreatedJob);
    });
  });

  describe("updateJob", () => {
    it("should update a job successfully when user is the owner", async () => {
      const mockUpdateData = { title: "Senior Software Engineer" };

      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockUpdatedJob = { ...mockExistingJob, ...mockUpdateData };

      mock.method(JobPosting, "findById", () => mockExistingJob);
      mock.method(JobPosting, "findByIdAndUpdate", () => mockUpdatedJob);

      const result = await jobService.updateJob(mockJobId, mockUpdateData, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobPosting.findByIdAndUpdate.mock.calls.length, 1);
      assert.deepEqual(JobPosting.findByIdAndUpdate.mock.calls[0].arguments, [
        mockJobId,
        mockUpdateData,
        { new: true, runValidators: true }
      ]);
      assert.deepEqual(result, mockUpdatedJob);
    });

    it("should throw AppError(404) if job not found", async () => {
      mock.method(JobPosting, "findById", () => null);

      await assert.rejects(
        () => jobService.updateJob(new mongoose.Types.ObjectId().toString(), {}, mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter is not the owner", async () => {
      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => "differentRecruiter" } };
      mock.method(JobPosting, "findById", () => mockExistingJob);

      await assert.rejects(
        () => jobService.updateJob(mockJobId, {}, mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe("deleteJob", () => {
    it("should delete a job and its applications when user is owner", async () => {
      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };

      mock.method(JobPosting, "findById", () => mockExistingJob);
      mock.method(JobApplication, "deleteMany", () => ({ deletedCount: 5 }));
      mock.method(JobPosting, "findByIdAndDelete", () => mockExistingJob);

      await jobService.deleteJob(mockJobId, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobApplication.deleteMany.mock.calls.length, 1);
      assert.deepEqual(JobApplication.deleteMany.mock.calls[0].arguments, [{ job: mockJobId }]);
      assert.equal(JobPosting.findByIdAndDelete.mock.calls.length, 1);
      assert.equal(JobPosting.findByIdAndDelete.mock.calls[0].arguments[0], mockJobId);
    });

    it("should throw AppError(404) if job not found for deletion", async () => {
      mock.method(JobPosting, "findById", () => null);

      await assert.rejects(
        () => jobService.deleteJob(new mongoose.Types.ObjectId().toString(), mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter does not own the job for deletion", async () => {
      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => "differentRecruiter" } };
      mock.method(JobPosting, "findById", () => mockExistingJob);

      await assert.rejects(
        () => jobService.deleteJob(mockJobId, mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe("getJobRecommendations", () => {
    it("should return job recommendations successfully and call DB limit(100)", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId().toString() };
      const mockResume = {
        _id: new mongoose.Types.ObjectId().toString(),
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockResumeQuery = {
        select: mock.fn(function() { return this; }),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockResumeQuery);

      const mockJobs = [
        {
          _id: mockJobId,
          title: "Software Engineer",
          skills: ["React"],
          description: "Develop React apps",
          _doc: { _id: mockJobId, title: "Software Engineer", skills: ["React"], description: "Develop React apps" }
        }
      ];

      const mockJobQuery = {
        limit: mock.fn(async () => mockJobs)
      };
      mock.method(JobPosting, "find", () => mockJobQuery);

      const mockMatchResult = {
        recommendations: [
          {
            job: mockJobId,
            score: 85,
            breakdown: { skill: 90, experience: 80 },
            skillMatch: { feedback: ["Great match"] }
          }
        ]
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);

      const result = await jobService.getJobRecommendations(mockUser);

      assert.equal(Resume.findOne.mock.calls.length, 1);
      assert.equal(JobPosting.find.mock.calls.length, 1);
      assert.equal(mockJobQuery.limit.mock.calls.length, 1);
      assert.equal(mockJobQuery.limit.mock.calls[0].arguments[0], 100);
      assert.equal(matchingService.evaluateMatches.mock.calls.length, 1);
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 1);
      assert.equal(result.jobs[0].matchScore, 85);
      assert.equal(result.jobs[0].relevanceInsights, "Great match");
    });
  });

  describe("getJobApplications", () => {
    it("should return all applications for the job when no status filter is provided", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, status: "pending" }];

      mock.method(JobPosting, "findById", async () => mockJob);

      const mockQuery = {
        populate: mock.fn(function() { return this; }),
        sort: mock.fn(function() { return this; }),
        skip: mock.fn(function() { return this; }),
        limit: mock.fn(function() { return this; }),
        then: mock.fn(function(resolve) { resolve(mockApps); }),
      };
      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobApplication, "countDocuments", async () => 1);

      const result = await jobService.getJobApplications(mockJobId, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobApplication.find.mock.calls.length, 1);
      assert.deepEqual(JobApplication.find.mock.calls[0].arguments[0], { job: mockJobId });
      assert.deepEqual(result.applications, mockApps);
      assert.equal(result.totalCount, 1);
    });

    it("should filter applications by status when status filter is provided", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, status: "shortlisted" }];

      mock.method(JobPosting, "findById", async () => mockJob);

      const mockQuery = {
        populate: mock.fn(function() { return this; }),
        sort: mock.fn(function() { return this; }),
        skip: mock.fn(function() { return this; }),
        limit: mock.fn(function() { return this; }),
        then: mock.fn(function(resolve) { resolve(mockApps); }),
      };
      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobApplication, "countDocuments", async () => 1);

      const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, "shortlisted");

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobApplication.find.mock.calls.length, 1);
      assert.deepEqual(JobApplication.find.mock.calls[0].arguments[0], { job: mockJobId, status: "shortlisted" });
      assert.deepEqual(result.applications, mockApps);
    });

    it("should throw AppError(404) if job not found", async () => {
      mock.method(JobPosting, "findById", async () => null);

      await assert.rejects(
        () => jobService.getJobApplications(new mongoose.Types.ObjectId().toString(), mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          assert.equal(err.message, "Job not found");
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter is not the job owner", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => "otherRecruiter" } };
      mock.method(JobPosting, "findById", async () => mockJob);

      await assert.rejects(
        () => jobService.getJobApplications(mockJobId, mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          assert.equal(err.message, "You do not have permission to view these applications");
          return true;
        }
      );
    });
  });
});