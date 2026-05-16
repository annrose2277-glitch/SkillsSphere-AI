import express from "express";
import { uploadResumeMiddleware } from "../../middleware/uploadResume.js";
import {
  uploadResume,
  analyzeResume,
  getResumeResult,
  getLatestResume,
  compareVersions
} from "./controller.js";


import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Only Students can upload and analyze resumes in this example
router.post("/upload", protect, authorizeRoles("student"), uploadResumeMiddleware, uploadResume);
router.post("/analyze", protect, authorizeRoles("student"), uploadResumeMiddleware, analyzeResume);
router.get("/me/latest", protect, getLatestResume);
router.get("/result/:id", protect, getResumeResult);


/**
 * @openapi
 * /api/resume/compare:
 *   post:
 *     summary: Get AI-generated strategic comparison between two resume versions
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionAId
 *               - versionBId
 *             properties:
 *               versionAId:
 *                 type: string
 *               versionBId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Strategic comparison generated
 */
router.post("/compare", protect, compareVersions);


export default router;
