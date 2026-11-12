// src/app/siswa/assessment/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"

import { TakeAssessmentClient } from "@/components/student/TakeAssessmentClient"
import { getAssessmentForTaking, requireStudent } from "@/lib/student"

type Props = { params: Promise<{ id: string }> }

export default async function SiswaAssessmentDetail({ params }: Props) {
  const { id } = await params
  const student = await requireStudent()

  const data = await getAssessmentForTaking(student.id, id)
  if (!data) notFound()

  return (
    <div className="space-y-4">
      {data.state !== "in-progress" && (
        <Link href="/siswa/assessment" className="text-sm text-[#FF8833] hover:underline">
          ← Kembali ke daftar assessment
        </Link>
      )}
      <TakeAssessmentClient data={data} />
    </div>
  )
}
