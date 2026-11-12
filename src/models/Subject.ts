import mongoose, { Schema, type Document } from "mongoose";

export interface ISubject extends Document {
  name: string; // e.g. "Pemrograman Web"
  code: string; // e.g. "PWB-001"
  category: "umum" | "kejuruan" | "muatan-lokal";
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
    category: {
      type: String,
      enum: ["umum", "kejuruan", "muatan-lokal"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Subject =
  mongoose.models.Subject ||
  mongoose.model<ISubject>("Subject", subjectSchema);

export default Subject;
