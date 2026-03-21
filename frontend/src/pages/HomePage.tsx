import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { analyzeArchitecture } from "../utils/api";
import "./HomePage.css";

const MAX_CHARS = 2000;
const MIN_CHARS = 10;

const SAMPLE_PROMPTS = [
  "E-commerce platform for 10,000 monthly users with product catalog, shopping cart, and Stripe payments",
  "Real-time collaboration tool for 50,000 MAU with document editing, video calls, and EU GDPR compliance",
  "Healthcare patient portal for 5,000 users with appointment booking, medical records, and HIPAA compliance",
];

function getErrorMessage(err: unknown): { message: string; canRetry: boolean } {
  if (err && typeof err === "object") {
    const e = err as { status?: number; message?: string };
    if (e.status === 400) {
      return { message: "Please check your input and try again.", canRetry: false };
    }
    if (e.status === 502) {
      return {
        message: "The analysis service encountered an error. Please try again.",
        canRetry: false,
      };
    }
    if (e.status === 504) {
      return {
        message: "The analysis is taking longer than expected. Please try again.",
        canRetry: true,
      };
    }
  }
  // AbortError from timeout or network failure
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return {
      message: "The analysis is taking longer than expected. Please try again.",
      canRetry: true,
    };
  }
  return {
    message: "Unable to reach the service. Please check your connection and try again.",
    canRetry: true,
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { description, setDescription, isLoading, setIsLoading, setAnalysisResponse } =
    useAppContext();

  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState<{ message: string; canRetry: boolean } | null>(
    null
  );
  const [fetchUnsupported, setFetchUnsupported] = useState(false);

  // Detect Fetch API support on mount
  useEffect(() => {
    if (typeof fetch === "undefined") {
      setFetchUnsupported(true);
    }
  }, []);

  const trimmedLength = description.trim().length;
  const isSubmitDisabled =
    trimmedLength < MIN_CHARS || isLoading || fetchUnsupported;

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setDescription(val);
    if (validationError && val.trim().length >= MIN_CHARS) {
      setValidationError("");
    }
  };

  const handleSamplePrompt = (prompt: string) => {
    setDescription(prompt);
    setValidationError("");
  };

  const doSubmit = useCallback(async () => {
    const trimmed = description.trim();
    if (trimmed.length < MIN_CHARS) {
      setValidationError("Please enter a description of at least 10 characters.");
      return;
    }
    setValidationError("");
    setSubmitError(null);
    setIsLoading(true);
    try {
      const data = await analyzeArchitecture(trimmed);
      setAnalysisResponse(data);
      navigate("/results");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [description, navigate, setAnalysisResponse, setIsLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  const handleRetry = () => {
    setSubmitError(null);
    doSubmit();
  };

  return (
    <main className="home-page page-wrapper">
      {/* Background SVG */}
      <svg
        className="home-bg-svg"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <polygon className="float-1" points="100,50 150,130 50,130" fill="#4a91f2" opacity="0.06" />
        <polygon className="float-2" points="650,80 710,180 590,180" fill="#3b7dd8" opacity="0.06" />
        <polygon className="float-3" points="300,400 360,500 240,500" fill="#64a1f4" opacity="0.06" />
        <polygon className="float-4" points="700,350 760,450 640,450" fill="#8dbdff" opacity="0.06" />
        <polygon className="float-5" points="50,300 100,380 0,380" fill="#4a91f2" opacity="0.06" />
        <polygon className="float-6" points="500,150 550,230 450,230" fill="#3b7dd8" opacity="0.06" />
      </svg>

      {/* Hero */}
      <section className="home-hero">
        <h1 className="home-hero-heading">Design Your AWS Architecture</h1>
        <p className="home-hero-sub">
          Describe your app in plain language — get architecture, costs, and compliance in seconds.
        </p>
      </section>

      {/* Fetch API compatibility notice */}
      {fetchUnsupported && (
        <div className="home-compat-notice" role="alert">
          Your browser does not support the Fetch API required by this application. Please upgrade
          to a modern browser (Chrome, Firefox, Safari, or Edge) to continue.
        </div>
      )}

      {/* Input form */}
      <form className="home-form" onSubmit={handleSubmit} noValidate>
        <div className="home-textarea-wrapper">
          <label htmlFor="description" className="home-label">
            Describe your application
          </label>
          <textarea
            id="description"
            className={`home-textarea${validationError ? " home-textarea--error" : ""}`}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="e.g. A real-time collaboration platform for 50,000 monthly active users with file sharing, video calls, and GDPR compliance for EU users..."
            disabled={isLoading}
            aria-describedby={validationError ? "desc-error" : undefined}
            aria-invalid={!!validationError}
            rows={7}
          />
          <div className="home-textarea-footer">
            {validationError ? (
              <span id="desc-error" className="home-validation-error" role="alert">
                {validationError}
              </span>
            ) : (
              <span />
            )}
            <span
              className={`home-char-count${description.length >= MAX_CHARS ? " home-char-count--limit" : ""}`}
              aria-live="polite"
            >
              {description.length} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="home-submit-error" role="alert">
            <span>{submitError.message}</span>
            {submitError.canRetry && (
              <button type="button" className="home-retry-btn" onClick={handleRetry}>
                Retry
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="home-loading" aria-live="polite">
            <span className="home-spinner" aria-hidden="true" />
            <span>Analyzing your architecture... This may take up to 15 seconds.</span>
          </div>
        )}

        <button
          type="submit"
          className="home-submit-btn"
          disabled={isSubmitDisabled}
          aria-busy={isLoading}
        >
          {isLoading ? "Analyzing..." : "Analyze Architecture"}
        </button>
      </form>

      {/* Sample prompts */}
      <section className="home-samples">
        <h2 className="home-samples-heading">Try an example</h2>
        <ul className="home-samples-list">
          {SAMPLE_PROMPTS.map((prompt, i) => (
            <li key={i}>
              <button
                type="button"
                className="home-sample-btn"
                onClick={() => handleSamplePrompt(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
