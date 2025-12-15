import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { Plus, Folder, Clock, Archive, CheckCircle, LogOut, Monitor, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMachineStore } from '../stores/machineStore';
import { isWeb } from '../lib/platform';

export default function Home() {
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const [showAll, setShowAll] = useState(false);

  // Auth state for user indicator
  const { user, isAuthenticated, logout } = useAuthStore();
  const connectionState = useMachineStore((state) => state.connectionState);
  const webMode = isWeb();
  const isConnected = webMode ? isAuthenticated : connectionState === 'authenticated';
  const displayName = user?.name || user?.email || 'Unknown User';

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const displayProjects = showAll ? projects : activeProjects;
  const recentProjects = [...displayProjects]
    .sort((a, b) => {
      const aTime = a.last_activity || a.created_at;
      const bTime = b.last_activity || b.created_at;
      return bTime - aTime; // Already timestamps in ms
    })
    .slice(0, 6);

  const handleActivateProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    try {
      await updateProject(projectId, { status: 'active' });
      await loadProjects(); // Refresh the list
    } catch (error) {
      console.error('Failed to activate project:', error);
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">AtelierCode</a>
        </div>
        <div className="flex-none gap-2 flex items-center">
          {projects.length > 0 && (
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Show All</span>
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
            </label>
          )}
          <button
            onClick={() => navigate('/wizard?mode=existing')}
            className="btn btn-ghost gap-2"
          >
            <Folder className="w-4 h-4" />
            Add Existing
          </button>
          <button
            onClick={() => navigate('/wizard')}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>

          {/* User Indicator */}
          {isConnected && (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-300 hover:bg-base-100 transition-colors cursor-pointer"
              >
                {webMode ? (
                  <Globe className="w-4 h-4 text-info" />
                ) : (
                  <Monitor className="w-4 h-4 text-success" />
                )}
                <span className="text-sm font-medium max-w-32 truncate">{displayName}</span>
                <span className="w-2 h-2 rounded-full bg-success" />
              </div>
              <ul tabIndex={0} className="dropdown-content z-50 mt-2 p-2 shadow-lg bg-base-200 border border-base-300 rounded-lg w-52">
                <li className="px-3 py-2 text-xs text-base-content/60">
                  {webMode ? 'Web Client' : 'Desktop App'}
                </li>
                {user?.email && (
                  <li className="px-3 py-1 text-sm truncate">{user.email}</li>
                )}
                <li className="divider my-1"></li>
                <li>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded-lg transition-colors text-error"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {recentProjects.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-24 h-24 rounded-full bg-base-200 flex items-center justify-center mb-6">
              <Folder className="w-12 h-12 text-base-content/40" />
            </div>
            <h2 className="text-3xl font-bold mb-2">No Projects Yet</h2>
            <p className="text-base-content/70 mb-8 text-center max-w-md">
              Create your first AI-assisted development project to get started
            </p>
            <button
              onClick={() => navigate('/wizard')}
              className="btn btn-primary btn-lg gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Project
            </button>
          </div>
        ) : (
          // Projects List
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Recent Projects
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="card bg-base-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                  >
                    <div className="card-body">
                      <div className="flex items-start justify-between">
                        <h3 className="card-title text-lg">{project.name}</h3>
                        {project.status !== 'active' && (
                          <button
                            onClick={(e) => handleActivateProject(project.id, e)}
                            className="btn btn-xs btn-success gap-1"
                            title="Activate project"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Activate
                          </button>
                        )}
                      </div>

                      {project.prd_content && (
                        <p className="text-sm text-base-content/70 line-clamp-2">
                          {project.prd_content}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className={`badge badge-sm ${project.status === 'active' ? 'badge-primary' : 'badge-ghost'}`}>
                          {project.agent_type}
                        </div>
                        <div className={`badge badge-sm ${project.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                          {project.status}
                        </div>
                      </div>

                      <div className="text-xs text-base-content/60 mt-2">
                        {project.last_activity && project.last_activity !== project.created_at
                          ? `Opened ${new Date(project.last_activity).toLocaleDateString()}`
                          : `Created ${new Date(project.created_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {projects.length > recentProjects.length && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Archive className="w-6 h-6" />
                  All Projects
                </h2>

                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Agent</th>
                        <th>Location</th>
                        <th>Last Opened</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr
                          key={project.id}
                          onClick={() => navigate(`/workspace/${project.id}`)}
                          className="cursor-pointer hover:bg-base-300"
                        >
                          <td>
                            <div className="font-bold">{project.name}</div>
                            {project.prd_content && (
                              <div className="text-sm text-base-content/60 line-clamp-1">
                                {project.prd_content}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="badge badge-primary badge-sm">
                              {project.agent_type}
                            </div>
                          </td>
                          <td>
                            <code className="text-xs">{project.root_path}</code>
                          </td>
                          <td>
                            <div className="text-sm">
                              {project.last_activity && project.last_activity !== project.created_at
                                ? new Date(project.last_activity).toLocaleDateString()
                                : new Date(project.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm">Open</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
