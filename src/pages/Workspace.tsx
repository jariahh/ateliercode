import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { ArrowLeft, Folder, Bot } from 'lucide-react';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProjectStore((state) =>
    id ? state.getProject(id) : null
  );
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);

  useEffect(() => {
    if (id) {
      setCurrentProject(id);
    }
  }, [id, setCurrentProject]);

  if (!project) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-base-content/70 mb-6">
            The project you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1">
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="divider divider-horizontal mx-2"></div>
          <Folder className="w-5 h-5 mr-2" />
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-xs text-base-content/60">{project.path}</p>
          </div>
        </div>
        <div className="flex-none gap-2">
          <div className="badge badge-primary gap-2">
            <Bot className="w-3 h-3" />
            {project.agent.type}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Workspace Coming Soon</h2>
            <p className="text-base-content/70">
              This is where you'll interact with your AI agent and manage your project.
            </p>

            <div className="mt-6 space-y-4">
              <div className="stat bg-base-300 rounded-lg">
                <div className="stat-title">Project Created</div>
                <div className="stat-value text-2xl">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
                <div className="stat-desc">
                  {new Date(project.createdAt).toLocaleTimeString()}
                </div>
              </div>

              {project.description && (
                <div>
                  <h3 className="font-bold mb-2">Description</h3>
                  <p className="text-sm text-base-content/70">{project.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
