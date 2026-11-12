import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITeacherProfile extends Document {
  user: Types.ObjectId; // ref → User
  nip: string; // Nomor Induk Pegawai
  specialization?: string;
  isActive: boolean;
}

const teacherProfileSchema = new Schema<ITeacherProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    nip: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
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

const TeacherProfile =
  mongoose.models.TeacherProfile ||
  mongoose.model<ITeacherProfile>("TeacherProfile", teacherProfileSchema);

export default TeacherProfile;
