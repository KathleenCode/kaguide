import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { ComplianceFlag } from '../context/AppContext';
import RegionComparison from '../components/RegionComparison';
import styles from './CompliancePage.module.css';

function FlagIndicator({ severity }: { severity: ComplianceFlag['severity'] }) {
  const cls =
    severity === 'violation'
      ? styles.flagIndicatorViolation
      : severity === 'warning'
      ? styles.flagIndicatorWarning
      : styles.flagIndicatorInfo;
  return (
    <span
      className={`${styles.flagIndicator} ${cls}`}
      aria-hidden="true"
    />
  );
}

function FlagSeverityLabel({ severity }: { severity: ComplianceFlag['severity'] }) {
  const cls =
    severity === 'violation'
      ? styles.flagSeverityViolation
      : severity === 'warning'
      ? styles.flagSeverityWarning
      : styles.flagSeverityInfo;
  return <span className={cls}>{severity}</span>;
}

export default function CompliancePage() {
  const navigate = useNavigate();
  const { analysisResponse } = useAppContext();

  useEffect(() => {
    if (!analysisResponse) {
      navigate('/', { replace: true });
    }
  }, [analysisResponse, navigate]);

  if (!analysisResponse) return null;

  const { compliance_check, partial_failure } = analysisResponse;
  const {
    applicable_regulations,
    flags,
    recommended_region,
    region_justification,
    region_comparison,
  } = compliance_check;

  return (
    <>
      {/* Animated SVG background — floating geometric shapes at opacity ≤ 0.08 */}
      <svg
        className={styles.bgSvg}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Hexagon-like polygons */}
        <polygon
          points="120,60 160,60 180,95 160,130 120,130 100,95"
          fill="none"
          stroke="#4a91f2"
          strokeWidth="1.5"
          opacity="0.07"
        />
        <polygon
          points="1050,150 1090,150 1110,185 1090,220 1050,220 1030,185"
          fill="none"
          stroke="#3b7dd8"
          strokeWidth="1.5"
          opacity="0.07"
        />
        <polygon
          points="550,680 590,680 610,715 590,750 550,750 530,715"
          fill="none"
          stroke="#64a1f4"
          strokeWidth="1.5"
          opacity="0.07"
        />
        {/* Circles */}
        <circle cx="200" cy="500" r="70" fill="none" stroke="#8dbdff" strokeWidth="1.5" opacity="0.07" />
        <circle cx="950" cy="350" r="90" fill="none" stroke="#4a91f2" strokeWidth="2" opacity="0.06" />
        <circle cx="400" cy="750" r="50" fill="#bfd6f6" opacity="0.07" />
        <circle cx="1100" cy="600" r="60" fill="#8dbdff" opacity="0.06" />
        {/* Small filled dots */}
        <circle cx="80" cy="300" r="18" fill="#4a91f2" opacity="0.07" />
        <circle cx="700" cy="100" r="22" fill="#64a1f4" opacity="0.07" />
        <circle cx="1150" cy="400" r="15" fill="#3b7dd8" opacity="0.07" />
        <circle cx="300" cy="200" r="12" fill="#bfd6f6" opacity="0.08" />
        {/* Triangles */}
        <polygon points="850,50 880,100 820,100" fill="none" stroke="#4a91f2" strokeWidth="1.5" opacity="0.07" />
        <polygon points="50,650 80,700 20,700" fill="none" stroke="#64a1f4" strokeWidth="1.5" opacity="0.07" />
      </svg>

      <main className={styles.page}>
        <div className={styles.content}>
          {/* Back navigation */}
          <Link to="/results" className={styles.backLink} aria-label="Back to results">
            ← Back to Results
          </Link>

          {/* Page header */}
          <header className={styles.header}>
            <h1 className={styles.title}>Compliance Report</h1>
            <p className={styles.subtitle}>
              Regulatory analysis for your architecture
            </p>
          </header>

          {/* Section 1: Applicable Regulations */}
          <section className={styles.section} aria-labelledby="regulations-heading">
            <h2 className={styles.sectionTitle} id="regulations-heading">
              Applicable Regulations
            </h2>
            {applicable_regulations.length > 0 ? (
              <ul className={styles.regulationList} aria-label="Applicable regulations">
                {applicable_regulations.map((reg) => (
                  <li key={reg}>
                    <span className={styles.regulationBadge}>{reg}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noFlags}>No applicable regulations identified.</p>
            )}
          </section>

          {/* Section 2: Compliance Flags */}
          <section className={styles.section} aria-labelledby="flags-heading">
            <h2 className={styles.sectionTitle} id="flags-heading">
              Compliance Flags
            </h2>

            {partial_failure.compliance ? (
              <div className={styles.amberPlaceholder} role="alert">
                <span className={styles.amberIcon} aria-hidden="true">⚠️</span>
                Compliance data unavailable — the compliance scan could not complete. Review manually.
              </div>
            ) : flags.length > 0 ? (
              <ul className={styles.flagList} aria-label="Compliance flags">
                {flags.map((flag, i) => (
                  <li key={`${flag.regulation}-${i}`} className={styles.flagCard}>
                    <FlagIndicator severity={flag.severity} />
                    <div className={styles.flagBody}>
                      <div className={styles.flagHeader}>
                        <span className={styles.flagRegulation}>{flag.regulation}</span>
                        <FlagSeverityLabel severity={flag.severity} />
                      </div>
                      <p className={styles.flagDescription}>{flag.description}</p>
                      <p className={styles.flagPlainLanguage}>{flag.plain_language}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noFlags}>No compliance flags detected.</p>
            )}
          </section>

          {/* Section 3: Recommended Region */}
          <section className={styles.section} aria-labelledby="region-heading">
            <h2 className={styles.sectionTitle} id="region-heading">
              Recommended Region
            </h2>
            <div className={styles.regionRecommendation}>
              <div className={styles.regionRecommendationLabel}>Recommended</div>
              <div className={styles.regionRecommendationValue}>{recommended_region}</div>
              {region_justification && (
                <p className={styles.regionJustification}>{region_justification}</p>
              )}
            </div>

            {/* Region Comparison — only shown when ≥ 2 regions available */}
            {region_comparison.length >= 2 && (
              <RegionComparison
                regions={region_comparison}
                recommendedRegion={recommended_region}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
