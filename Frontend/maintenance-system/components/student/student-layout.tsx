// components/student/student-layout.tsx
"use client"

import type React from "react"
import { Navigation } from "@/components/navigation" // Make sure this path is correct

interface StudentLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

export function StudentLayout({ children, activeTab }: StudentLayoutProps) {
  // You would typically get the user's name and email from a state management
  // solution or context, but for this example, we'll use placeholders.
  const userName = "Student User"
  const userEmail = "student@example.com"
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation
        userType="student"
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