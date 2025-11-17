import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { Plus, Folder, Clock, Archive } from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const recentProjects = [...activeProjects]
    .sort((a, b) => {
      const aTime = a.lastOpenedAt || a.createdAt;
      const bTime = b.lastOpenedAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">AtelierCode</a>
        </div>
        <div className="flex-none gap-2 flex">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        {activeProjects.length === 0 ? (
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
                      <h3 className="card-title text-lg">{project.name}</h3>

                      {project.description && (
                        <p className="text-sm text-base-content/70 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="badge badge-primary badge-sm">
                          {project.agent.type}
                        </div>
                        {project.tags?.map((tag) => (
                          <div key={tag} className="badge badge-outline badge-sm">
                            {tag}
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-base-content/60 mt-2">
                        {project.lastOpenedAt
                          ? `Opened ${new Date(project.lastOpenedAt).toLocaleDateString()}`
                          : `Created ${new Date(project.createdAt).toLocaleDateString()}`}
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
                            {project.description && (
                              <div className="text-sm text-base-content/60 line-clamp-1">
                                {project.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="badge badge-primary badge-sm">
                              {project.agent.type}
                            </div>
                          </td>
                          <td>
                            <code className="text-xs">{project.path}</code>
                          </td>
                          <td>
                            <div className="text-sm">
                              {project.lastOpenedAt
                                ? new Date(project.lastOpenedAt).toLocaleDateString()
                                : new Date(project.createdAt).toLocaleDateString()}
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
