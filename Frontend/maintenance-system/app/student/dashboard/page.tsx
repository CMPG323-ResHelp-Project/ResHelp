"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, CheckCircle, AlertTriangle, ListFilter, X, MapPin, ClipboardList, ArrowRight, Image as ImageIcon, Users, Search } from "lucide-react" 
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
// 🔑 NEW: Import Dialog components for the confirmation modal
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"


// Mock-up of a simplified Issue type based on the backend response
interface Issue {
    Id: string;
    Status: "Pending" | "Assigned" | "In-Progress" | "Resolved" | "Cancelled";
    Title: string;
    Description: string;
    Priority: "High" | "Medium" | "Low";
    Category: string; // Issue category (e.g., Plumbing, Electrical, Structural)
    Location: string; // Specific location (e.g., House 3A, Room 204)
    IsUrgentSafetyHazard: boolean; // Urgent safety hazard flag
    ReportedAt: string;
    UpdatedAt: string;
    Rating?: number;
    ReporterEmail: string;
    ImageUrl: string;
    DriverName: string; 
    DriverSurname: string;
    DriverPhone: string;
}

const parseImageUrls = (imageUrlString: string): string[] => {
    if (!imageUrlString) return [];
    
    // FIX: Split by pipe symbol ('|') to handle your backend format
    const urls = imageUrlString
        .split('|') 
        .map(url => url.trim())
        .filter(url => url.length > 0);
        
    return urls.slice(0, 3);
};

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


// ------------------------------------------------------------------------------------
// 🆕 NEW: Rating Prompt Modal Component (Issue History Container)
// ------------------------------------------------------------------------------------

interface RatingPromptModalProps {
    issue: Issue;
    onClose: () => void;
    onSubmitRating: (id: string, rating: number) => Promise<void>;
}

