import { ProtectedRoute } from "@/components/auth/protected-route"
import { StaffLayout } from "@/components/staff/staff-layout"
import { StaffProfile } from "@/components/staff/staff-profile"

export default function StaffProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["staff"]}>
      <StaffLayout activeTab="profile">
        <StaffProfile />
      </StaffLayout>
    </ProtectedRoute>
  )
}