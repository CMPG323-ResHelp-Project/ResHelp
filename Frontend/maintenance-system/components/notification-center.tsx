"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, X, CheckCircle, AlertTriangle, Clock, MessageSquare } from "lucide-react"
import { auth } from "@/lib/firebase"

interface Issue {
  Id: string
  Status: "Pending" | "Assigned" | "In-Progress" | "Resolved" | "Cancelled" | string
  Title: string
  Description: string
  Priority: "High" | "Medium" | "Low"
  Category: string
  Location: string
  IsUrgentSafetyHazard: boolean
  ReportedAt: string
  UpdatedAt: string
  Rating?: number
  ReporterEmail: string
  ImageUrl: string
  DriverName: string
  DriverSurname: string
  DriverPhone: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: "status_update" | "urgent" | "message" | "resolved"
  timestamp: string
  isRead: boolean
  issueId?: string
}

interface NotificationCenterProps {
  userType: "student" | "staff" | "manager"
}

export function NotificationCenter({ userType }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const previousStatuses = useRef<Record<string, string>>({})
  const removedNotificationIds = useRef<string[]>([])
  const LOCAL_STORAGE_KEY = "student_notifications"
  const REMOVED_KEY = "removed_notifications"

  // Load persisted notifications and removed IDs
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) setNotifications(JSON.parse(saved))

    const removed = localStorage.getItem(REMOVED_KEY)
    if (removed) removedNotificationIds.current = JSON.parse(removed)
  }, [])

  // Persist notifications
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

   

    const fetchIssues = useCallback(async () => {
    if (userType !== "student") return
    const student = auth.currentUser
    if (!student || !student.email) return

    try {
      const idToken = await student.getIdToken()
      const res = await fetch("http://localhost:5229/Issues/all", {
        headers: { "Authorization": `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`)
      const data: Issue[] = await res.json()

      const newNotifications: Notification[] = []

      data.forEach((issue) => {
        if (issue.ReporterEmail !== student.email) return
        if (removedNotificationIds.current.includes(issue.Id)) return

        const oldStatus = previousStatuses.current[issue.Id] || ""
        const rawStatus = issue.Status
        const newStatus = rawStatus.toLowerCase().replace(/\s+/g, "-")

        if (oldStatus.toLowerCase().replace(/\s+/g, "-") === newStatus) return
        previousStatuses.current[issue.Id] = rawStatus

        let title = ""
        switch (newStatus) {
          case "pending": title = "Issue Reported"; break
          case "in-progress": title = "Issue In-Progress"; break
          case "assigned": title = "Issue Assigned"; break
          case "resolved": title = "Issue Resolved"; break
          case "cancelled": title = "Issue Cancelled"; break
          default: return
        }

        if (notifications.some((n) => n.issueId === issue.Id && n.title === title)) return

        let message = ""
        let type: Notification["type"] = "status_update"

        switch (newStatus) {
          case "pending":
            message = `You have successfully reported your issue "${issue.Title}".`
            break
          case "in-progress":
            message = `Staff is on its way for issue "${issue.Title}".`
            break
          case "assigned":
            message = `Your issue "${issue.Title}" has been assigned to a staff member.`
            type = "message"
            break
          case "resolved":
            message = `Your issue "${issue.Title}" has been resolved.`
            type = "resolved"
            break
          case "cancelled":
            message = `Issue "${issue.Title}" has been cancelled.`
            break
        }

        newNotifications.push({
          id: `${issue.Id}-${Date.now()}`,
          title,
          message,
          type,
          timestamp: issue.UpdatedAt,
          isRead: false,
          issueId: issue.Id,
        })
      })

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...newNotifications, ...prev])
      }
    } catch (err: any) {
      console.error("Failed to fetch student notifications:", err)
    }
  }, [userType, notifications])

  
 // ✅ Updated: Fetch Issues for Staff (Type-safe version)
 const fetchStaffIssues = useCallback(async () => {
  if (userType !== "staff") return;
  const staff = auth.currentUser;
  if (!staff) return;

  try {
    const token = await staff.getIdToken();
    const res = await fetch("http://localhost:5229/StaffIssues/dashboard", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch staff issues: ${res.status}`);

    const data = await res.json();
    const allIssues = data.recentIssues || [];

    const newNotifications: Notification[] = [];

    allIssues.forEach((issue: any) => {
      const issueId = issue.Id;
      const status = issue.Status?.toLowerCase() || "pending";

      // 🧠 Skip if already removed or already shown
      if (
        removedNotificationIds.current.includes(issueId) ||
        notifications.some((n) => n.issueId === issueId)
      )
        return;

      // 🟢 Add one-time notification per issue
      newNotifications.push({
        id: `${issueId}-${Date.now()}`,
        title: `New ${status.charAt(0).toUpperCase() + status.slice(1)} Issue`,
        message: `A "${issue.Category}" issue titled "${issue.Title}" is now "${status}".`,
        type:
          status === "resolved"
            ? "resolved"
            : status === "in-progress" || status === "assigned"
            ? "status_update"
            : "urgent",
        timestamp: issue.UpdatedAt || new Date().toISOString(),
        isRead: false,
        issueId,
      });
    });

    // ✅ Add only *new unique* notifications
    if (newNotifications.length > 0) {
      setNotifications((prev) => {
        const unique = [
          ...newNotifications,
          ...prev.filter(
            (n) => !newNotifications.some((nn) => nn.issueId === n.issueId)
          ),
        ];
        return unique;
      });
    }
  } catch (err: any) {
    console.error("Failed to fetch staff notifications:", err);
  }
}, [userType, notifications]);




useEffect(() => {
  if (userType === "student") fetchIssues()
  else if (userType === "staff") fetchStaffIssues()
}, [fetchIssues, fetchStaffIssues, userType])



  const unreadCount = notifications.filter((n) => !n.isRead).length

  const getNotificationIcon = (title: string) => {
    switch (title.toLowerCase()) {
      case "issue reported":
        return <Bell className="h-4 w-4 text-blue-600" />
      case "issue in-progress":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "issue assigned":
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case "issue resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "issue cancelled":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-50 border-red-200"
      case "resolved":
        return "bg-green-50 border-green-200"
      case "status_update":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const removeNotification = (id: string, issueId?: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (issueId) {
      removedNotificationIds.current.push(issueId)
      localStorage.setItem(REMOVED_KEY, JSON.stringify(removedNotificationIds.current))
    }
  }

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="relative bg-transparent">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Notifications</span>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                          !notification.isRead ? "bg-opacity-100" : "bg-opacity-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getNotificationIcon(notification.title)}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  !notification.isRead ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatTimestamp(notification.timestamp)}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 p-0"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id, notification.issueId)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
