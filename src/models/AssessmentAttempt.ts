import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAnswerEntry {
  question: Types.ObjectId; // ref → Question
  answer: string;
  isCorrect?: boolean; // null/undefined untuk essay yang belum dikoreksi
  points: number;
}

export interface IAssessmentAttempt extends Document {
  assessment: Types.ObjectId; // ref → Assessment
  student: Types.ObjectId; // ref → User
  answers: IAnswerEntry[];
  totalScore: number;
  maxScore: number;
  submittedAt?: Date;
  status: "in-progress" | "submitted" | "needs_manual_review" | "graded";
}

const answerEntrySchema = new Schema<IAnswerEntry>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    answer: {
      type: String,
      default: "",
    },
    isCorrect: {
      type: Boolean,
    },
    points: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: {
      type: [answerEntrySchema],
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["in-progress", "submitted", "needs_manual_review", "graded"],
      default: "in-progress",
    },
  },
  {
    timestamps: true,
  },
);

// Seorang siswa hanya punya 1 attempt per assessment
assessmentAttemptSchema.index(
  { assessment: 1, student: 1 },
  { unique: true },
);

const AssessmentAttempt =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttempt>(
    "AssessmentAttempt",
    assessmentAttemptSchema,
  );

export default AssessmentAttempt;
