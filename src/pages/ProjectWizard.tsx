import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, FolderOpen, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../stores/projectStore';
import type { AgentType, CreateProjectInput } from '../types/project';
import type { ProjectAnalysisResult } from '../types/tauri';
import AgentSelector from '../components/AgentSelector';
import FolderPicker from '../components/FolderPicker';

interface FormData {
  name: string;
  path: string;
  description: string;
  agentType: AgentType | null;
  initGit: boolean;
}

interface FormErrors {
  name?: string;
  path?: string;
  agentType?: string;
}

const NEW_PROJECT_STEPS = [
  { id: 1, label: 'Basic Info', description: 'Project name and location' },
  { id: 2, label: 'AI Agent', description: 'Choose your assistant' },
  { id: 3, label: 'Review', description: 'Confirm and create' },
];

const EXISTING_PROJECT_STEPS = [
  { id: 1, label: 'Select Folder', description: 'Choose existing project' },
  { id: 2, label: 'AI Agent', description: 'Choose your assistant' },
  { id: 3, label: 'AI Analysis', description: 'Analyzing project' },
  { id: 4, label: 'Review', description: 'Confirm and create' },
];

export default function ProjectWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'existing' ? 'existing' : 'new';
  const createProject = useProjectStore((state) => state.createProject);
  const isLoading = useProjectStore((state) => state.isLoading);

  const STEPS = mode === 'existing' ? EXISTING_PROJECT_STEPS : NEW_PROJECT_STEPS;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    path: '',
    description: '',
    agentType: null,
    initGit: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ProjectAnalysisResult | null>(null);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (mode === 'existing') {
      // Existing project validation
      if (step === 1) {
        if (!formData.path.trim()) {
          newErrors.path = 'Please select a project folder';
        }
      }

      if (step === 2) {
        if (!formData.agentType) {
          newErrors.agentType = 'Please select an AI agent';
        }
      }

      if (step === 4) {
        if (!formData.name.trim()) {
          newErrors.name = 'Project name is required';
        }
      }
    } else {
      // New project validation
      if (step === 1) {
        if (!formData.name.trim()) {
          newErrors.name = 'Project name is required';
        } else if (formData.name.length < 3) {
          newErrors.name = 'Project name must be at least 3 characters';
        }

        if (!formData.path.trim()) {
          newErrors.path = 'Project location is required';
        }
      }

      if (step === 2) {
        if (!formData.agentType) {
          newErrors.agentType = 'Please select an AI agent';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // AI Analysis for existing projects
  const analyzeExistingProject = async () => {
    setIsAnalyzing(true);

    try {
      // Call the AI-powered analysis command
      const analysis = await invoke<ProjectAnalysisResult>('analyze_project_with_ai', {
        path: formData.path,
      });

      setAiAnalysis(analysis);

      // Auto-fill form with AI suggestions
      updateFormData('name', analysis.suggested_name);
      updateFormData('description', analysis.suggested_description);
      updateFormData('initGit', !analysis.has_git); // Only init if doesn't have git
    } catch (error) {
      console.error('Failed to analyze project with AI:', error);
      // Fallback to basic analysis if AI fails
      try {
        const basicAnalysis = await invoke<ProjectAnalysisResult>('analyze_project_directory', {
          path: formData.path,
        });
        setAiAnalysis(basicAnalysis);
        updateFormData('name', basicAnalysis.suggested_name);
        updateFormData('description', basicAnalysis.suggested_description);
        updateFormData('initGit', !basicAnalysis.has_git);
      } catch (fallbackError) {
        console.error('Basic analysis also failed:', fallbackError);
        // Show a generic error but continue - user can still fill manually
        setAiAnalysis({
          suggested_name: formData.path.split(/[/\\]/).pop() || 'my-project',
          suggested_description: 'Unable to analyze project automatically. Please fill in the details manually.',
          detected_languages: [],
          detected_frameworks: [],
          file_count: 0,
          has_git: false,
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger analysis when moving to step 3 in existing mode
  useEffect(() => {
    if (mode === 'existing' && currentStep === 3 && !aiAnalysis && formData.agentType) {
      analyzeExistingProject();
    }
  }, [currentStep, mode, formData.agentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    if (!formData.agentType) {
      return;
    }

    try {
      const projectInput: CreateProjectInput = {
        name: formData.name,
        path: formData.path,
        description: formData.description || undefined,
        agentType: formData.agentType,
        initGit: formData.initGit,
      };

      const project = await createProject(projectInput);

      // Navigate to the workspace
      navigate(`/workspace/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      // Error is handled in the store
    }
  };

  const renderStepContent = () => {
    // For existing projects
    if (mode === 'existing') {
      switch (currentStep) {
        case 1:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-2">Add Existing Project</h2>
                <p className="text-base-content/70">
                  Select a folder containing your existing code
                </p>
              </div>

              {/* Project Location */}
              <FolderPicker
                value={formData.path}
                onChange={(path) => updateFormData('path', path)}
                error={errors.path}
                required
                label="Existing Project Folder"
              />

              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Our AI will analyze your project and suggest details automatically</span>
              </div>
            </div>
          );

        case 2:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Choose Your AI Agent</h2>
                <p className="text-base-content/70">
                  Select the AI assistant to help with this project
                </p>
              </div>

              <AgentSelector
                value={formData.agentType}
                onChange={(agent) => updateFormData('agentType', agent)}
                error={errors.agentType}
              />
            </div>
          );

        case 3:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-full ${isAnalyzing ? 'bg-primary/20 animate-pulse' : 'bg-success/20'} flex items-center justify-center`}>
                    {isAnalyzing ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-success" />
                    )}
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {isAnalyzing ? 'Analyzing Project...' : 'Analysis Complete!'}
                </h2>
                <p className="text-base-content/70">
                  {isAnalyzing
                    ? 'AI is examining your project structure, code, and dependencies'
                    : 'Here\'s what we discovered about your project'}
                </p>
              </div>

              {isAnalyzing ? (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-sm text-primary"></span>
                        <span>Scanning files and directories...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-sm text-primary"></span>
                        <span>Detecting languages and frameworks...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-sm text-primary"></span>
                        <span>Analyzing project structure...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-sm text-primary"></span>
                        <span>Generating description...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : aiAnalysis && (
                <div className="space-y-4">
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg mb-4">Project Analysis</h3>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="stat bg-base-300 rounded-lg p-4">
                          <div className="stat-title text-xs">Files Found</div>
                          <div className="stat-value text-2xl">{aiAnalysis.file_count}</div>
                        </div>
                        <div className="stat bg-base-300 rounded-lg p-4">
                          <div className="stat-title text-xs">Git Repository</div>
                          <div className="stat-value text-2xl">{aiAnalysis.has_git ? '✓' : '✗'}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-base-content/60 mb-2">Detected Languages</div>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysis.detected_languages.map(lang => (
                              <div key={lang} className="badge badge-primary">{lang}</div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-base-content/60 mb-2">Detected Frameworks</div>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysis.detected_frameworks.map(fw => (
                              <div key={fw} className="badge badge-secondary">{fw}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-success">
                    <Sparkles className="w-5 h-5" />
                    <span>AI has auto-filled the project details below. Feel free to edit them!</span>
                  </div>
                </div>
              )}
            </div>
          );

        case 4:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-2">Review & Customize</h2>
                <p className="text-base-content/70">
                  Verify AI suggestions and adjust if needed
                </p>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4">Project Details</h3>

                  <div className="space-y-4">
                    {/* Editable Project Name */}
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">
                          Project Name
                          <span className="text-error ml-1">*</span>
                        </span>
                        <span className="label-text-alt badge badge-sm badge-success">AI Suggested</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div className="divider my-2"></div>

                    <div>
                      <div className="text-sm text-base-content/60 mb-1">Location</div>
                      <div className="font-medium font-mono text-sm">{formData.path}</div>
                    </div>

                    <div className="divider my-2"></div>

                    {/* Editable Description */}
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Description</span>
                        <span className="label-text-alt badge badge-sm badge-success">AI Suggested</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        className="textarea textarea-bordered w-full h-24"
                      />
                    </div>

                    <div className="divider my-2"></div>

                    <div>
                      <div className="text-sm text-base-content/60 mb-1">AI Agent</div>
                      <div className="font-medium">
                        {formData.agentType?.split('-').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </div>
                    </div>

                    {!aiAnalysis?.has_git && (
                      <>
                        <div className="divider my-2"></div>
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-3">
                            <input
                              type="checkbox"
                              checked={formData.initGit}
                              onChange={(e) => updateFormData('initGit', e.target.checked)}
                              className="checkbox checkbox-primary"
                            />
                            <div>
                              <span className="label-text font-medium">Initialize Git repository</span>
                              <p className="text-sm text-base-content/60">
                                No git repository detected
                              </p>
                            </div>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    }

    // For new projects (original flow)
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Create New Project</h2>
              <p className="text-base-content/70">
                Let's set up your AI-assisted development workspace
              </p>
            </div>

            {/* Project Name */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">
                  Project Name
                  <span className="text-error ml-1">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="my-awesome-project"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className={`input input-bordered w-full ${
                  errors.name ? 'input-error' : ''
                }`}
                autoFocus
              />
              {errors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.name}</span>
                </label>
              )}
            </div>

            {/* Project Location */}
            <FolderPicker
              value={formData.path}
              onChange={(path) => updateFormData('path', path)}
              error={errors.path}
              required
            />

            {/* Project Description */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Description (Optional)</span>
              </label>
              <textarea
                placeholder="What is this project about?"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="textarea textarea-bordered w-full h-24"
              />
            </div>

            {/* Git Initialization */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.initGit}
                  onChange={(e) => updateFormData('initGit', e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-medium">Initialize Git repository</span>
                  <p className="text-sm text-base-content/60">
                    Recommended for version control and collaboration
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Choose Your AI Agent</h2>
              <p className="text-base-content/70">
                Select the AI assistant that best fits your workflow
              </p>
            </div>

            <AgentSelector
              value={formData.agentType}
              onChange={(agent) => updateFormData('agentType', agent)}
              error={errors.agentType}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-2">Ready to Create</h2>
              <p className="text-base-content/70">
                Review your project configuration
              </p>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">Project Details</h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-base-content/60 mb-1">Project Name</div>
                    <div className="font-medium">{formData.name}</div>
                  </div>

                  <div className="divider my-2"></div>

                  <div>
                    <div className="text-sm text-base-content/60 mb-1">Location</div>
                    <div className="font-medium font-mono text-sm">{formData.path}</div>
                  </div>

                  {formData.description && (
                    <>
                      <div className="divider my-2"></div>
                      <div>
                        <div className="text-sm text-base-content/60 mb-1">Description</div>
                        <div className="text-sm">{formData.description}</div>
                      </div>
                    </>
                  )}

                  <div className="divider my-2"></div>

                  <div>
                    <div className="text-sm text-base-content/60 mb-1">AI Agent</div>
                    <div className="font-medium">
                      {formData.agentType?.split('-').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </div>
                  </div>

                  <div className="divider my-2"></div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.initGit}
                      readOnly
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">Initialize Git repository</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Click "Create Project" to start your AI-assisted development workspace</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-12">
          {STEPS.map((step) => (
            <li
              key={step.id}
              className={`step ${currentStep >= step.id ? 'step-primary' : ''}`}
              data-content={currentStep > step.id ? '✓' : step.id}
            >
              <div className="text-left mt-2">
                <div className="font-medium">{step.label}</div>
                <div className="text-xs text-base-content/60">{step.description}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* Step Content */}
        <form onSubmit={handleSubmit}>
          <div className="mb-8">{renderStepContent()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-base-300">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="btn btn-ghost gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-sm text-base-content/60">
              Step {currentStep} of {STEPS.length}
            </div>

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
