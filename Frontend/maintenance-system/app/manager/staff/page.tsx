"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Wrench,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from "@/lib/firebase";

// --- Type Definition (ID must be string to match Firebase UID) ---
type Staff = {
  id: string; 
  name: string;
  surname: string;
  email: string;
  phone: string;
  maintenanceType: string;
};

// --- Component Start ---
export default function ManagerStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
// Before: string | null
const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [sortByNameOrder, setSortByNameOrder] = useState<"asc" | "desc">("asc");
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null
  );
  // Renamed to separate loading states for better control
  const [isAddLoading, setIsAddLoading] = useState(false); 
  const [isEditLoading, setIsEditLoading] = useState(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    maintenanceType: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateFormData = (data: typeof formData): string | null => {
    if (!data.name.trim()) return "First name is required.";
    if (!data.surname.trim()) return "Last name is required.";
    // Only perform email validation on the ADD staff form
    if (isAddDialogOpen && !data.email.endsWith("@gmail.com")) return "Email must end with @gmail.com.";
    const phoneRegex = /^0\d{9}$/;
    if (!data.phone.trim()) return "Phone number is required.";
    if (!phoneRegex.test(data.phone)) return "Phone number must be 10 digits and start with 0.";
    if (!data.maintenanceType.trim()) return "Maintenance area is required.";
    return null;
  };

  useEffect(() => {
    const fetchStaff = async () => {
      setErrorMessage(null);
      setIsTableLoading(true);

      try {    
        const response = await fetch("http://localhost:5229/UserUpdate/staff/all", {
          method: "GET",
        });
  
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorBody.error || `Server returned status: ${response.status}`);
        }
  
        const staffList: Staff[] = await response.json();
        console.log("Fetched staff:", staffList); // debug log
        setStaff(staffList);
      } catch (err: any) {
        console.error("API Error:", err);
        setErrorMessage(err.message);
      } finally {
        setIsTableLoading(false);      }
    };
  
    fetchStaff();
  }, []);
  

  // ⭐️ API Handling Logic for ADD Staff (UNCHANGED)
  const handleAddStaff = async () => {
    const validationError = validateFormData(formData);
    if (validationError) {
      setErrorMessage(validationError); 
      return;
    }

    setErrorMessage(null);
    setIsAddLoading(true); // START ADD LOADING

    try {
      // ⚠️ Use the specific controller route
      const apiUrl = "http://localhost:5229/AddStaff"; 
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userType: "staff", 
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Server returned status: ${response.status}`);
      }

      const savedStaff: Staff = await response.json();
      
      setStaff((prev) => [savedStaff, ...prev]);

      setFormData({ name: "", surname: "", email: "", phone: "", maintenanceType: "" });
      setIsAddDialogOpen(false); 

      setConfirmationMessage("Staff added successfully! Login details sent to their email.");
      setTimeout(() => setConfirmationMessage(null), 5000);

    } catch (err) {
      console.error("API Error:", err);
      const message = (err as Error).message.includes("Failed to fetch")
        ? "Failed to fetch. Check if the C# API is running and the URL is correct (http://localhost:5229/AddStaff)."
        : (err as Error).message;
        
      setErrorMessage(message); 
    } finally {
      setIsTableLoading(false);   
     }
  };
  

  const handleEditStaff = (staffMember: Staff) => {
    // Clear ADD error messages if they were open before editing
    setErrorMessage(null); 
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      surname: staffMember.surname,
      email: staffMember.email, // Kept for display, but will be disabled
      phone: staffMember.phone,
      maintenanceType: staffMember.maintenanceType,
    });
  };

  // ⭐️ API Handling Logic for UPDATE Staff (NEW/MODIFIED)
  const handleUpdateStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingStaff) return;
  
    setErrorMessage(null);
    setConfirmationMessage(null);
    setIsEditLoading(true);
  
    try {
      // ✅ Get Firebase ID Token from the logged-in manager
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : null;
      if (!user || !idToken) throw new Error("Manager not authenticated or token missing.");
  
      // Validate updatable fields only (ignore email)
      const validationError = validateFormData(formData);
      if (validationError) {
        setErrorMessage(validationError);
        setIsEditLoading(false);
        return;
      }
  
      // ✅ Build payload (no email update, only allowed fields)
      const payload = {
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        maintenanceType: formData.maintenanceType,
        email: editingStaff.email,
      };
  
      // ✅ Call backend
      const response = await fetch("http://localhost:5229/UserUpdate/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Server returned status: ${response.status}`);
      }
  
      // ✅ Update local state after backend success
      const updatedStaff: Staff = { ...editingStaff, ...formData };
      setStaff((prev) => prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
  
      // ✅ Show confirmation and close dialog
      setEditingStaff(null);
      setFormData({ name: "", surname: "", email: "", phone: "", maintenanceType: "" });
      setConfirmationMessage("Staff updated successfully!");
      setTimeout(() => setConfirmationMessage(null), 3000);
  
    } catch (err: any) {
      console.error("API Error:", err);
      const message = err.message.includes("Failed to fetch")
        ? "Failed to fetch. Check if the API is running, the URL is correct, and you have a valid Firebase token."
        : err.message;
      setErrorMessage(message);
    } finally {
      setIsEditLoading(false);
    }
  };
  

  const handleDeleteStaff = (staffMember: Staff) => setStaffToDelete(staffMember);

  const confirmDelete = async () => {
  if (!staffToDelete) return;

  setIsTableLoading(true); // START loading

  try {
    const response = await fetch(
      `http://localhost:5229/UserUpdate/staff/${staffToDelete.email}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorBody.error || `Server returned status: ${response.status}`);
    }

    setStaffToDelete(null);
    setConfirmationMessage("Staff deleted successfully!");
    setTimeout(() => setConfirmationMessage(null), 3000);

    // 🔄 Reload staff after deletion
    const reloadResponse = await fetch("http://localhost:5229/UserUpdate/staff/all", {
      method: "GET",
    });
    const updatedStaff: Staff[] = await reloadResponse.json();
    setStaff(updatedStaff);

  } catch (err: any) {
    console.error("Delete API Error:", err);
    const message = err.message.includes("Failed to fetch")
      ? "Failed to fetch. Check if the API is running and the URL is correct."
      : err.message;
    setErrorMessage(message);
  } finally {
    setIsTableLoading(false); // STOP loading
  }
};



  const handleSortByName = () =>
    setSortByNameOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  const displayedStaff = staff
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm) ||
        s.maintenanceType.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const fullNameA = `${a.name} ${a.surname}`.toLowerCase();
      const fullNameB = `${b.name} ${b.surname}`.toLowerCase();
      return sortByNameOrder === "asc"
        ? fullNameA.localeCompare(fullNameB)
        : fullNameB.localeCompare(fullNameA);
    });

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/staff" />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Manage Staff</h1>
            <p className="text-muted-foreground">
              Add, edit, and manage staff profiles
            </p>
          </div>

{/* --- ADD STAFF DIALOG --- */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Button
              onClick={() => {
                setErrorMessage(null); // Clear errors on open
                setFormData({ name: "", surname: "", email: "", phone: "", maintenanceType: "" }); // Clear form on open
                setIsAddDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Staff
            </Button>

            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add New Staff
                </DialogTitle>
                <DialogDescription>
                  Enter the staff member's information.
                </DialogDescription>
              </DialogHeader>

              {/* Display Error Message for ADD */}
              {errorMessage && !editingStaff && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                  **Error:** {errorMessage}
                </div>
              )}

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      disabled={isAddLoading}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.surname}
                      onChange={(e) => updateFormData("surname", e.target.value)}
                      disabled={isAddLoading}
                    />
                  </div>
                </div>

                <div>
                  <Label>Email (@gmail.com required)</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    disabled={isAddLoading}
                  />
                </div>

                <div>
                  <Label>Phone (0XXXXXXXXX format)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    disabled={isAddLoading}
                  />
                </div>

                <div>
                  <Label>Maintenance Area</Label>
                  <Select
                    value={formData.maintenanceType}
                    onValueChange={(val) => updateFormData("maintenanceType", val)}
                    disabled={isAddLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Carpentry">Carpentry</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isAddLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStaff} 
                  disabled={isAddLoading} 
                >
                  {isAddLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isAddLoading ? "Adding Staff..." : "Add Staff"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Stats (UNCHANGED) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{staff.length} Total Staff</Badge>
            <Button variant="outline" onClick={handleSortByName}>
              Sort by Name{" "}
              {sortByNameOrder === "asc" ? (
                <ArrowUp className="h-4 w-4 ml-2" />
              ) : (
                <ArrowDown className="h-4 w-4 ml-2" />
              )}
            </Button>
          </div>
        </div>

        {confirmationMessage && (
          <div className="bg-green-100 text-green-700 p-3 rounded border border-green-200">
            {confirmationMessage}
          </div>
        )}

       {/* Staff Table (Updated with Loader) */}
<Card>
  <CardHeader>
    <CardTitle>Staff Directory</CardTitle>
    <CardDescription>
      Complete list of registered staff
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Maintenance Area</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isTableLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" />
              <div>Loading staff...</div>
            </TableCell>
          </TableRow>
        ) : displayedStaff.length > 0 ? (
          displayedStaff.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />{" "}
                  {member.name} {member.surname}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />{" "}
                  {member.email}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />{" "}
                  {member.phone}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />{" "}
                  {member.maintenanceType}
                </div>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditStaff(member)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteStaff(member)} // pass full staff object
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              className="h-24 text-center text-muted-foreground"
            >
              No staff found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </CardContent>
</Card>


{/* --- EDIT STAFF DIALOG (MODIFIED) --- */}
        <Dialog open={!!editingStaff} onOpenChange={() => { setEditingStaff(null); setErrorMessage(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" /> Edit Staff
              </DialogTitle>
              <DialogDescription>
                Update the staff member's information. Email cannot be changed.
              </DialogDescription>
            </DialogHeader>
            
            {/* Display Error Message for EDIT */}
            {errorMessage && editingStaff && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                **Error:** {errorMessage}
              </div>
            )}

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    disabled={isEditLoading}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.surname}
                    onChange={(e) => updateFormData("surname", e.target.value)}
                    disabled={isEditLoading}
                  />
                </div>
              </div>

              <div>
                <Label>Email (Cannot be changed)</Label>
                <Input
                  value={formData.email}
                  // 🚨 SECURITY: Disable the input to prevent submission of a new email
                  disabled={true} 
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  disabled={isEditLoading}
                />
              </div>

              <div>
                <Label>Maintenance Area</Label>
                <Select
                  value={formData.maintenanceType}
                  onValueChange={(val) => updateFormData("maintenanceType", val)}
                  disabled={isEditLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="Carpentry">Carpentry</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditingStaff(null)}
                disabled={isEditLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStaff}
                disabled={isEditLoading}
              >
                {isEditLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit className="h-4 w-4 mr-2" />
                )}
                {isEditLoading ? "Updating..." : "Update Staff"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation (UNCHANGED) */}
        <Dialog
          open={staffToDelete !== null}
          onOpenChange={() => setStaffToDelete(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this staff member? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStaffToDelete(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}