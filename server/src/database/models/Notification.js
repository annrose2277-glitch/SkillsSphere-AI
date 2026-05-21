import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["skill_gap_alert", "general", "system"],
      default: "general",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedData: {
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosting" },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      score: Number,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
