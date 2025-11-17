import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { ArrowLeft, Folder, Bot, LayoutDashboard, MessageSquare, FileCode, ListTodo, Settings } from 'lucide-react';
import type { Project } from '../types/project';
import OverviewTab from '../components/workspace/OverviewTab';

type TabType = 'overview' | 'chat' | 'files' | 'tasks' | 'settings';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const getProject = useProjectStore((state) => state.getProject);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);

  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Set as current project (updates last_activity in backend)
        await setCurrentProject(id);
        // Get the full project data
        const projectData = await getProject(id);
        setProject(projectData || null);
      } catch (error) {
        console.error('Failed to load project:', error);
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, getProject, setCurrentProject]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

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

      {/* Tabs */}
      <div className="border-b border-base-300 bg-base-200">
        <div className="container mx-auto px-8">
          <div className="tabs tabs-boxed bg-transparent gap-2 py-3">
            <button
              className={`tab gap-2 ${activeTab === 'overview' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'chat' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'files' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <FileCode className="w-4 h-4" />
              Files
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'tasks' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'settings' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto p-8">
        {activeTab === 'overview' && (
          <OverviewTab
            agentType={project.agent.type}
            projectPath={project.path}
          />
        )}

        {activeTab === 'chat' && (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Chat</h2>
              <p className="text-base-content/70">Chat interface coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Files</h2>
              <p className="text-base-content/70">File browser coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Tasks</h2>
              <p className="text-base-content/70">Task management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Project Settings</h2>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="label">
                    <span className="label-text">Project Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={project.name}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Project Path</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full font-mono text-sm"
                    value={project.path}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">AI Agent</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={project.agent.type}
                    disabled
                  />
                </div>
                {project.description && (
                  <div>
                    <label className="label">
                      <span className="label-text">Description</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      value={project.description}
                      disabled
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
