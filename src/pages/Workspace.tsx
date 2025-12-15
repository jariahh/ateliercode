import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { Folder, Bot, LayoutDashboard, MessageSquare, FileCode, ListTodo, Settings, Sparkles, Save, GitCompare } from 'lucide-react';
import type { Project } from '../services/backend/types';
import OverviewTab from '../components/workspace/OverviewTab';
import TasksTab from '../components/workspace/TasksTab';
import FilesTab from '../components/workspace/FilesTab';
import ChatTab from '../components/workspace/ChatTab';
import ChangesTab from '../components/workspace/ChangesTab';
import AIProjectDetailsModal, { type AIProjectDetails } from '../components/modals/AIProjectDetailsModal';
import { invoke } from '@tauri-apps/api/core';

type TabType = 'overview' | 'chat' | 'files' | 'tasks' | 'changes' | 'settings';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const getProject = useProjectStore((state) => state.getProject);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const updateProjectInStore = useProjectStore((state) => state.updateProject);

  // Settings tab state
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<string>('active');
  const [editedIcon, setEditedIcon] = useState<string | null>(null);
  const [editedColor, setEditedColor] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // AI modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGeneratedDetails, setAiGeneratedDetails] = useState<AIProjectDetails>({ name: '', description: '' });

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
          setEditedDescription(projectData.prd_content || '');
          setEditedStatus(projectData.status);
          setEditedIcon(projectData.icon || null);
          setEditedColor(projectData.color || null);
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
    const descChanged = editedDescription !== (project.prd_content || '');
    const statusChanged = editedStatus !== project.status;
    setHasChanges(nameChanged || descChanged || statusChanged);
  }, [editedName, editedDescription, editedStatus, project]);

  // Handle AI regeneration - generate and show in modal
  const handleRegenerateWithAI = async () => {
    if (!id || !project) return;

    setIsRegenerating(true);
    setShowAIModal(true);

    try {
      console.log('Calling generate_project_details with path:', project.root_path);
      const details = await invoke<AIProjectDetails>('generate_project_details', {
        projectPath: project.root_path,
      });

      console.log('Received AI-generated details:', details);
      setAiGeneratedDetails(details);
    } catch (error) {
      console.error('Failed to generate project details:', error);
      alert('Failed to generate project details with AI. Please check console for details.');
      setShowAIModal(false);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle applying AI-generated details
  const handleApplyAIDetails = (details: AIProjectDetails) => {
    setEditedName(details.name);
    setEditedDescription(details.description);
    setHasChanges(true);
  };

  // Handle manual save
  const handleSaveChanges = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      const updatedProject = await invoke<Project>('update_project', {
        id,
        updates: {
          name: editedName,
          prd_content: editedDescription,
          status: editedStatus,
          icon: editedIcon || undefined,
          color: editedColor || undefined,
        },
      });

      // Update local state
      setProject(updatedProject);

      // Update the Zustand store so the sidebar updates
      await updateProjectInStore(id, {
        name: editedName,
        prd_content: editedDescription,
        status: editedStatus,
        icon: editedIcon || undefined,
        color: editedColor || undefined,
      });

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
        <div className="flex-1 gap-2">
          <Folder className="w-5 h-5" />
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-xs text-base-content/60">{project.root_path}</p>
          </div>
        </div>
        <div className="flex-none gap-2">
          {project.agent_type && (
            <div className="badge badge-primary gap-2">
              <Bot className="w-3 h-3" />
              {project.agent_type}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-base-300 bg-base-200">
        <div className="px-8">
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
              data-tab="chat"
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
              className={`tab gap-2 ${activeTab === 'changes' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('changes')}
            >
              <GitCompare className="w-4 h-4" />
              Changes
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
      <div className="p-8">
        {activeTab === 'overview' && id && project.agent_type && (
          <OverviewTab
            projectId={id}
            agentType={project.agent_type}
            projectPath={project.root_path}
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

        {activeTab === 'changes' && id && (
          <ChangesTab projectId={id} />
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

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Active Status</span>
                  </label>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input
                        type="checkbox"
                        className="toggle toggle-success"
                        checked={editedStatus === 'active'}
                        onChange={(e) => setEditedStatus(e.target.checked ? 'active' : 'archived')}
                      />
                      <div>
                        <span className="label-text font-medium">
                          {editedStatus === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <div className="label-text-alt text-base-content/60 mt-1">
                          {editedStatus === 'active'
                            ? 'Project appears on home page and is actively tracked'
                            : 'Project is hidden from default view (use "Show All" toggle to see it)'}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="divider"></div>

                {/* Icon Selection */}
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Project Icon</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['📁', '🚀', '💻', '🎮', '🎨', '📱', '🌐', '⚡', '🔧', '📊', '🎵', '📚', '🛠️', '🔬', '🎯'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { setEditedIcon(emoji); setHasChanges(true); }}
                        className={`btn btn-square btn-sm text-lg ${editedIcon === emoji ? 'btn-primary' : 'btn-ghost'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setEditedIcon(null); setHasChanges(true); }}
                      className={`btn btn-sm ${!editedIcon ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Default
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Choose an icon to identify this project in the sidebar
                    </span>
                  </label>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Project Color</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'purple', class: 'bg-purple-500' },
                      { name: 'blue', class: 'bg-blue-500' },
                      { name: 'green', class: 'bg-green-500' },
                      { name: 'orange', class: 'bg-orange-500' },
                      { name: 'red', class: 'bg-red-500' },
                      { name: 'yellow', class: 'bg-yellow-500' },
                      { name: 'cyan', class: 'bg-cyan-500' },
                      { name: 'pink', class: 'bg-pink-500' },
                      { name: 'indigo', class: 'bg-indigo-500' },
                      { name: 'teal', class: 'bg-teal-500' },
                    ].map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => { setEditedColor(color.name); setHasChanges(true); }}
                        className={`w-8 h-8 rounded-full ${color.class} transition-all ${
                          editedColor === color.name ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                        }`}
                        title={color.name}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => { setEditedColor(null); setHasChanges(true); }}
                      className={`btn btn-sm ${!editedColor ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Default
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Choose a color theme for this project
                    </span>
                  </label>
                </div>

                <div className="divider"></div>

                <div>
                  <label className="label">
                    <span className="label-text">Project Path</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full font-mono text-sm"
                    value={project.root_path}
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
                    value={project.agent_type || 'Unknown'}
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
                      setEditedDescription(project.prd_content || '');
                      setEditedStatus(project.status);
                      setEditedIcon(project.icon || null);
                      setEditedColor(project.color || null);
                      setHasChanges(false);
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

      {/* AI Project Details Modal */}
      <AIProjectDetailsModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApply={handleApplyAIDetails}
        initialDetails={aiGeneratedDetails}
        isLoading={isRegenerating}
      />
    </div>
  );
}
