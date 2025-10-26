"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Alert, AlertDescription } from "@/components/ui/alert"

import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase" 

type LoginFormProps = {
  onViewChange: () => void
  onForgotPassword: () => void
}

export function LoginForm({ onViewChange, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  // Auto-dismiss alerts after 5s
  useEffect(() => {
    if (error || message) {
      const timer = setTimeout(() => {
        setError(null)
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
  
    if (!userType) {
      setError("Please select your role before signing in.")
      return
    }
  
    setIsLoading(true)
  
    try {
      if (userType === "manager") {
        // 🔑 For managers: bypass Firebase
        const response = await fetch("http://localhost:5229/Login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            userType: "manager"
          })
        })
  
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Manager login failed.")
        }
  
        await response.json()
        setMessage("Manager login successful! Redirecting...")
        setTimeout(() => {
          router.push("/manager/dashboard")
          setIsLoading(false)
        }, 1500)
        return
      }
  
      // 🔑 Normal Firebase flow for students/staff
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
  
      if (!user.emailVerified) {
        setError("Please verify your email before logging in.")
        setIsLoading(false)
        return
      }
  
      const idToken = await user.getIdToken()
      const loginUserType = userType.toLowerCase()
  
      const response = await fetch("http://localhost:5229/Login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          userType: loginUserType,
          idToken: idToken
        })
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Login failed on the server.")
      }
  
      const data = await response.json()
  
      switch (data.userType.toLowerCase()) {
        case "student":
          setMessage("Login successful! Redirecting...")
          setTimeout(() => {
            router.push("/student/dashboard")
            setIsLoading(false)
          }, 1500)
          break
        case "staff":
          setMessage("Login successful! Redirecting...")
          setTimeout(() => {
            router.push("/staff/dashboard")
            setIsLoading(false)
          }, 1500)
          break
        default:
          setError("User role not recognized.")
          setIsLoading(false)
          break
      }
    } catch (err: any) {
      console.error("Login error:", err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Incorrect email or password.")
      } else {
        setError(err.message || "An error occurred during login.")
      }
      setIsLoading(false) // stop loading on error
    }
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <h2 className="text-2xl font-bold">Sign In</h2>
        <p className="text-muted-foreground text-center">Acess your ResHelp support account</p>
      </div>

      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Styled alerts */}
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

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
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={onForgotPassword} // 🔑 opens Forgot Password view
                  disabled={isLoading}      // 🔒 disable when signing in
                >
                  Forgot password?
                </Button>
              </div>
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
                  <SelectItem value="manager">Residence Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/80 active:bg-primary/90 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-transparent border-primary text-primary hover:bg-transparent transition-colors"
              onClick={onViewChange}
              disabled={isLoading} // 🔒 disable when signing in
            >
              Sign Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}