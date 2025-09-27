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
import { Search, Plus, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { auth } from "@/lib/firebase";

// --- Student Type ---
type Student = {
  id: number;
  name: string;
  surname: string;
  contact_details: string;
  email: string;
  res_name: string;
  section: string; 
  room_number: string; 
  res_address: string;
};

// --- Mock Students (used as initial state until API loads) ---
const initialStudents: Student[] = [
  { id: 1, name: "Alice", surname: "Johnson", contact_details: "0123456789", email: "alice@gmail.com", res_name: "Res A", section: "Block 1", room_number: "101", res_address: "Res A, Block 1, 101" },
  { id: 2, name: "Bob", surname: "Smith", contact_details: "0123456790", email: "bob@gmail.com", res_name: "Res B", section: "C Wing", room_number: "202", res_address: "Res B, C Wing, 202" },
  { id: 3, name: "Charlie", surname: "Brown", contact_details: "0123456791", email: "charlie@gmail.com", res_name: "Res C", section: "North Block", room_number: "303", res_address: "Res C, North Block, 303" },
];

export default function ManagerStudentsPage() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    contact_details: "",
    email: "",
    res_name: "",
    section: "", 
    room_number: "", 
    res_address: "",
  });
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // --- Form Update ---
  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Load students from API ---
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const user = auth.currentUser;
        const idToken = user ? await user.getIdToken() : null;
        if (!user || !idToken) throw new Error("Manager not authenticated");

        const response = await fetch("http://localhost:5229/UserUpdate/students/all", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!response.ok) throw new Error("Failed to fetch students");
        const data: Student[] = await response.json();
        setStudents(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStudents();
  }, []);

  // --- Add Student ---
  const handleAddStudent = async (): Promise<boolean> => {
    setAddError(null);

    if (!formData.name.trim() || !formData.surname.trim() || !formData.email.trim() || !formData.contact_details.trim() || !formData.res_name.trim() || !formData.section.trim() || !formData.room_number.trim()) {
        setAddError("All fields are required.");
        return false;
    }

    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : null;
      if (!user || !idToken) throw new Error("Manager not authenticated");

      const payload = { ...formData, res_address: `${formData.res_name}, ${formData.section}, ${formData.room_number}` };
      const response = await fetch("http://localhost:5229/UserUpdate/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add student");
      const newStudent: Student = await response.json();
      setStudents((prev) => [...prev, newStudent]);
      setFormData({ name: "", surname: "", contact_details: "", email: "", res_name: "", section: "", room_number: "", res_address: "" });
      setConfirmationMessage("Student added successfully!");
      setTimeout(() => setConfirmationMessage(null), 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      setAddError(err.message || "Error adding student");
      return false;
    }
  };

  // --- Edit Student ---
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      surname: student.surname,
      contact_details: student.contact_details,
      email: student.email,
      res_name: student.res_name,
      section: student.section,
      room_number: student.room_number,
      res_address: student.res_address, // still keep full address for backend
    });
  };
  

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    setUpdateError(null);

    if (!formData.name.trim() || !formData.surname.trim() || !formData.email.trim() || !formData.contact_details.trim() || !formData.res_name.trim() || !formData.section.trim() || !formData.room_number.trim()) {
        setUpdateError("All fields are required for update.");
        return;
    }

    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : null;
      if (!user || !idToken) throw new Error("Manager not authenticated");

      const payload = {
        ...formData,
        res_address: `${formData.res_name}, ${formData.section}, ${formData.room_number}`,
      };
            const response = await fetch(`http://localhost:5229/UserUpdate/students/${editingStudent.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to update student");
      const updatedStudent: Student = await response.json();
      setStudents((prev) => prev.map((s) => s.id === updatedStudent.id ? updatedStudent : s));
      setEditingStudent(null);
      setConfirmationMessage("Student updated successfully!");
      setTimeout(() => setConfirmationMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setUpdateError(err.message || "Error updating student");
    }
  };

  // --- Delete Student ---
  const handleDeleteStudent = (id: number) => setStudentToDelete(id);
  const confirmDelete = async () => {
    if (studentToDelete === null) return;

    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : null;
      if (!user || !idToken) throw new Error("Manager not authenticated");

      const response = await fetch(`http://localhost:5229/UserUpdate/students/${studentToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) throw new Error("Failed to delete student");

      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete));
      setStudentToDelete(null);
      setConfirmationMessage("Student deleted successfully!");
      setTimeout(() => setConfirmationMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  // --- Sorting & Filtering ---
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.res_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a, b) =>
    sortDirection === "asc"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  );

  const toggleSortDirection = () =>
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");

  // --- Form Inputs (unchanged) ---
  const StudentFormInputs = ({ formError }: { formError: string | null }) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input value={formData.name} onChange={e => updateFormData("name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input value={formData.surname} onChange={e => updateFormData("surname", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={formData.email} onChange={e => updateFormData("email", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Phone Number</Label>
        <Input value={formData.contact_details} onChange={e => updateFormData("contact_details", e.target.value)} />
      </div>

      <div className="space-y-2 pt-2">
        <h3 className="text-sm font-medium text-primary">Residence Address</h3>
      </div>

      <div className="space-y-2">
        <Label>Residence Name</Label>
        <Input value={formData.res_name} onChange={e => updateFormData("res_name", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Section (e.g., Block A, C Wing)</Label>
          <Input value={formData.section} onChange={e => updateFormData("section", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Room Number</Label>
          <Input value={formData.room_number} onChange={e => updateFormData("room_number", e.target.value)} />
        </div>
      </div>

      {formError && <p className="text-red-600 mt-2">{formError}</p>}
    </>
  );


  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/students" />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Manage Students</h1>
            <p className="text-muted-foreground">Add, edit, and manage student profiles (Local Mock Data)</p>
          </div>

          {/* Add Student Dialog Trigger */}
          <Button onClick={() => {
            setFormData({ // Reset form data on opening Add dialog
              // REMOVED: student_number: "",
              name: "",
              surname: "",
              contact_details: "",
              email: "",
              res_name: "",
              section: "", 
              room_number: "", 
              res_address: "",
            });
            setAddError(null);
            setIsAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>

          {/* Add Student Dialog */}
          {isAddDialogOpen && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add Student
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Enter the student's information
                </DialogDescription>
              </DialogHeader>
            
              <div className="space-y-4 mt-4">
                <StudentFormInputs formError={addError} />
            {/* Action Buttons */}
<div className="flex justify-end gap-3 mt-6">
  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
  <Button
    className="flex items-center gap-2"
    onClick={async () => {
      const success = await handleAddStudent();
      if (success) setIsAddDialogOpen(false);
    }}
  >
    <Plus className="h-4 w-4" /> Add
  </Button>
</div>

              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search by name, or address..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Badge variant="outline">{filteredStudents.length} of {students.length} students</Badge>
          <Button variant="outline" onClick={toggleSortDirection}>
            Sort ({sortDirection === "asc" ? "A-Z" : "Z-A"}) <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {confirmationMessage && <div className="bg-green-100 text-green-700 p-2 rounded">{confirmationMessage}</div>}

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Complete list of registered students</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
  <TableHeader>
    <TableRow>
      {/* REMOVED: Student No. header */}
      <TableHead>First Name</TableHead>
      <TableHead>Last Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Phone</TableHead>
      <TableHead>Address</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {sortedStudents.length === 0 ? (
      <TableRow>
        {/* UPDATED: colSpan from 6 to 5 */}
        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No students found</TableCell>
      </TableRow>
    ) : (
      sortedStudents.map(student => (
        <TableRow key={student.id}>
          {/* REMOVED: Student Number cell */}
          <TableCell>{student.name}</TableCell>
          <TableCell>{student.surname}</TableCell>
          <TableCell>{student.email}</TableCell>
          <TableCell>{student.contact_details}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{student.res_address}</TableCell>
          <TableCell className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}><Edit className="h-4 w-4" /></Button>
            <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student.id)}><Trash2 className="h-4 w-4" /></Button>
          </TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
          </CardContent>
        </Card>

        {/* Edit Student Dialog */}
        <Dialog open={!!editingStudent} onOpenChange={() => { setEditingStudent(null); setUpdateError(null); }}>
<DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
  <DialogHeader>
    <DialogTitle className="text-xl font-bold flex items-center gap-2">
      <Edit className="h-5 w-5 text-primary" /> Edit Student
    </DialogTitle>
    <DialogDescription className="text-sm text-muted-foreground mt-1">
      Update the student's information.
    </DialogDescription>
  </DialogHeader>

  <div className="space-y-4 mt-4">
    <StudentFormInputs formError={updateError} />

    <div className="flex justify-end gap-3 mt-6">
      <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
      <Button className="flex items-center gap-2" onClick={handleUpdateStudent}><Edit className="h-4 w-4" /> Update</Button>
    </div>
  </div>
</DialogContent>
</Dialog>

        {/* Delete Student Dialog */}
        <Dialog open={studentToDelete !== null} onOpenChange={() => setStudentToDelete(null)}>
          <DialogContent className="max-w-md mx-auto rounded-2xl shadow-2xl border border-muted/20 bg-background/95 backdrop-blur-lg p-6 animate-fade-in">
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
              <Button variant="destructive" className="flex items-center gap-2" onClick={confirmDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}