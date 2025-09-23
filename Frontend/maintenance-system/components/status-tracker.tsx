"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, AlertTriangle, Wrench, MessageSquare, User } from "lucide-react"

interface StatusUpdate {
  id: string
  message: string
  author: string
  authorType: "student" | "staff" | "system"
  timestamp: string
  status?: string
}

interface StatusTrackerProps {
  issueId: string
  currentStatus: "reported" | "in-progress" | "resolved"
  priority: "low" | "medium" | "high"
  isUrgent?: boolean
  updates: StatusUpdate[]
  onAddComment?: (comment: string) => void
  userType: "student" | "staff" | "manager"
}

export function StatusTracker({
  issueId,
  currentStatus,
  priority,
  isUrgent = false,
  updates,
  onAddComment,
  userType,
}: StatusTrackerProps) {
  const getStatusProgress = (status: string) => {
    switch (status) {
      case "reported":
        return 25
      case "in-progress":
        return 65
      case "resolved":
        return 100
      default:
        return 0
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reported":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "in-progress":
        return <Wrench className="h-4 w-4 text-blue-600" />
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
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

  const getAuthorIcon = (authorType: string) => {
    switch (authorType) {
      case "staff":
        return <Wrench className="h-4 w-4 text-blue-600" />
      case "student":
        return <User className="h-4 w-4 text-green-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>Status Tracking</span>
            {isUrgent && (
              <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>URGENT</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(currentStatus)}>{currentStatus.replace("-", " ")}</Badge>
            <Badge className={getPriorityColor(priority)}>{priority} priority</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{getStatusProgress(currentStatus)}% complete</span>
          </div>
          <Progress value={getStatusProgress(currentStatus)} className="h-2" />
        </div>

        {/* Status Steps */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ["reported", "in-progress", "resolved"].includes(currentStatus)
                  ? "bg-yellow-100 border-2 border-yellow-500"
                  : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium">Issue Reported</p>
              <p className="text-sm text-muted-foreground">Your maintenance request has been submitted</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ["in-progress", "resolved"].includes(currentStatus)
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              <Wrench className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Work in Progress</p>
              <p className="text-sm text-muted-foreground">Maintenance staff is working on your issue</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStatus === "resolved"
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Issue Resolved</p>
              <p className="text-sm text-muted-foreground">Your maintenance request has been completed</p>
            </div>
          </div>
        </div>

        {/* Updates Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Updates & Communication</span>
          </h4>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {updates.map((update) => (
              <div key={update.id} className="flex space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">{getAuthorIcon(update.authorType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{update.author}</p>
                    <p className="text-xs text-muted-foreground">{update.timestamp}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{update.message}</p>
                  {update.status && (
                    <Badge className={`${getStatusColor(update.status)} mt-1 text-xs`}>
                      Status: {update.status.replace("-", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {userType === "student" && currentStatus !== "resolved" && (
          <div className="pt-4 border-t border-border">
            <Button variant="outline" className="w-full bg-transparent">
              Contact Maintenance Staff
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
