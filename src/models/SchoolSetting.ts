import mongoose, { Schema, type Document } from "mongoose";

export interface ISchoolSetting extends Document {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  academicYear: string; // informational only
  updatedAt: Date;
}

const schoolSettingSchema = new Schema<ISchoolSetting>(
  {
    schoolName: { type: String, required: true, trim: true },
    npsn: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    principalName: { type: String, trim: true, default: "" },
    academicYear: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const SchoolSetting =
  mongoose.models.SchoolSetting ||
  mongoose.model<ISchoolSetting>("SchoolSetting", schoolSettingSchema);

export default SchoolSetting;

