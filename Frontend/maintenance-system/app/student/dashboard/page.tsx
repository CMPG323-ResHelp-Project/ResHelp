"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, CheckCircle, AlertTriangle, ListFilter, X, MapPin, ClipboardList } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


// Mock-up of a simplified Issue type based on the backend response
interface Issue {
    Id: string;
    Title: string;
    Description: string;
    Status: "Pending" | "In-Progress" | "Resolved" | "Cancelled";
    Priority: "High" | "Medium" | "Low";
    Category: string; // Issue category (e.g., Plumbing, Electrical, Structural)
    Location: string; // Specific location (e.g., House 3A, Room 204)
    IsUrgentSafetyHazard: boolean; // Urgent safety hazard flag
    ReportedAt: string;
    UpdatedAt: string;
    ReporterEmail: string;
    Rating?: number;
}

// Helper to format date and time
function formatDateTime(timestamp: any): string {
  if (!timestamp) return "";

  let date: Date;

  // Case 1: Firestore Timestamp object (has seconds and nanoseconds)
  if (typeof timestamp === "object" && timestamp.seconds !== undefined) {
    date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
  } 
  // Case 2: Already a JS Date
  else if (timestamp instanceof Date) {
    date = timestamp;
  } 
  // Case 3: Backend might send ISO string
  else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } 
  else {
    return ""; // fallback
  }

  if (isNaN(date.getTime())) return "";

  // Format as desired
  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}




// --- Edit Issue Modal Component ---
interface EditIssueModalProps {
    issue: Issue;
    onClose: () => void;
    onSave: (id: string, form: EditIssueForm) => Promise<void>;
}

interface EditIssueForm {
    Title: string;
    Description: string;
    Category: string;
    Location: string;
    Priority: "High" | "Medium" | "Low";
    IsUrgentSafetyHazard: boolean;
}

const EditIssueModal: React.FC<EditIssueModalProps> = ({ issue, onClose, onSave }) => {
    // Only allow editing if the status is "Pending"
    if (issue.Status.toLowerCase() !== 'pending') {
        onClose();
        return null;
    }

    const [editForm, setEditForm] = useState<EditIssueForm>({
        Title: issue.Title,
        Description: issue.Description,
        Category: issue.Category,
        Location: issue.Location,
        Priority: issue.Priority,
        IsUrgentSafetyHazard: issue.IsUrgentSafetyHazard,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setEditForm(prev => ({ ...prev, [id]: value }));
    };

    const handlePriorityChange = (value: string) => {
        // Ensure the value stored in the form is capitalized to match the Issue interface
        const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1) as "High" | "Medium" | "Low";
        setEditForm(prev => ({ ...prev, Priority: capitalizedValue }));
    };

    const handleCategoryChange = (value: string) => {
        setEditForm(prev => ({ ...prev, Category: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(issue.Id, editForm);
        setIsSaving(false);
        // Note: onClose is handled by onSave after successful update
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit Pending Issue #{issue.Id.slice(0, 8)}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="Title">Issue Title</Label>
                            <Input id="Title" value={editForm.Title} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Description">Detailed Description</Label>
                            <Textarea id="Description" value={editForm.Description} onChange={handleChange} required rows={4} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="Category">Category</Label>
                                <Select onValueChange={handleCategoryChange} value={editForm.Category}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plumbing">Plumbing</SelectItem>
                                        <SelectItem value="electrical">Electrical</SelectItem>
                                        <SelectItem value="heating">Heating/Cooling</SelectItem>
                                        <SelectItem value="locks">Locks & Security</SelectItem>
                                        <SelectItem value="appliances">Appliances</SelectItem>
                                        <SelectItem value="cleaning">Cleaning</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="Location">Location (House/Room)</Label>
                                <Input id="Location" value={editForm.Location} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Priority">Priority Level</Label>
                            {/* Use lowercased value for the select component, but store capitalized in form state */}
                            <Select onValueChange={handlePriorityChange} value={editForm.Priority.toLowerCase()}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <Checkbox
                                    id="IsUrgentSafetyHazard"
                                    checked={editForm.IsUrgentSafetyHazard}
                                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, IsUrgentSafetyHazard: !!checked }))}
                                    className="h-5 w-5 text-red-600 border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                                />
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    <Label htmlFor="IsUrgentSafetyHazard" className="text-red-800 font-bold leading-none">
                                        Urgent Safety Hazard
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};


