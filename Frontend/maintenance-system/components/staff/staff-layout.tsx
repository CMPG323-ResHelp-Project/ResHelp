// components/student/student-layout.tsx
"use client"

import type React from "react"
import { Navigation } from "@/components/navigation" // Make sure this path is correct

interface StaffLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

export function StaffLayout({ children, activeTab }: StaffLayoutProps) {
  // You would typically get the user's name and email from a state management
  // solution or context, but for this example, we'll use placeholders.
  const userName = "Staff User"
  const userEmail = "staff@example.com"
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation
        userType="staff"
        currentPage={activeTab}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 container mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}