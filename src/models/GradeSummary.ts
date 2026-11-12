import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IGradeSummary extends Document {
  student: Types.ObjectId; // ref → User
  subject: Types.ObjectId; // ref → Subject
  class: Types.ObjectId; // ref → Class
  academicYear: Types.ObjectId; // ref → AcademicYear
  assessmentAvg: number;
  projectAvg: number;
  finalGrade: number;
}

const gradeSummarySchema = new Schema<IGradeSummary>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    assessmentAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    projectAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    finalGrade: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  },
);

// Satu rekap nilai per siswa per mapel per kelas per tahun ajaran
gradeSummarySchema.index(
  { student: 1, subject: 1, class: 1, academicYear: 1 },
  { unique: true },
);

const GradeSummary =
  mongoose.models.GradeSummary ||
  mongoose.model<IGradeSummary>("GradeSummary", gradeSummarySchema);

export default GradeSummary;
