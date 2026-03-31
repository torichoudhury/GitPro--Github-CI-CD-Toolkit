import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CIPipelineProvider } from "./contexts/CIPipelineContext";
import { NotificationProvider } from "./components/Notifications";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

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

  return user ? <Dashboard /> : <Login />;
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
