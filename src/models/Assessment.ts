import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAssessment extends Document {
  title: string;
  description: string;
  subject: Types.ObjectId; // ref → Subject
  class: Types.ObjectId; // ref → Class
  teacher: Types.ObjectId; // ref → User
  academicYear: Types.ObjectId; // ref → AcademicYear
  type: "quiz" | "uts" | "uas" | "tugas";
  duration: number; // durasi dalam menit
  startDate: Date;
  endDate: Date; // deadline
  status: "draft" | "active" | "closed";
}

const assessmentSchema = new Schema<IAssessment>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    type: {
      type: String,
      enum: ["quiz", "uts", "uas", "tugas"],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

const Assessment =
  mongoose.models.Assessment ||
  mongoose.model<IAssessment>("Assessment", assessmentSchema);

export default Assessment;
