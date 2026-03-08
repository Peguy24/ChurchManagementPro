// App root - force rebuild
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TenantProvider } from "@/contexts/TenantContext";
import Commercial from "./pages/Commercial";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberCards from "./pages/MemberCards";
import MemberDetails from "./pages/MemberDetails";
import Attendance from "./pages/Attendance";
import MemberAttendanceStats from "./pages/MemberAttendanceStats";
import AttendanceAlerts from "./pages/AttendanceAlerts";
import GroupComparisonDashboard from "./pages/GroupComparisonDashboard";
import Donations from "./pages/Donations";
import IncomeCategories from "./pages/IncomeCategories";
import FinancialReports from "./pages/FinancialReports";
import FinancialDashboard from "./pages/FinancialDashboard";
import Budgets from "./pages/Budgets";
import Expenses from "./pages/Expenses";
import ExpenseCategories from "./pages/ExpenseCategories";
import BankReconciliation from "./pages/BankReconciliation";
import SpecialFunds from "./pages/SpecialFunds";
import CashRegister from "./pages/CashRegister";
import FinancialAudit from "./pages/FinancialAudit";
import Events from "./pages/Events";
import Ministries from "./pages/Ministries";
import MinistryDetails from "./pages/MinistryDetails";
import MinistriesStats from "./pages/MinistriesStats";
import Auth from "./pages/Auth";
import TenantAuth from "./pages/TenantAuth";
import SelectTenant from "./pages/SelectTenant";
import Branches from "./pages/Branches";
import CustomFields from "./pages/CustomFields";
import EmailTemplates from "./pages/EmailTemplates";
import ChurchSettings from "./pages/ChurchSettings";

