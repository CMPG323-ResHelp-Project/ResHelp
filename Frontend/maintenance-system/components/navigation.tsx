"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notification-center"
import { useRouter } from "next/navigation"
import { LogOut, Home, Settings, Menu, X, User } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet"

interface NavigationProps {
  userType: "student" | "staff" | "manager"
  currentPage?: string
  userName?: string
  userEmail?: string
}

export function Navigation({ userType, currentPage, userName, userEmail }: NavigationProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    router.push("/")
  }

  const handleProfileClick = () => {
    // Navigate to the profile page based on the user's role
    router.push(`/${userType}/profile`)
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

  const navItems = getNavItems()

  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <img src="/reshelp-logo.png" alt="ResHelp" className="h-12 w-20" />
            <h1 className="text-xl font-bold text-foreground">ResHelp</h1>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
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
            
            {/* Profile Button - no dropdown */}
            <Button
              variant="ghost"
              onClick={handleProfileClick}
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          </div>
        </div>

        {/* Desktop Notification and Logout */}
        <div className="hidden md:flex items-center space-x-4">
          <NotificationCenter userType={userType} />
          <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Mobile Navigation (Sidebar) */}
        <div className="md:hidden flex items-center space-x-2">
          <NotificationCenter userType={userType} />
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader className="p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Menu</h2>
                  <Button variant="ghost" className="p-2" onClick={() => setIsSidebarOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </SheetHeader>
              <div className="flex flex-col p-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Button
                      key={item.href}
                      variant={currentPage === item.href ? "default" : "ghost"}
                      onClick={() => {
                        router.push(item.href)
                        setIsSidebarOpen(false)
                      }}
                      className="flex justify-start items-center space-x-2 w-full"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  )
                })}
                {/* Profile Button in mobile sidebar */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleProfileClick()
                    setIsSidebarOpen(false)
                  }}
                  className="flex justify-start items-center space-x-2 w-full"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>

                <div className="border-t border-border mt-4 pt-4">
                  {userName && <div className="font-semibold">{userName}</div>}
                  {userEmail && <div className="text-sm text-gray-500 truncate">{userEmail}</div>}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="flex justify-start items-center space-x-2 w-full mt-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}