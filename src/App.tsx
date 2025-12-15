import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProjectWizard from './pages/ProjectWizard';
import Workspace from './pages/Workspace';
import Settings from './pages/Settings';
import ThemeSelector from './components/ThemeSelector';
import ProjectSidebar from './components/ProjectSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { initServerConnection } from './services/serverConnection';

function App() {
  const currentYear = new Date().getFullYear();

  // Initialize server connection on app startup (optional, non-blocking)
  useEffect(() => {
    // Attempt to connect to server in background
    // This is completely optional - app works without it
    initServerConnection().catch((err) => {
      console.log('[App] Server connection not available:', err);
    });
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Project Sidebar */}
        <div className="flex">
          <ProjectSidebar />

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/wizard" element={<ProjectWizard />} />
              <Route path="/workspace/:id" element={<Workspace />} />
              <Route path="/settings" element={<Settings />} />

              {/* Redirect any unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>

        {/* Footer Bar */}
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-base-200 border-t border-base-300">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Copyright */}
            <div className="text-xs text-base-content/60">
              © {currentYear} AtelierCode. All rights reserved.
            </div>

            {/* Theme Selector */}
            <ThemeSelector />
          </div>
        </footer>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
