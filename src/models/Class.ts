import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IClass extends Document {
  name: string; // e.g. "X PPLG 1"
  grade: "X" | "XI" | "XII";
  major: Types.ObjectId; // ref → Major
  academicYear: Types.ObjectId; // ref → AcademicYear
  homeroomTeacher?: Types.ObjectId; // ref → User (wali kelas)
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      enum: ["X", "XI", "XII"],
      required: true,
    },
    major: {
      type: Schema.Types.ObjectId,
      ref: "Major",
      required: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    homeroomTeacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Unique: nama kelas unik per tahun ajaran
classSchema.index({ name: 1, academicYear: 1 }, { unique: true });

const Class =
  mongoose.models.Class || mongoose.model<IClass>("Class", classSchema);

export default Class;
