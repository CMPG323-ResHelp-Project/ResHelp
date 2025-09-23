"use client"

import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notification-center"
import { useRouter } from "next/navigation"
import { LogOut, Home, Settings } from "lucide-react"

interface NavigationProps {
  userType: "student" | "staff" | "manager"
  currentPage?: string
}

export function Navigation({ userType, currentPage }: NavigationProps) {
  const router = useRouter()

  const handleLogout = () => {
    router.push("/")
  }

  const getNavItems = () => {
    switch (userType) {
      case "student":
        return [
          { label: "Dashboard", href: "/student/dashboard", icon: Home },
          { label: "Report Issue", href: "/student/report", icon: Settings },
        ]
      case "staff":
        return [
          { label: "Dashboard", href: "/staff/dashboard", icon: Home },
          { label: "Manage Issues", href: "/staff/issues", icon: Settings },
        ]
      case "manager":
        return [
          { label: "Dashboard", href: "/manager/dashboard", icon: Home },
          { label: "Analytics", href: "/manager/analytics", icon: Settings },
        ]
      default:
        return []
    }
  }

  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <img src="/reshelp-logo.png" alt="ResHelp" className="h-12 w-20" />
            <h1 className="text-xl font-bold text-foreground">ResHelp</h1>
          </div>
          <div className="flex space-x-4">
            {getNavItems().map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={currentPage === item.href ? "default" : "ghost"}
                  onClick={() => router.push(item.href)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationCenter userType={userType} />
          <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
