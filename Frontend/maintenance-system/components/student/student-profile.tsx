"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { auth } from "@/lib/firebase" 
import { onAuthStateChanged } from "firebase/auth";


// Import new modular functions from firebase/auth
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

// Assuming you have a type for the user data
interface UserProfile {
  uid: string
  name: string
  surname: string
  email: string
  phone: string
  userType: "student" | "staff" | "manager"
  address?: string
  maintenanceType?: string
}

export function StudentProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  
  // States for form fields
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")

  // New state for password change
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showPasswordChange, setShowPasswordChange] = useState(false) 

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.error("User not authenticated");
        setError("User not authenticated. Please log in.");
        setIsLoading(false);
        return;
      }
  
      console.log("User signed in:", user.uid, user.email);
  
      try {
        const idToken = await user.getIdToken();
        console.log("ID Token (first 10 chars):", idToken.substring(0, 10));
  
        const response = await fetch(`http://localhost:5229/Profile?uid=${user.uid}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
        });
  
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Backend error: ${response.status}`);
        }
  
        const data = await response.json();
        if (!data || Object.keys(data).length === 0) {
          throw new Error("Profile data is empty.");
        }
  
        console.log("Profile fetched:", data);
  
        setProfile(data);
        setName(data.name);
        setSurname(data.surname);
        setPhone(data.phone);
        setAddress(data.address || "");
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Unknown error fetching profile.");
      } finally {
        setIsLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setPasswordError("")
    setIsLoading(true)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated.")
      }
      const idToken = await user.getIdToken()

      // Handle password update if checkbox is checked
      if (showPasswordChange) {
        if (newPassword !== confirmNewPassword) {
          setPasswordError("New passwords do not match.")
          setIsLoading(false)
          return
        }
        if (!currentPassword || !newPassword) {
          setPasswordError("Please fill out all password fields.")
          setIsLoading(false)
          return
        }
        try {
          const credential = EmailAuthProvider.credential(user.email!, currentPassword)
          await reauthenticateWithCredential(user, credential)
          await updatePassword(user, newPassword)
          setMessage("Password updated successfully!")
          setCurrentPassword("")
          setNewPassword("")
          setConfirmNewPassword("")
        } catch (err: any) {
          console.error("Password update error:", err)
          if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
            setPasswordError("Incorrect current password.")
          } else {
            setPasswordError(err.message)
          }
          setIsLoading(false)
          return;
        }
      }

      // Handle profile data update
      const updateData = {
        uid: user.uid,
        name,
        surname,
        phone,
        address
      }

      const response = await fetch("http://localhost:5229/Profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile.")
      }

      setMessage("Profile updated successfully!")
      setIsEditing(false)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !profile) {
    return <div className="p-4 text-center">Loading profile...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>
  }

  if (!profile) {
    return <div className="p-4 text-center">No profile data found.</div>
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Update your personal information and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {message && <div className="text-green-500 text-sm text-center">{message}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!isEditing}
                    className="border-2 border-gray-400 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    required
                    disabled={!isEditing}
                    className="border-2 border-gray-400 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email} // Email should not be editable directly here
                    disabled
                    className="border-2 border-gray-400 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={!isEditing}
                    className="border-2 border-gray-400 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* The address field is always shown here since this is the student profile */}
                <div className="space-y-2">
                  <Label htmlFor="address">Residence Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    disabled={!isEditing}
                    className="border-2 border-gray-400 focus:border-blue-500"
                  />
                </div>
                {profile.userType === "staff" && (
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceType">Maintenance Area</Label>
                    <Select value={profile.maintenanceType} disabled={!isEditing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumber">Plumber</SelectItem>
                        <SelectItem value="electrician">Electrician</SelectItem>
                        <SelectItem value="general">General Maintenance</SelectItem>
                        <SelectItem value="cleaning">Cleaning Services</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {profile.userType === "manager" && (
                  <div className="space-y-2">
                    <Label htmlFor="userType">Role</Label>
                    <Input id="userType" type="text" value="Residence Manager" disabled />
                  </div>
                )}
              </div>
            </div>

            <Separator />
            
            {/* Conditional rendering of the password change section */}
            {isEditing && (
                <>
                {/* Password Change Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-password-change"
                    checked={showPasswordChange}
                    onCheckedChange={() => setShowPasswordChange(!showPasswordChange)}
                    className="border-gray-400 data-[state=checked]:bg-blue-500"
                  />
                  <Label htmlFor="show-password-change">Change Password?</Label>
                </div>
                
                {/* Password Change Form (Conditionally Rendered) */}
                {showPasswordChange && (
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="text-lg font-semibold">Change Password</h3>
                    {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="border-2 border-gray-400 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="border-2 border-gray-400 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                          className="border-2 border-gray-400 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
                </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
              {isEditing && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}