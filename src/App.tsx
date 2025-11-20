import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberCards from "./pages/MemberCards";
import MemberDetails from "./pages/MemberDetails";
import Attendance from "./pages/Attendance";
import MemberAttendanceStats from "./pages/MemberAttendanceStats";
import AttendanceAlerts from "./pages/AttendanceAlerts";
import GroupComparisonDashboard from "./pages/GroupComparisonDashboard";
import Donations from "./pages/Donations";
import Events from "./pages/Events";
import Ministries from "./pages/Ministries";
import MinistryDetails from "./pages/MinistryDetails";
import MinistriesStats from "./pages/MinistriesStats";
import Auth from "./pages/Auth";
import Branches from "./pages/Branches";
import BranchHierarchy from "./pages/BranchHierarchy";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/members/cards" element={<ProtectedRoute><MemberCards /></ProtectedRoute>} />
          <Route path="/members/details" element={<ProtectedRoute><MemberDetails /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/attendance/stats" element={<ProtectedRoute><MemberAttendanceStats /></ProtectedRoute>} />
          <Route path="/attendance/alerts" element={<ProtectedRoute><AttendanceAlerts /></ProtectedRoute>} />
          <Route path="/attendance/comparison" element={<ProtectedRoute><GroupComparisonDashboard /></ProtectedRoute>} />
          <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
          <Route path="/ministries" element={<ProtectedRoute><Ministries /></ProtectedRoute>} />
          <Route path="/ministries/details" element={<ProtectedRoute><MinistryDetails /></ProtectedRoute>} />
          <Route path="/ministries/stats" element={<ProtectedRoute><MinistriesStats /></ProtectedRoute>} />
          <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
          <Route path="/branches/hierarchy" element={<ProtectedRoute><BranchHierarchy /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
