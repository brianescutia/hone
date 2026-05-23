import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HomePage from './pages/Home.jsx';
import ListingDetailPage from './pages/ListingDetail.jsx';
import LoginPage from './pages/Login.jsx';
import SignupPage from './pages/Signup.jsx';
import ManagerLoginPage from './pages/ManagerLogin.jsx';
import VerifyEmailPage from './pages/VerifyEmail.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import SubleaseFormPage from './pages/SubleaseForm.jsx';
import MessagesPage from './pages/Messages.jsx';
import ManagerDashboardPage from './pages/ManagerDashboard.jsx';
import ClaimListingPage from './pages/ClaimListing.jsx';
import EditClaimedListingPage from './pages/EditClaimedListing.jsx';
import AdminDashboardPage from './pages/AdminDashboard.jsx';
import AboutPage from './pages/About.jsx';
import PrivacyPage from './pages/Privacy.jsx';
import TermsPage from './pages/Terms.jsx';
import SafetyPage from './pages/Safety.jsx';
import ContactPage from './pages/Contact.jsx';
import ReportProblemPage from './pages/ReportProblem.jsx';

export default function App() {
  const location = useLocation();
  // Homepage owns its own full-height layout (map + list). Hiding the
  // global footer there avoids fighting it for screen real estate; every
  // other route gets the footer.
  const hideFooter = location.pathname === '/';

  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/manager-login" element={<ManagerLoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/report-problem" element={<ReportProblemPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['student']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subleases/new"
            element={
              <ProtectedRoute roles={['student']} verifiedOnly>
                <SubleaseFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subleases/:id/edit"
            element={
              <ProtectedRoute roles={['student']} verifiedOnly>
                <SubleaseFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute roles={['manager']}>
                <ManagerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/claim-property"
            element={
              <ProtectedRoute roles={['manager']}>
                <ClaimListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/listings/:id/edit"
            element={
              <ProtectedRoute roles={['manager']}>
                <EditClaimedListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
