"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase" 

type LoginFormProps = {
  onViewChange: () => void
}

export function LoginForm({ onViewChange }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null);

    if (!userType) {
      setError("Please select your role before signing in.");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      // Convert userType to lowercase here
      const loginUserType = userType.toLowerCase();

      const response = await fetch("http://localhost:5229/Login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: user.email, 
          userType: loginUserType, // Send the lowercase version
          idToken: idToken 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed on the server.");
      }

      const data = await response.json();
      console.log("Backend response:", data);

      switch (data.userType) {
        case "student":
          router.push("/student/dashboard");
          break;
        case "staff":
          router.push("/staff/dashboard");
          break;
        case "manager":
          router.push("/manager/dashboard");
          break;
        default:
          setError("User role not recognized.");
          break;
      }

    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code) {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
          setError("Incorrect email, password, or user role.");
        } else if (err.code === "auth/user-not-found") {
          setError("No user found with this email.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
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
                  onClick={() => router.push("/forgot-password")}
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
            >
              Sign Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}