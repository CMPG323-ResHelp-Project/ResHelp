"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, AlertTriangle, Clock, User, MapPin, Calendar, MessageSquare, CornerDownRight, Check, Wrench, Star } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Define type for issue
type Issue = {
  id: string
  title: string
  description: string
  priority: string
  status: string
  category: string
  reportedAt: string
  updatedAt: string
  isUrgent: boolean
  imageUrl?: string
  location: string
  staffname: string
  staffsurname: string
  staffemail: string
  staffphone: string
  updates: { // Keep the updates type, but remove the rendering
    id: string
    message: string
    author: string
    timestamp: string
    status: string
  }[]
  studentName: string
  studentSurname: string
  studentAddress: string
  studentPhone: string
  studentEmail: string
  rating?: number | null // *** Student rating for the issue ***
}

type IssueAction = "accept" | "attend" | "resolve";

interface IssueConfirm {
  issue: Issue;
  action: IssueAction;
}

/**
 * Renders a star rating display (e.g., ★★★☆☆) based on the score out of 5.
 * @param score The rating value (0 to 5).
 * @returns JSX.Element for the star rating.
 */
const StarRatingDisplay = ({ score }: { score: number }) => {
  // Clamp score between 0 and 5
  const clampedScore = Math.max(0, Math.min(5, score));
  // Determine the number of full stars
  const fullStars = Math.floor(clampedScore);
  const emptyStars = 5 - fullStars;

  const starElements = [];

  // Full Stars (filled)
  for (let i = 0; i < fullStars; i++) {
    starElements.push(<Star key={`full-${i}`} className="h-6 w-6 fill-yellow-500 text-yellow-500" />);
  }

  // Empty Stars (outline)
  for (let i = 0; i < emptyStars; i++) {
    starElements.push(<Star key={`empty-${i}`} className="h-6 w-6 fill-transparent text-yellow-500" />);
  }

  return (
    <span className="flex items-center space-x-0.5">
      {starElements}
    </span>
  );
};

// Helper to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending": return <Clock className="h-4 w-4 text-yellow-600" />;
    case "assigned": return <Check className="h-4 w-4 text-indigo-600" />;
    case "in-progress": return <Wrench className="h-4 w-4 text-blue-600" />;
    case "resolved": return <Check className="h-4 w-4 text-green-600" />;
    default: return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