import TenantBranding from "./pages/TenantBranding";
import UserManagement from "./pages/UserManagement";
import PendingApproval from "./pages/PendingApproval";
import Salaries from "./pages/Salaries";
import Inventory from "./pages/Inventory";
import TenantManagement from "./pages/TenantManagement";
import TenantUserManagement from "./pages/TenantUserManagement";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PlatformAccounting from "./pages/PlatformAccounting";
import AdminInvitations from "./pages/AdminInvitations";
import Subscription from "./pages/Subscription";
import TenantDataViewer from "./pages/TenantDataViewer";
import SmartInsights from "./pages/SmartInsights";
import SystemGuide from "./pages/SystemGuide";
import Support from "./pages/Support";
import PlatformActivityLog from "./pages/PlatformActivityLog";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import ChurchHealthScores from "./pages/ChurchHealthScores";
import BulkCommunication from "./pages/BulkCommunication";
import PlatformSettings from "./pages/PlatformSettings";
import SupportManagement from "./pages/SupportManagement";
import AnnouncementBanners from "./pages/AnnouncementBanners";
import SubscriptionOverrides from "./pages/SubscriptionOverrides";
import ChurnPrevention from "./pages/ChurnPrevention";
import TenantComparison from "./pages/TenantComparison";
import WhiteLabelManager from "./pages/WhiteLabelManager";
import EventCalendar from "./pages/EventCalendar";
import AttendanceKiosk from "./pages/AttendanceKiosk";
import EngagementAutomations from "./pages/EngagementAutomations";
import JoinChurch from "./pages/JoinChurch";
import MemberRequests from "./pages/MemberRequests";
import EventRegister from "./pages/EventRegister";
import EventRegistrations from "./pages/EventRegistrations";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TenantProvider>
            <Routes>
              <Route path="/commercial" element={<Commercial />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join/:tenantId" element={<JoinChurch />} />
              <Route path="/event/:eventId/register" element={<EventRegister />} />
              <Route path="/select-tenant" element={<SelectTenant />} />
              <Route path="/t/:slug/auth" element={<TenantAuth />} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/" element={<Home />} />
              <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
              <Route path="/members/requests" element={<ProtectedRoute><MemberRequests /></ProtectedRoute>} />
              <Route path="/members/cards" element={<ProtectedRoute><MemberCards /></ProtectedRoute>} />
              <Route path="/members/details" element={<ProtectedRoute><MemberDetails /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/attendance/stats" element={<ProtectedRoute><MemberAttendanceStats /></ProtectedRoute>} />
              <Route path="/attendance/alerts" element={<ProtectedRoute><AttendanceAlerts /></ProtectedRoute>} />
              <Route path="/attendance/comparison" element={<ProtectedRoute><GroupComparisonDashboard /></ProtectedRoute>} />
              <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
              <Route path="/donations/categories" element={<ProtectedRoute><IncomeCategories /></ProtectedRoute>} />
              <Route path="/donations/reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><FinancialDashboard /></ProtectedRoute>} />
              <Route path="/finance/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/finance/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/finance/expenses/categories" element={<ProtectedRoute><ExpenseCategories /></ProtectedRoute>} />
              <Route path="/finance/bank" element={<ProtectedRoute><BankReconciliation /></ProtectedRoute>} />
              <Route path="/finance/funds" element={<ProtectedRoute><SpecialFunds /></ProtectedRoute>} />
              <Route path="/finance/cash" element={<ProtectedRoute><CashRegister /></ProtectedRoute>} />
              <Route path="/finance/audit" element={<ProtectedRoute><FinancialAudit /></ProtectedRoute>} />
              <Route path="/finance/salaries" element={<ProtectedRoute><Salaries /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/events/calendar" element={<ProtectedRoute><EventCalendar /></ProtectedRoute>} />
              <Route path="/attendance/kiosk" element={<ProtectedRoute><AttendanceKiosk /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute><EngagementAutomations /></ProtectedRoute>} />
              <Route path="/events/registrations" element={<ProtectedRoute><EventRegistrations /></ProtectedRoute>} />
              <Route path="/ministries" element={<ProtectedRoute><Ministries /></ProtectedRoute>} />
              <Route path="/ministries/details" element={<ProtectedRoute><MinistryDetails /></ProtectedRoute>} />
              <Route path="/ministries/stats" element={<ProtectedRoute><MinistriesStats /></ProtectedRoute>} />
              <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><SmartInsights /></ProtectedRoute>} />
              <Route path="/custom-fields" element={<ProtectedRoute><CustomFields /></ProtectedRoute>} />
              <Route path="/settings/email-templates" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
              <Route path="/settings/church" element={<ProtectedRoute><ChurchSettings /></ProtectedRoute>} />
              
              <Route path="/settings/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
              <Route path="/settings/tenants" element={<ProtectedRoute requireAdmin><TenantManagement /></ProtectedRoute>} />
              <Route path="/settings/invitations" element={<ProtectedRoute requireAdmin><AdminInvitations /></ProtectedRoute>} />
              <Route path="/settings/tenant-users" element={<ProtectedRoute><TenantUserManagement /></ProtectedRoute>} />
              <Route path="/settings/branding" element={<ProtectedRoute><TenantBranding /></ProtectedRoute>} />
              <Route path="/settings/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/super-admin" element={<ProtectedRoute requireSuperAdmin><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/explore" element={<ProtectedRoute requireSuperAdmin><TenantDataViewer /></ProtectedRoute>} />
              <Route path="/super-admin/accounting" element={<ProtectedRoute requireSuperAdmin><PlatformAccounting /></ProtectedRoute>} />
              <Route path="/super-admin/activity" element={<ProtectedRoute requireSuperAdmin><PlatformActivityLog /></ProtectedRoute>} />
              <Route path="/super-admin/revenue" element={<ProtectedRoute requireSuperAdmin><RevenueAnalytics /></ProtectedRoute>} />
              <Route path="/super-admin/health" element={<ProtectedRoute requireSuperAdmin><ChurchHealthScores /></ProtectedRoute>} />
              <Route path="/super-admin/communication" element={<ProtectedRoute requireSuperAdmin><BulkCommunication /></ProtectedRoute>} />
              <Route path="/super-admin/settings" element={<ProtectedRoute requireSuperAdmin><PlatformSettings /></ProtectedRoute>} />
              <Route path="/super-admin/banners" element={<ProtectedRoute requireSuperAdmin><AnnouncementBanners /></ProtectedRoute>} />
              <Route path="/super-admin/subscriptions" element={<ProtectedRoute requireSuperAdmin><SubscriptionOverrides /></ProtectedRoute>} />
              <Route path="/super-admin/churn" element={<ProtectedRoute requireSuperAdmin><ChurnPrevention /></ProtectedRoute>} />
              <Route path="/super-admin/comparison" element={<ProtectedRoute requireSuperAdmin><TenantComparison /></ProtectedRoute>} />
              <Route path="/super-admin/branding" element={<ProtectedRoute requireSuperAdmin><WhiteLabelManager /></ProtectedRoute>} />
              <Route path="/system-guide" element={<ProtectedRoute><SystemGuide /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="/support-management" element={<ProtectedRoute requireSuperAdmin><SupportManagement /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
