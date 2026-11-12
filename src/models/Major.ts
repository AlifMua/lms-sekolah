import mongoose, { Schema, type Document } from "mongoose";

export interface IMajor extends Document {
  name: string; // e.g. "Pengembangan Perangkat Lunak dan Gim"
  abbreviation: string; // e.g. "PPLG"
  slug: string; // e.g. "pplg"
  description?: string;
}

const majorSchema = new Schema<IMajor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    abbreviation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Major =
  mongoose.models.Major || mongoose.model<IMajor>("Major", majorSchema);

export default Major;
