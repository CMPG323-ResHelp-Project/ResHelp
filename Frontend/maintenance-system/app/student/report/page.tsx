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
import { Upload, AlertTriangle, ArrowLeft } from "lucide-react"

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

    // Client-side validation
    if (!title || !description || !category || !priority || !location) {
        setError("Please fill out all required fields.")
        return
    }

    setIsSubmitting(true)

    try {
      // Get currently logged in user from Firebase
      // Dynamic import for client use (replace with your actual auth source if different)
      const { auth } = await import("@/lib/firebase") 
      const user = auth.currentUser
      
      if (!user) {
        throw new Error("User not logged in. Please sign in again.")
      }
      
      const idToken = await user.getIdToken()

      // The corrected JSON payload
      const payload = {
          title,
          description,
          category,
          priority,
          location,
          isUrgent, 
          imageUrl: "", // Assuming image upload is handled separately or is empty string
          
          // Match the new C# DTO field
          reporterEmail: user.email || "unknown@reshelp.com", 
          
          // DO NOT SEND THESE FIELDS: The C# controller (Issues.cs) sets them.
          // Id, Status, ReportedBy, ReportedAt, UpdatedAt
      }

      // Send issue to backend
      const response = await fetch("http://localhost:5229/Issues/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`, 
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text() // Read as text first for better error logging
      
      if (!response.ok) {
        // Attempt to parse JSON if available, otherwise use raw text
        let data: { error?: string, message?: string }
        try {
            data = JSON.parse(responseText)
        } catch {
            // Fallback for non-JSON errors (like 500 HTML page)
            console.error("Non-JSON Server Error Response:", responseText)
            throw new Error(`Server returned status ${response.status}. Details: ${responseText.substring(0, 100)}...`)
        }

        console.error("Server responded with error:", data.error)
        throw new Error(data.error || data.message || "Failed to report issue with an unexpected response.")
      }

      // Successful response
      setMessage("Issue reported successfully! Redirecting to dashboard...")
      setTimeout(() => router.push("/student/dashboard"), 2000)

    } catch (err: any) {
      console.error("Error reporting issue:", err)
      setError(err.message || "An unknown error occurred during submission.")
    } finally {
      setIsSubmitting(false)
    }
  }
  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("Image uploaded:", file.name)
      // Handle image upload logic here (e.g., upload to cloud storage)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="student" currentPage="/student/report" />

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/student/dashboard")}
            className="flex items-center space-x-2"
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
                  <Select value={category} onValueChange={setCategory} required>
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
                  <Select value={priority} onValueChange={setPriority} required>
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
                <Input
                  id="location"
                  placeholder="e.g., Room 205, Kitchen, Bathroom"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLocationLoading} 
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

              <div className="space-y-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Upload Photo (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Upload a photo to help illustrate the issue</p>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/student/dashboard")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Issue Report"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}