"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Mail, CheckCircle, ArrowLeftCircle } from "lucide-react"

type ForgotPasswordFormProps = {
  /** A function to change the view (e.g., back to the login form) in a parent component. */
  onViewChange?: () => void
}

export function ForgotPasswordForm({ onViewChange }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailError("")
    setIsLoading(true)
  
    try {
      // --- VALIDATION ---
      if (!email.trim().endsWith("@gmail.com")) {
        setError("Please enter a valid email address ending with @gmail.com.")
        setIsLoading(false)
        return
      }
  
      // --- API CALL ---
      const response = await fetch("http://localhost:5229/Profile/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        // Handle backend error (e.g., email not found)
        setError(data.error || "No user found with this email. Please enter a correct email.")
        setIsLoading(false)
        return
      }
  
      // Success: email sent
      setIsSent(true)
    } catch (err: any) {
      console.error("Fetch error:", err)
      setError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  
  // automatically go back to main page after 3 seconds
  useEffect(() => {
    if (isSent && onViewChange) {
      const timer = setTimeout(() => onViewChange(), 3000)
      return () => clearTimeout(timer)
    }
  }, [isSent, onViewChange])

  if (isSent) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <h3 className="text-2xl font-bold text-green-600">Email Sent!</h3>
        <p className="text-muted-foreground">
          We've sent a new password to {email}. Please check your emails.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <h2 className="text-2xl font-bold">Forgot Password</h2>
        <p className="text-muted-foreground text-center">
          Enter your registered email address to receive a new password.
        </p>
      </div>

      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 h-11 bg-input border-border/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
              {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 transition-colors cursor-pointer font-medium shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Sending Request...
                </div>
              ) : (
                "Reset password"
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
