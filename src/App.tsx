import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProjectWizard from './pages/ProjectWizard';
import Workspace from './pages/Workspace';
import Settings from './pages/Settings';
import ThemeSelector from './components/ThemeSelector';
import ProjectSidebar from './components/ProjectSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import AuthDialog from './components/AuthDialog';
import { initServerConnection } from './services/serverConnection';
import { useAuthStore } from './stores/authStore';
import { useMachineStore, CLOUD_MACHINE_ID } from './stores/machineStore';
import { isWeb } from './lib/platform';

function App() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, checkAuth, setShowAuthDialog } = useAuthStore();
  const { selectMachine } = useMachineStore();

  // Initialize app based on platform
  useEffect(() => {
    const initApp = async () => {
      if (isWeb()) {
        // Web mode: check authentication and show dialog if not authenticated
        const authenticated = await checkAuth();
        if (!authenticated) {
          setShowAuthDialog(true);
        } else {
          // Set machine to cloud when authenticated in web mode
          selectMachine(CLOUD_MACHINE_ID);
          // Connect to server for WebRTC signaling
          initServerConnection().catch((err) => {
            console.log('[App] Server connection not available:', err);
          });
        }
      } else {
        // Tauri mode: connect to server in background (optional)
        initServerConnection().catch((err) => {
          console.log('[App] Server connection not available:', err);
        });
      }
    };

    initApp();
  }, []);

  // When auth state changes in web mode, connect to server for signaling
  useEffect(() => {
    if (isWeb() && isAuthenticated) {
      selectMachine(CLOUD_MACHINE_ID);
      // Connect to server for WebRTC signaling after auth
      initServerConnection().catch((err) => {
        console.log('[App] Server connection not available:', err);
      });
    }
  }, [isAuthenticated]);

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

        {/* Auth Dialog (for web mode) */}
        <AuthDialog />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
