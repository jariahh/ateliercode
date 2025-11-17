import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProjectWizard from './pages/ProjectWizard';
import Workspace from './pages/Workspace';
import ThemeSelector from './components/ThemeSelector';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Theme Selector - Available on all pages */}
        <div className="fixed bottom-4 right-4 z-50">
          <ThemeSelector />
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wizard" element={<ProjectWizard />} />
          <Route path="/workspace/:id" element={<Workspace />} />

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
