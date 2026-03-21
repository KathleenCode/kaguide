import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "../context/AppContext";
import HomePage from "./HomePage";

// Helper to render HomePage inside required providers
function renderHomePage() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AppProvider>
  );
}

// ── 8.4: Submit button disabled when description < 10 chars ──────────────────

describe("Submit button disabled state (Requirement 1.4)", () => {
  it("is disabled when description is empty", () => {
    renderHomePage();
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when description has fewer than 10 chars", () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "short" } });
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when description is exactly 9 chars", () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "123456789" } });
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when description is whitespace-only (trims to < 10)", () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "         " } });
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).toBeDisabled();
  });

  it("is enabled when description has exactly 10 chars", () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "1234567890" } });
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).not.toBeDisabled();
  });

  it("is enabled when description has more than 10 chars", () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "A valid description for testing" } });
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows inline validation message when submitting with short description", async () => {
    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "short" } });
    // Force submit via form (bypass disabled button by directly calling submit)
    const form = textarea.closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        screen.getByText(/please enter a description of at least 10 characters/i)
      ).toBeInTheDocument();
    });
  });
});

// ── 8.5: Fetch API absence shows compatibility notice (Requirement 12.5) ──────

describe("Fetch API compatibility notice (Requirement 12.5)", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("shows compatibility notice when fetch is undefined", () => {
    // @ts-expect-error intentionally removing fetch
    delete globalThis.fetch;
    renderHomePage();
    expect(
      screen.getByText(/your browser does not support the fetch api/i)
    ).toBeInTheDocument();
  });

  it("disables submit button when fetch is undefined", () => {
    // @ts-expect-error intentionally removing fetch
    delete globalThis.fetch;
    renderHomePage();
    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    expect(btn).toBeDisabled();
  });

  it("does not show compatibility notice when fetch is available", () => {
    renderHomePage();
    expect(
      screen.queryByText(/your browser does not support the fetch api/i)
    ).not.toBeInTheDocument();
  });
});

// ── 8.6: Loading indicator shown when isLoading is true (Requirement 12.4) ───

describe("Loading indicator (Requirement 12.4)", () => {
  it("shows loading message and spinner when isLoading is set during submit", async () => {
    // Mock fetch to hang so we can observe loading state
    const neverResolve = new Promise<Response>(() => {});
    vi.stubGlobal("fetch", () => neverResolve);

    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "A valid description for testing purposes" } });

    const btn = screen.getByRole("button", { name: /analyze architecture/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(
        screen.getByText(/analyzing your architecture/i)
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("disables textarea while loading", async () => {
    const neverResolve = new Promise<Response>(() => {});
    vi.stubGlobal("fetch", () => neverResolve);

    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "A valid description for testing purposes" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze architecture/i }));

    await waitFor(() => {
      expect(textarea).toBeDisabled();
    });

    vi.unstubAllGlobals();
  });

  it("shows 'Analyzing...' text on submit button while loading", async () => {
    const neverResolve = new Promise<Response>(() => {});
    vi.stubGlobal("fetch", () => neverResolve);

    renderHomePage();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "A valid description for testing purposes" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze architecture/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /analyzing\.\.\./i })).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
