import mongoose, { Schema, type Document } from "mongoose";

export interface IAcademicYear extends Document {
  year: string; // e.g. "2025/2026"
  semester: "ganjil" | "genap";
  isActive: boolean;
  startDate: Date;
  endDate: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    year: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: String,
      enum: ["ganjil", "genap"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique: hanya boleh ada satu semester per tahun
academicYearSchema.index({ year: 1, semester: 1 }, { unique: true });

const AcademicYear =
  mongoose.models.AcademicYear ||
  mongoose.model<IAcademicYear>("AcademicYear", academicYearSchema);

export default AcademicYear;
