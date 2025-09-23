"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const testimonials = [
  {
    quote: "ResHelp has transformed how students get support in their residences. Safe, reliable, and always on time.",
    cite: "NWU Student Council",
  },
  {
    quote: "The system is incredibly easy to use. I can log a maintenance issue and get a response within minutes.",
    cite: "Thabo, Student Resident",
  },
  {
    quote: "As a residence manager, I now have a clear overview of all complaints and can assign staff efficiently.",
    cite: "Susan, Residence Manager",
  },
  {
    quote: "This platform has significantly improved communication between students and staff.",
    cite: "Emily, Support Staff",
  },
  {
    quote: "The ability to track my request from start to finish gives me peace of mind.",
    cite: "Lerato, Student Resident",
  },
]

export default function LoginPage() {
  const [view, setView] = useState<"login" | "register">("login")
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and welcome content */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="relative w-full max-w-lg">
                  <img
                    src="/reshelp-logo.png"
                    alt="ResHelp"
                    className="h-30 w-125 object-cover rounded-t-3xl shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 overflow-hidden relative min-h-[10rem]">
            <div 
              className="absolute top-0 left-0 h-full w-full flex transition-transform duration-1000 ease-in-out"
              style={{ transform: `translateX(-${currentTestimonialIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="flex-shrink-0 w-full p-6 box-border">
                  <blockquote className="text-card-foreground/80 italic">
                    "{testimonial.quote}"
                  </blockquote>
                  <cite className="text-sm text-muted-foreground mt-2 block">- {testimonial.cite}</cite>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Form container */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md mx-auto space-y-6">
            {view === "login" ? (
              <LoginForm onViewChange={() => setView("register")} />
            ) : (
              <>
                <RegisterForm onViewChange={() => setView("login")} />
                <Button
                  onClick={() => setView("login")}
                  variant="outline"
                  className="w-full h-11 bg-transparent hover:bg-muted-foreground/5 transition-all"
                >
                  Back to Home
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}