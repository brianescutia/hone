import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function HouseIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V11z" />
    </svg>
  );
}

function MessageIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PersonIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardLink =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'manager'
      ? '/manager'
      : '/dashboard';

  return (
    <header className="bg-sage-200 border-b border-sage-300/50">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 px-4 sm:px-6 py-2.5">
        <Link to="/" className="flex items-center gap-1.5 text-ink-900 hover:opacity-80">
          <span className="wordmark">hone</span>
          <HouseIcon className="w-6 h-6" />
        </Link>

        <div className="flex-1" />

        {user ? (
          <>
            <Link to="/messages" aria-label="Messages" className="p-2 rounded-full hover:bg-white/40">
              <MessageIcon />
            </Link>
            <Link
              to={dashboardLink}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm border border-ink-100 hover:bg-ink-100/40"
            >
              <span className="w-7 h-7 rounded-full bg-sky-200 grid place-items-center">
                <PersonIcon className="w-4 h-4" />
              </span>
              <span className="font-medium">{user.name.split(' ')[0]}</span>
            </Link>
            <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/messages" aria-label="Messages" className="p-2 rounded-full hover:bg-white/40">
              <MessageIcon />
            </Link>
            <Link to="/login" className="rounded-full bg-white px-4 py-1.5 text-sm font-medium border border-ink-100 hover:bg-ink-100/40">
              login
            </Link>
            <Link
              to="/signup"
              className="hidden sm:inline-flex rounded-full bg-sky-200 px-4 py-1.5 text-sm font-medium hover:bg-sky-300"
            >
              sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
