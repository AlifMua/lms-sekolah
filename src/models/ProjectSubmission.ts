import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IProjectSubmission extends Document {
  project: Types.ObjectId; // ref → Project
  student: Types.ObjectId; // ref → User
  content: string; // deskripsi/link
  fileUrl?: string;
  submittedAt: Date;
  submissionStatus: "ontime" | "late"; // dihitung otomatis dari deadline vs submittedAt
  grade?: number;
  feedback?: string;
  status: "submitted" | "graded" | "revision";
}

const projectSubmissionSchema = new Schema<IProjectSubmission>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submissionStatus: {
      type: String,
      enum: ["ontime", "late"],
      required: true,
    },
    grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["submitted", "graded", "revision"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  },
);

// Hitung submissionStatus otomatis. Harus di "validate" (bukan "save") karena
// field ini required dan validasi berjalan sebelum hook save.
projectSubmissionSchema.pre("validate", async function () {
  if (this.isNew || this.isModified("submittedAt")) {
    // Populate project untuk ambil deadline
    const ProjectModel = mongoose.model("Project");
    const project = await ProjectModel.findById(this.project).lean<{
      deadline: Date;
    }>();

    if (project?.deadline) {
      this.submissionStatus =
        this.submittedAt <= project.deadline ? "ontime" : "late";
    }
  }
});

// Seorang siswa hanya bisa submit satu kali per project
projectSubmissionSchema.index({ project: 1, student: 1 }, { unique: true });

const ProjectSubmission =
  mongoose.models.ProjectSubmission ||
  mongoose.model<IProjectSubmission>(
    "ProjectSubmission",
    projectSubmissionSchema,
  );

export default ProjectSubmission;
