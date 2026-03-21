import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PolicyViewer from "../components/PolicyViewer";
import CopyButton from "../components/CopyButton";
import styles from "./IAMExportPage.module.css";

/** Derive a short service name from a statement Sid, e.g. "S3ReadAccess" → "S3" */
function sidToService(sid: string): string {
  // Take the leading uppercase run as the service name
  const match = sid.match(/^([A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)?)/);
  return match ? match[1] : sid;
}

export default function IAMExportPage() {
  const { analysisResponse } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!analysisResponse) {
      navigate("/");
    }
  }, [analysisResponse, navigate]);

  if (!analysisResponse) return null;

  const { iam_export } = analysisResponse;
  const policyJson = JSON.stringify(iam_export, null, 2);

  // Derive unique service names from Statement Sids
  const services = Array.from(
    new Set(iam_export.Statement.map((s) => sidToService(s.Sid)))
  );

  return (
    <>
      {/* Dots/grid SVG background */}
      <svg
        className={styles.bgSvg}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="iam-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="var(--color-primary-4)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#iam-dots)" opacity="0.07" />
      </svg>

      <div className={styles.page}>
        <Navbar />

        <main className={styles.content}>
          <Link to="/results" className={styles.backLink}>
            ← Back to Results
          </Link>

          <header className={styles.header}>
            <h1 className={styles.title}>IAM Policy Export</h1>
            <p className={styles.subtitle}>
              Least-privilege IAM policy generated from your architecture — ready to copy and deploy.
            </p>
          </header>

          {/* Summary */}
          <div className={styles.summaryCard} aria-label="Policy summary">
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Statements</span>
              <span className={styles.summaryValue}>{iam_export.Statement.length}</span>
            </div>

            <div className={styles.summaryDivider} aria-hidden="true" />

            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Services covered</span>
              <ul className={styles.serviceList} aria-label="Services covered">
                {services.map((svc) => (
                  <li key={svc}>
                    <span className={styles.serviceBadge}>{svc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Policy viewer with copy button */}
          <section className={styles.viewerSection} aria-labelledby="policy-viewer-title">
            <div className={styles.viewerHeader}>
              <h2 className={styles.sectionTitle} id="policy-viewer-title">
                Policy JSON
              </h2>
              <CopyButton text={policyJson} label="Copy IAM Policy" />
            </div>

            <PolicyViewer policy={iam_export} />
          </section>

          {/* Least-privilege note */}
          <aside className={styles.note} role="note">
            <span className={styles.noteIcon} aria-hidden="true">⚠️</span>
            <span>
              This policy follows the principle of least privilege. Review before deploying.
            </span>
          </aside>
        </main>

        <Footer />
      </div>
    </>
  );
}
