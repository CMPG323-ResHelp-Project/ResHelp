"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Simple Loading Spinner component
const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


interface UserProfile {
  uid?: string
  name: string
  surname: string
  email: string
  phone: string
  userType: "student" | "staff" | "manager"
  address?: string
  maintenanceType?: string
}

export function StaffProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [isEmailChangeAllowed, setIsEmailChangeAllowed] = useState(false)
  const [maintenanceType, setMaintenanceType] = useState<string | undefined>(undefined)

  // State for email update progress (used as Loading state)
  const [isEmailUpdatePending, setIsEmailUpdatePending] = useState(false)
  // State for the post-API-call verification message (6-second delay before logout)
  const [isVerificationStep, setIsVerificationStep] = useState(false)
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  
  // Ref for the 6-second delay timer
  const apiDelayRef = useRef<NodeJS.Timeout | null>(null)


  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000); // 5 seconds
      return () => clearTimeout(timer); // cleanup if component unmounts
    }
  }, [message]);
  
  // Cleanup for the delay timer
  useEffect(() => {
      return () => {
        if (apiDelayRef.current) clearTimeout(apiDelayRef.current);
      };
  }, []);


  // Fetch profile on mount
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setError("User not authenticated. Please log in.")
        setIsLoading(false)
        return
      }

      try {
        const token = await user.getIdToken(true)
        setIdToken(token)
        const response = await fetch(`http://localhost:5229/Profile?email=${user.email}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || "Backend error")
        setProfile(data)
        setName(data.name)
        setSurname(data.surname)
        setEmail(data.email)
        setPhone(data.phone)
        setAddress(data.address || "")
        setMaintenanceType(data.maintenanceType || "")  // ✅ set state from fetched profile
      } catch (err: any) {
        setError(err.message || "Error fetching profile.")
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleCancelUpdate = () => {
    if (apiDelayRef.current) clearTimeout(apiDelayRef.current)
    setIsEmailUpdatePending(false)
    setIsVerificationStep(false)
    setEmail(profile?.email || "") // Revert email to original
    setMessage("Email update cancelled.")
  }

  useEffect(() => {
    if (profile?.maintenanceType) {
      setMaintenanceType(profile.maintenanceType)
    }
  }, [profile])


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setPasswordError("")
    setIsLoading(true)

    try {
      const user = auth.currentUser
      if (!user || !idToken) throw new Error("User not authenticated or token missing.")

      // Handle password change
      if (showPasswordChange) {
        if (!currentPassword) {
          setPasswordError("Current password is required to change password.")
          setIsLoading(false)
          return
        }
        const credential = EmailAuthProvider.credential(user.email!, currentPassword)
        await reauthenticateWithCredential(user, credential)

        if (newPassword !== confirmNewPassword) throw new Error("New passwords do not match.")
        await updatePassword(user, newPassword)
        setMessage("Password updated successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      }

      // ✅ Handle email change with dialog (no window.confirm)
      if (isEmailChangeAllowed && email !== profile?.email) {
        setShowEmailConfirmDialog(true) // Open dialog instead of confirm
        setIsLoading(false)
        return
      }

      // Update other profile info via backend (excluding email change)
      const updateData = { name, surname, email: profile?.email, phone, address, maintenanceType }
      const response = await fetch("http://localhost:5229/Profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to update profile.")
      }

      setMessage("Profile updated successfully!")
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !profile) return <div className="p-4 text-center">Loading profile...</div>
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>
  if (!profile) return <div className="p-4 text-center">No profile data found.</div>

  return (
    <div className="relative">
      {/* Overlay stays active and disables all interaction during email update process */}
      {(isEmailUpdatePending || isVerificationStep) && (
        <div className="fixed inset-0 z-40 bg-white/70" />
      )}

      <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-8 relative z-50">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your personal information and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Disable form elements if email update is pending or verification is needed */}
              <div className={`${(isEmailUpdatePending || isVerificationStep) ? "pointer-events-none opacity-60" : "pointer-events-auto"}`}>

                {/* ERROR ALERT (for general errors) */}
                {error && (
                  <Alert className="border-red-200 bg-red-50 text-red-800 mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* SUCCESS/UNSUCCESSFUL MESSAGE */}
                {message && (
                  <Alert
                    className={
                      message.startsWith("Unsuccessful:")
                        ? "border-red-200 bg-red-50 text-red-800 mb-4"
                        : "border-green-200 bg-green-50 text-green-800 mb-4"
                    }
                  >
                    <AlertTitle>
                      {message.startsWith("Unsuccessful:") ? "Unsuccessful" : "Success"}
                    </AlertTitle>
                    <AlertDescription>
                      {message.startsWith("Unsuccessful:") ? message.replace("Unsuccessful: ", "") : message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Profile Form (Disabled via parent div opacity/pointer-events) */}
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
                        disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
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
                        disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
                        className="border-2 border-gray-400 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Checkbox
                          id="allow-email-change"
                          checked={isEmailChangeAllowed}
                          onCheckedChange={() => setIsEmailChangeAllowed(!isEmailChangeAllowed)}
                          disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
                          className="border-gray-400 data-[state=checked]:bg-blue-500"
                        />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={!isEditing || !isEmailChangeAllowed || isEmailUpdatePending || isVerificationStep}
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
                        disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
                        className="border-2 border-gray-400 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {profile.userType !== "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="address">Residence Address</Label>
                        <Input
                          id="address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
                          className="border-2 border-gray-400 focus:border-blue-500"
                        />
                      </div>
                    )}
                    {profile.userType === "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="maintenanceType">Maintenance Area</Label>
                        <Select
                          value={maintenanceType}
                          onValueChange={(value) => setMaintenanceType(value)}
                          disabled={!isEditing || isEmailUpdatePending || isVerificationStep}
                        >
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

                {/* Password change section */}
                {isEditing && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-password-change"
                        checked={showPasswordChange}
                        onCheckedChange={() => setShowPasswordChange(!showPasswordChange)}
                        disabled={isEmailUpdatePending || isVerificationStep}
                        className="border-gray-400 data-[state=checked]:bg-blue-500"
                      />
                      <Label htmlFor="show-password-change">Change Password?</Label>
                    </div>

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
                              disabled={isEmailUpdatePending || isVerificationStep}
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
                              disabled={isEmailUpdatePending || isVerificationStep}
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
                              disabled={isEmailUpdatePending || isVerificationStep}
                              className="border-2 border-gray-400 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                  {!isEmailUpdatePending && !isVerificationStep && (
                    <Button type="button" variant="outline" onClick={() => { setIsEditing(!isEditing); setError(null); setMessage(null); }}>
                      {isEditing ? "Cancel" : "Edit Profile"}
                    </Button>
                  )}
                  {isEditing && !isEmailUpdatePending && !isVerificationStep && (
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Email Update Progress Message - Displayed on top of the form when pending/verifying */}
        {(isEmailUpdatePending || isVerificationStep) && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Card className="p-6 text-center border-blue-400 shadow-xl max-w-sm w-full pointer-events-auto">
              {isEmailUpdatePending && (
                <>
                  <div className="flex justify-center mb-4 text-blue-600">
                    <LoadingSpinner />
                  </div>
                  <h3 className="text-xl font-bold text-blue-600">Email Update in Progress...</h3>
                  <p className="mt-2 text-lg font-semibold text-gray-700">
                    Please wait. Do not close this page.
                  </p>
                </>
              )}
              {isVerificationStep && (
                <>
                  <h3 className="text-xl font-bold text-green-600">Verification Link Sent!</h3>
                  <p className="mt-2 text-lg font-semibold text-gray-700">
                    You have successfully started the email change.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Please check your new email address **{email}** for a verification link. You will be logged out now.
                  </p>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Email Update Confirmation Dialog */}
      <Dialog open={showEmailConfirmDialog} onOpenChange={() => setShowEmailConfirmDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Confirm Email Update
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to change your email to **{email}**? This action will trigger verification and **log you out**.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowEmailConfirmDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setError(null)
                setMessage(null)
                setIsLoading(true)
                setShowEmailConfirmDialog(false); // Close dialog
                
                // **STEP 1: Initiate Email Update Pending State (Loading/Delay)**
                setIsEmailUpdatePending(true);
                
                try {
                  const res = await fetch("http://localhost:5229/Profile/update", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ name, surname, email, phone, address, maintenanceType, sendEmailVerification: true }),
                  })

                  const data = await res.json()

                  if (!res.ok) {
                    // **Failure Handler**
                    if (apiDelayRef.current) clearTimeout(apiDelayRef.current);
                    setIsEmailUpdatePending(false); // Stop pending state
                    
                    if (data?.error?.includes("EMAIL_EXISTS")) {
                      setMessage("Unsuccessful: This email already exists.")
                    } else {
                      setError(data?.error || "Failed to update email.")
                    }
                  } else {
                    // **Success Handler**
                    setIsEditing(false)
                    
                    // Set the 6-second delay before showing the verification message/logging out
                    apiDelayRef.current = setTimeout(() => {
                        setIsEmailUpdatePending(false); // Remove loading screen
                        setIsVerificationStep(true); // Show verification message
                        
                        // Log out after a short pause (e.g., 3 seconds) for the user to read the message
                        setTimeout(() => {
                            signOut(auth).then(() => {
                                window.location.href = "/"
                            })
                        }, 3000); 
                        
                    }, 6000); // **6-second delay as requested**
                  }
                } catch (err: any) {
                  // **Error Handler**
                  if (apiDelayRef.current) clearTimeout(apiDelayRef.current);
                  setIsEmailUpdatePending(false); // Stop pending state
                  setError(err.message)
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

}