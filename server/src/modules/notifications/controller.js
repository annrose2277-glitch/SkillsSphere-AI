import Notification from "../../database/models/Notification.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("relatedData.jobId", "title company")
    .populate("relatedData.studentId", "name email profilePic");
    
  res.json({ success: true, data: notifications });
});

export const markAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ success: true, message: "Notifications marked as read" });
});
