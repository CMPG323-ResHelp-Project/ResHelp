"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { Search, Filter, AlertTriangle, Clock, CheckCircle, Wrench, ChevronRight, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react"; // optional icon, can change to Check or Info

/**
 * @param dateString The ISO date/time string (e.g., "2025-10-05T17:53:46.8635690Z")
 * @returns A formatted string, e.g., "2025/10/05, 17:53:46" or "N/A".
 */

const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return "N/A"
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid Date"

    // Helper to add leading zero
    const pad = (num: number): string => num.toString().padStart(2, '0')

    // Get date components
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1) // Months are 0-indexed
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())

    // Assemble the final format: YYYY/MM/DD, HH:mm:ss
    return `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`
  } catch (e) {
    return "Error Formatting" // Fallback on parsing error
  }
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case "pending": return <Clock className="h-4 w-4" />
    case "in-progress": return <Wrench className="h-4 w-4" />
    case "resolved": return <CheckCircle className="h-4 w-4" />
    case "rejected": return <AlertTriangle className="h-4 w-4" />
    case "assigned": return <Check className="h-4 w-4" /> // Included the assigned state icon
    default: return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800"
    case "assigned": return "bg-indigo-100 text-indigo-800" // Included the assigned state color
    case "in-progress": return "bg-blue-100 text-blue-800"
    case "resolved": return "bg-green-100 text-green-800"
    case "rejected": return "bg-red-100 text-red-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "high": return "bg-red-100 text-red-800"
    case "medium": return "bg-orange-100 text-orange-800"
    case "low": return "bg-green-100 text-green-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

// -------------------- Types --------------------
interface Issue {
  id: string
  title: string
  description: string
  status: "pending" | "assigned" | "in-progress" | "resolved" | "rejected" | undefined
  priority: "high" | "medium" | "low" | undefined
  category: string
  room: string
  student: string
  isUrgent: boolean
  updatedAt: string // This is the date we will format
}

type IssueAction = "accept" | "attend" | "resolve";

interface IssueConfirm {
  issue: Issue;
  action: IssueAction;
}


// -------------------- Component --------------------
export default function StaffIssues() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issueToConfirm, setIssueToConfirm] = useState<IssueConfirm | null>(null);

  const router = useRouter()

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || issue.status === statusFilter.toLowerCase()
    const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:5229/StaffIssues/${issueId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }), // dynamically set status
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }

      const updatedData = await res.json();

      // Update local state
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? { ...issue, status: updatedData.status as Issue["status"], updatedAt: updatedData.UpdatedAt || new Date().toISOString() } // Use UpdatedAt from API or current time
            : issue
        )
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update status");
    }
  };



  useEffect(() => {
    const fetchStaffIssues = async () => {
      setLoading(true)
      setError(null)
      try {
        const user = auth.currentUser
        if (!user) {
          setError("User not logged in")
          return
        }

        const token = await user.getIdToken()
        const res = await fetch("http://localhost:5229/StaffIssues/all", {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || "Failed to fetch staff issues")
        }

        const data = await res.json()
        const normalizedIssues: Issue[] = data.map((issue: any) => ({
          id: issue.Id,
          title: issue.Title,
          description: issue.Description,
          status: issue.Status?.toLowerCase() as Issue["status"],
          priority: issue.Priority?.toLowerCase() as Issue["priority"],
          category: issue.Category,
          room: issue.Location,
          student: issue.ReporterName,
          isUrgent: issue.IsUrgent,
          updatedAt: issue.UpdatedAt, // This is the ISO string from the API
        }))

        setIssues(normalizedIssues)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to fetch staff issues")
      } finally {
        setLoading(false)
      }
    }

    fetchStaffIssues()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="staff" currentPage="/staff/issues" />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Issues</h1>
            <p className="text-muted-foreground">View and update all maintenance requests</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues by category or descption..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List Scrollable Container */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {filteredIssues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Top Section: Details and Badges */}
                <div className="flex-1 mb-4">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(issue.status)}
                    <h3 className="font-semibold text-foreground">{issue.title}</h3>
                    {issue.isUrgent && (
                      <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>URGENT</span>
                      </Badge>
                    )}
                    <Badge className={getStatusColor(issue.status)}>
                      {(issue.status ?? "unknown").replace("-", " ")}
                    </Badge>
                    <Badge className={getPriorityColor(issue.priority)}>
                      {(issue.priority ?? "unknown")} priority
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{issue.description}</p>
                  <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground">
                    <span>Student: {issue.student}</span>
                    <span>Location: {issue.room}</span>
                    <span>Category: {issue.category}</span>
                    {/* 💡 FIXED DATE FORMATTING HERE */}
                    <span>Reported: {formatDateTime(issue.updatedAt)}</span>
                  </div>
                </div>

                {/* Bottom Section / Actions */}
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <div className="flex space-x-2">
                    {/* Pending → Accept */}
                    {issue.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={() => setIssueToConfirm({ issue: issue, action: "accept" })}
                      >
                        Accept
                      </Button>
                    )}

                    {/* Assigned → Attend */}
                    {issue.status === "assigned" && (
                      <Button
                        variant="outline"
                        onClick={() => setIssueToConfirm({ issue: issue, action: "attend" })}
                      >
                        Attend
                      </Button>
                    )}

                    {/* In-progress → Resolve */}
                    {issue.status === "in-progress" && (
                      <Button
                        variant="outline"
                        onClick={() => setIssueToConfirm({ issue, action: "resolve" })}
                      >
                        Resolve
                      </Button>
                    )}

                    {/* View Details */}
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/staff/issues/${issue.id}`)}
                      className="text-sm text-primary p-0 h-auto hover:bg-transparent"
                    >
                      View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading/Error/No Issues messages (kept outside the scroll container) */}
        {loading && <p className="text-center text-muted-foreground mt-8">Loading issues...</p>}
        {error && (
          <div className="text-center text-red-500 mt-8">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        )}
        {filteredIssues.length === 0 && !loading && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No issues found</h3>
                <p>No maintenance requests match your current filters, or no issues have been reported yet.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- Confirmation Dialog --- */}
      <Dialog open={issueToConfirm !== null} onOpenChange={() => setIssueToConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {issueToConfirm?.action === "accept"
                ? "Confirm Accept"
                : issueToConfirm?.action === "attend"
                  ? "Confirm Attend"
                  : "Confirm Resolve"}
            </DialogTitle>
            <DialogDescription>
              {issueToConfirm?.action === "accept" ? (
                <>Are you sure you want to accept this issue? This will change its status to <strong>assigned</strong>.</>
              ) : issueToConfirm?.action === "attend" ? (
                <>Are you sure you want to attend this issue? This will change its status to <strong>in-progress</strong>.</>
              ) : (
                <>Are you sure you want to resolve this issue? This will change its status to <strong>resolved</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIssueToConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (issueToConfirm) {
                  let newStatus: string;
                  if (issueToConfirm.action === "accept") newStatus = "assigned";
                  else if (issueToConfirm.action === "attend") newStatus = "in-progress";
                  else newStatus = "resolved";

                  handleStatusChange(issueToConfirm.issue.id, newStatus);
                }
                setIssueToConfirm(null);
              }}
            >
              {issueToConfirm?.action === "accept"
                ? "Accept"
                : issueToConfirm?.action === "attend"
                  ? "Attend"
                  : "Resolve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}