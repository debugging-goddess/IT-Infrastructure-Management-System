import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import MainLayout from "@/layouts/MainLayout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ServersPage from "@/pages/servers/ServersPage";
import VMsPage from "@/pages/vms/VMsPage";
import ApplicationsPage from "@/pages/applications/ApplicationsPage";
import NetworkPage from "@/pages/network/NetworkPage";
import TopologyPage from "@/pages/topology/TopologyPage";
import UsersPage from "@/pages/users/UsersPage";
import AuditPage from "@/pages/audit/AuditPage";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* All other routes require authentication */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="servers"      element={<ServersPage />} />
        <Route path="vms"          element={<VMsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="network"      element={<NetworkPage />} />
        <Route path="topology"     element={<TopologyPage />} />
        <Route path="users"        element={<UsersPage />} />
        <Route path="audit"        element={<AuditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
