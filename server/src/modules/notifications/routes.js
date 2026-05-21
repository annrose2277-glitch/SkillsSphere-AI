import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { getNotifications, markAsRead } from "./controller.js";

const router = express.Router();

router.use(protect);
router.get("/", getNotifications);
router.post("/read", markAsRead);

export default router;
