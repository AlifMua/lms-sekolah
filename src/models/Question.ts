import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IQuestionOption {
  label: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface IQuestion extends Document {
  assessment: Types.ObjectId; // ref → Assessment
  questionText: string;
  questionType: "multiple-choice" | "essay" | "true-false";
  options: IQuestionOption[]; // untuk pilihan ganda
  correctAnswer: string; // label jawaban benar (MC/TF) atau contoh jawaban (essay)
  points: number;
  order: number;
}

const questionOptionSchema = new Schema<IQuestionOption>(
  {
    label: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema<IQuestion>(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["multiple-choice", "essay", "true-false"],
      required: true,
    },
    options: {
      type: [questionOptionSchema],
      default: [],
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 1,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index: soal diurutkan per assessment
questionSchema.index({ assessment: 1, order: 1 });

const Question =
  mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", questionSchema);

export default Question;
