// src/app/logout/page.tsx
"use client"

import { Card } from "@/components/ui/Card"
import { signOut } from "next-auth/react"

export default function LogoutPage() {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <Card className="p-6 max-w-md mx-auto mt-20">
      <h2 className="text-xl font-semibold text-neutral-900 mb-4">Logout</h2>
      <p className="mb-4 text-neutral-600">Anda akan keluar dari akun dan diarahkan ke halaman login.</p>
      <button
        onClick={handleLogout}
        className="w-full px-4 py-2.5 bg-[#FF8833] text-white rounded-lg font-medium hover:bg-[#e6782b] transition-colors"
      >
        Logout Sekarang
      </button>
    </Card>
  )
}
