"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, AlertTriangle, Clock, User, MapPin, Calendar, MessageSquare } from "lucide-react"

// Mock issue data
const issueData = {
  id: "1",
  title: "Broken door lock",
  description:
    "Room door lock is not working properly. The key turns but the lock mechanism doesn't engage. This is a security concern as the door cannot be properly secured.",
  student: "John Smith",
  studentEmail: "john.smith@university.edu",
  room: "Room 205, Building A",
  priority: "high",
  status: "reported",
  category: "locks",
  reportedAt: "2024-01-16 09:30",
  updatedAt: "2024-01-16 09:30",
  isUrgent: true,
  imageUrl: "/broken-door-lock.png",
  updates: [
    {
      id: "1",
      message: "Issue reported by student",
      author: "System",
      timestamp: "2024-01-16 09:30",
      status: "reported",
    },
  ],
}

export default function IssueDetails() {
  const [newComment, setNewComment] = useState("")
  const [newStatus, setNewStatus] = useState(issueData.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const params = useParams()

  const handleStatusUpdate = async () => {
    setIsUpdating(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("Status updated to:", newStatus)
    console.log("Comment added:", newComment)

    setIsUpdating(false)
    setNewComment("")
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
      <Navigation userType="staff" currentPage="/staff/issues" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/staff/issues")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Issues</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Issue Details</h1>
            <p className="text-muted-foreground">Issue #{params.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Issue Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <span>{issueData.title}</span>
                      {issueData.isUrgent && (
                        <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>URGENT</span>
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getStatusColor(issueData.status)}>{issueData.status.replace("-", " ")}</Badge>
                      <Badge className={getPriorityColor(issueData.priority)}>{issueData.priority} priority</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{issueData.description}</p>

                {/* Issue Image */}
                <div className="mb-4">
                  <img
                    src={issueData.imageUrl || "/placeholder.svg"}
                    alt="Issue photo"
                    className="w-full max-w-md rounded-lg border border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Student: {issueData.student}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Location: {issueData.room}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Reported: {issueData.reportedAt}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Updated: {issueData.updatedAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Updates Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Updates & Comments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issueData.updates.map((update) => (
                    <div key={update.id} className="border-l-2 border-border pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{update.author}</span>
                        <span className="text-xs text-muted-foreground">{update.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{update.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Update Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Comment</label>
                  <Textarea
                    placeholder="Add a comment about the progress or resolution..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || newStatus === issueData.status}
                  className="w-full"
                >
                  {isUpdating ? "Updating..." : "Update Issue"}
                </Button>
              </CardContent>
            </Card>

            {/* Student Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Student Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Name:</strong> {issueData.student}
                  </p>
                  <p>
                    <strong>Email:</strong> {issueData.studentEmail}
                  </p>
                  <p>
                    <strong>Room:</strong> {issueData.room}
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Contact Student
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
