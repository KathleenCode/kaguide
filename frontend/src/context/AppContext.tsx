import { createContext, useContext, useState, ReactNode } from "react";

// --- Data model interfaces matching backend AnalysisResponse schema ---

export interface ServiceItem {
  id: string;
  name: string;
  purpose: string;
  category: string;
}

export interface AlternativeItem {
  name: string;
  reason: string;
}

export interface ArchitectureSuggestion {
  services: ServiceItem[];
  alternatives: Record<string, AlternativeItem[]>;
  tradeoffs: Record<string, string>;
  cost_drivers: string[];
}

export interface CostServiceItem {
  service_id: string;
  monthly_cost_usd: number;
  unit_price: number;
  units_per_mau: number;
  free_tier_limit: number;
  pricing_unavailable: boolean;
}

export interface CostEstimate {
  services: CostServiceItem[];
  total_monthly_cost_usd: number;
  top_cost_drivers: string[];
  base_mau: number;
}

export interface ComplianceFlag {
  regulation: string;
  severity: "violation" | "warning" | "info";
  description: string;
  plain_language: string;
}

export interface RegionComparisonItem {
  region: string;
  estimated_cost_delta_pct: number;
  latency_note: string;
}

export interface ComplianceCheck {
  applicable_regulations: string[];
  flags: ComplianceFlag[];
  recommended_region: string;
  region_justification: string;
  region_comparison: RegionComparisonItem[];
}

export interface IAMStatement {
  Sid: string;
  Effect: string;
  Action: string[];
  Resource: string;
}

export interface IAMExport {
  Version: string;
  Statement: IAMStatement[];
}

export interface PartialFailure {
  compliance: boolean;
  amazon_q: boolean;
  pricing: boolean;
}

export interface AnalysisResponse {
  architecture_suggestion: ArchitectureSuggestion;
  cost_estimate: CostEstimate;
  compliance_check: ComplianceCheck;
  iam_export: IAMExport;
  amazon_q_summary: string;
  amazon_q_fallback: boolean;
  partial_failure: PartialFailure;
}

// --- Context state ---

interface AppState {
  description: string;
  analysisResponse: AnalysisResponse | null;
  currentMAU: number;
  spikeMultiplier: number | null;
  isLoading: boolean;
  setDescription: (v: string) => void;
  setAnalysisResponse: (v: AnalysisResponse | null) => void;
  setCurrentMAU: (v: number) => void;
  setSpikeMultiplier: (v: number | null) => void;
  setIsLoading: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [description, setDescription] = useState("");
  const [analysisResponse, setAnalysisResponse] =
    useState<AnalysisResponse | null>(null);
  const [currentMAU, setCurrentMAU] = useState(1000);
  const [spikeMultiplier, setSpikeMultiplier] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AppContext.Provider
      value={{
        description,
        analysisResponse,
        currentMAU,
        spikeMultiplier,
        isLoading,
        setDescription,
        setAnalysisResponse,
        setCurrentMAU,
        setSpikeMultiplier,
        setIsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
