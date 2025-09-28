"use client"

import { useEffect, useState } from "react"
import { onSnapshot, collection, query, orderBy, limit, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle, Users, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StaffDashboard() {
  const router = useRouter()

  // ✅ State for stats and recent issues
  const [dashboardStats, setDashboardStats] = useState({
    totalIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    resolvedToday: 0,
    urgentIssues: 0,
  })
  const [recentIssues, setRecentIssues] = useState<any[]>([])

  // ✅ Real-time subscription
  useEffect(() => {
    const q = query(collection(db, "issues"), orderBy("reportedAt", "desc"), limit(5))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Compute stats
      const totalIssues = issues.length
      const pendingIssues = issues.filter((i: any) => i.status === "reported").length
      const inProgressIssues = issues.filter((i: any) => i.status === "in-progress").length
      const resolvedToday = issues.filter((i: any) => {
        if (!i.statusUpdatedAt) return false
        const updated = new Date(i.statusUpdatedAt.seconds * 1000)
        const today = new Date()
        return i.status === "resolved" && updated.toDateString() === today.toDateString()
      }).length
      const urgentIssues = issues.filter((i: any) => i.priority === "high").length

      setDashboardStats({ totalIssues, pendingIssues, inProgressIssues, resolvedToday, urgentIssues })
      setRecentIssues(issues)
    })

    return () => unsubscribe()
  }, [])

  // ✅ Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "reported":
        return "bg-yellow-100 text-yellow-800"
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

        {/* ✅ Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
        </div>

        {/* ✅ Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIssues.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent issues</h3>
                <p>No maintenance requests have been reported yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentIssues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-foreground">{issue.title}</h3>
                        {issue.priority === "high" && (
                          <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>URGENT</span>
                          </Badge>
                        )}
                        <Badge className={getStatusColor(issue.status)}>{issue.status.replace("-", " ")}</Badge>
                        <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Student: {issue.student}</span>
                        <span>Location: {issue.room}</span>
                        <span>
                          Reported:{" "}
                          {issue.reportedAt?.seconds
                            ? new Date(issue.reportedAt.seconds * 1000).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/staff/issues/${issue.id}`)} className="ml-4">
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