// --- Main Dashboard Component ---
export default function MyIssuesDashboard() {
    const router = useRouter()
    const [issues, setIssues] = useState<Issue[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [issueMessage, setIssueMessage] = useState<string | null>(null) // 🆕 New state for success messages
    const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
    const [activeSort, setActiveSort] = useState<"ReportedAt_desc" | "ReportedAt_asc">("ReportedAt_desc");
    const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
    const [historySort, setHistorySort] = useState<"UpdatedAt_desc" | "UpdatedAt_asc">("UpdatedAt_desc");
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string | null>(null);

    const submitRating = async (issueId: string, rating: number) => {
      try {
        // 🆕 Ask user to confirm
        const confirmed = window.confirm(`Are you sure you want to rate this issue with ${rating} star(s)?`)
        if (!confirmed) return // 🚫 user cancelled → don’t submit
    
        const { auth } = await import("@/lib/firebase")
        const user = auth.currentUser
        if (!user) throw new Error("User not logged in.")
        const idToken = await user.getIdToken()
    
        const response = await fetch(`http://localhost:5229/Issues/${issueId}/rate`, {
          method: "POST", // ⚠️ match backend
          headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating })
        })
    
        const responseText = await response.text()
    
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch {
          console.error("Non-JSON response:", responseText)
          throw new Error(`Server returned status ${response.status}.`)
        }
    
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to submit rating")
        }
    
        // 🆕 Show success message instead of just refreshing
        setIssueMessage(`Issue #${issueId.slice(0, 8)} rated ${rating} star(s).`)
        setTimeout(() => setIssueMessage(null), 5000)
    
        fetchIssues() // refresh to show updated rating
    
      } catch (err: any) {
        setError(err.message || "Failed to submit rating")
      }
    }
    
    
    // Status & Priority helpers
    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return <Clock className="h-4 w-4" />
            case "in-progress":
                return <AlertTriangle className="h-4 w-4" />
            case "resolved":
                return <CheckCircle className="h-4 w-4" />
            case "cancelled":
                return <X className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case "in-progress":
                return "bg-blue-100 text-blue-800 border-blue-200"
            case "resolved":
                return "bg-green-100 text-green-800 border-green-200"
            case "cancelled":
                return "bg-red-100 text-red-800 border-red-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case "high":
                return "bg-red-100 text-red-800 border-red-200"
            case "medium":
                return "bg-orange-100 text-orange-800 border-orange-200"
            case "low":
                return "bg-lime-100 text-lime-800 border-lime-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    // Fetch user's issues from backend
    const fetchIssues = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { auth } = await import("@/lib/firebase") 
            const user = auth.currentUser

            if (!user) throw new Error("User not logged in. Please sign in again.")

            const idToken = await user.getIdToken()

            // The backend endpoint provided: [HttpGet("all")]
            const res = await fetch("http://localhost:5229/Issues/all", {
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                },
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || `Failed to fetch issues: ${res.status}`)
            }

            const data: any[] = await res.json()
            
            // Map the data to the Issue interface, ensuring proper casing and existence
            const formattedIssues: Issue[] = data.map(item => ({
                Id: item.Id || item.id || crypto.randomUUID(), // Fallback for Id
                Title: item.Title || "No Title",
                Description: item.Description || "No description provided.",
                Status: (item.Status as Issue['Status']) || "Pending",
                Priority: (item.Priority || "Low").charAt(0).toUpperCase() + (item.Priority || "Low").slice(1).toLowerCase() as Issue['Priority'],
                Category: item.Category || "General",
                Location: item.Location || "Unknown",
                // FIX: Map C#'s 'IsUrgent' property to frontend's 'IsUrgentSafetyHazard' property
                IsUrgentSafetyHazard: item.IsUrgent === true, 
                ReportedAt: item.ReportedAt || new Date().toISOString(),
                UpdatedAt: item.UpdatedAt || item.ReportedAt || new Date().toISOString(),
                ReporterEmail: item.ReporterEmail || "",
                Rating: item.Rating ?? null, 
            }));

            setIssues(formattedIssues)
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Failed to load issues")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchIssues()
    }, [fetchIssues])


    // --- CRUD Handlers ---

    const handleEditIssue = (issue: Issue) => {
        // Only allow editing if the status is "Pending"
        if (issue.Status.toLowerCase() === 'pending') {
            setEditingIssue(issue);
        } else {
            alert(`Issue is ${issue.Status.toLowerCase()}. Only Pending issues can be edited.`);
        }
    }

    // 🔑 IMPLEMENTED UPDATE LOGIC HERE
    const handleSaveEdit = async (issueId: string, form: EditIssueForm) => {
        setError(null); // Clear previous errors
        setIssueMessage(null); // Clear previous messages
        try {
            const { auth } = await import("@/lib/firebase")
            const user = auth.currentUser
            if (!user) throw new Error("User not logged in.")
            const idToken = await user.getIdToken()

            // Construct payload using camelCase for JSON keys (standard practice)
            const payload = {
                title: form.Title,
                description: form.Description,
                category: form.Category,
                priority: form.Priority.toLowerCase(), // Ensure lowercase for backend consistency
                location: form.Location,
                imageUrl: "", // Not editable in modal, but required by DTO
                isUrgent: form.IsUrgentSafetyHazard, // Maps to C# IssueDto.IsUrgent
            };

            // Send PUT request to the new C# endpoint
            const response = await fetch(`http://localhost:5229/Issues/${issueId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update issue: ${response.status}`);
            }

            setEditingIssue(null); // Close the modal
            
            // 🆕 Set the success message and clear it after a timeout
            setIssueMessage(`Issue #${issueId.slice(0, 8)} updated successfully.`);
            setTimeout(() => setIssueMessage(null), 5000); 

            fetchIssues(); // Refresh the list to show changes
        } catch (err: any) {
            setError(err.message || "An error occurred while updating the issue.");
        }
    }
    // 🔑 END UPDATE LOGIC

    const handleCancelIssue = async (issueId: string) => {
        const confirmation = window.confirm(`Are you sure you want to cancel issue #${issueId}? This action will update its status to 'Cancelled'.`);
        if (!confirmation) return;

        try {
            const { auth } = await import("@/lib/firebase")
            const user = auth.currentUser
            if (!user) throw new Error("User not logged in.")
            const idToken = await user.getIdToken()

            // NOTE: This PUT endpoint for cancellation needs to be implemented in the C# controller
            const response = await fetch(`http://localhost:5229/Issues/${issueId}/cancel`, {
                method: "PUT", // Using PUT to update status to 'Cancelled'
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to cancel issue: ${response.status}`);
            }

             // ✅ Show success message in UI, not alert
    setIssueMessage(`Issue #${issueId.slice(0, 8)} cancelled successfully.`)
    setTimeout(() => setIssueMessage(null), 5000)
            fetchIssues(); // Refresh the list
        } catch (err: any) {
            setError(err.message || "An error occurred while cancelling the issue.");
        }
    }


    // --- Filtering and Sorting Logic ---

    const sortAndFilterIssues = (
        data: Issue[],
        sortCriteria: string,
        statusFilter: string | null,
        dateField: 'ReportedAt' | 'UpdatedAt'
    ): Issue[] => {
        let filteredData = data;

        if (statusFilter) {
            filteredData = data.filter(req => req.Status.toLowerCase() === statusFilter.toLowerCase());
        }

        const sortedData = [...filteredData];

        switch (sortCriteria) {
            case "ReportedAt_asc":
            case "UpdatedAt_asc":
                return sortedData.sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());
            case "ReportedAt_desc":
            case "UpdatedAt_desc":
                return sortedData.sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime());
            default:
                return sortedData;
        }
    };


    const activeIssues = useMemo(() => {
        const active = issues.filter((i) => ["pending", "in-progress"].includes(i.Status.toLowerCase()));
        return sortAndFilterIssues(active, activeSort, activeStatusFilter, 'ReportedAt');
    }, [issues, activeSort, activeStatusFilter]);


    const historyIssues = useMemo(() => {
        const history = issues.filter((i) => ["resolved", "cancelled"].includes(i.Status.toLowerCase()));
        return sortAndFilterIssues(history, historySort, historyStatusFilter, 'UpdatedAt');
    }, [issues, historySort, historyStatusFilter]);


    const statusCounts = issues.reduce(
        (acc, issue) => {
            const status = (issue.Status || "").toLowerCase()
            if (status === "pending") acc.pending += 1
            else if (status === "in-progress") acc.inProgress += 1
            else if (status === "resolved") acc.resolved += 1
            else if (status === "cancelled") acc.cancelled += 1
            return acc
        },
        { pending: 0, inProgress: 0, resolved: 0, cancelled: 0 }
    )


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading issues...</span>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-background">
            <Navigation userType="student" currentPage="/student/dashboard" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Maintenance Issues</h1>
                        <p className="text-muted-foreground">Track and manage your reported maintenance requests</p>
                    </div>
                    <Button onClick={() => router.push("/student/report")} className="flex items-center space-x-2">
                        <Plus className="h-4 w-4" />
                        <span>Report New Issue</span>
                    </Button>
                </div>

                {/* Messages */}
                {error && <p className="text-center text-red-600">{error}</p>}
                {issueMessage && ( // 🆕 Success message container
                    <div className="text-center py-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 font-medium">{issueMessage}</p>
                    </div>
                )}
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <Clock className="h-5 w-5 text-yellow-600 mb-2" />
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="text-2xl font-bold text-yellow-800">{statusCounts.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <AlertTriangle className="h-5 w-5 text-blue-600 mb-2" />
                            <p className="text-sm text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold text-blue-800">{statusCounts.inProgress}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                            <p className="text-sm text-muted-foreground">Resolved</p>
                            <p className="text-2xl font-bold text-green-800">{statusCounts.resolved}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <X className="h-5 w-5 text-red-600 mb-2" />
                            <p className="text-sm text-muted-foreground">Cancelled</p>
                            <p className="text-2xl font-bold text-red-800">{statusCounts.cancelled}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Issues Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            <CardTitle>Active Issues ({activeIssues.length})</CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="ml-2">
                                        <ListFilter className="h-4 w-4 mr-2" />
                                        {activeStatusFilter ? activeStatusFilter.charAt(0).toUpperCase() + activeStatusFilter.slice(1) : "Filter Status"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setActiveStatusFilter("pending"); }}>Pending</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setActiveStatusFilter("in-progress"); }}>In Progress</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setActiveStatusFilter(null); }}>Show All</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Sort Date
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Sort Active Issues</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setActiveSort("ReportedAt_desc"); }}>Reported Date (Newest)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setActiveSort("ReportedAt_asc"); }}>Reported Date (Oldest)</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {activeIssues.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No active issues matching the current filter.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {activeIssues.map((issue) => (
                                    <div key={issue.Id} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge className={getStatusColor(issue.Status)}>{issue.Status.replace("-", " ")}</Badge>
                                                <Badge className={getPriorityColor(issue.Priority)} variant="outline">{issue.Priority} Priority</Badge>
                                                {issue.IsUrgentSafetyHazard && (
                                                    <Badge className="bg-red-700 text-white font-bold tracking-wider uppercase border-red-900 border-2">
                                                        <AlertTriangle className="h-3 w-3 mr-1 fill-white" /> Urgent Safety Hazard
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground font-mono">ID: {issue.Id.slice(0, 8)}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-foreground">{issue.Title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{issue.Description}</p>

                                        <div className="grid grid-cols-2 gap-4 border-t pt-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium">Location:</span>
                                                <span className="text-muted-foreground">{issue.Location}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <ClipboardList className="h-4 w-4 text-purple-500" />
                                                <span className="font-medium">Category:</span>
                                                <span className="text-muted-foreground">{issue.Category}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm col-span-2">
                                                {getStatusIcon(issue.Status)}
                                                <span className="font-medium">Reported:</span>
                                                <span className="text-muted-foreground">{formatDateTime(issue.ReportedAt)}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-3">
                                            {/* Only Pending issues can be updated/cancelled */}
                                            {issue.Status.toLowerCase() === "pending" && (
                                                <>
                                                    <Button variant="outline" size="sm" onClick={() => handleEditIssue(issue)}>
                                                        Edit Issue
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleCancelIssue(issue.Id)}>
                                                        Cancel Issue
                                                    </Button>
                                                </>
                                            )}
                                            {issue.Status.toLowerCase() === "in-progress" && (
                                                <Button variant="secondary" size="sm" disabled>
                                                    Cannot Edit (In Progress)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Issue History Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Issue History ({historyIssues.length})</CardTitle>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <ListFilter className="h-4 w-4 mr-2" />
                                        {historyStatusFilter ? historyStatusFilter.charAt(0).toUpperCase() + historyStatusFilter.slice(1) : "Filter Status"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setHistoryStatusFilter("resolved"); }}>Resolved</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setHistoryStatusFilter("cancelled"); }}>Cancelled</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setHistoryStatusFilter(null); }}>Show All</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Sort Date
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Sort History</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setHistorySort("UpdatedAt_desc"); }}>Updated Date (Newest)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setHistorySort("UpdatedAt_asc"); }}>Updated Date (Oldest)</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {historyIssues.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                                <p>No completed or cancelled issues yet.</p>
                            </div>
                        ) : (
                            <div className={`space-y-3 max-h-[400px] overflow-y-auto`}>
                                {historyIssues.map((issue) => (
                                    <div key={issue.Id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-secondary/10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className={getStatusColor(issue.Status)} variant="outline">
                                                {issue.Status.replace("-", " ")}
                                            </Badge>
                                            <span className="text-sm font-medium text-foreground">{issue.Title}</span>
                                            {issue.IsUrgentSafetyHazard && (
                                                <AlertTriangle className="h-4 w-4 text-red-700 fill-red-300" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-mono">ID: {issue.Id.slice(0, 8)}</span> | Category: {issue.Category} | Location: {issue.Location}
                                        </p>
                                
                                        {/* 🆕 Rating Stars */}
                                        {issue.Status.toLowerCase() === "resolved" && (
                                            <div className="flex items-center gap-1 mt-1">
                                                {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => !issue.Rating && submitRating(issue.Id, star)}
                                                        className={`text-xl ${star <= (issue.Rating || 0) ? "text-yellow-400" : "text-gray-300"} ${!issue.Rating ? "hover:text-yellow-500" : ""}`}
                                                        disabled={!!issue.Rating}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                                {issue.Rating && <span className="ml-2 text-sm text-muted-foreground">{issue.Rating} / 5</span>}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-2 sm:mt-0 whitespace-nowrap">
                                        Updated: {formatDateTime(issue.UpdatedAt)}
                                    </span>
                                </div>
                                
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Modal */}
            {editingIssue && (
                <EditIssueModal
                    issue={editingIssue}
                    onClose={() => setEditingIssue(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    )
}