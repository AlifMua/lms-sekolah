import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITeachingAssignment extends Document {
  teacher: Types.ObjectId; // ref → User
  subject: Types.ObjectId; // ref → Subject
  class: Types.ObjectId; // ref → Class
  academicYear: Types.ObjectId; // ref → AcademicYear
}

const teachingAssignmentSchema = new Schema<ITeachingAssignment>(
  {
    teacher: {
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
  },
  {
    timestamps: true,
  },
);

// Satu guru hanya boleh ditugaskan satu kali per mapel per kelas per tahun ajaran
teachingAssignmentSchema.index(
  { teacher: 1, subject: 1, class: 1, academicYear: 1 },
  { unique: true },
);

const TeachingAssignment =
  mongoose.models.TeachingAssignment ||
  mongoose.model<ITeachingAssignment>(
    "TeachingAssignment",
    teachingAssignmentSchema,
  );

export default TeachingAssignment;
