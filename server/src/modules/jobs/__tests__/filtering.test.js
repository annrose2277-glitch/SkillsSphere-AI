import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";

describe("Job Service Filtering", () => {
  const mockJobId = new mongoose.Types.ObjectId().toString();
  const mockRecruiterId = new mongoose.Types.ObjectId().toString();

  before(() => {
    // Disable buffering so tests don't hang if they accidentally hit the DB
    mongoose.set("bufferCommands", false);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const createMockQuery = (responseData) => ({
    populate: mock.fn(function() { return this; }),
    sort: mock.fn(function() { return this; }),
    skip: mock.fn(function() { return this; }),
    limit: mock.fn(function() { return this; }),
    select: mock.fn(function() { return this; }),
    lean: mock.fn(function() { return this; }),
    then: mock.fn(function(resolve) { resolve(responseData); }),
  });

  it("should filter applications by minScore and maxScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, aiMatchScore: 88 }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { minScore: 80, maxScore: 95 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobPosting.findById.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.aiMatchScore, { $gte: 80, $lte: 95 });
    assert.deepEqual(result.applications, mockApps);
  });

  it("should filter applications by minAtsScore and maxAtsScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, "matchBreakdown.atsCompatibility": 82 }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { minAtsScore: 75, maxAtsScore: 90 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.atsCompatibility"], { $gte: 75, $lte: 90 });
    assert.deepEqual(result.applications, mockApps);
  });

  it("should filter applications by matchCategory correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, matchCategory: "Excellent Match" }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { matchCategory: "excellent,moderate" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.matchCategory, { $in: ["Excellent Match", "Moderate Match"] });
    assert.deepEqual(result.applications, mockApps);
  });

  it("should filter applications by contributorOnly correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, "matchBreakdown.contributionActivity": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { contributorOnly: "true" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.contributionActivity"], { $in: ["High", "Medium"] });
    assert.deepEqual(result.applications, mockApps);
  });

  it("should filter applications by careerReadiness correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, "matchBreakdown.careerReadiness": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { careerReadiness: "High,Medium" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.careerReadiness"], { $in: ["High", "Medium"] });
    assert.deepEqual(result.applications, mockApps);
  });

  it("should filter applications by specialization correctly using Resume subquery", async () => {
    const mockJob = { _id: mockJobId, recruiter: mockRecruiterId };
    const mockResumeId1 = new mongoose.Types.ObjectId();
    const mockResumeId2 = new mongoose.Types.ObjectId();
    const mockApps = [{ _id: new mongoose.Types.ObjectId().toString(), job: mockJobId, resume: mockResumeId1 }];
    const mockResumes = [{ _id: mockResumeId1 }, { _id: mockResumeId2 }];

    mock.method(JobPosting, "findById", async () => mockJob);
    
    const mockResumeQuery = {
        select: mock.fn(function() { return this; }),
        lean: mock.fn(async () => mockResumes)
    };
    mock.method(Resume, "find", () => mockResumeQuery);

    mock.method(JobApplication, "find", () => createMockQuery(mockApps));
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { specialization: "frontend" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(Resume.find.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.resume, { $in: [mockResumeId1, mockResumeId2] });
    assert.deepEqual(result.applications, mockApps);
  });
});

