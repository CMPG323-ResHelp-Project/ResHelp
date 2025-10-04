"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle, Users, Wrench, ListTodo, History } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"

interface Issue {
  id: string
  title: string
  description?: string
  status: "assigned" | "in-progress" | "resolved" | "pending"
  priority: "low" | "medium" | "high"
  category?: string
  room?: string
  student?: string
  isUrgent?: boolean
  updatedAt?: string
  reportedAt?: string
  rating?: number | null 
}

// Mock data for staff dashboard (Using state initial values)
// Mock data for demonstration
const mockDashboardStats = {
  totalIssues: 12,
  pendingIssues: 3,
  inProgressIssues: 4,
  resolvedToday: 2,
  urgentIssues: 1,
}

const mockRecentIssues: Issue[] = [
  { id: "1001", title: "Leaking Faucet in Unit 3A", status: "assigned", priority: "high", isUrgent: true, student: "Alice Smith", room: "Unit 3A", reportedAt: "1 hour ago" },
  { id: "1002", title: "Broken Window in Hallway B", status: "assigned", priority: "medium", isUrgent: false, student: "Bob Johnson", room: "Hallway B", reportedAt: "3 hours ago" },
  { id: "1003", title: "No Hot Water, Unit 1C", status: "assigned", priority: "high", isUrgent: false, student: "Charlie Brown", room: "Unit 1C", reportedAt: "5 hours ago" },
]

const mockWorkingOnIssues: Issue[] = [
  { id: "950", title: "Clogged Toilet, Unit 2B", status: "in-progress", priority: "medium", isUrgent: false, reportedAt: "Yesterday" },
  { id: "945", title: "Light flickering in Gym", status: "in-progress", priority: "low", isUrgent: false, reportedAt: "2 days ago" },
]

// Mock data for Issue History (resolved/older issues)
const mockIssueHistory: Issue[] = [
  { id: "880", title: "Door lock fixed Unit 4D", status: "resolved", priority: "medium", isUrgent: false, student: "Emma Davis", room: "Unit 4D", reportedAt: "1 week ago", updatedAt: "1 week ago" },
  { id: "875", title: "HVAC filter replaced", status: "resolved", priority: "low", isUrgent: false, student: "Alex Clark", room: "Maintenance Room", reportedAt: "1 week ago", updatedAt: "1 week ago" },
  { id: "870", title: "Loud noise from boiler room", status: "resolved", priority: "high", isUrgent: false, student: "Mia Taylor", room: "Boiler Room", reportedAt: "2 weeks ago", updatedAt: "2 weeks ago" },
  { id: "865", title: "Broken chair in computer lab", status: "resolved", priority: "low", isUrgent: false, student: "Liam Wilson", room: "Lab 2", reportedAt: "2 weeks ago", updatedAt: "2 weeks ago" },
  { id: "860", title: "Graffiti removed from wall", status: "resolved", priority: "medium", isUrgent: false, student: "Noah Brown", room: "Exterior Wall", reportedAt: "3 weeks ago", updatedAt: "3 weeks ago" },
]


