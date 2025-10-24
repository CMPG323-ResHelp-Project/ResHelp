"use client"

import type React from "react"
import { Navigation } from "@/components/navigation" // Make sure this path is correct

interface StudentLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

export function StudentLayout({ children, activeTab }: StudentLayoutProps) {
  // get the user's name and email from a state management
  const userName = " "
  const userEmail = " "
  
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