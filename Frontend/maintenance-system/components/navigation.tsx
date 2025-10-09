"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notification-center"
import { useRouter } from "next/navigation"
import { LogOut, Home, Settings, Menu, X, User, HelpCircle, BookOpen, KeyRound, Mail, Wrench, CheckCircle, Clock, Check, ListTodo, AlertTriangle, Users, MapPin, Plus } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface NavigationProps {
  userType: "student" | "staff" | "manager"
  currentPage?: string
  userName?: string
  userEmail?: string
}

// 🌟 UPDATED: Added 'reportIssue'
type HelpTopic = "default" | "profile" | "manageIssues" | "staffDashboard" | "studentDashboard" | "reportIssue";

export function Navigation({ userType, currentPage, userName, userEmail }: NavigationProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHelpSidebarOpen, setIsHelpSidebarOpen] = useState(false)

  const [helpTopic, setHelpTopic] = useState<HelpTopic>("default");

  const handleLogout = () => {
    router.push("/")
  }

  const handleProfileClick = () => {
    router.push(`/${userType}/profile`)
  }

  const getNavItems = () => {
    switch (userType) {
      case "student":
        return [
          { label: "Dashboard", href: "/student/dashboard", icon: Home },
          { label: "Report Issue", href: "/student/report", icon: Plus }, // ✅ CHANGED: Icon to Plus
        ]
      case "staff":
        return [
          { label: "Dashboard", href: "/staff/dashboard", icon: Home },
          { label: "Manage Issues", href: "/staff/issues", icon: Wrench },
        ]
      case "manager":
        return [
          { label: "Dashboard", href: "/manager/dashboard", icon: Home },
          { label: "Analytics", href: "/manager/analytics", icon: Settings },
          { label: "Students", href: "/manager/students", icon: User },
          { label: "Staff", href: "/manager/staff", icon: User },
          { label: "Issues", href: "/manager/issues", icon: Wrench },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  // Utility to set topic and open sheet on button click
  const openHelpForTopic = (topic: HelpTopic) => {
    setHelpTopic(topic);
    setIsHelpSidebarOpen(true);
  }

  // 🌟 UPDATED: Added check for Student Dashboard
  const getActiveHelpTopic = (path: string | undefined, role: string): HelpTopic => {
    if (!path) return "default";
    if (role === "student" && path.endsWith("/student/dashboard")) return "studentDashboard";
    if (role === "student" && path.endsWith("/student/report")) return "reportIssue"; // ✅ NEW: Auto-select report issue help
    if (role === "staff" && path.endsWith("/staff/dashboard")) return "staffDashboard";
    if (path.endsWith("/issues")) return "manageIssues";
    if (path.includes("/profile")) return "profile";
    return "default";
  }

  // Effect to automatically set the topic when the page changes
  useMemo(() => {
    setHelpTopic(getActiveHelpTopic(currentPage, userType));
  }, [currentPage, userType]);


  // ------------------------------------------------------------------------------------
  // ✅ NEW: Help Content for Report Issue Page
  // ------------------------------------------------------------------------------------
  const getReportIssueHelpContent = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-bold mt-2">How to Report an Issue</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Use the **Report Issue** page to submit any maintenance request for your residence. Providing clear and accurate information ensures the fastest resolution.
        </p>

        <div className="space-y-4 border p-3 rounded-lg bg-red-50/50">
          <h5 className="font-semibold flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" /> Urgent Safety Hazard: When to Tick
          </h5>
          <p className="text-xs text-gray-700 font-medium">
            Tick the **'This is an urgent safety hazard'** box ONLY for immediate, critical situations.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 ml-2 text-gray-600">
            <li>✅ **TICK IF:** Active flood/major leak, exposed live electrical wiring, gas leak smell, no heat in freezing weather, or a broken security lock.</li>
            <li>❌ **DO NOT TICK IF:** Leaky faucet drip, burnt-out lightbulb, slow drain, or broken non-essential appliance.</li>
            <li>⚠️ **EMERGENCY:** For fire, major medical, or security breaches, **CALL EMERGENCY SERVICES FIRST** before submitting this form.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h5 className="font-semibold">Tips for a Quick Resolution</h5>
          <ul className="list-disc list-inside text-sm space-y-1 ml-2 text-gray-600">
            <li>**Location:** Use your current address (autofilled from your profile) and add specific details (e.g., "Room 205 Bathroom Ceiling").</li>
            <li>**Description:** Include **when** the problem started and any potential **cause** you know of.</li>
          </ul>
        </div>

        <Button
          variant="default"
          className="w-full mt-4"
          onClick={() => {
            router.push('/student/report');
            setIsHelpSidebarOpen(false);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Go to Report Issue Page
        </Button>
      </div>
    );
  };


  // --- Help Content: Student Dashboard ---
  // ------------------------------------------------------------------------------------
  // CODE FOR Navigation.tsx - REPLACE the existing getStudentDashboardHelpContent function
  // ------------------------------------------------------------------------------------

  // --- Help Content: Student Dashboard ---
  const getStudentDashboardHelpContent = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-bold mt-2">Student Dashboard Overview</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Your dashboard provides a quick summary of all your reported maintenance requests.
        </p>

        <div className="space-y-4 border p-3 rounded-lg bg-indigo-50/50">
          <h5 className="font-semibold">Understanding Issue Statuses</h5>

          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Pending Issues</p>
              <p className="text-xs text-gray-600">
                The issue is waiting to be accepted by a staff member. **You can Edit or Cancel pending issues.**
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Wrench className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">In Progress (Assigned/In-Progress)</p>
              <p className="text-xs text-gray-600">
                A staff member is on their way or actively working on your issue. Editing and canceling is **disabled** at this stage.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Resolved Issues</p>
              <p className="text-xs text-gray-600">
                The issue has been fixed and closed. **Please leave a rating** in the issue history to provide feedback on the service!
              </p>
            </div>
          </div>
        </div>

        {/* NEW DEDICATED SECTION FOR EDIT, CANCEL, HISTORY, RATING */}
        <div className="space-y-4 border p-3 rounded-lg bg-yellow-50/50">
          <h5 className="font-semibold flex items-center"><ListTodo className="h-4 w-4 mr-2" /> Detailed Actions Guide</h5>

          <p className="font-medium text-sm">Issue History & Rating</p>
          <p className="text-xs text-gray-600 ml-2">
            All resolved and cancelled issues are moved to the **Issue History** section at the bottom of the dashboard. This section is where you can see the final state and **submit your service rating (1-5 stars)** for resolved issues.
          </p>

          <p className="font-medium text-sm">Editing an Issue</p>
          <p className="text-xs text-gray-600 ml-2">
            You can **Edit** an issue (title, description, location) **ONLY** when its status is **Pending**. Once staff starts work (Assigned/In-Progress), editing is locked.
          </p>

          <p className="font-medium text-sm">Canceling an Issue</p>
          <p className="text-xs text-gray-600 ml-2">
            You can **Cancel** an issue (e.g., if you fixed it yourself) **ONLY** when its status is **Pending**. A canceled issue moves to the history section.
          </p>
        </div>
        {/* END NEW SECTION */}

        <Button
          variant="default"
          className="w-full mt-4"
          onClick={() => {
            router.push('/student/report');
            setIsHelpSidebarOpen(false);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Report a New Issue
        </Button>
      </div>
    );
  };

  // --- Help Content: Staff Dashboard ---
  const getStaffDashboardHelpContent = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-bold mt-2">Staff Dashboard Overview</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Your dashboard provides an at-a-glance summary of your workload and the most urgent issues.
        </p>

        <div className="space-y-4 border p-3 rounded-lg bg-indigo-50/50">
          <h5 className="font-semibold">Key Dashboard Sections</h5>

          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Recent Issues (Pending)</p>
              <p className="text-xs text-gray-600">
                This section shows all **Pending** issues in your assigned maintenance area that haven't been claimed yet.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ListTodo className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Issues Working On (Assigned/In-Progress)</p>
              <p className="text-xs text-gray-600">
                This shows issues that are currently **Assigned** or **In-Progress** by you. Use this for quick access to your active tasks.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Resolved Issues (History)</p>
              <p className="text-xs text-gray-600">
                This card tracks the total number of issues you have successfully **Resolved**, serving as your issue history count.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="default"
          className="w-full mt-4"
          onClick={() => {
            router.push('/staff/issues');
            setIsHelpSidebarOpen(false);
          }}
        >
          Go to Manage All Issues
        </Button>
      </div>
    );
  };

  // --- Help Content tailored to the Profile Page ---
  const getProfileHelpContent = () => {
    const profileButton = (userType !== 'manager') ?
      <Button
        variant="outline"
        className="w-full justify-start text-sm"
        onClick={() => {
          handleProfileClick();
          setIsHelpSidebarOpen(false); // Close help when navigating
        }}
      >
        <User className="h-4 w-4 mr-2" />
        Go to Profile Page
      </Button> : null;

    return (
      <div className="space-y-4">
        {profileButton}
        <h4 className="font-semibold mt-4">Manage Account Security</h4>
        <p className="text-xs text-muted-foreground">
          On the Profile page, two critical security actions require careful steps:
        </p>

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start text-sm">
            <KeyRound className="h-4 w-4 mr-2 text-red-500" />
            Change Password
          </Button>
          <p className="text-xs ml-6 text-gray-600">
            Check the **'Change Password?'** box. You must enter your **Current Password** to re-authenticate before saving a new one.
          </p>

          <Button variant="outline" className="w-full justify-start text-sm">
            <Mail className="h-4 w-4 mr-2 text-red-500" />
            Change Email Address
          </Button>
          <p className="text-xs ml-6 text-gray-600 font-semibold">
            **This action will log you out!** Check the **'Allow Email Change?'** box, save, and click the **verification link** sent to your new email.
          </p>
        </div>

        {userType === 'staff' && (
          <div className="mt-4">
            <h4 className="font-semibold">Staff Field: Maintenance Area</h4>
            <p className="text-xs text-muted-foreground">
              Ensure your **Maintenance Area** (e.g., Plumber) is correct for proper issue assignment.
            </p>
          </div>
        )}
        {userType === 'student' && (
          <div className="mt-4">
            <h4 className="font-semibold">Student Field: Residence Address</h4>
            <p className="text-xs text-muted-foreground">
              Keep your **Residence Address** accurate. Staff use this to quickly locate your reported issues.
            </p>
          </div>
        )}
        {userType === 'manager' && (
          <div className="mt-4">
            <h4 className="font-semibold">Your Role Status</h4>
            <p className="text-xs text-muted-foreground">
              Your **Role** is set to "Residence Manager" and cannot be changed on this page.
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- Help Content for Manage Issues Page (Staff/Manager) ---
  const getManageIssuesHelpContent = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-bold mt-2">Manage Issues Lifecycle</h4>
        <p className="text-sm text-muted-foreground mb-4">
          {userType === 'staff' ?
            "This view tracks an issue from being **Pending** to being **Resolved**. Use the context-sensitive buttons to progress the issue." :
            "As a **Manager**, you primarily monitor issue status and reassign staff. Only Staff can use the lifecycle buttons (Accept/Attend/Resolve)."
          }
        </p>

        {userType === 'staff' && (
          <div className="space-y-4 border p-3 rounded-lg bg-yellow-50/50">
            <h5 className="font-semibold">Staff Issue Actions</h5>

            <Button variant="outline" className="w-full justify-start text-sm bg-yellow-100 border-yellow-300">
              <Check className="h-4 w-4 mr-2" />
              Accept (Pending → Assigned)
            </Button>
            <p className="text-xs ml-6 text-gray-600">
              Click **Accept** on a **Pending** issue to take ownership. Status moves to **Assigned**.
            </p>

            <Button variant="outline" className="w-full justify-start text-sm bg-blue-100 border-blue-300">
              <Wrench className="h-4 w-4 mr-2" />
              Attend (Assigned → In-Progress)
            </Button>
            <p className="text-xs ml-6 text-gray-600">
              Click **Attend** when you start the work on site. Status moves to **In-Progress**.
            </p>

            <Button variant="outline" className="w-full justify-start text-sm bg-green-100 border-green-300">
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve (In-Progress → Resolved)
            </Button>
            <p className="text-xs ml-6 text-gray-600">
              Click **Resolve** once the maintenance work is complete. Status moves to **Resolved**.
            </p>
          </div>
        )}

        {userType === 'manager' && (
          <div className="space-y-2 border p-3 rounded-lg bg-red-50/50">
            <h5 className="font-semibold flex items-center"><Users className="h-4 w-4 mr-2" /> Manager Actions</h5>
            <p className="text-xs text-muted-foreground">
              In the issue detail view, you can **Change Priority** and **Reassign** the issue to a different staff member or area. Use this for load balancing or correction.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Logic to determine the content to show based on the current helpTopic state
  const getCurrentHelpContent = () => {
    switch (helpTopic) {
      case "studentDashboard":
        return getStudentDashboardHelpContent();
      case "reportIssue": // ✅ NEW CASE
        return getReportIssueHelpContent(); // ✅ NEW FUNCTION CALL
      case "profile":
        return getProfileHelpContent();
      case "manageIssues":
        return getManageIssuesHelpContent();
      case "staffDashboard":
        return getStaffDashboardHelpContent();
      default:
        return null;
    }
  };


  return (
    <>
      <nav className="bg-card border-b border-border px-4 py-3">
        {/* Navigation Bar Content */}
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo and Main Nav Links (Left side) */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-3">
              <img src="/reshelp-logo.png" alt="ResHelp" className="h-12" />
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
              {userType !== "manager" && (
                <Button
                  variant="ghost"
                  onClick={handleProfileClick}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  const activeTopic = getActiveHelpTopic(currentPage, userType);
                  openHelpForTopic(activeTopic);
                }}
                className="flex items-center space-x-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </Button>
            </div>
          </div>
          {/* Desktop Notification and Logout / Mobile Toggles */}
          <div className="flex items-center space-x-4">
            <NotificationCenter userType={userType} />
            {/* Desktop Only Logout Button */}
            <Button variant="outline" onClick={handleLogout} className="hidden md:flex items-center space-x-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center space-x-2">
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
                    {userType !== "manager" && (
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
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const activeTopic = getActiveHelpTopic(currentPage, userType);
                        openHelpForTopic(activeTopic);
                        setIsSidebarOpen(false); // Close mobile menu when opening help
                      }}
                      className="flex justify-start items-center space-x-2 w-full"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>Help</span>
                    </Button>

                    {/* User Info Block (Conditional) */}
                    {(userName || userEmail) && (
                      <div className="border-t border-border mt-4 pt-4">
                        {userName && <div className="font-semibold">{userName}</div>}
                        {userEmail && <div className="text-sm text-gray-500 truncate">{userEmail}</div>}
                      </div>
                    )}

                    {/* Logout Button (Always Present) */}
                    <div className={`${!(userName || userEmail) ? "border-t border-border mt-4 pt-4" : "mt-2"}`}>
                      <Button
                        onClick={() => {
                          handleLogout()
                          setIsSidebarOpen(false) // Close the sheet on logout
                        }}
                        className="flex justify-start items-center space-x-2 w-full"
                        variant="ghost"
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
        </div>
      </nav>

      {/* --- DEDICATED HELP/SUPPORT SHEET (DYNAMIC) --- */}
      {/* --- DEDICATED HELP/SUPPORT SHEET (DYNAMIC) --- */}
      <Sheet open={isHelpSidebarOpen} onOpenChange={setIsHelpSidebarOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>
                {helpTopic === "profile" ? "Profile Management" :
                  helpTopic === "manageIssues" ? "Staff Issues Guide" :
                    helpTopic === "staffDashboard" ? "Staff Dashboard Guide" :
                      helpTopic === "studentDashboard" ? "Student Dashboard Guide" :
                        helpTopic === "reportIssue" ? "Issue Reporting Guide" : // ✅ NEW TITLE
                          "In-App Help Menu"}
              </span>
            </SheetTitle>
          </SheetHeader>
          {/* ✅ SCROLLBAR FIX HERE: */}
          <div className="h-full overflow-y-auto p-4 space-y-4">

            {/* Default/Initial Help Menu */}
            {helpTopic === "default" && (
              <>
                {/* Fixed Footer Content (Shown only when viewing a specific topic) */}
            {(helpTopic !== "default") && (
              <div className="border-t pt-4 space-y-2"></div>
            )}

                <h3 className="text-lg font-bold text-primary">Need assistance?</h3>
                <p className="text-sm text-muted-foreground">
                  Select a topic below for contextual information on a specific page.
                </p>

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium">Quick Guides</h4>

                  {/* Dashboard Button (Staff Only) */}
                  {userType === "staff" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setHelpTopic("staffDashboard")}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Staff Dashboard Overview
                    </Button>
                  )}

                  {/* 🌟 NEW: Report Issue Button (Student Only) */}
                  {userType === "student" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setHelpTopic("reportIssue")} // ✅ NEW CLICK HANDLER
                    >
                      <Plus className="h-4 w-4 mr-2 text-red-500" />
                      Reporting Issues & Hazard Guide
                    </Button>
                  )}

                  {/* 🌟 NEW: Dashboard Button (Student Only) */}
                  {userType === "student" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setHelpTopic("studentDashboard")}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Student Dashboard & Issue Tracking
                    </Button>
                  )}

                  {/* Profile Button */}
                  {userType !== "manager" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setHelpTopic("profile")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      How to Edit Your Profile & Security
                    </Button>
                  )}

                  {/* Manage Issues Button (Staff/Manager) */}
                  {userType === "staff" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setHelpTopic("manageIssues")}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Manage Issues Action Buttons
                    </Button>
                  )}
                  {userType === "manager" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        router.push('/manager/issues');
                        setIsHelpSidebarOpen(false);
                      }}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      View All Issues (Manager)
                    </Button>
                  )}

                </div>
              </>
            )}

            {/* Dynamic Help Content */}
            {(helpTopic !== "default") && (
              <>
                <div className="space-y-4 border p-3 rounded-lg bg-secondary/10">
                  {getCurrentHelpContent()}
                </div>
                <Button variant="link" className="p-0 justify-start" onClick={() => setHelpTopic("default")}>
                  &larr; Back to Help Menu
                </Button>
              </>
            )}

          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}