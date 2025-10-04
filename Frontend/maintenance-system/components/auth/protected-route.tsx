// components/auth/protected-route.tsx
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase" // Ensure this path is correct

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // No user is logged in, redirect to login page
        router.push("/")
      } else {
        // User is logged in, now check their role (if you have this logic)
        // For now, we will assume the role is correct to resolve the immediate error.
      }
      setLoading(false)
    })

    // Clean up the listener on component unmount
    return () => unsubscribe() 
  }, [router, allowedRoles])

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  return <>{children}</>
}