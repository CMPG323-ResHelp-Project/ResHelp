"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

// Mock data for student's issues
const mockIssues: any[] = []

export default function StudentDashboard() {
  const router = useRouter()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reported":
        return <Clock className="h-4 w-4" />
      case "in-progress":
        return <AlertTriangle className="h-4 w-4" />
      case "resolved":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

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
      <Navigation userType="student" currentPage="/student/dashboard" />

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Issues</h1>
            <p className="text-muted-foreground">Track and manage your maintenance requests</p>
          </div>
          <Button onClick={() => router.push("/student/report")} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Report New Issue</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {mockIssues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(issue.status)}
                      <h3 className="font-semibold text-foreground">{issue.title}</h3>
                      <Badge className={getStatusColor(issue.status)}>{issue.status.replace("-", " ")}</Badge>
                      <Badge className={getPriorityColor(issue.priority)}>{issue.priority} priority</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{issue.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Reported: {issue.reportedAt}</span>
                      <span>Updated: {issue.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {mockIssues.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground mb-4">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No issues reported</h3>
                <p>You haven't reported any maintenance issues yet.</p>
              </div>
              <Button onClick={() => router.push("/student/report")}>Report Your First Issue</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
