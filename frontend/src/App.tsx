import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useAppContext } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import CompliancePage from "./pages/CompliancePage";
import IAMExportPage from "./pages/IAMExportPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { analysisResponse } = useAppContext();
  if (!analysisResponse) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedRoute>
                <CompliancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/iam-export"
            element={
              <ProtectedRoute>
                <IAMExportPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AppProvider>
  );
}
