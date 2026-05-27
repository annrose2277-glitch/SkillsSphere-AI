import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import * as classroomService from "../service.js";
import ClassroomSession from "../../../database/models/ClassroomSession.js";

describe("Classroom Service - Active Sessions", () => {
  before(() => {
    mongoose.set("bufferCommands", false);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("getActiveSessions", () => {
    it("should fetch all active classroom sessions with populated host and proper sort", async () => {
      const mockActiveSessions = [
        {
          roomId: "room-1",
          title: "Introduction to React",
          subject: "Web Development",
          status: "active",
          host: {
            _id: "host-1",
            name: "John Doe",
            profilePic: "avatar.png",
            role: "tutor"
          },
          createdAt: new Date("2026-05-22T10:00:00Z")
        },
        {
          roomId: "room-2",
          title: "Advanced Data Structures",
          subject: "Computer Science",
          status: "active",
          host: {
            _id: "host-2",
            name: "Jane Smith",
            profilePic: "avatar2.png",
            role: "tutor"
          },
          createdAt: new Date("2026-05-22T09:00:00Z")
        }
      ];

      const mockQuery = {
        populate: mock.fn(function() { return this; }),
        sort: mock.fn(function() { return this; }),
        lean: mock.fn(async () => mockActiveSessions),
      };
      
      mock.method(ClassroomSession, "find", () => mockQuery);

      const result = await classroomService.getActiveSessions();

      assert.equal(ClassroomSession.find.mock.calls.length, 1);
      assert.deepEqual(ClassroomSession.find.mock.calls[0].arguments[0], { status: "active" });

      assert.equal(mockQuery.populate.mock.calls.length, 1);
      assert.deepEqual(mockQuery.populate.mock.calls[0].arguments, ["host", "name profilePic role"]);

      assert.equal(mockQuery.sort.mock.calls.length, 1);
      assert.deepEqual(mockQuery.sort.mock.calls[0].arguments[0], { createdAt: -1 });

      assert.deepEqual(result, mockActiveSessions);
    });
  });
});
