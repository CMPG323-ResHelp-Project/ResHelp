"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, ArrowUpDown, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- Request Type ---
type Issue = {
  id: number; // currently 'number', but Firestore uses string Id
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  isUrgent: boolean;
  status: "Pending" | "Assigned" | "Resolved" | "Cancelled" | "In Progress";
  reportedAt: string; // currently, we use this, but Firestore has ReportedAt
  reporterEmail: string;
  reporterName: string;
};


export default function ManagerIssuesPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortKey, setSortKey] = useState<'reportedAt' | 'status'>('reportedAt');
  const [selectedRequestToDelete, setSelectedRequestToDelete] = useState<number | null>(null);
  const [editingRequest, setEditingRequest] = useState<Issue | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "",
    isUrgent: false,
    location: "",
    reporterEmail: "",
  });

  useEffect(() => {
    const fetchIssues = async () => {
      setErrorMessage(null);
      setIsTableLoading(true);
  
      try {
        const response = await fetch("http://localhost:5229/issue/get", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch issues");
  
        const issuesList: Issue[] = await response.json();
        console.log("Fetched issues:", issuesList);
        setIssues(issuesList); 
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsTableLoading(false);
      }
    };
  
    fetchIssues();
  }, []);
   
const handleUpdateIssue = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (!editingRequest) return; 

  // 🔎 Validation should live here, not just in the button
  if (
    !editingRequest.title ||
    !editingRequest.description ||
    !editingRequest.category ||
    !editingRequest.priority ||
    !editingRequest.location
  ) {
    setErrorMessage("All fields are required.");
    return; // ⛔ stop before API call
  }

  setErrorMessage(null);
  setConfirmationMessage(null);
  setIsEditLoading(true); // START loading

  try {
    const payload: any = {
      Title: editingRequest.title,
      Description: editingRequest.description,
      Category: editingRequest.category,
      Priority: editingRequest.priority,
      Location: editingRequest.location,
      IsUrgent: editingRequest.isUrgent,
    };

    const response = await fetch(
      `http://localhost:5229/issue/update/${editingRequest.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(
        errorBody.error || `Server returned status: ${response.status}`
      );
    }

    // Reload after update
    const reloadResponse = await fetch("http://localhost:5229/issue/get", {
      method: "GET",
    });
    const updatedIssues: Issue[] = await reloadResponse.json();
    setIssues(updatedIssues);

    setEditingRequest(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "",
      isUrgent: false,
      reporterEmail: "",
      location: "",
    });

    setConfirmationMessage("Issue updated successfully!");
    setTimeout(() => setConfirmationMessage(null), 3000);
  } catch (err: any) {
    console.error("API Error:", err);
    const message = (err as Error).message.includes("Failed to fetch")
      ? "Failed to fetch. Check if the C# API is running and the URL is correct."
      : (err as Error).message;
    setErrorMessage(message);
  } finally {
    setIsEditLoading(false);
  }
};

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleAddRequest = async () => {
    // ✅ Validate required fields
    if (
      !formData.title ||
      !formData.description ||
      !formData.category ||
      !formData.priority ||
      !formData.reporterEmail
    ) {
      setErrorMessage("All fields are required.");
      return;
    }
    
    setErrorMessage(null);
    setConfirmationMessage(null);
    setIsAddLoading(true); // START loading

  
    try {
      // --- 1️⃣ Check if user exists by email ---
      const userCheckResponse = await fetch(
        `http://localhost:5229/issue/check?email=${encodeURIComponent(formData.reporterEmail)}`,
        { method: "GET" }
      );
  
      if (!userCheckResponse.ok) {
        throw new Error("Failed to check user email");
      }
  
      const userData = await userCheckResponse.json(); // expect { exists: true/false, userType: "student", name, location }
  
      if (!userData.exists) {
        setErrorMessage("No such user exists.");
        return; // stop here if email is invalid
      }
  
      // --- 2️⃣ Ensure the user is a student ---
      if (userData.userType !== "student") {
        setErrorMessage("Only students can submit issues.");
        return;
      }
  
      // --- 3️⃣ Prepare payload with automatic name + location ---
      const payload = {
        ...formData,
        reporterName: userData.name,
        location: userData.location, // automatically populated
      };
  
      // --- 4️⃣ Send issue to backend ---
      const response = await fetch("http://localhost:5229/issue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({
          error: response.statusText,
        }));
        throw new Error(errorBody.error || `Server returned status: ${response.status}`);
      }
  
      // --- 5️⃣ Reload all issues to avoid undefined fields ---
      const reloadResponse = await fetch("http://localhost:5229/issue/get", { method: "GET" });
      if (!reloadResponse.ok) throw new Error("Failed to reload issues");
  
      const updatedIssues: Issue[] = await reloadResponse.json();
      setIssues(updatedIssues);
  
      setIsAddDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "",
        priority: "",
        isUrgent: false,
        location: "",
        reporterEmail: "",
      });
  
      setConfirmationMessage("Issue added successfully!");
      setTimeout(() => setConfirmationMessage(null), 3000);
  
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to add issue");
    }finally {
      setIsAddLoading(false)
    }
  };
  
  
  const handleDeleteRequest = (id: number) => setSelectedRequestToDelete(id);
  const confirmDeleteRequest = () => {
    if (selectedRequestToDelete === null) return;
    setIssues(prev => prev.filter(r => r.id !== selectedRequestToDelete));
    setSelectedRequestToDelete(null);
    setConfirmationMessage("Issue Deleted successfully!");
    setTimeout(() => setConfirmationMessage(null), 3000);
  };

  const toggleSortDirection = (key: 'ReportedAt' | 'status') => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch ((status || "").toLowerCase().replace("_","")) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "assigned": return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      case "inprogress": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };


  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-"; // fallback for missing dates
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-"; // fallback for invalid dates
    return date.toLocaleString("en-ZA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  function formatDateTimeSafe(value: any): string {
    if (!value) return "-";
  
    let date: Date;
  
    // Firestore Timestamp object
    if (typeof value === "object" && value.seconds !== undefined) {
      date = new Date(value.seconds * 1000);
    }
    // JS Date object
    else if (value instanceof Date) {
      date = value;
    }
    // ISO string
    else if (typeof value === "string") {
      date = new Date(value);
    }
    else {
      return "-";
    }
  
    if (isNaN(date.getTime())) return "-";
  
    return date.toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }  

  const filteredRequests = issues.filter(
    r => (selectedStatus === "All" || (r.status || "").toLowerCase().replace("_", " ") === selectedStatus.toLowerCase()) &&
      (
        (r.title?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (r.category?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (r.priority?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (r.location?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
      )
  );
  
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortKey === 'reportedAt') {
      const dateA = new Date(a.reportedAt).getTime() || 0;
      const dateB = new Date(b.reportedAt).getTime() || 0;
      
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;

    } else {
      const statusOrder = ["pending", "assigned", "inprogress", "resolved", "cancelled"];
      
      const statusA = statusOrder.indexOf((a.status || "").toLowerCase().replace(/[\s_]/g, ""));
      const statusB = statusOrder.indexOf((b.status || "").toLowerCase().replace(/[\s_]/g, ""));

      return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;
    }}
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/issues" />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Manage Issues</h1>
            <p className="text-muted-foreground">Add, edit, and manage Issues</p>
          </div>

          {/* Add Request Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Issues
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add New Issue
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Create a new Issue on behalf of a student.
                </DialogDescription>
              </DialogHeader>

                    {/* Compact Form */}
            {errorMessage &&  (
                              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                              **Error:** {errorMessage}
                            </div>
                  )}

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Issue Title</Label>
                  <Input id="title" value={formData.title} onChange={e => updateFormData("title", e.target.value)} disabled={isAddLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => updateFormData("description", e.target.value)} disabled={isAddLoading}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={v => updateFormData("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={v => updateFormData("priority", v)} disabled={isAddLoading}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reporterEmail">Reporter Email</Label>
                    <Input
                      id="reporterEmail"
                      type="email"
                      value={formData.reporterEmail || ""}
                      onChange={e => updateFormData("reporterEmail", e.target.value)}
                      disabled={isAddLoading}
                      placeholder="Enter the reporter's email"
                    />
                  </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.isUrgent} onChange={e => updateFormData("isUrgent", e.target.checked)} />
                  <Label>Mark as Urgent</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isAddLoading}>Cancel</Button>
              <Button onClick={handleAddRequest} disabled={isAddLoading}>
  {isAddLoading ? "Adding..." : "Add Issue"}
</Button>

              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search Issues..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Badge variant="outline" className="text-sm">{filteredRequests.length} of {issues.length} Issues</Badge>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toggleSortDirection('ReportedAt')} className="p-2">
            Sort by Date ({sortKey === 'reportedAt' ? (sortDirection === 'asc' ? 'Oldest' : 'Newest') : 'Date'}) <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {confirmationMessage && <div className="bg-green-100 text-green-700 p-2 rounded">{confirmationMessage}</div>}

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Log</CardTitle>
            <CardDescription>Complete log of all reported issues</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Urgent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
  {isTableLoading ? (
    <TableRow>
      <TableCell colSpan={8} className="h-24 text-center">
        <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" />
        <div>Loading issues...</div>
      </TableCell>
    </TableRow>
  ) : sortedRequests.length > 0 ? (
    sortedRequests.map(r => (
      <TableRow key={r.id}>
        <TableCell>{r.title}</TableCell>
        <TableCell>{r.category}</TableCell>
        <TableCell>{r.priority}</TableCell>
        <TableCell>{r.location}</TableCell>
        <TableCell>{r.reporterName} ({r.reporterEmail})</TableCell>
        <TableCell>
          {r.isUrgent ? (
            <Badge variant="destructive">Yes</Badge>
          ) : (
            <Badge variant="secondary">No</Badge>
          )}
        </TableCell>
        <TableCell>
        <Badge className={getStatusColor(r.status ?? "Pending")}>
  {(r.status ?? "Pending").replace("_", " ")}
</Badge>

        </TableCell>
        <TableCell>{formatDateTimeSafe(r.reportedAt)}</TableCell>
        <TableCell className="flex gap-2">
  {/* Edit button */}
  <Button
    variant="outline"
    size="sm"
    onClick={() => setEditingRequest(r)}
    disabled={r.status !== "Pending"} // ✅ Only Pending can be edited
    title={r.status !== "Pending" ? "Only Pending issues can be edited" : ""}
  >
    <Edit className="h-4 w-4" />
  </Button>

</TableCell>

      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell
        colSpan={8}
        className="h-24 text-center text-muted-foreground"
      >
        No issues found.
      </TableCell>
    </TableRow>
  )}
</TableBody>

              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={selectedRequestToDelete !== null} onOpenChange={() => setSelectedRequestToDelete(null)}>
          <DialogContent className="max-w-md mx-auto mt-24 rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-destructive">Confirm Delete</DialogTitle>
              <DialogDescription>Are you sure you want to delete this issue? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setSelectedRequestToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteRequest}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Request Dialog */}
<Dialog open={editingRequest !== null} onOpenChange={() => setEditingRequest(null)}>
  {editingRequest && (
    <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl ...">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Edit Issue</DialogTitle>
      </DialogHeader>

            {/* Compact Form */}
            {errorMessage && (
                              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                              **Error:** {errorMessage}
                            </div>
                  )}

      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={editingRequest.title}
            onChange={e =>
              setEditingRequest(prev => prev ? { ...prev, title: e.target.value } : null)
            }
            disabled={isEditLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={editingRequest.description}
            onChange={e =>
              setEditingRequest(prev => prev ? { ...prev, description: e.target.value } : null)
              
            }
            disabled={isEditLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={editingRequest.category}
            onValueChange={v =>
              setEditingRequest(prev => prev ? { ...prev, category: v } : null)
            }
            disabled={isEditLoading}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Label>Priority</Label>
          <Select
            value={editingRequest.priority}
            onValueChange={v =>
              setEditingRequest(prev => prev ? { ...prev, priority: v } : null)
            }
            disabled={isEditLoading}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
  <Label>Location - Not Editable </Label>
  <Input
    value={editingRequest.location}
    readOnly
    className="pointer-events-none bg-gray-100" // make it visually disabled & not clickable
  />
</div>


        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={editingRequest.isUrgent}
            onChange={e =>
              setEditingRequest(prev => prev ? { ...prev, isUrgent: e.target.checked } : null)
            }
            disabled={isEditLoading}
          />
          <Label>Mark as Urgent</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => setEditingRequest(null)} disabled={isEditLoading} >Cancel</Button>
        <Button onClick={handleUpdateIssue} disabled={isEditLoading}>
  {isEditLoading ? "Saving..." : "Save"}
</Button>

      </div>
    </DialogContent>
  )}
</Dialog>

      </div>
    </div>
  );
}
