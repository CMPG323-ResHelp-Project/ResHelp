"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// 🔑 ADDED: Clock and Image as ImageIcon for loading/success UI
import { Upload, AlertTriangle, ArrowLeft, Clock, Image as ImageIcon, XCircle } from "lucide-react"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebase2 } from "@/lib/firebase2";
// NOTE: Ensure your Firebase auth library is correctly imported here
// import { auth } from "@/lib/firebase" 

export default function ReportIssue() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("")
  const [location, setLocation] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [idToken, setIdToken] = useState<string | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 🔑 MODIFIED: Change to an array to store multiple image URLs
  const [imageUrls, setImageUrls] = useState<string[]>([]); // store uploaded image URLs

  // 🔑 EXISTING: State for image uploading
  const [imageUploading, setImageUploading] = useState(false);

  // ✅ Populate address automatically on mount
  useEffect(() => {
    const fetchUserAddress = async () => {
      setIsLocationLoading(true);
      try {
        const { auth } = await import("@/lib/firebase")
        const user = auth.currentUser

        if (!user || !user.email) {
          setError("User not logged in. Please sign in again.")
          return
        }

        const token = await user.getIdToken()
        setIdToken(token)

        const res = await fetch(`http://localhost:5229/Profile?email=${user.email}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || "Failed to fetch user profile")
        }

        const data = await res.json()
        // Populate location with user's address
        setLocation(data.address || "")
      } catch (err: any) {
        console.error("Error fetching user address:", err)
        setError(err.message || "Failed to fetch address")
      } finally {
        setIsLocationLoading(false);
      }
    }

    fetchUserAddress()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // 🔑 NEW: Prevent submission if image is still uploading
    if (imageUploading) {
      setError("Please wait for all image uploads to complete before submitting.")
      return
    }

    // Client-side validation
    if (!title || !description || !category || !priority || !location) {
      setError("Please fill out all required fields.")
      return
    }

    setIsSubmitting(true)

    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const idToken = await user.getIdToken();

      // Get the display name and split it
      const fullName = user.displayName || "Unknown User";
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      const payload = {
        title,
        description,
        category,
        priority,
        location,
        isUrgent,
        imageUrl: imageUrls.join("|"), // Join URLs with a pipe for a single string field
        imageUrls: imageUrls,
        name: firstName,
        surname: lastName,
        reporterEmail: user.email || "unknown@reshelp.com",
      };

      const response = await fetch("http://localhost:5229/Issues/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      if (!response.ok) {
        let data: { error?: string; message?: string } = {};
        try { data = JSON.parse(responseText); } catch { }
        throw new Error(data.error || data.message || responseText);
      }

      setMessage("Issue reported successfully! Redirecting to dashboard...");
      setTimeout(() => router.push("/student/dashboard"), 2000);

    } catch (err: any) {
      console.error("Error reporting issue:", err);
      setError(err.message || "An unknown error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }

  }

  // 🔑 NEW FUNCTION: To remove an image from the list
  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls(prevUrls => prevUrls.filter(url => url !== urlToRemove));
    setError(null);
  };

  // 🔑 UPDATED: Handle multiple file selection and upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    setError(null); // Clear previous errors

    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);
    const totalNewImages = filesToUpload.length;

    // Check limit
    if (imageUrls.length + totalNewImages > 3) {
      setError(`You can only upload a maximum of 3 images. You tried to upload ${totalNewImages} new images, but already have ${imageUrls.length}.`);
      // Reset input to allow selecting again
      e.target.value = ''; 
      return;
    }

    try {
      setImageUploading(true); // 🚨 disable submit while uploading
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { firebase2 } = await import("@/lib/firebase2");
      const storage = getStorage(firebase2);
      
      const uploadPromises = filesToUpload.map(async (file) => {
        const storageRef = ref(storage, `issue-images/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      });
      
      const newUrls = await Promise.all(uploadPromises);
      
      setImageUrls(prevUrls => [...prevUrls, ...newUrls]);
      console.log("Images uploaded:", newUrls);
    } catch (err) {
      console.error("Image upload failed:", err);
      // Reset input on failure
      e.target.value = ''; 
      setError("Failed to upload one or more images. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  // 🔑 NEW: Combined state for disabling the entire form
  const isFormDisabled = isSubmitting || imageUploading || isLocationLoading;
  // 🔑 NEW: Check if the maximum number of files has been reached
  const isMaxFiles = imageUrls.length >= 3;


  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="student" currentPage="/student/report" />

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/student/dashboard")}
            className="flex items-center space-x-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Report an Issue</h1>
            <p className="text-muted-foreground">Submit a maintenance request for your residence</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help our maintenance team resolve your issue quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  <p className="font-medium">Submission Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              {message && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">{message}</p>
                </div>
              )}

              {/* Urgent Issue Alert */}
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="h-4 w-4 text-red-600"
                  disabled={isFormDisabled} 
                />
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <Label htmlFor="urgent" className="text-red-800 font-medium">
                    This is an urgent safety hazard
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Issue Category</Label>
                  <Select value={category} onValueChange={setCategory} required disabled={isFormDisabled}> {/* 🔑 DISABLED: Select Category */}
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={setPriority} required disabled={isFormDisabled}> {/* 🔑 DISABLED: Select Priority */}
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Can wait a few days</SelectItem>
                      <SelectItem value="medium">Medium - Should be fixed soon</SelectItem>
                      <SelectItem value="high">High - Needs immediate attention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <Input
                    id="location"
                    placeholder="e.g., Room 205, Kitchen, Bathroom"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isFormDisabled} 
                    required
                  />
                  {isLocationLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isFormDisabled} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe the issue in detail, including when it started and any relevant information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  disabled={isFormDisabled} 
                />
              </div>

              {/* 🔑 MODIFIED: Image Upload Section for multiple files */}
              <div className="space-y-2">
                <Label htmlFor="image">Upload Photos (Optional - Max 3)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-2">

                  {imageUploading ? (
                    // Loading State
                    <div className="flex flex-col items-center">
                      <Clock className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                      <p className="text-sm text-blue-600 mt-2">Uploading image(s), please wait...</p>
                    </div>
                  ) : (
                    // Initial/Upload Input State
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {isMaxFiles 
                          ? "Maximum 3 photos uploaded." 
                          : `Upload a photo to help illustrate the issue (${imageUrls.length} / 3)`
                        }
                      </p>
                      
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        // 🔑 NEW: Allow multiple files
                        multiple 
                        onChange={handleImageUpload}
                        className="max-w-xs mx-auto"
                        // 🔑 DISABLED: Disable if max files reached or form is disabled
                        disabled={isFormDisabled || isMaxFiles} 
                      />
                    </div>
                  )}
                  
                  {/* 🔑 NEW: Display uploaded images */}
                  {imageUrls.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-wrap justify-center gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={url} 
                            alt={`Issue image ${index + 1}`} 
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-0 right-0 p-1 bg-white/70 rounded-full hover:bg-white/90 transition-opacity"
                            aria-label={`Remove image ${index + 1}`}
                            disabled={isFormDisabled}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </button>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* END MODIFIED Image Upload Section */}

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/student/dashboard")}
                  className="flex-1"
                  disabled={isFormDisabled} 
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  // 🔑 UPDATED: Disable if submitting OR uploading
                  disabled={isFormDisabled}
                  className="flex-1"
                >
                  {/* 🔑 UPDATED: Show appropriate text based on state */}
                  {imageUploading ? "Waiting for Image(s)..." : isSubmitting ? "Submitting..." : "Submit Issue Report"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}