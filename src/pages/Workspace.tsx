import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { ArrowLeft, Folder, Bot, LayoutDashboard, MessageSquare, FileCode, ListTodo, Settings, Sparkles, Save } from 'lucide-react';
import type { Project } from '../types/project';
import OverviewTab from '../components/workspace/OverviewTab';
import TasksTab from '../components/workspace/TasksTab';
import FilesTab from '../components/workspace/FilesTab';
import ChatTab from '../components/workspace/ChatTab';
import { invoke } from '@tauri-apps/api/core';

type TabType = 'overview' | 'chat' | 'files' | 'tasks' | 'settings';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const getProject = useProjectStore((state) => state.getProject);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);

  // Settings tab state
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

        // Initialize settings form fields
        if (projectData) {
          setEditedName(projectData.name);
          setEditedDescription(projectData.description || '');
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, getProject, setCurrentProject]);

  // Track changes in settings
  useEffect(() => {
    if (!project) return;
    const nameChanged = editedName !== project.name;
    const descChanged = editedDescription !== (project.description || '');
    setHasChanges(nameChanged || descChanged);
  }, [editedName, editedDescription, project]);

  // Handle AI regeneration
  const handleRegenerateWithAI = async () => {
    if (!id) return;

    setIsRegenerating(true);
    try {
      const updatedProject = await invoke<Project>('update_project_with_ai', {
        projectId: id,
      });

      // Update local state
      setProject(updatedProject);
      setEditedName(updatedProject.name);
      setEditedDescription(updatedProject.description || '');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to regenerate with AI:', error);
      alert('Failed to regenerate project details with AI. Please check console for details.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle manual save
  const handleSaveChanges = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      const updatedProject = await invoke<Project>('update_project', {
        id,
        name: editedName,
        description: editedDescription,
      });

      // Update local state
      setProject(updatedProject);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save project changes. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

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
        {activeTab === 'overview' && id && (
          <OverviewTab
            projectId={id}
            agentType={project.agent.type}
            projectPath={project.path}
          />
        )}

        {activeTab === 'chat' && (
          <ChatTab projectId={id} />
        )}

        {activeTab === 'files' && (
          <FilesTab projectId={id} />
        )}

        {activeTab === 'tasks' && id && (
          <TasksTab projectId={id} />
        )}

        {activeTab === 'settings' && (
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <h2 className="card-title">Project Settings</h2>
                <button
                  onClick={handleRegenerateWithAI}
                  disabled={isRegenerating}
                  className="btn btn-primary btn-sm gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate with AI
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="label">
                    <span className="label-text">Project Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>

                <div className="divider"></div>

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
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Project path cannot be changed
                    </span>
                  </label>
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
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Agent type cannot be changed after project creation
                    </span>
                  </label>
                </div>

                <div className="divider"></div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditedName(project.name);
                      setEditedDescription(project.description || '');
                    }}
                    disabled={!hasChanges || isSaving}
                    className="btn btn-ghost btn-sm"
                  >
                    Reset Changes
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={!hasChanges || isSaving}
                    className="btn btn-success btn-sm gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
