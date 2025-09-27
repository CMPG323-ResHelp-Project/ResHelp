"use client";

import { useState } from "react";
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
import { Search, Plus, MapPin, ArrowUpDown, User, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Request Type ---
type Request = {
  id: number;
  student_name: string;
  student_number: string;
  pickup_location: string;
  destination: string;
  status: "Pending" | "Assigned" | "In_progress" | "Completed" | "Cancelled";
  created_at: string;
  student_id: number;
  pickup_time: string;
};

// --- Mock Data ---
const initialRequests: Request[] = [
  { id: 1, student_name: "Alice Johnson", student_number: "S1001", pickup_location: "Res A Gate", destination: "Library East", status: "Pending", created_at: new Date(Date.now() - 3600000).toISOString(), student_id: 1, pickup_time: new Date(Date.now() + 3600000).toISOString() },
  { id: 2, student_name: "Bob Smith", student_number: "S1002", pickup_location: "Sports Field", destination: "Admin Building", status: "Completed", created_at: new Date(Date.now() - 86400000).toISOString(), student_id: 2, pickup_time: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, student_name: "Charlie Brown", student_number: "S1003", pickup_location: "Lecture Hall 5", destination: "Res C Gate", status: "Assigned", created_at: new Date(Date.now() - 7200000).toISOString(), student_id: 3, pickup_time: new Date(Date.now() + 7200000).toISOString() },
  { id: 4, student_name: "Diana Prince", student_number: "S1004", pickup_location: "Main Entrance", destination: "Research Block", status: "Cancelled", created_at: new Date(Date.now() - 1800000).toISOString(), student_id: 4, pickup_time: new Date(Date.now() + 1800000).toISOString() },
  { id: 5, student_name: "Ethan Hunt", student_number: "S1005", pickup_location: "Cafeteria", destination: "Engineering Lab", status: "In_progress", created_at: new Date(Date.now() - 300000).toISOString(), student_id: 5, pickup_time: new Date(Date.now() + 300000).toISOString() },
];

export default function ManagerIssuesPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortKey, setSortKey] = useState<'created_at' | 'status'>('created_at');
  const [selectedRequestToDelete, setSelectedRequestToDelete] = useState<number | null>(null);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    student_id: "",
    pickup_location: "",
    destination: "",
    pickup_time: new Date().toISOString().slice(0, 16),
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRequest = () => {
    if (!formData.student_id || !formData.pickup_location || !formData.destination || !formData.pickup_time) {
      alert("All fields are required.");
      return;
    }

    const newRequest: Request = {
      id: Date.now(),
      student_name: `New Student ${formData.student_id}`,
      student_number: `M${formData.student_id}`,
      ...formData,
      status: "Pending",
      created_at: new Date().toISOString(),
      student_id: parseInt(formData.student_id),
    };
    setRequests(prev => [newRequest, ...prev]);
    setIsAddDialogOpen(false);
    setFormData({ student_id: "", pickup_location: "", destination: "", pickup_time: new Date().toISOString().slice(0, 16) });
    setConfirmationMessage("Issue Added successfully! ");
    setTimeout(() => setConfirmationMessage(null), 3000);
  };

  const handleDeleteRequest = (id: number) => setSelectedRequestToDelete(id);
  const confirmDeleteRequest = () => {
    if (selectedRequestToDelete === null) return;
    setRequests(prev => prev.filter(r => r.id !== selectedRequestToDelete));
    setSelectedRequestToDelete(null);
    setConfirmationMessage("Issue Deleted successfully! ");
    setTimeout(() => setConfirmationMessage(null), 3000);
  };

  const toggleSortDirection = (key: 'created_at' | 'status') => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: Request['status']) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Assigned": return "bg-blue-100 text-blue-800 border-blue-200";
      case "In_progress": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Completed": return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-ZA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const filteredRequests = requests.filter(
    r => (selectedStatus === "All" || r.status === selectedStatus) &&
      (r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student_number.includes(searchTerm) ||
        r.pickup_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortKey === 'created_at') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const statusOrder = ["Pending", "Assigned", "In_progress", "Completed", "Cancelled"];
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);
      return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/issues" />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Manage Issues</h1>
            <p className="text-muted-foreground">Add, edit, and manage Issues (Local Mock Data)</p>
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
                  <Plus className="h-5 w-5 text-primary" /> Add New Issues
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Create a new Issue on behalf of a student.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input id="student_id" value={formData.student_id} onChange={e => updateFormData("student_id", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_location">Pickup Location</Label>
                  <Input id="pickup_location" value={formData.pickup_location} onChange={e => updateFormData("pickup_location", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input id="destination" value={formData.destination} onChange={e => updateFormData("destination", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_time">Pickup Time</Label>
                  <Input id="pickup_time" type="datetime-local" value={formData.pickup_time} onChange={e => updateFormData("pickup_time", e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" className="text-muted-foreground hover:bg-muted/20" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button className="flex items-center gap-2" onClick={handleAddRequest}>
                  <Plus className="h-4 w-4" /> Add Issues
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
          <Badge variant="outline" className="text-sm">{filteredRequests.length} of {requests.length} Issues</Badge>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In_progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toggleSortDirection('created_at')} className="p-2">
            Sort by Date ({sortKey === 'created_at' ? (sortDirection === 'asc' ? 'Oldest' : 'Newest') : 'Date'}) <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {confirmationMessage && <div className="bg-green-100 text-green-700 p-2 rounded">{confirmationMessage}</div>}


        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Log</CardTitle>
            <CardDescription>Complete log of all ride Issues</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRequests.length > 0 ? sortedRequests.map(request => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.student_name}</div>
                            <div className="text-muted-foreground text-sm">{request.student_number}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>{request.pickup_location} → {request.destination}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>{request.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(request.created_at)}</TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingRequest(request)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(request.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No requests found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Request Dialog */}
<Dialog open={editingRequest !== null} onOpenChange={() => setEditingRequest(null)}>
  <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold flex items-center gap-2">
        <Edit className="h-5 w-5 text-primary" /> Edit Request
      </DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground mt-1">
        Update the details of this ride request.
      </DialogDescription>
    </DialogHeader>

    {editingRequest && (
      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="edit_pickup_location">Pickup Location</Label>
          <Input
            id="edit_pickup_location"
            value={editingRequest.pickup_location}
            onChange={e =>
              setEditingRequest(prev =>
                prev ? { ...prev, pickup_location: e.target.value } : null
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_destination">Destination</Label>
          <Input
            id="edit_destination"
            value={editingRequest.destination}
            onChange={e =>
              setEditingRequest(prev =>
                prev ? { ...prev, destination: e.target.value } : null
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_pickup_time">Pickup Time</Label>
          <Input
            id="edit_pickup_time"
            type="datetime-local"
            value={editingRequest.pickup_time.slice(0,16)}
            onChange={e =>
              setEditingRequest(prev =>
                prev ? { ...prev, pickup_time: e.target.value } : null
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_status">Status</Label>
          <Select
            value={editingRequest.status}
            onValueChange={value =>
              setEditingRequest(prev =>
                prev ? { ...prev, status: value as Request["status"] } : null
              )
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In_progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )}

    <div className="flex justify-end gap-3 mt-6">
      <Button variant="outline" className="text-muted-foreground hover:bg-muted/20" onClick={() => setEditingRequest(null)}>Cancel</Button>
      <Button
        className="flex items-center gap-2"
        onClick={() => {
          if (editingRequest) {
            setRequests(prev =>
              prev.map(r => (r.id === editingRequest.id ? editingRequest : r))
            );
            setEditingRequest(null);
            setConfirmationMessage("Student updated successfully! 🎉");
            setTimeout(() => setConfirmationMessage(null), 3000);
          }
        }}
      >
        <Edit className="h-4 w-4" /> Update
      </Button>
    </div>
  </DialogContent>
</Dialog>


        {/* Delete Confirmation Dialog */}
        <Dialog open={selectedRequestToDelete !== null} onOpenChange={() => setSelectedRequestToDelete(null)}>
          <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete this Issue? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" className="text-muted-foreground hover:bg-muted/20" onClick={() => setSelectedRequestToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="flex items-center gap-2" onClick={confirmDeleteRequest}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
