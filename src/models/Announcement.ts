import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: Types.ObjectId; // ref → User
  targetRole: "all" | "teacher" | "student";
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetRole: {
      type: String,
      enum: ["all", "teacher", "student"],
      default: "all",
    },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index untuk sorting cepat: pinned dulu, lalu terbaru
announcementSchema.index({ pinned: -1, createdAt: -1 });

const Announcement =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", announcementSchema);

export default Announcement;

