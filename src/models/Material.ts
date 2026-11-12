import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IMaterial extends Document {
  title: string;
  description: string;
  content: string; // markdown/HTML
  subject: Types.ObjectId; // ref → Subject
  class: Types.ObjectId; // ref → Class
  teacher: Types.ObjectId; // ref → User
  academicYear: Types.ObjectId; // ref → AcademicYear
  publishedAt?: Date;
  status: "draft" | "published";
}

const materialSchema = new Schema<IMaterial>(
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
    content: {
      type: String,
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
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

const Material =
  mongoose.models.Material ||
  mongoose.model<IMaterial>("Material", materialSchema);

export default Material;