const RatingPromptModal: React.FC<RatingPromptModalProps> = ({ issue, onClose, onSubmitRating }) => {
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (selectedRating !== null) {
            setIsSubmitting(true);
            // onSubmitRating is expected to call onClose after success
            await onSubmitRating(issue.Id, selectedRating);
            // setIsSubmitting will be set to false if onSubmitRating doesn't close the modal on error
            // However, since we expect it to close on success, we don't strictly need to set it to false here.
            // But leaving it for a robust catch scenario:
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl text-primary flex items-center justify-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500"/>
                        Rate Your Service
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">Please rate the resolution for:</p>
                    <p className="font-semibold text-base truncate">{issue.Title}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    
                    <div className="flex justify-center items-center gap-1 text-4xl">
                        {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                            <button
                                key={star}
                                onClick={() => setSelectedRating(star)}
                                className={`transition-colors ${star <= (selectedRating || 0) ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
                                aria-label={`${star} star rating`}
                                // Ensure stars are not clickable if already submitting
                                disabled={isSubmitting} 
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        <Button 
                            variant="default" 
                            className="flex-1" 
                            onClick={handleSubmit} 
                            disabled={selectedRating === null || isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : `Submit ${selectedRating || 0} Star${selectedRating === 1 ? '' : 's'}`}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            className="flex-1"
                            disabled={isSubmitting} // 🔑 FIX: Disable close button while submitting
                        >
                            Rate Later (Close)
                        </Button>
                    </div>
                    
                    <div className="text-center text-xs text-muted-foreground">
                        <span className="font-semibold">Note:</span> You can also rate this issue anytime in the **Issue History** section below.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


// ------------------------------------------------------------------------------------
// --- Edit Issue Modal Component (EXISTING) ---
// ------------------------------------------------------------------------------------
// 🔑 UPDATED: Added ImageUrl to the form object sent to onSave
interface EditIssueForm {
    Title: string;
    Description: string;
    Category: string;
    Location: string;
    Priority: "High" | "Medium" | "Low";
    IsUrgentSafetyHazard: boolean;
    ImageUrl: string; // The determined URL for the backend
}

interface EditIssueModalProps {
    issue: Issue;
    onClose: () => void;
    // 🔑 UPDATED: onSave now expects the EditIssueForm which includes ImageUrl
    onSave: (id: string, form: EditIssueForm) => Promise<void>;
}

const EditIssueModal: React.FC<EditIssueModalProps> = ({ issue, onClose, onSave }) => {
    // 🔑 FIX: Case-insensitive check on Status
    if (issue.Status.toLowerCase() !== 'pending') {
        onClose();
        return null;
    }

    // 🔑 UPDATED: States for file management
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [newImageUrl, setNewImageUrl] = useState<string>(''); // Holds the URL if a new file is uploaded
    const [isUploading, setIsUploading] = useState(false); // Used to disable the submit button
    const [currentImageUrls, setCurrentImageUrls] = useState<string[]>(parseImageUrls(issue.ImageUrl));

    const [editForm, setEditForm] = useState<Omit<EditIssueForm, 'ImageUrl'>>({ // Omit ImageUrl for form fields
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


    const handleRemoveImage = (indexToRemove: number) => {
        setCurrentImageUrls(prevUrls => 
            prevUrls.filter((_, index) => index !== indexToRemove)
        );
        // If a new file was uploaded and we remove the last/only URL, clear the new file state
        if (newImageFile && currentImageUrls.length === 1) {
            setNewImageFile(null);
        }
    };

    
    // 🔑 UPDATED: Handle file selection, upload, and URL generation
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        
        // Check image limit BEFORE upload
        if (currentImageUrls.length >= 3) {
            alert("You have reached the maximum limit of 3 images. Please remove an existing image before uploading a new one.");
            // Reset input field to allow re-selection/re-try
            e.target.value = ''; 
            return;
        }

        if (!file) {
            setNewImageFile(null);
            return;
        }
        
        setNewImageFile(file);

        try {
            setIsUploading(true); 
            // Lazy import Firebase modules
            const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { firebase2 } = await import("@/lib/firebase2"); 

            const storage = getStorage(firebase2);
            const storageRef = ref(storage, `issue-images/${file.name}-${Date.now()}`);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            // 🔑 IMPORTANT: ADD the new URL to the currentImageUrls array
            setCurrentImageUrls(prevUrls => [...prevUrls, url]); 
            
            // Clear the input to allow another file selection immediately
            e.target.value = '';

        } catch (err) {
            console.error("Image upload failed:", err);
            setNewImageFile(null); 
            alert("Failed to upload image. Please check the file and try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Disable submission if still uploading
        if (isUploading) {
            alert("Please wait for the image upload to complete.");
            return;
        }

        setIsSaving(true);
        
        // 🔑 FIXED: Use the currentImageUrls array (which includes additions and removals)
        // to construct the final pipe-separated string for the backend.
        const finalImageUrl = currentImageUrls.join('|');
            
        // Construct the full form object including the ImageUrl
        const fullForm: EditIssueForm = {
            ...editForm,
            ImageUrl: finalImageUrl // This now holds the correct, updated list of URLs
        };

        await onSave(issue.Id, fullForm);
        
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

                        {/* Image Display and Replacement Section */}
<div className="space-y-2 p-3 border rounded-lg bg-gray-50">
    <Label htmlFor="issueImage" className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" /> Issue Image(s)
    </Label>
    
    {/* Display ALL Existing/New Images from the currentImageUrls state array */}
    {currentImageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white/70">
            {/* Map over the currentImageUrls array */}
            {currentImageUrls.map((url, index) => (
                <div key={index} className="w-20 h-20 overflow-hidden rounded-md border shrink-0 relative group">
                    <img 
                        src={url} 
                        alt={`Issue ${issue.Id.slice(0, 8)} Image ${index + 1}`} 
                        className="object-cover w-full h-full"
                    />
                    
                    {/* 🔑 REMOVE BUTTON: Allows individual image deletion */}
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity p-0 z-10"
                        onClick={() => handleRemoveImage(index)} // Calls handler to remove this URL
                        title="Remove Image"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                    
                    {/* View Link Overlay */}
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View Full Image"
                    >
                        <Search className="h-5 w-5 text-white" />
                    </a>
                </div>
            ))}
            <p className="text-sm self-end p-2 text-muted-foreground">
                {/* Display current count */}
                {currentImageUrls.length} image(s) attached.
            </p>
        </div>
    ) : (
        <div className="text-center py-4 border-dashed border-2 rounded-lg text-muted-foreground">
            <ImageIcon className="h-6 w-6 mx-auto mb-2" />
            <p>No image(s) currently attached.</p>
        </div>
    )}

    {/* Image Replacement/Upload Alternative */}
    <div className="pt-2">
        <Label htmlFor="imageUpload" className="text-sm font-medium">
            {/* 🔑 UPDATED LABEL: Shows current count / max limit */}
            Upload New Image ({currentImageUrls.length} / 3)
        </Label>
        <Input 
            id="imageUpload" 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="mt-1"
            // 🔑 UPDATED DISABLED LOGIC: Disable if uploading OR max limit (3) is reached
            disabled={isUploading || currentImageUrls.length >= 3} 
        />
        
        {/* 🔑 NEW: Max Limit Warning Message */}
        {currentImageUrls.length >= 3 && (
            <p className="text-xs text-red-600 mt-1">
                Maximum 3 images reached. Please remove one to upload a new one.
            </p>
        )}
        
        {isUploading && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3 animate-spin" /> Uploading image...
            </p>
        )}
        {/* NOTE: Removed old newImageFile/newImageUrl status messages as they are obsolete with the new state management */}
    </div>
</div>
                        {/* END Image Section */}

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

                        <Button type="submit" className="w-full" disabled={isSaving || isUploading}>
                            {isUploading ? "Waiting for Image..." : isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};


// ------------------------------------------------------------------------------------
// --- Main Dashboard Component ---
// ------------------------------------------------------------------------------------
export default function MyIssuesDashboard() {
    const router = useRouter()
    const [issues, setIssues] = useState<Issue[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [issueMessage, setIssueMessage] = useState<string | null>(null) 
    const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
    const [activeSort, setActiveSort] = useState<"ReportedAt_desc" | "ReportedAt_asc">("ReportedAt_desc");
    const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
    const [historySort, setHistorySort] = useState<"UpdatedAt_desc" | "UpdatedAt_asc">("UpdatedAt_desc");
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string | null>(null);
    const [issueToRate, setIssueToRate] = useState<Issue | null>(null); // 🆕 New state for the rating modal
    const [imageUrls, setImageUrls] = useState<string[]>([]); 
    const [imageUploading, setImageUploading] = useState(false);

    // 🔑 NEW: State to manage the issue being confirmed for cancellation
    const [issueToCancel, setIssueToCancel] = useState<Issue | null>(null);
    
    // 🔑 UPDATED: State to manage the search query (used by both sections)
    const [searchQuery, setSearchQuery] = useState("");

    const submitRating = async (issueId: string, rating: number) => {
      try {
        // 🔑 FIX: Removed window.confirm as the modal handles selection/confirmation
    
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
        
        setIssueToRate(null); // 🆕 Close the rating prompt modal on success

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
            case "assigned": // 🔑 NEW STATUS ICON
                return <Users className="h-4 w-4" />
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
            case "assigned": // 🔑 NEW STATUS COLOR (Teal)
                return "bg-teal-100 text-teal-800 border-teal-200"
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
                // Status is kept as-is from backend (e.g., "Pending", "assigned")
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
                // 🔑 ADDED: Mapping the ImageUrl property
                ImageUrl: item.ImageUrl || "", 
                // 🔑 NEW: Mapping Driver properties
                DriverName: item.DriverName || "",
                DriverSurname: item.DriverSurname || "",
                DriverPhone: item.DriverPhone || "",
            }));

            setIssues(formattedIssues)
            
            // 🆕 Check for the first unrated resolved issue and set it for the modal
            const unratedResolvedIssue = formattedIssues.find(
                (i) => i.Status.toLowerCase() === "resolved" && i.Rating === null
            );
            if (unratedResolvedIssue) {
                setIssueToRate(unratedResolvedIssue);
            }

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
        // 🔑 FIX: Case-insensitive check on Status is already correct, but the message is clearer.
        if (issue.Status.toLowerCase() === 'pending') {
            setEditingIssue(issue);
        } else {
            // Updated alert message to be dynamic and avoid misleading hardcoded strings
            alert(`Issue is currently '${issue.Status}'. Only 'Pending' issues can be edited.`);
        }
    }

    

    // 🔑 UPDATED: handleSaveEdit now expects the full form including ImageUrl
// Inside MyIssuesDashboard component
const handleSaveEdit = async (issueId: string, form: EditIssueForm) => {
    setError(null); // Clear previous errors
    setIssueMessage(null); // Clear previous messages
    try {
        // Assuming imports like auth and firebase2 are available in this scope
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
            // 🔑 FIXED: Use the ImageUrl property from the 'form' object passed by the modal
            imageUrl: form.ImageUrl, 
            isUrgent: form.IsUrgentSafetyHazard, 
        };

        // Send PUT request to the C# endpoint
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
};
    // 🔑 END UPDATE LOGIC
    
    // 🔑 UPDATED: Initial handler to open the dialog
    const handleConfirmCancel = (issue: Issue) => {
        setIssueToCancel(issue);
    };

    // 🔑 UPDATED: Core logic for cancellation, called from the Dialog
    const handleCancelIssue = async (issueId: string) => {
        setIssueToCancel(null); // Close the dialog immediately upon confirmation
        setError(null);
        setIssueMessage(null); 

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

        // 🔑 FIX: Ensure filter comparison uses toLowerCase()
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

    const parseImageUrls = (imageUrlString: string): string[] => {
        if (!imageUrlString) return [];
        
        // FIX: Split by pipe symbol ('|') to handle your backend format
        const urls = imageUrlString
            .split('|') 
            .map(url => url.trim())
            .filter(url => url.length > 0);
            
        return urls.slice(0, 3);
    };

    const activeIssues = useMemo(() => {
        // 1. Filter by status (Active statuses: pending, assigned, in-progress)
        let issuesByStatus = issues.filter((i) => ["pending", "assigned", "in-progress"].includes(i.Status.toLowerCase()));

        // 🔑 NEW: 2. Filter by search query (Title or Description)
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (lowerCaseQuery) {
            issuesByStatus = issuesByStatus.filter(issue => 
                issue.Title.toLowerCase().includes(lowerCaseQuery) ||
                issue.Description.toLowerCase().includes(lowerCaseQuery)
            );
        }

        // 3. Apply status filter and sorting (using the existing helper)
        return sortAndFilterIssues(issuesByStatus, activeSort, activeStatusFilter, 'ReportedAt');
    }, [issues, activeSort, activeStatusFilter, searchQuery]); // 🔑 ADDED: searchQuery dependency


    const historyIssues = useMemo(() => {
        // 1. Filter by status (History statuses: resolved, cancelled)
        let issuesByStatus = issues.filter((i) => ["resolved", "cancelled"].includes(i.Status.toLowerCase()));
        
        // 🔑 NEW: 2. Filter by search query (Title or Description)
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (lowerCaseQuery) {
            issuesByStatus = issuesByStatus.filter(issue => 
                issue.Title.toLowerCase().includes(lowerCaseQuery) ||
                issue.Description.toLowerCase().includes(lowerCaseQuery)
            );
        }

        // 3. Apply status filter and sorting
        return sortAndFilterIssues(issuesByStatus, historySort, historyStatusFilter, 'UpdatedAt');
    }, [issues, historySort, historyStatusFilter, searchQuery]); // 🔑 ADDED: searchQuery dependency


    const statusCounts = issues.reduce(
        (acc, issue) => {
            const status = (issue.Status || "").toLowerCase()
            if (status === "pending") acc.pending += 1
            else if (status === "assigned") acc.assigned += 1 // 🔑 NEW STATUS COUNT
            else if (status === "in-progress") acc.inProgress += 1
            else if (status === "resolved") acc.resolved += 1
            else if (status === "cancelled") acc.cancelled += 1
            return acc
        },
        // 🔑 UPDATED: Added assigned to initial state
        { pending: 0, assigned: 0, inProgress: 0, resolved: 0, cancelled: 0 } 
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
                            <Users className="h-5 w-5 text-teal-600 mb-2" />
                            <p className="text-sm text-muted-foreground">Assigned</p>
                            <p className="text-2xl font-bold text-teal-800">{statusCounts.assigned}</p>
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
                </div>

                {/* Active Issues Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            <CardTitle>Active Issues ({activeIssues.length})</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">                            {/* 🔑 NEW: Search Input for Active Issues */}
                            <div className="relative w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search title/desc..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                            {/* 🔑 END NEW SEARCH */}
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
                                    <DropdownMenuItem onClick={() => { setActiveStatusFilter("assigned"); }}>Assigned</DropdownMenuItem>
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
                                <p>No active issues matching the current filters.</p>
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
                                        
                                        {/* 🔑 ADDED: Thumbnail display in the active issue card */}
                                        {parseImageUrls(issue.ImageUrl).length > 0 && (
                                            <div className="flex gap-1.5 justify-end mb-2">                                                {parseImageUrls(issue.ImageUrl).map((url, index) => (
                                                    <div key={index} className="w-16 h-12 overflow-hidden rounded-md border border-gray-300">
                                                        <img 
                                                            src={url} 
                                                            alt={`Issue Thumbnail ${index + 1}`} 
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* 🔑 END ADDED */}

                                        {/* 🔑 NEW: Staff Info Block for Assigned/In-Progress */}
                                        {(issue.Status.toLowerCase() === "assigned" || issue.Status.toLowerCase() === "in-progress") && (
                                            <div className="space-y-1 border-t pt-3 mt-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-bold text-gray-700">Staff name:</span>
                                                    <span className="text-muted-foreground">{issue.DriverName} {issue.DriverSurname}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-bold text-gray-700">Staff contact:</span>
                                                    <span className="text-muted-foreground">{issue.DriverPhone}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Original info grid - only show border/padding if staff info was NOT shown */}
                                        <div className={`grid grid-cols-2 gap-4 ${!(issue.Status.toLowerCase() === "assigned" || issue.Status.toLowerCase() === "in-progress") ? "border-t pt-3" : ""}`}>
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
                                            {/* 🔑 UPDATED: Allow CANCEL for Pending OR Assigned. Only allow EDIT if Pending. */}
                                            {(issue.Status.toLowerCase() === "pending" || issue.Status.toLowerCase() === "assigned") && (
                                                <>
                                                    {issue.Status.toLowerCase() === "pending" && ( // Only show edit button for Pending
                                                        <Button variant="outline" size="sm" onClick={() => handleEditIssue(issue)}>
                                                            Edit Issue
                                                        </Button>
                                                    )}
                                                    {/* 🔑 UPDATED: Use the new handler to open the dialog */}
                                                    <Button variant="destructive" size="sm" onClick={() => handleConfirmCancel(issue)}>
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
                        <div className="flex flex-wrap gap-2 justify-end">                             {/* 🔑 NEW: Search Input for History Issues */}
                             <div className="relative w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search title/desc..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                            {/* 🔑 END NEW SEARCH */}
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
                                <p>No completed or cancelled issues matching the current filters.</p>
                            </div>
                        ) : (
                            <div className={`space-y-3 max-h-[400px] overflow-y-auto`}>
                                {historyIssues.map((issue) => (
                                    // 🆕 Added 'group' class for the arrow indicator animation
                                    <div key={issue.Id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-secondary/10">
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
                                
                                        {/* Rating Stars & Arrow Indicator */}
                                        {issue.Status.toLowerCase() === "resolved" && (
                                            <div className="flex items-center gap-1 mt-1">
                                                {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                                                    <button
                                                        key={star}
                                                        // 🔑 FIX: Set onClick to a function that does nothing when it's unrated,
                                                        // forcing the user to use the "RATE NOW" button/modal.
                                                        // Also ensures rated issues remain unclickable.
                                                        onClick={() => {}} 
                                                        className={`text-xl ${star <= (issue.Rating || 0) ? "text-yellow-400" : "text-gray-300"} cursor-default`}
                                                        disabled={true} // 🔑 FIX: Disable all star buttons here
                                                        aria-label={`Star ${star}`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                                {issue.Rating && <span className="ml-2 text-sm text-muted-foreground">{issue.Rating} / 5</span>}
                                                
                                                {/* 🆕 Moving Arrow Indicator for unresolved ratings */}
                                                {issue.Rating === null && (
                                                    <div className="flex items-center ml-3 px-2 py-1 rounded-full bg-yellow-100 border border-yellow-200 group-hover:bg-yellow-200 transition-colors cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent potential parent clicks
                                                            setIssueToRate(issue); // Open the rating modal
                                                        }}
                                                    >
                                                        <span className="text-xs font-semibold text-yellow-800 mr-1 whitespace-nowrap">RATE NOW</span>
                                                        <ArrowRight className="h-4 w-4 text-yellow-700 animate-pulse transition-transform transform group-hover:translate-x-1" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                   {/* Updated date and button container */}
  <div className="mt-2 sm:mt-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
    <span className="text-xs text-muted-foreground whitespace-nowrap">
      Updated: {formatDateTime(issue.UpdatedAt)}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push(`/student/issues/${issue.Id}`)}
      className="flex-shrink-0"
    >
      View Details
    </Button>
  </div>
                                    
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
            
            {/* 🆕 Rating Prompt Modal */}
            {issueToRate && (
                <RatingPromptModal
                    issue={issueToRate}
                    onClose={() => setIssueToRate(null)} // User chooses to rate later
                    onSubmitRating={submitRating} // Re-use existing submit logic
                />
            )}
            
            {/* 🔑 NEW: Cancellation Confirmation Dialog */}
            <Dialog open={issueToCancel !== null} onOpenChange={() => setIssueToCancel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Issue Cancellation
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Are you sure you want to **cancel** issue <strong className="font-mono">{issueToCancel?.Id.slice(0, 8)}</strong> ({issueToCancel?.Title})?
                            <p className="mt-2">This action will update its status to **Cancelled**.</p>
                            <p className="mt-2 text-sm text-muted-foreground">Current Status: **{issueToCancel?.Status}**</p>
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-4">
                        <Button 
                            variant="outline" 
                            onClick={() => setIssueToCancel(null)}
                        >
                            Nevermind (Keep Issue)
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (issueToCancel) {
                                    handleCancelIssue(issueToCancel.Id);
                                }
                            }}
                        >
                            Yes, Cancel Issue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}