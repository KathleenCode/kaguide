import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: var(--color-cta);
          color: #fff;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .footer__brand {
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .footer__privacy {
          font-size: 0.85rem;
          opacity: 0.9;
          text-align: center;
          flex: 1;
          min-width: 200px;
        }
        .footer__links {
          display: flex;
          gap: 1rem;
          align-items: center;
          white-space: nowrap;
        }
        .footer__link {
          color: var(--color-primary-1);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 150ms;
        }
        .footer__link:hover {
          color: #fff;
          text-decoration: underline;
        }
        @media (max-width: 600px) {
          .footer {
            flex-direction: column;
            text-align: center;
          }
          .footer__links {
            justify-content: center;
          }
        }
      `}</style>
      <footer className="footer">
        <span className="footer__brand">Kaguide AI — AWS Architecture Advisor</span>
        <p className="footer__privacy">
          🔒 Zero data stored. Your inputs are never saved or logged.
        </p>
        <div className="footer__links">
          <Link to="/iam-export" className="footer__link">
            IAM Export
          </Link>
          <a
            href="https://github.com/placeholder/kaguide-ai"
            className="footer__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
