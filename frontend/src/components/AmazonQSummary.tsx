interface AmazonQSummaryProps {
  summary: string;
  isFallback: boolean;
  isUnavailable: boolean;
}

export default function AmazonQSummary({ summary, isFallback, isUnavailable }: AmazonQSummaryProps) {
  return (
    <>
      <style>{`
        .aq-summary {
          background: linear-gradient(135deg, #e8f4fd 0%, #dbeeff 100%);
          border: 1px solid #b3d4f5;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .aq-summary__header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }
        .aq-summary__icon {
          font-size: 1.3rem;
          line-height: 1;
        }
        .aq-summary__title {
          font-size: 1rem;
          font-weight: 700;
          color: #134e8e;
          flex: 1;
        }
        .aq-summary__badge {
          display: inline-block;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          background: #fff3cd;
          color: #7a4a00;
          border: 1px solid var(--color-caution);
        }
        .aq-summary__text {
          font-size: 0.9rem;
          color: #1a3a5c;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .aq-summary__unavailable {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.9rem;
          background: #fff8e1;
          border: 1px solid var(--color-caution);
          border-radius: 8px;
          font-size: 0.85rem;
          color: #7a4a00;
          font-weight: 500;
        }
      `}</style>
      <section className="aq-summary" aria-label="AI Trade-off Analysis">
        <div className="aq-summary__header">
          <span className="aq-summary__icon" aria-hidden="true">
            {isUnavailable ? '💡' : '✨'}
          </span>
          <span className="aq-summary__title">AI Trade-off Analysis</span>
          {isFallback && !isUnavailable && (
            <span className="aq-summary__badge">Using cached analysis</span>
          )}
        </div>

        {isUnavailable ? (
          <div className="aq-summary__unavailable" role="status">
            <span aria-hidden="true">⚠️</span>
            Section unavailable — AI analysis could not be retrieved for this request.
          </div>
        ) : (
          <p className="aq-summary__text">{summary}</p>
        )}
      </section>
    </>
  );
}