export default function StaffDashboard() {
  const [dashboardStats, setDashboardStats] = useState(mockDashboardStats)
  const [recentIssues, setRecentIssues] = useState<Issue[]>(mockRecentIssues)
  const [workingOnIssues, setWorkingOnIssues] = useState<Issue[]>(mockWorkingOnIssues)
  const [issueHistory, setIssueHistory] = useState<Issue[]>(mockIssueHistory)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "assigned":
        return "bg-purple-100 text-purple-800"  // ✅ Added
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Retaining the useEffect logic for completeness, but relying on mock data for the requested change.
  // Retaining the useEffect logic for completeness, but relying on mock data for the requested change.
  useEffect(() => {
    const fetchStaffDashboard = async () => {
      setLoading(true)
      setError(null)
      try {
        const user = auth.currentUser
        if (!user) throw new Error("User not logged in")
  
        const token = await user.getIdToken()
  
        // 1️⃣ Fetch Dashboard
        const dashboardRes = await fetch("http://localhost:5229/StaffIssues/dashboard", {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        })
  
        if (!dashboardRes.ok) {
          const errData = await dashboardRes.json()
          throw new Error(errData.error || "Failed to fetch dashboard")
        }
  
        const dashboardData = await dashboardRes.json()
        setDashboardStats(dashboardData.dashboardStats)
  
        setRecentIssues(
          dashboardData.recentIssues.map((issue: any): Issue => ({
            id: issue.Id,
            title: issue.Title,
            description: issue.Description,
            status: issue.Status?.toLowerCase() || "pending",
            priority: issue.Priority?.toLowerCase() || "low",
            category: issue.Category,
            room: issue.Address,
            student: issue.ReporterName,
            isUrgent: issue.IsUrgent,
            updatedAt: issue.UpdatedAt,
          })).filter((issue: Issue) => issue.status === "pending")
        )
  
        setWorkingOnIssues(
          dashboardData.workingOnIssues.map((issue: any): Issue => ({
            id: issue.Id,
            title: issue.Title,
            status: issue.Status?.toLowerCase() || "in-progress",
            priority: issue.Priority?.toLowerCase() || "low",
            isUrgent: issue.IsUrgent,
            updatedAt: issue.UpdatedAt,
          })).filter((issue: Issue) => issue.status === "in-progress" || issue.status === "assigned")
        )
  
        // 2️⃣ Fetch History
        const historyRes = await fetch("http://localhost:5229/StaffIssues/history", {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        })
  
        if (!historyRes.ok) {
          const errData = await historyRes.json()
          throw new Error(errData.error || "Failed to fetch history")
        }
  
        const historyData = await historyRes.json()
  
        // Map history issues to same structure
        const mappedHistory: Issue[] = historyData.resolvedIssues.map((issue: any): Issue => ({
          id: issue.Id,
          title: issue.Title,
          description: issue.Description,
          status: issue.Status?.toLowerCase() || "resolved",
          priority: issue.Priority?.toLowerCase() || "low",
          category: issue.Category,
          room: issue.Address,
          student: issue.ReporterName,
          isUrgent: issue.IsUrgent,
          updatedAt: issue.UpdatedAt,
          reportedAt: issue.ReportedAt,
          rating: issue.Rating ?? null, // include rating if available
        }))
  
        setIssueHistory(mappedHistory)
  
        // Optional: log history stats
        console.log("History stats:", {
          overallRating: historyData.overallRating,
          totalResolvedCancelled: historyData.totalResolvedCancelled,
          ratedCount: historyData.ratedCount,
        })
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard")
        setDashboardStats(mockDashboardStats)
        setRecentIssues(mockRecentIssues)
        setWorkingOnIssues(mockWorkingOnIssues)
        setIssueHistory(mockIssueHistory)
      } finally {
        setLoading(false)
      }
    }
  
    fetchStaffDashboard()
  }, [])
  


  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="staff" currentPage="/staff/dashboard" />
  
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Dashboard</h1>
            <p className="text-muted-foreground">Manage and track maintenance requests</p>
          </div>
          <Button onClick={() => router.push("/staff/issues")} className="flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Manage All Issues</span>
          </Button>
        </div>
  
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {loading ? (
            <p className="text-center text-muted-foreground col-span-5 mt-4">Loading stats...</p>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Issues</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalIssues}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{dashboardStats.pendingIssues}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold">{dashboardStats.inProgressIssues}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved Today</p>
                      <p className="text-2xl font-bold">{dashboardStats.resolvedToday}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Urgent</p>
                      <p className="text-2xl font-bold">{dashboardStats.urgentIssues}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
  
        {/* Two-Part Issues Section */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Left: Recent Issues */}
          <div className="col-span-3 lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span>Recent Issues</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <p className="text-center text-muted-foreground mt-8">Loading recent issues...</p>
                ) : recentIssues.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No new issues</h3>
                    <p>No maintenance requests have been reported recently.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-foreground truncate">{issue.title}</h3>
                            {issue.isUrgent && (
                              <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>URGENT</span>
                              </Badge>
                            )}
                            <Badge className={getStatusColor(issue.status)}>{issue.status.replace("-", " ")}</Badge>
                            <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground">
                            <span>Student: {issue.student}</span>
                            <span>Location: {issue.room}</span>
                            <span>Reported: {issue.updatedAt}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/staff/issues/${issue.id}`)}
                          className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0"
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
  
          {/* Right: Issues Working On */}
          <div className="col-span-3 lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                  <span>Issues Working On</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <p className="text-center text-muted-foreground mt-8">Loading working issues...</p>
                ) : workingOnIssues.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Wrench className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">No issues currently in progress.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workingOnIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex flex-col items-start p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-full">
                          <h4 className="font-medium text-foreground truncate">{issue.title}</h4>
                          <div className="flex items-center justify-between text-xs mt-1 mb-2">
                            <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                            <span className="text-muted-foreground">{issue.reportedAt}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/staff/issues/${issue.id}`)}
                          className="w-full mt-1"
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
  
        {/* Full-Width History Container */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-gray-500" />
                <span>Issue History</span>
              </div>
            </CardTitle>
            <div className="mt-2 flex space-x-6 text-sm text-muted-foreground">
  <span>
    Total Resolved: {loading ? "..." : issueHistory.length}
  </span>
  <span>
    Average Rating:{" "}
    {loading
      ? "..."
      : issueHistory.filter(i => i.rating != null).length > 0
        ? (
            issueHistory
              .filter(i => i.rating != null)
              .reduce((acc, i) => acc + (i.rating || 0), 0) /
            issueHistory.filter(i => i.rating != null).length
          ).toFixed(1)
        : "N/A"}
  </span>
</div>

          </CardHeader>
  
          <CardContent className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-center text-muted-foreground mt-8">Loading issue history...</p>
            ) : issueHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Historical Issues</h3>
                <p>Resolved and older maintenance requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {issueHistory.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">{issue.title}</h3>
                        <Badge className={getStatusColor(issue.status)}>{issue.status.replace("-", " ")}</Badge>
                        <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground">
                        <span>Location: {issue.room}</span>
                        <span>Resolved: {issue.updatedAt}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/staff/issues/${issue.id}`)}
                      className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0"
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}  