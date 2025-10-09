"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
// NOTE: Select is kept as it is a shadcn component, though not used for students in the final form structure
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

export function StudentProfile() {
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
  
  // States for the robust email update flow (from staff-profile)
  const [isEmailUpdatePending, setIsEmailUpdatePending] = useState(false)
  const [isVerificationStep, setIsVerificationStep] = useState(false)
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const apiDelayRef = useRef<NodeJS.Timeout | null>(null)
  
  // --- NEW: split-address states (residence name, section, room)
  const [residenceName, setResidenceName] = useState("");
  const [residenceSection, setResidenceSection] = useState("");
  const [residenceRoom, setResidenceRoom] = useState("");

  // UPDATED: Use the 5-second message timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ADDED: Cleanup for the delay timer
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
      } catch (err: any) {
        setError(err.message || "Error fetching profile.")
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])
  
  // Email Update Cancel Handler
  const handleCancelUpdate = () => {
    if (apiDelayRef.current) clearTimeout(apiDelayRef.current)
    setIsEmailUpdatePending(false)
    setIsVerificationStep(false)
    setEmail(profile?.email || "") // Revert email to original
    setMessage("Email update cancelled.")
  }


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setPasswordError("") // Clear previous password errors
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
        
        try {
          // Attempt reauthentication
          const credential = EmailAuthProvider.credential(user.email!, currentPassword)
          await reauthenticateWithCredential(user, credential)
        } catch (authError: any) {
          // *** FIX: Handle Firebase reauthentication error (auth/invalid-credential/wrong-password) ***
          if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
             setPasswordError("Incorrect current password. Please try again.");
          } else {
             // For all other Firebase Auth errors during reauthentication
             setPasswordError("Authentication failed: " + authError.message);
          }
          setIsLoading(false);
          return; // Stop the profile update process
        }
        
        // Continue if reauthentication succeeded
        if (newPassword !== confirmNewPassword) {
            setPasswordError("New passwords do not match.");
            setIsLoading(false);
            return;
        }
        await updatePassword(user, newPassword)
        setMessage("Password updated successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      }

      // Handle email change with dialog
      if (isEmailChangeAllowed && email !== profile?.email) {
        setIsLoading(false) // Unset loading temporarily while dialog is open
        setShowEmailConfirmDialog(true) // Open dialog
        return
      }

      // --- VALIDATION AND CONCATENATION LOGIC ---
      let addressToSend = address; // Default to the current address state (original value if not editing)

      if (isEditing && (profile?.userType === "student" || profile?.userType === "manager")) {
        
        // **VALIDATION: Ensure all three split fields are filled if editing**
        const requiredFields = [residenceName, residenceSection, residenceRoom];
        const allFieldsFilled = requiredFields.every(field => field && field.trim() !== "");

        if (!allFieldsFilled) {
            setError("All three Residence Address fields (Name, Section, Room) must be filled to save changes.");
            setIsLoading(false);
            return; // Stop the function from proceeding
        }

        // CONCATENATION: Now that we know they are filled, concatenate them
        const roomValue = residenceRoom.trim();
        
        // **CRITICAL FIX: Prepend "Room " to the room value for the final concatenated string**
        const formattedRoom = roomValue.startsWith("Room ") ? roomValue : `Room ${roomValue}`;


        const parts = [
            residenceName.trim(), 
            residenceSection.trim(), 
            formattedRoom
        ];
        
        addressToSend = parts.join(", "); 
      }


      // Update other profile info via backend (excluding email change)
      const updateData = { name, surname, email: profile?.email, phone, address: addressToSend }
      const response = await fetch("http://localhost:5229/Profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to update profile.")
      }

      // Update local states so cancel/next edit reflect latest saved address
      setAddress(addressToSend) // Update the main address state
      setProfile(prev => prev ? { ...prev, name, surname, phone, address: addressToSend } : prev)

      setMessage("Profile updated successfully!")
      setIsEditing(false)
      // clear split-address fields after successful save
      setResidenceName("")
      setResidenceSection("")
      setResidenceRoom("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false) // Unset loading at the end of the saving process
    }
  }

  // NEW: toggle edit handler that initializes or reverts split address state
  const handleToggleEdit = () => {
    if (!isEditing) {
      // Entering edit mode: split current address into 3 parts
      const parts = (profile?.address || "").split(",").map(p => p.trim())
      
      // Attempt to clean the "Room " prefix from the third part for display in the input field
      let roomPart = parts[2] || "";
      if (roomPart.toLowerCase().startsWith("room ")) {
          roomPart = roomPart.substring(5).trim(); // Remove "Room "
      }

      setResidenceName(parts[0] || "")
      setResidenceSection(parts[1] || "")
      setResidenceRoom(roomPart) // Set the cleaned room value
      setError(null)
      setMessage(null)
      setIsEditing(true)
    } else {
      // Cancelling edit: revert to original profile address and clear split fields
      setIsEditing(false)
      setError(null)
      setMessage(null)
      // Revert states
      setName(profile?.name || "")
      setSurname(profile?.surname || "")
      setEmail(profile?.email || "")
      setPhone(profile?.phone || "")
      setAddress(profile?.address || "")
      setResidenceName("")
      setResidenceSection("")
      setResidenceRoom("")
      setShowPasswordChange(false) // Hide password fields on cancel
      setIsEmailChangeAllowed(false) // Reset email change checkbox
      setPasswordError("") // Clear password error on cancel
    }
  }

  if (isLoading && !profile) return <div className="p-4 text-center">Loading profile...</div>
  if (error && !isEmailUpdatePending && !isVerificationStep) return <div className="p-4 text-center text-red-500">{error}</div>
  if (!profile) return <div className="p-4 text-center">No profile data found.</div>

  // 🔑 Fields are disabled if not editing OR email flow is active OR general saving is in progress
  const isFieldDisabled = !isEditing || isEmailUpdatePending || isVerificationStep || isLoading;
  
  // 🔑 The whole form (opacity/pointer-events) is disabled only during the email update flow
  const isEmailFlowActive = isEmailUpdatePending || isVerificationStep;

  return (
    <div className="relative">
      {/* Overlay stays active and disables all interaction during email update process */}
      {isEmailFlowActive && ( 
        <div className="fixed inset-0 z-40 bg-white/70" />
      )}

      <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-8 relative z-50">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your personal information and password.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* The wrapper div only manages opacity/pointer-events for the email flow overlay */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className={`${isEmailFlowActive ? "pointer-events-none opacity-60" : "pointer-events-auto"}`}>

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

                {/* Profile Form */}
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
                        // 🔑 Fields are disabled if isFieldDisabled is true
                        disabled={isFieldDisabled} 
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
                        disabled={isFieldDisabled}
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
                          disabled={isEmailFlowActive || isLoading || !isEditing} // Also disable checkbox if not editing
                          className="border-gray-400 data-[state=checked]:bg-blue-500"
                        />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={!isEditing || !isEmailChangeAllowed || isEmailFlowActive || isLoading}
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
                        disabled={isFieldDisabled}
                        className="border-2 border-gray-400 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Student/Manager Address is shown */}
                    {(profile.userType === "student" || profile.userType === "manager") && (
                      <div className="space-y-2">
                        <Label htmlFor="address">Residence Address</Label>

                        {/* WHEN NOT EDITING: single address input (unchanged) */}
                        {!isEditing && (
                          <Input
                            id="address"
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            disabled={isFieldDisabled}
                            className="border-2 border-gray-400 focus:border-blue-500"
                          />
                        )}

                        {/* WHEN EDITING: show three fields (Residence name, Section, Room) */}
                        {isEditing && (
                          <div className="grid grid-cols-1 gap-2">
                            <Input
                              id="residence-name"
                              placeholder="Residence name"
                              value={residenceName}
                              onChange={(e) => setResidenceName(e.target.value)}
                              // Mark as required using native attribute to help user see required fields
                              required
                              disabled={isEmailFlowActive || isLoading ? true : false}
                              className="border-2 border-gray-400 focus:border-blue-500"
                            />
                            <Input
                              id="residence-section"
                              placeholder="Section"
                              value={residenceSection}
                              onChange={(e) => setResidenceSection(e.target.value)}
                              required
                              disabled={isEmailFlowActive || isLoading ? true : false}
                              className="border-2 border-gray-400 focus:border-blue-500"
                            />
                            <Input
                              id="residence-room"
                              placeholder="Room number (e.g., 12)"
                              value={residenceRoom}
                              onChange={(e) => setResidenceRoom(e.target.value)}
                              required
                              disabled={isEmailFlowActive || isLoading ? true : false}
                              className="border-2 border-gray-400 focus:border-blue-500"
                            />
                            <p className="text-xs text-muted-foreground">(The room number will automatically be saved as "Room [Number]". **All three must be filled**.)</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Staff/Manager Type is shown as disabled text/input (keeping the structure) */}
                    {profile.userType === "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="maintenanceType">Maintenance Area</Label>
                        {/* Disabled by isEmailFlowActive or isLoading */}
                        <Input id="maintenanceType" type="text" value={profile.maintenanceType || "N/A"} disabled={isEmailFlowActive || isLoading} />
                      </div>
                    )}
                    {profile.userType === "manager" && (
                      <div className="space-y-2">
                        <Label htmlFor="userType">Role</Label>
                        {/* Disabled by isEmailFlowActive or isLoading */}
                        <Input id="userType" type="text" value="Residence Manager" disabled={isEmailFlowActive || isLoading} />
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
                        disabled={isEmailFlowActive || isLoading} // Disable checkbox if saving or in email flow
                        className="border-gray-400 data-[state=checked]:bg-blue-500"
                      />
                      <Label htmlFor="show-password-change">Change Password?</Label>
                    </div>

                    {showPasswordChange && (
                      <div className="space-y-4">
                        <Separator />
                        <h3 className="text-lg font-semibold">Change Password</h3>
                        {/* Display the custom password error here */}
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
                              disabled={isEmailFlowActive || isLoading}
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
                              disabled={isEmailFlowActive || isLoading}
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
                              disabled={isEmailFlowActive || isLoading}
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
                  {/* 🔑 CORRECTED: The Cancel/Edit button is only disabled if the Email flow is active */}
                  {!isEmailFlowActive && ( 
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleToggleEdit}
                      disabled={isLoading} // Disable the button while saving is in progress
                    >
                      {isEditing ? "Cancel" : "Edit Profile"}
                    </Button>
                  )}
                  {isEditing && !isEmailFlowActive && (
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner /> Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Email Update Progress Message - Displayed on top of the form when pending/verifying */}
        {isEmailFlowActive && (
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
                setIsLoading(true) // Start loading state for the API call
                setShowEmailConfirmDialog(false); // Close dialog
                
                // **STEP 1: Initiate Email Update Pending State (Loading/Delay)**
                setIsEmailUpdatePending(true);
                
                try {
                  // Re-calculate addressToSend for the API call (important if address changed alongside email)
                  let addressToSend = profile?.address || "";
                  if (isEditing && (profile?.userType === "student" || profile?.userType === "manager")) {
                     // Check for required fields again 
                    const requiredFields = [residenceName, residenceSection, residenceRoom];
                    const allFieldsFilled = requiredFields.every(field => field && field.trim() !== "");

                    if (!allFieldsFilled) {
                        throw new Error("Cannot update email: Residence address fields are incomplete.");
                    }

                    // CRITICAL FIX: Re-calculate the concatenated string with the "Room " prefix
                    const roomValue = residenceRoom.trim();
                    const formattedRoom = roomValue.startsWith("Room ") ? roomValue : `Room ${roomValue}`;

                    const parts = [
                        residenceName.trim(), 
                        residenceSection.trim(), 
                        formattedRoom
                    ];
                    addressToSend = parts.join(", "); 
                  }

                  const res = await fetch("http://localhost:5229/Profile/update", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ name, surname, email, phone, address: addressToSend, sendEmailVerification: true }),
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
                        
                    }, 6000);
                  }
                } catch (err: any) {
                  // **Error Handler**
                  if (apiDelayRef.current) clearTimeout(apiDelayRef.current);
                  setIsEmailUpdatePending(false); // Stop pending state
                  setError(err.message)
                } finally {
                  setIsLoading(false) // Stop loading after API call finishes or errors out
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? <><LoadingSpinner /> Updating...</> : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}