import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import TeacherProfile from "@/models/TeacherProfile";
import AcademicYear from "@/models/AcademicYear";
import TeachingAssignment from "@/models/TeachingAssignment";
import { GuruPageClient } from "@/components/admin/GuruPageClient";
import type { GuruItem } from "@/components/admin/dialogs/GuruDialog";

type ProfileLean = {
  _id: unknown;
  nip: string;
  specialization?: string;
  isActive: boolean;
  user: { _id: unknown; username: string; email: string; isActive?: boolean } | null;
};

export default async function GuruPage() {
  await connectDB();

  const activeYear = await AcademicYear.findOne({ isActive: true }).select("_id").lean<{ _id: unknown }>();

  const [profiles, assignments] = await Promise.all([
    TeacherProfile.find({})
      .populate({ path: "user", model: User, select: "username email isActive" })
      .sort({ createdAt: -1 })
      .lean<ProfileLean[]>(),
    activeYear
      ? TeachingAssignment.find({ academicYear: activeYear._id }).select("teacher").lean<Array<{ teacher: unknown }>>()
      : Promise.resolve([] as Array<{ teacher: unknown }>),
  ]);

  const assignmentCount = new Map<string, number>();
  for (const a of assignments) {
    const key = String(a.teacher);
    assignmentCount.set(key, (assignmentCount.get(key) ?? 0) + 1);
  }

  const items: GuruItem[] = profiles
    .filter((p) => p.user)
    .map((p) => ({
      _id: String(p._id),
      name: p.user!.username,
      email: p.user!.email,
      nip: p.nip,
      specialization: p.specialization ?? "",
      // Akun dianggap nonaktif jika salah satu (User/Profile) bernilai false
      isActive: p.isActive !== false && p.user!.isActive !== false,
      activeAssignments: assignmentCount.get(String(p.user!._id)) ?? 0,
    }));

  return <GuruPageClient items={items} />;
}