export default function IssueDetails() {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [issueToConfirm, setIssueToConfirm] = useState<IssueConfirm | null>(null)
  const router = useRouter()
  const params = useParams()

  // Fetch issue by ID
  useEffect(() => {
    const fetchIssue = async () => {
      if (!params?.id) return

      try {
        const user = auth.currentUser
        if (!user) throw new Error("User not logged in")

        const token = await user.getIdToken()

        const res = await fetch(`http://localhost:5229/StaffIssues/${params.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || "Failed to fetch issue")
        }

        const data = await res.json()

        const normalizedIssue: Issue = {
          id: data.Id,
          title: data.Title,
          description: data.Description,
          status: data.Status?.toLowerCase(),
          priority: data.Priority?.toLowerCase(),
          category: data.Category,
          reportedAt: data.ReportedAt,
          updatedAt: data.UpdatedAt,
          isUrgent: data.IsUrgent,
          imageUrl: data.ImageUrl,
          location: data.Location,
          staffname: data.DriverName,
          staffsurname: data.DriverSurname,
          staffemail: data.DriverEmail,
          staffphone: data.DriverPhone,
          updates: data.Updates?.map((u: any) => ({
            id: u.Id,
            message: u.Message,
            author: u.Author,
            timestamp: u.Timestamp,
            status: u.Status,
          })) || [],
          studentName: data.StudentName,
          studentSurname: data.StudentSurname,
          studentAddress: data.StudentAddress,
          studentPhone: data.StudentPhone,
          studentEmail: data.StudentEmail,
          // *** FIX APPLIED: Use API data for rating, if available ***
          rating: data.Rating != null ? parseFloat(data.Rating) : null,
          // *** END FIX ***
        }

        setIssue(normalizedIssue)
      } catch (err: any) {
        console.error("Error fetching issue:", err)
        alert(err.message || "Failed to fetch issue")
        // Fallback mock data for testing UI if fetch fails
      }
    }

    fetchIssue()
  }, [params?.id])

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200"
      case "assigned":
        return "bg-indigo-100 text-indigo-700 border border-indigo-200"
      case "in-progress":
        return "bg-blue-100 text-blue-700 border border-blue-200"
      case "resolved":
        return "bg-green-100 text-green-700 border border-green-200"
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200"
    }
  }

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-orange-400 text-white"
      case "low":
        return "bg-green-400 text-white"
      default:
        return "bg-gray-400 text-white"
    }
  }

  if (!issue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading issue details...</p>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType="student" currentPage="/student/issues" />

      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/student/dashboard")}
            className="flex items-center space-x-2 border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Issue Details</h1>
            <p className="text-lg text-gray-500">Request ID: <span className="font-mono text-sm text-gray-600">#{issue.id}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Issue Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Issue Card */}
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3 text-2xl font-bold">
                      {getStatusIcon(issue.status)}
                      <h4 className="text-lg font-semibold mb-2 text-gray-700">Title</h4>
                      </CardTitle>
                      <p className="text-gray-600 mb-6 border-l-4 border-primary/50 pl-3 italic">{issue.title}</p>
                    <div className="flex flex-wrap items-center space-x-2 mt-3">
                      <Badge className={getStatusColor(issue.status)}>{issue.status.replace("-", " ")}</Badge>
                      <Badge className={getPriorityColor(issue.priority)}>{issue.priority} priority</Badge>
                      {issue.isUrgent && (
                        <Badge className="bg-red-600 text-white flex items-center space-x-1 hover:bg-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          <span>URGENT</span>
                        </Badge>
                      )}
                      {/* *** RATING DISPLAY REMOVED FROM HEADER *** */}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <h4 className="text-lg font-semibold mb-2 text-gray-700">Description</h4>
                <p className="text-gray-600 mb-6 border-l-4 border-primary/50 pl-3 italic">{issue.description}</p>

                {/* Issue Image */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2 text-gray-700">Attachment</h4>
                  <img
                    src={issue.imageUrl || "/placeholder.svg"}
                    alt="Issue photo"
                    className="w-full max-w-sm rounded-lg shadow-md transition-shadow hover:shadow-xl cursor-pointer"
                  />
                </div>

                {/* *** RATING SECTION (MODIFIED FOR APPEALING DISPLAY) *** */}
                {issue.status === 'resolved' && (
                  <div className="mb-6 p-6 bg-white border border-yellow-300 rounded-xl shadow-lg">
                    <h4 className="text-xl font-bold mb-3 text-yellow-800 flex items-center space-x-2 border-b pb-2 border-yellow-200">
                      <Star className="h-6 w-6 fill-yellow-600 text-yellow-600" />
                      <span>Student Feedback Rating</span>
                    </h4>
                    {/* MODIFIED: Check for null AND greater than 0 */}
                    {issue.rating != null && issue.rating > 0 ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <span className="text-5xl font-extrabold text-yellow-700">
                            {parseFloat(issue.rating as any).toFixed(1)}
                          </span>
                          <span className="text-2xl font-bold text-gray-400">/ 5</span>
                        </div>
                        <div className="flex-shrink-0">
                          <StarRatingDisplay score={parseFloat(issue.rating as any)} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <MessageSquare className="h-5 w-5 text-gray-500" />
                        <p className="text-sm text-gray-600 italic">This resolved issue is **Not yet Rated** by the student.</p>
                      </div>
                    )}
                  </div>
                )}
                {/* *** END RATING SECTION *** */}

                <h4 className="text-lg font-semibold mb-3 text-gray-700">Metadata</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800">Reporter:</span>
                    <span className="text-gray-600">{issue.studentName} {issue.studentSurname}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800">Location:</span>
                    <span className="text-gray-600">{issue.location}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800">Reported:</span>
                    <span className="text-gray-600">{new Date(issue.reportedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800">Last Update:</span>
                    <span className="text-gray-600">{new Date(issue.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Contact Panel */}
            <Card className="shadow-md">
              <CardHeader className="border-b"><CardTitle className="text-xl">Staff Contact</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-6 text-sm">
                <div className="flex justify-between">
                  <strong className="text-gray-700">Name:</strong>
                  <span className="text-right">{issue.staffname} {issue.staffsurname}</span>
                </div>
                <div className="flex justify-between">
                  <strong className="text-gray-700">Email:</strong>
                  <a href={`mailto:${issue.staffemail}`} className="text-right text-primary hover:underline">{issue.staffemail}</a>
                </div>
                <div className="flex justify-between">
                  <strong className="text-gray-700">Phone:</strong>
                  <a href={`tel:${issue.staffphone}`} className="text-right text-primary hover:underline">{issue.staffphone}</a>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}