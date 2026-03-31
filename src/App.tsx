import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CIPipelineProvider } from "./contexts/CIPipelineContext";
import { NotificationProvider } from "./components/Notifications";
import { Dashboard } from "./components/Dashboard";

const AppContent: React.FC = () => {
  const { userProfile, loading, error, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0d1117" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "#3fb950" }}
          >
            <span className="font-mono font-bold text-xs" style={{ color: "#0d1117" }}>
              GP
            </span>
          </div>
          <span className="font-mono text-sm" style={{ color: "#8b949e" }}>
            Loading…
          </span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#0d1117" }}
      >
        <div
          className="w-full max-w-xl rounded-2xl p-6 border"
          style={{
            background: "rgba(22, 27, 34, 0.8)",
            borderColor: "rgba(63, 185, 80, 0.25)",
          }}
        >
          <h1 className="text-lg font-semibold mb-2" style={{ color: "#e6edf3" }}>
            GitHub profile not loaded
          </h1>
          <p className="text-sm mb-4" style={{ color: "#8b949e" }}>
            Add VITE_GITHUB_TOKEN or VITE_GITHUB_USERNAME in backend/.env and reload the extension.
          </p>
          {error && (
            <p className="text-xs mb-4" style={{ color: "#f85149" }}>
              {error}
            </p>
          )}
          <button
            onClick={() => {
              void refreshProfile();
            }}
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: "#3fb950", color: "#0d1117" }}
          >
            Retry Profile Fetch
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CIPipelineProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </CIPipelineProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
