import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function Navbar() {
  const { analysisResponse } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link nav-link--active" : "nav-link";

  return (
    <>
      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-primary-1);
          padding: 0 1.5rem;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navbar__left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .navbar__logo {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-cta);
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .navbar__logo:hover {
          color: var(--color-primary-5);
        }
        .navbar__back {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-primary-5);
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 150ms, color 150ms;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .navbar__back:hover {
          background: var(--color-primary-1);
          color: var(--color-cta);
        }
        .navbar__links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          list-style: none;
        }
        .nav-link {
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.9rem;
          color: #444;
          transition: color 150ms, background 150ms;
        }
        .nav-link:hover {
          color: var(--color-primary-5);
          background: var(--color-primary-1);
        }
        .nav-link--active {
          color: var(--color-primary-5);
          background: var(--color-primary-1);
          font-weight: 600;
        }
        .navbar__hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.4rem;
          color: var(--color-cta);
          font-size: 1.4rem;
          line-height: 1;
        }
        @media (max-width: 600px) {
          .navbar__links {
            display: none;
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            background: white;
            border-bottom: 1px solid var(--color-primary-1);
            flex-direction: column;
            align-items: flex-start;
            padding: 0.75rem 1.5rem;
            gap: 0.25rem;
          }
          .navbar__links--open {
            display: flex;
          }
          .navbar__hamburger {
            display: block;
          }
        }
      `}</style>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__left">
          {!isHome && (
            <button
              className="navbar__back"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              ← Back
            </button>
          )}
          <Link to="/" className="navbar__logo">
            Kaguide AI
          </Link>
        </div>

        <button
          className="navbar__hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <ul className={`navbar__links${menuOpen ? " navbar__links--open" : ""}`}>
          <li>
            <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
          </li>
          {analysisResponse && (
            <>
              <li>
                <NavLink to="/results" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  Results
                </NavLink>
              </li>
              <li>
                <NavLink to="/compliance" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  Compliance
                </NavLink>
              </li>
              <li>
                <NavLink to="/iam-export" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  IAM Export
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>
    </>
  );
}
