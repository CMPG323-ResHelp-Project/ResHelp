"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { auth } from "@/lib/firebase";

type StudentAPI = {
  Email?: string;
  Name?: string;
  Surname?: string;
  Phone?: string;
  Address?: string;
};

// --- Student Type ---
type Student = {
  res_name: string;
  phone: string;
  id: string;
  name: string;
  surname: string;
  contact_details: string;
  email: string;
  address: string;
  section: string; 
  room_number: string; 
  res_address: string;
};

export default function ManagerStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [sortByNameOrder, setSortByNameOrder] = useState<"asc" | "desc">("asc");


  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    email: "",
    res_name: "",
    section: "", 
    room_number: "", 
    res_address: "",
  });
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);


  // --- Form Update ---
  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateFormData = (data: typeof formData): string | null => {
    if (!data.name.trim()) return "First name is required.";
    if (!data.surname.trim()) return "Last name is required.";
    if (!data.email.endsWith("@gmail.com")) return "Email must end with @gmail.com.";
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(data.phone)) return "Phone must be 10 digits and start with 0.";
    if (!data.res_name.trim()) return "Residence name is required.";
    if (!data.section.trim()) return "Section is required.";
    if (!data.room_number.trim()) return "Room number is required.";
    return null;
  };

 
// ⭐️ API Handling Logic for ADD Student (cleaned)
const handleAddStudent = async () => {
  const validationError = validateFormData(formData);
  if (validationError) {
    setErrorMessage(validationError);
    return;
  }

  setErrorMessage(null);
  setIsAddLoading(true); // START ADD LOADING

  try {
    const apiUrl = "http://localhost:5229/studentupdate/add";

    // Prepare payload, combine residence info into full address
    const payload = {
      ...formData,
      address: `${formData.res_name.trim()}, ${formData.section.trim()}, ${formData.room_number.trim()}`,
      userType: "student",
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorBody.error || `Server returned status: ${response.status}`);
    }

    const savedStudent: Student = await response.json();

    // Add new student to state
    setStudents((prev) => [savedStudent, ...prev]);

    // Reset form
    setFormData({
      name: "",
      surname: "",
      email: "",
      phone: "",
      res_name: "",
      section: "",
      room_number: "",
      res_address: "",
    });
    setIsAddDialogOpen(false);

    setConfirmationMessage("Student added successfully!");
    setTimeout(() => setConfirmationMessage(null), 5000);

  } catch (err) {
    console.error("API Error:", err);
    const message = (err as Error).message.includes("Failed to fetch")
      ? "Failed to fetch. Check if the C# API is running and the URL is correct (http://localhost:5229/studentupdate/add)."
      : (err as Error).message;

    setErrorMessage(message);
  } finally {
    setIsAddLoading(false); // STOP ADD LOADING
  }
};


const handleSortByName = () =>
  setSortByNameOrder((prev) => (prev === "asc" ? "desc" : "asc"));


const displayedStudents = students
  .filter((s) => {
    const term = searchTerm.toLowerCase();

    // Ensure all fields are defined before using toLowerCase
    const name = s.name ?? "";
    const surname = s.surname ?? "";
    const phone = s.phone ?? "";
    const address = s.address ?? "";
    const section = s.section ?? "";
    const room_number = s.room_number ?? "";
    const res_address = s.res_address ?? "";

    return (
      name.toLowerCase().includes(term) ||
      surname.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term) ||
      address.toLowerCase().includes(term) ||
      section.toLowerCase().includes(term) ||
      room_number.toLowerCase().includes(term) ||
      res_address.toLowerCase().includes(term)
    );
  })
  .sort((a, b) => {
    // Default to empty string if name/surname are undefined
    const fullNameA = `${a.name ?? ""} ${a.surname ?? ""}`.toLowerCase();
    const fullNameB = `${b.name ?? ""} ${b.surname ?? ""}`.toLowerCase();

    // Sort based on the current order state
    return sortByNameOrder === "asc"
      ? fullNameA.localeCompare(fullNameB)
      : fullNameB.localeCompare(fullNameA);
  });

