import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { classifyTier } from '../utils/costCalc';
import ServiceCard from '../components/ServiceCard';
import TrafficSlider from '../components/TrafficSlider';
import ViralSpikeSimulator from '../components/ViralSpikeSimulator';
import CostCurveChart from '../components/CostCurveChart';
import CostBreakdownTable from '../components/CostBreakdownTable';
import AmazonQSummary from '../components/AmazonQSummary';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { analysisResponse, currentMAU, spikeMultiplier } = useAppContext();

  useEffect(() => {
    if (!analysisResponse) {
      navigate('/', { replace: true });
    }
  }, [analysisResponse, navigate]);

  if (!analysisResponse) return null;

  const { architecture_suggestion, cost_estimate, amazon_q_summary, amazon_q_fallback, partial_failure } = analysisResponse;
  const effectiveMAU = currentMAU * (spikeMultiplier ?? 1);

  // Truncate description summary to 100 chars
  const descSummary = architecture_suggestion.cost_drivers.join(', ');
  const truncatedSummary = descSummary.length > 100 ? descSummary.slice(0, 97) + '…' : descSummary;

  return (
    <>
      <style>{`
        .results-page {
          position: relative;
          min-height: 100vh;
          padding: 2rem 1rem 4rem;
          overflow: hidden;
        }
        .results-bg-svg {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        .results-content {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
        }
        .results-header {
          margin-bottom: 2rem;
        }
        .results-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1a1a2e;
          margin: 0 0 0.4rem;
        }
        .results-subtitle {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
        }
        .results-section {
          margin-bottom: 2.5rem;
        }
        .results-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 1rem;
          padding-bottom: 0.4rem;
          border-bottom: 2px solid var(--color-primary-1);
        }
        .results-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .results-services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .results-services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .results-cost-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .results-banner-pricing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: #fff8e1;
          border: 1.5px solid var(--color-caution);
          border-radius: 8px;
          font-size: 0.875rem;
          color: #7a4a00;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .results-nav-links {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .results-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 1.1rem;
          border-radius: 8px;
          background: var(--color-cta);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 150ms, transform 150ms, box-shadow 150ms;
        }
        .results-nav-link:hover {
          background: #0f3d72;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(19,78,142,0.3);
        }
        .results-nav-link--secondary {
          background: white;
          color: var(--color-cta);
          border: 1.5px solid var(--color-primary-3);
        }
        .results-nav-link--secondary:hover {
          background: var(--color-primary-1);
          box-shadow: 0 4px 12px rgba(74,145,242,0.2);
        }
        .results-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.85rem;
          color: var(--color-primary-5);
          text-decoration: none;
          margin-bottom: 1.25rem;
          font-weight: 500;
        }
        .results-back-link:hover {
          color: var(--color-cta);
          text-decoration: underline;
        }
      `}</style>

      {/* Background SVG: geometric circles/dots */}
      <svg
        className="results-bg-svg"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="100" cy="120" r="80" fill="none" stroke="#4a91f2" strokeWidth="2" opacity="0.06" />
        <circle cx="100" cy="120" r="50" fill="none" stroke="#4a91f2" strokeWidth="1.5" opacity="0.06" />
        <circle cx="1100" cy="200" r="120" fill="none" stroke="#3b7dd8" strokeWidth="2" opacity="0.06" />
        <circle cx="1100" cy="200" r="70" fill="none" stroke="#3b7dd8" strokeWidth="1.5" opacity="0.06" />
        <circle cx="600" cy="700" r="100" fill="none" stroke="#64a1f4" strokeWidth="2" opacity="0.06" />
        <circle cx="200" cy="600" r="60" fill="#bfd6f6" opacity="0.06" />
        <circle cx="950" cy="600" r="90" fill="#8dbdff" opacity="0.06" />
        <circle cx="400" cy="100" r="40" fill="#4a91f2" opacity="0.06" />
        <circle cx="800" cy="400" r="30" fill="#64a1f4" opacity="0.06" />
        <circle cx="50" cy="400" r="25" fill="#3b7dd8" opacity="0.06" />
        <circle cx="1150" cy="500" r="45" fill="#bfd6f6" opacity="0.06" />
      </svg>

      <main className="results-page">
        <div className="results-content">
          {/* Back navigation */}
          <Link to="/" className="results-back-link" aria-label="Back to homepage">
            ← Back to Input
          </Link>

          {/* Page header */}
          <header className="results-header">
            <h1 className="results-title">Architecture Analysis</h1>
            {truncatedSummary && (
              <p className="results-subtitle">{truncatedSummary}</p>
            )}
          </header>

          {/* Partial failure: pricing banner */}
          {partial_failure.pricing && (
            <div className="results-banner-pricing" role="alert">
              <span aria-hidden="true">⚠️</span>
              Pricing data partially unavailable — some cost estimates may be missing.
            </div>
          )}

          {/* Section 1: Recommended Services */}
          <section className="results-section" aria-labelledby="services-heading">
            <h2 className="results-section-title" id="services-heading">Recommended Services</h2>
            <div className="results-services-grid">
              {architecture_suggestion.services.map((service) => {
                const costSvc = cost_estimate.services.find((s) => s.service_id === service.id);
                const units = costSvc ? effectiveMAU * costSvc.units_per_mau : 0;
                const tier = costSvc && !costSvc.pricing_unavailable
                  ? classifyTier(units, costSvc.free_tier_limit)
                  : 'amber';
                const tradeoff = architecture_suggestion.tradeoffs[service.id] ?? '';
                const alternatives = architecture_suggestion.alternatives[service.id];

                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    tradeoff={tradeoff}
                    indicator={tier}
                    alternatives={alternatives}
                  />
                );
              })}
            </div>
          </section>

          {/* Section 2: Cost Dashboard */}
          <section className="results-section" aria-labelledby="cost-heading">
            <h2 className="results-section-title" id="cost-heading">Cost Dashboard</h2>
            <div className="results-cost-dashboard">
              <TrafficSlider />
              <ViralSpikeSimulator />
              <CostCurveChart costEstimate={cost_estimate} />
              <CostBreakdownTable costEstimate={cost_estimate} effectiveMAU={effectiveMAU} />
            </div>
          </section>

          {/* Section 3: AI Trade-off Analysis */}
          <section className="results-section" aria-labelledby="ai-heading">
            <h2 className="results-section-title" id="ai-heading">AI Trade-off Analysis</h2>
            <AmazonQSummary
              summary={amazon_q_summary}
              isFallback={amazon_q_fallback}
              isUnavailable={partial_failure.amazon_q}
            />
          </section>

          {/* Navigation links */}
          <nav className="results-nav-links" aria-label="Continue to other sections">
            <Link to="/compliance" className="results-nav-link">
              View Compliance Report →
            </Link>
            <Link to="/iam-export" className="results-nav-link results-nav-link--secondary">
              IAM Policy Export
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}
