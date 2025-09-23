"use client"

import { Navigation } from "@/components/navigation"
import { StatusTracker } from "@/components/status-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, User } from "lucide-react"

// Mock issue data with status updates
const issueData = {
  id: "1",
  title: "Leaking faucet in bathroom",
  description: "Water dripping constantly from bathroom sink faucet. The drip is getting worse and creating a puddle.",
  category: "plumbing",
  priority: "medium" as const,
  status: "in-progress" as const,
  isUrgent: false,
  location: "Room 312, Building A",
  reportedAt: "2024-01-15 14:20",
  updatedAt: "2024-01-16 10:30",
  imageUrl: "/leaking-faucet.png",
}

const statusUpdates = [
  {
    id: "1",
    message: "Issue reported by student",
    author: "System",
    authorType: "system" as const,
    timestamp: "2024-01-15 14:20",
    status: "reported",
  },
  {
    id: "2",
    message: "Issue has been assigned to maintenance staff",
    author: "System",
    authorType: "system" as const,
    timestamp: "2024-01-15 15:45",
  },
  {
    id: "3",
    message:
      "I've reviewed the issue and will be there tomorrow morning to fix the faucet. I'll bring replacement parts.",
    author: "John Martinez",
    authorType: "staff" as const,
    timestamp: "2024-01-15 16:20",
  },
  {
    id: "4",
    message: "Work has started on your faucet repair",
    author: "John Martinez",
    authorType: "staff" as const,
    timestamp: "2024-01-16 10:30",
    status: "in-progress",
  },
]

export default function StudentIssueDetails() {
  const router = useRouter()
  const params = useParams()

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="student" currentPage="/student/dashboard" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/student/dashboard")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Issue Tracking</h1>
            <p className="text-muted-foreground">Issue #{params.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issue Details */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{issueData.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{issueData.description}</p>

                {/* Issue Image */}
                <div className="mb-4">
                  <img
                    src={issueData.imageUrl || "/placeholder.svg?height=200&width=300&query=leaking bathroom faucet"}
                    alt="Issue photo"
                    className="w-full max-w-md rounded-lg border border-border"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Location: {issueData.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Reported: {issueData.reportedAt}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Category: {issueData.category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Last Updated: {issueData.updatedAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Tracker */}
          <div>
            <StatusTracker
              issueId={issueData.id}
              currentStatus={issueData.status}
              priority={issueData.priority}
              isUrgent={issueData.isUrgent}
              updates={statusUpdates}
              userType="student"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
