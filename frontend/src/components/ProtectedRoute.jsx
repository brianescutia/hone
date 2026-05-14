import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, roles, verifiedOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="p-12 text-center text-ink-500">Loading…</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center">
        <h2 className="section-cap mb-3">Access denied</h2>
        <p className="text-ink-500">This page is for {roles.join(' / ')} accounts only.</p>
      </div>
    );
  }

  if (verifiedOnly && user.role === 'student' && !user.verified) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center">
        <h2 className="section-cap mb-3">Verification required</h2>
        <p className="text-ink-500">
          You need to sign up with a UC Davis email (<code>@ucdavis.edu</code>) to use this feature.
        </p>
      </div>
    );
  }

  if (user.role === 'manager' && user.managerStatus !== 'approved') {
    return (
      <div className="max-w-xl mx-auto p-12 text-center">
        <h2 className="section-cap mb-3">Approval pending</h2>
        <p className="text-ink-500">
          Your manager account is awaiting admin approval. We'll email you when it's reviewed.
        </p>
      </div>
    );
  }

  return children;
}
