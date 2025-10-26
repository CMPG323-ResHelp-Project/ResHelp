"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

type RegisterFormProps = {
  onViewChange: () => void
}

export function RegisterForm({ onViewChange }: RegisterFormProps) {
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userType, setUserType] = useState("")
  const [maintenanceType, setMaintenanceType] = useState("")
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null) 
  const router = useRouter()

  const [residenceName, setResidenceName] = useState("")
  const [residenceSection, setResidenceSection] = useState("")
  const [residenceRoom, setResidenceRoom] = useState("")

  // New state variables for field-level errors
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [userTypeError, setUserTypeError] = useState("")
  const [addressError, setAddressError] = useState("")
  const [maintenanceError, setMaintenanceError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setError(null)
    setEmailError("")
    setPasswordError("")
    setPhoneError("")
    setUserTypeError("")
    setAddressError("")
    setMaintenanceError("")

    let hasError = false

    // Email Validation
    if (!email.endsWith("@gmail.com")) {
      setError("Please enter a valid email address ending with @gmail.com.")
      hasError = true
    }

    // Password Match
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      hasError = true
    }

    // Phone Number Validation
    const cleanedPhone = phone.replace(/[^0-9+]/g, "")
    const isTenDigits = /^\d{10}$/.test(cleanedPhone)
    const isPlus27 = /^\+27\d{9}$/.test(cleanedPhone)
    if (!isTenDigits && !isPlus27) {
      setError("Please enter a 10-digit number or one starting with +27 followed by 9 digits.")
      hasError = true
    }

    // Role Selection Validation
    if (!userType) {
      setError("Please select your role.")
      hasError = true
    }

    // Address validation
    if (userType === "student") {
      const requiredFields = [residenceName, residenceSection, residenceRoom]
      const allFilled = requiredFields.every(field => field.trim() !== "")
      if (!allFilled) {
        setError("All three Residence Address fields (Name, Section, Room) must be filled.")
        return
      }
    }

    if (hasError) {
      return
    }

    setIsLoading(true)

    try {
      // Concatenate address if student
      let addressToSend = ""
      if (userType === "student") {
        const roomValue = residenceRoom.trim()
        const formattedRoom = roomValue.startsWith("Room ") ? roomValue : `Room ${roomValue}`
        addressToSend = [residenceName.trim(), residenceSection.trim(), formattedRoom].join(", ")
      }

      const response = await fetch("http://localhost:5229/Register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, surname, email, phone: cleanedPhone, password, userType, maintenanceType, address: addressToSend
        })
      })

      if (!response.ok) {
        let errorMessage = "Registration failed"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || JSON.stringify(errorData)
        } catch (jsonErr) {
          console.error("Error parsing backend response:", jsonErr)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Backend response:", data)

      setIsRegistered(true)
      setTimeout(() => onViewChange(), 2000)
    } catch (err) {
      console.error("Fetch error:", err)
      setError((err as Error).message) // 🔴 show error inside form instead of alert
    } finally {
      setIsLoading(false)
    }
  }

  if (isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h3 className="text-2xl font-bold text-green-500">Registration Successful!</h3>
        <p className="text-muted-foreground">You will now be redirected to the login page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <h2 className="text-2xl font-bold">Sign Up</h2>
        <p className="text-muted-foreground text-center">Create a new ResHelp support account</p>
      </div>

      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show backend error here */}
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    type="text"
                    placeholder="Enter your surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {/* Styled password hint like success message */}
                {password.length < 6 && (
                  <Alert className="border-green-200 bg-green-50 text-green-800 mt-2">
                    <AlertDescription>Password must be at least 6 characters long.</AlertDescription>
                  </Alert>
                )}
              </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userType">I am a</Label>
                  <Select value={userType} onValueChange={setUserType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Support Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  {userTypeError && <p className="text-red-500 text-sm mt-1">{userTypeError}</p>}
                </div>
                {userType === "student" && (
                  <div className="space-y-2">
                  <Label htmlFor="residenceName">Residence Address</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Input placeholder="Residence Name" value={residenceName} onChange={e => setResidenceName(e.target.value)} required />
                    <Input placeholder="Section" value={residenceSection} onChange={e => setResidenceSection(e.target.value)} required />
                    <Input placeholder="Room Number" value={residenceRoom} onChange={e => setResidenceRoom(e.target.value)} required />
                  </div>
                  <Alert className="border-green-200 bg-green-50 text-green-800 mt-2">
                    <AlertDescription>All three fields must be filled. </AlertDescription>
                  </Alert>                </div>
                )}
                {userType === "staff" && (
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceType">Select your maintenance area</Label>
                    <Select value={maintenanceType} onValueChange={setMaintenanceType}>
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
                    {maintenanceError && <p className="text-red-500 text-sm mt-1">{maintenanceError}</p>}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
