import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IProject extends Document {
  title: string;
  description: string;
  subject: Types.ObjectId; // ref → Subject
  class: Types.ObjectId; // ref → Class
  teacher: Types.ObjectId; // ref → User
  academicYear: Types.ObjectId; // ref → AcademicYear
  deadline: Date;
  status: "active" | "closed";
}

const projectSchema = new Schema<IProject>(
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
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

const Project =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", projectSchema);

export default Project;