useEffect(() => {
  const fetchStudents = async () => {
    setIsTableLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("http://localhost:5229/studentupdate/students/all", {
        method: "GET",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Server returned status: ${response.status}`);
      }

      const studentList: Student[] = await response.json(); // no mapping, direct
      console.log("Fetched students:", studentList);
      setStudents(studentList);

    } catch (err: any) {
      console.error("API Error:", err);
      setErrorMessage(err.message);
    } finally {
      setIsTableLoading(false);
    }
  };

  fetchStudents();
}, []);





const handleEditStudent = (student: any) => {
  const parts: string[] = (student.address || "").split(",").map((p: string) => p.trim());
  const resName = parts[0] || "";
  const section = parts[1] || "";
  const room = parts[2] || "";

  setFormData({
    name: student.name || "",
    surname: student.surname || "",
    email: student.email || "",
    phone: student.phone || "",
    res_name: resName,
    section: section,
    room_number: room,
    res_address: student.address || "",
  });

  setEditingStudent(student);
};


const handleUpdateStudent = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (!editingStudent) return;

  setErrorMessage(null);
  setConfirmationMessage(null);
  setIsEditLoading(true);

  try {
    // Concatenate address parts
    const address = `${formData.res_name.trim()}, ${formData.section.trim()}, ${formData.room_number.trim()}`;

    const payload: any = {
      email: editingStudent.email, // identify student
      Name: formData.name,
      Surname: formData.surname,
      Phone: formData.phone,
      Address: address,
    };

    // Call backend to update student
    const response = await fetch("http://localhost:5229/studentupdate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorBody.error || `Server returned status: ${response.status}`);
    }

    // 🔄 Reload full student list from backend after update
    const reloadResponse = await fetch("http://localhost:5229/studentupdate/students/all", {
      method: "GET",
    });
    const updatedStudents: Student[] = await reloadResponse.json();
    setStudents(updatedStudents);

    // Reset form and editing state
    setEditingStudent(null);
    setFormData({
      name: "",
      surname: "",
      email: "",
      phone: "",
      res_name: "",
      section: "",
      room_number: "",
      res_address: "",
    });

    setConfirmationMessage("Student updated successfully!");
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


  // --- Delete Student ---
 // Students only – inside students/page.tsx
const handleDeleteStudent = (student: Student) => setStudentToDelete(student);
const confirmDelete = async () => {
  if (!studentToDelete) return;

  setIsTableLoading(true);

  try {
    const response = await fetch(
      `http://localhost:5229/studentupdate/${studentToDelete.email}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      let errorMessage = `Server returned status: ${response.status}`;
      try {
        const errorBody = await response.clone().json();
        if (errorBody?.error) errorMessage = errorBody.error;
      } catch {}
      throw new Error(errorMessage);
    }

    setStudents((prev) =>
      prev.filter((s) => s.email !== studentToDelete.email)
    );

    setStudentToDelete(null);
    setConfirmationMessage("Student deleted successfully!");
    setTimeout(() => setConfirmationMessage(null), 3000);

  } catch (err: any) {
    console.error("Delete Student API Error:", err);
    setErrorMessage(err.message);
  } finally {
    setIsTableLoading(false);
  }
};



const filteredStudents = students.filter((s) => {
  const term = searchTerm.toLowerCase();
  return (
    (s.name ?? "").toLowerCase().includes(term) ||
    (s.surname ?? "").toLowerCase().includes(term) ||
    (s.phone ?? "").toLowerCase().includes(term) ||
    (s.address ?? "").toLowerCase().includes(term) ||
    (s.section ?? "").toLowerCase().includes(term) ||
    (s.room_number ?? "").toLowerCase().includes(term) ||
    (s.res_address ?? "").toLowerCase().includes(term)
  );
});


  const sortedStudents = [...filteredStudents].sort((a, b) =>
    sortDirection === "asc"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  );

  const toggleSortDirection = () =>
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");

  interface StudentFormInputsProps {
    formData: {
      name: string;
      surname: string;
      contact_details: string;
      email: string;
      res_name: string;
      section: string;
      room_number: string;
      res_address: string;
    };
    updateFormData: (field: string, value: string) => void;
    formError: string | null;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/students" />
  
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header & Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Manage Students</h1>
            <p className="text-muted-foreground">
              Add, edit, and manage student profiles
            </p>
          </div>
  
          <Button
            onClick={() => {
              setFormData({
                name: "",
                surname: "",
                phone: "",
                email: "",
                res_name: "",
                section: "",
                room_number: "",
                 res_address: "",
              });
              setAddError(null);
              setIsAddDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>
  
        {/* Search + Sort */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, residence, or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline">
            {filteredStudents.length} of {students.length} students
          </Badge>
          <Button variant="outline" onClick={handleSortByName}>
  Sort by Name{" "}
  {sortByNameOrder === "asc" ? (
    <ArrowUp className="h-4 w-4 ml-2" />
  ) : (
    <ArrowDown className="h-4 w-4 ml-2" />
  )}
</Button>

        </div>
  
        {confirmationMessage && (
          <div className="bg-green-100 text-green-700 p-2 rounded">
            {confirmationMessage}
          </div>
        )}
  
        {/* Students Table */}
        <Card>
  <CardHeader>
    <CardTitle>Student Directory</CardTitle>
    <CardDescription>
      Complete list of registered members
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Residence</TableHead>
          <TableHead>Section</TableHead>
          <TableHead>Room</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isTableLoading ? (
          <TableRow key="loading">
            <TableCell colSpan={7} className="h-24 text-center">
              <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" />
              <div>Loading students...</div>
            </TableCell>
          </TableRow>
        ) : displayedStudents.length > 0 ? (
          displayedStudents.map((member) => (
            <TableRow key={member.id}>
  <TableCell>
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      {member.name} {member.surname}
    </div>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-muted-foreground" />
      {member.email}
    </div>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-2">
      <Phone className="h-4 w-4 text-muted-foreground" />
      {member.phone}
    </div>
  </TableCell>

  {(() => {
    const parts = member.address.split(",").map(p => p.trim());
    const resName = parts[0] || "";
    const section = parts[1] || "";
    const room = parts[2] || "";
    return (
      <>
        <TableCell>{resName}</TableCell>
        <TableCell>{section}</TableCell>
        <TableCell>{room}</TableCell>
      </>
    );
  })()}

  <TableCell className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => handleEditStudent(member)}>
      <Edit className="h-4 w-4" />
    </Button>
    <Button size="sm" variant="destructive" onClick={() => handleDeleteStudent(member)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </TableCell>

            </TableRow>
          ))
        ) : (
          <TableRow key="no student">
            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
              No Stundent found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </CardContent>
</Card>


        {/* Add Student Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md mx-auto mt-12 rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Add Student
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Enter the student's information
              </DialogDescription>
            </DialogHeader>
  
            {/* Compact Form */}
            {errorMessage && !editingStudent && (
                              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                              **Error:** {errorMessage}
                            </div>
                  )}
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    className="w-full"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    className="w-full"
                    value={formData.surname}
                    onChange={(e) => updateFormData("surname", e.target.value)}
                  />
                </div>
              </div>
  
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  className="w-full"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                />
              </div>
  
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  className="w-full"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                />
              </div>
  
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Residence Name</Label>
                  <Input
                    className="w-full"
                    value={formData.res_name}
                    onChange={(e) => updateFormData("res_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    className="w-full"
                    value={formData.section}
                    onChange={(e) => updateFormData("section", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input
                    className="w-full"
                    value={formData.room_number}
                    onChange={(e) => updateFormData("room_number", e.target.value)}
                  />
                </div>
              </div>
    
              <div className="flex justify-end gap-3 mt-4">
                <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isAddLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStudent} 
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

              </div>
            </div>
          </DialogContent>
        </Dialog>
  
        {/* Edit Student Dialog */}
        <Dialog open={!!editingStudent} onOpenChange={() => { setEditingStudent(null); setUpdateError(null); }}>
          <DialogContent className="max-w-md mx-auto mt-12 rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" /> Edit Student
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Update the student's information
              </DialogDescription>
            </DialogHeader>
  
 {/* Display Error Message for EDIT */}
 {errorMessage && editingStudent && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                **Error:** {errorMessage}
              </div>
            )}            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    className="w-full"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    className="w-full"
                    value={formData.surname}
                    onChange={(e) => updateFormData("surname", e.target.value)}
                  />
                </div>
              </div>
  
              <div className="space-y-2">
                <Label>Email (Cannot Change)</Label>
                <Input className="w-full bg-gray-100 cursor-not-allowed" value={formData.email} disabled />
              </div>
  
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  className="w-full"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                />
              </div>
  
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Residence Name</Label>
                  <Input
                    className="w-full"
                    value={formData.res_name}
                    onChange={(e) => updateFormData("res_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    className="w-full"
                    value={formData.section}
                    onChange={(e) => updateFormData("section", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input
                    className="w-full"
                    value={formData.room_number}
                    onChange={(e) => updateFormData("room_number", e.target.value)}
                  />
                </div>
              </div>
    
              <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setEditingStudent(null)}
                disabled={isEditLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStudent}
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
            </div>
          </DialogContent>
        </Dialog>
  
        {/* Delete Student Dialog */}
        <Dialog open={studentToDelete !== null} onOpenChange={() => setStudentToDelete(null)}>
          <DialogContent className="max-w-md mx-auto mt-12 rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete this student? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
  
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" className="text-muted-foreground hover:bg-muted/20" onClick={() => setStudentToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="flex items-center gap-2" onClick={confirmDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}  