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

  // Countdown for email verification
  const [isEmailUpdatePending, setIsEmailUpdatePending] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(10)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const [isVerificationStep, setIsVerificationStep] = useState(false) // NEW: covers the "verify email" state

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
      } catch (err: any) {
        setError(err.message || "Error fetching profile.")
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Countdown effect
  useEffect(() => {
    if (isEmailUpdatePending && countdownSeconds > 0) {
      countdownRef.current = setInterval(() => setCountdownSeconds(prev => prev - 1), 1000)
    } else if (countdownSeconds === 0 && isEmailUpdatePending) {
      if (countdownRef.current) clearInterval(countdownRef.current)

      setMessage("You will be logged out to allow update.")
      setIsVerificationStep(true) // 🔒 keep overlay active during verification step

      // Call backend to update email via Firebase Admin
      fetch("http://localhost:5229/Profile/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${idToken}` 
        },
        body: JSON.stringify({ name, surname, email, phone, address, sendEmailVerification: true }),
      })
      .then(res => res.json())
      .then(data => {
        console.log("Email verification sent:", data)
        // Auto logout after verification email sent
        setTimeout(() => {
          signOut(auth)
        }, 3000)
      })
      .catch(err => setError("Failed to send email verification: " + err.message))

      setIsEmailUpdatePending(false) // stop countdown, move to verification step
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [isEmailUpdatePending, countdownSeconds, idToken, name, surname, email, phone, address])

  const handleCancelUpdate = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setIsEmailUpdatePending(false)
    setIsVerificationStep(false)
    setCountdownSeconds(10)
    setEmail(profile?.email || "")
    setMessage("Email update cancelled.")
  }

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
  
      // ✅ Handle email change with confirmation
      if (isEmailChangeAllowed && email !== profile?.email) {
        const confirmed = window.confirm(`Are you sure you want to change your email to ${email}?`)
        if (!confirmed) {
          setIsLoading(false)
          return
        }
  
        setMessage(`Email will be updated in ${countdownSeconds} seconds. Do not exit the page.`)
        setIsEmailUpdatePending(true)
        setCountdownSeconds(10)
        setIsLoading(false)
        return
      }
  
      // Update other profile info via backend
      const updateData = { name, surname, email: profile?.email, phone, address }
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
      {/* Overlay stays active during countdown and verification */}
      {(isEmailUpdatePending || isVerificationStep) && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(255,255,255,0.7)" }} />
      )}

      <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-8 relative z-50">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your personal information and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4 pointer-events-none relative">
              {/* Enable pointer events only when not pending/verification */}
              <div className={`${(isEmailUpdatePending || isVerificationStep) ? "pointer-events-none" : "pointer-events-auto"}`}>
                {message && <div className="text-green-500 text-sm text-center">{message}</div>}
  
                {/* Countdown */}
                {isEmailUpdatePending && (
                  <div className="text-center text-blue-600 font-semibold space-y-1 z-50 relative pointer-events-auto">
                    <p>Email update in progress...</p>
                    <p>Time remaining: {Math.floor(countdownSeconds / 60)}:{("0" + (countdownSeconds % 60)).slice(-2)}</p>
                    <Button type="button" variant="outline" onClick={handleCancelUpdate}>
                      Cancel Update
                    </Button>
                  </div>
                )}

                {/* Verification Step */}
                {isVerificationStep && (
                  <div className="text-center text-red-600 font-semibold space-y-2 z-50 relative pointer-events-auto">
                    <p>Please verify your new email. Do not close page yet</p>
                  </div>
                )}
  
                {/* The rest of your profile form unchanged */}
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
                    {/* Address field only visible if NOT staff */}
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
                        <Select value={profile.maintenanceType} disabled={!isEditing || isEmailUpdatePending || isVerificationStep}>
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
  
                {/* Conditional password change section */}
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
                    <Button type="button" variant="outline" onClick={() => setIsEditing(!isEditing)}>
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
    </div>
    </div>
  )
}
