import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-100 bg-cream-50 text-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2">
          <span className="wordmark text-xl">hone</span>
          <span className="text-ink-500 text-xs">
            UC Davis student housing
          </span>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-ink-700">
          <Link to="/about" className="hover:text-ink-900 hover:underline">
            About
          </Link>
          <Link to="/safety" className="hover:text-ink-900 hover:underline">
            Safety
          </Link>
          <Link to="/contact" className="hover:text-ink-900 hover:underline">
            Contact
          </Link>
          <Link to="/report-problem" className="hover:text-ink-900 hover:underline">
            Report a problem
          </Link>
          <Link to="/privacy" className="hover:text-ink-900 hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-ink-900 hover:underline">
            Terms
          </Link>
        </nav>

        <div className="sm:ml-auto text-xs text-ink-500">
          © {new Date().getFullYear()} hone. Not affiliated with UC Davis.
        </div>
      </div>
    </footer>
  );
}
