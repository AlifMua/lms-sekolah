import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IStudentProfile extends Document {
  user: Types.ObjectId; // ref → User
  nis: string; // Nomor Induk Siswa
  class: Types.ObjectId; // ref → Class
  major: Types.ObjectId; // ref → Major
  enrollmentYear: number; // e.g. 2025
  isActive: boolean;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    nis: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    major: {
      type: Schema.Types.ObjectId,
      ref: "Major",
      required: true,
    },
    enrollmentYear: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const StudentProfile =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", studentProfileSchema);

export default StudentProfile;
