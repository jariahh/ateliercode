import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FolderOpen, Plus, Home, Settings, Cloud } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useProjectActivityStore, startActivityCleanup, stopActivityCleanup } from '../stores/projectActivityStore';
import { useMachineStore } from '../stores/machineStore';
import MachineSelector from './MachineSelector';

export default function ProjectSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useProjectStore((state) => state.projects);

  // Subscribe to project activity store for real-time updates
  // We subscribe to activities to trigger re-renders when the Map changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activities = useProjectActivityStore((state) => state.activities);
  const hasActivity = useProjectActivityStore((state) => state.hasActivity);

  // Machine store for multi-machine support
  const connectionState = useMachineStore((state) => state.connectionState);
  const isRemoteMode = useMachineStore((state) => state.isRemoteMode);
  const getSelectedMachine = useMachineStore((state) => state.getSelectedMachine);

  // Get current project ID from URL
  const currentProjectId = location.pathname.startsWith('/workspace/')
    ? location.pathname.split('/')[2]
    : null;

  // Start/stop the activity cleanup interval
  useEffect(() => {
    startActivityCleanup();
    return () => stopActivityCleanup();
  }, []);

  // Force re-render every second to update activity indicators as they expire
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleProjectClick = (projectId: string) => {
    navigate(`/workspace/${projectId}`);
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleNewProject = () => {
    navigate('/wizard');
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-base-200 border-r border-base-300 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-base-content">Projects</h2>
                {/* Remote mode indicator */}
                {isRemoteMode() && (
                  <span className="badge badge-info badge-xs gap-1">
                    <Cloud className="w-3 h-3" />
                    {getSelectedMachine()?.name || 'Remote'}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-ghost btn-xs btn-square"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Machine Selector (only shown when connected to server) */}
          {connectionState === 'authenticated' && (
            <MachineSelector isCollapsed={isCollapsed} />
          )}

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Home Button */}
            <button
              onClick={handleHomeClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
              title="Home"
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Home</span>}
            </button>

            {/* New Project Button */}
            <button
              onClick={handleNewProject}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mt-1 ${
                location.pathname === '/wizard'
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
              title="New Project"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">New Project</span>}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mt-1 ${
                location.pathname === '/settings'
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
            </button>

            {/* Divider */}
            {projects.length > 0 && (
              <div className="divider my-2">
                {!isCollapsed && <span className="text-xs text-base-content/60">Recent</span>}
              </div>
            )}

            {/* Projects List */}
            <div className="space-y-1">
              {projects.map((project) => {
                // Get color classes based on project.color
                const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
                  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
                  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
                  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
                  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
                  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
                  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500' },
                  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500' },
                  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500' },
                  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500' },
                };
                const projectColor = project.color && colorClasses[project.color] ? colorClasses[project.color] : null;
                const isActive = currentProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? projectColor
                          ? `${projectColor.bg} ${projectColor.text} border-l-4 ${projectColor.border}`
                          : 'bg-primary text-primary-content'
                        : projectColor
                          ? `hover:${projectColor.bg} border-l-4 border-transparent hover:${projectColor.border}`
                          : 'hover:bg-base-300'
                    }`}
                    title={project.name}
                  >
                    {/* Project Icon */}
                    {project.icon ? (
                      <span className="text-lg flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {project.icon}
                      </span>
                    ) : (
                      <FolderOpen className={`w-5 h-5 flex-shrink-0 ${isActive && projectColor ? projectColor.text : ''}`} />
                    )}
                    {!isCollapsed && (
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{project.name}</div>
                        <div className={`text-xs truncate ${
                          isActive
                            ? projectColor ? `${projectColor.text}/70` : 'text-primary-content/70'
                            : 'text-base-content/60'
                        }`}>
                          {project.path}
                        </div>
                      </div>
                    )}
                    {/* Activity indicator - always visible */}
                    <div className="flex-shrink-0">
                      {hasActivity(project.id) ? (
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full h-3 w-3 bg-base-content/20"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Empty State */}
            {projects.length === 0 && !isCollapsed && (
              <div className="text-center py-8 px-4">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-xs text-base-content/60">No projects yet</p>
                <p className="text-xs text-base-content/50 mt-1">
                  Create your first project to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Spacer to push content right */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0`} />
    </>
  );
}
