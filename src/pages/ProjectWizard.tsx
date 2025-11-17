import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import type { AgentType, CreateProjectInput } from '../types/project';
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

const STEPS = [
  { id: 1, label: 'Basic Info', description: 'Project name and location' },
  { id: 2, label: 'AI Agent', description: 'Choose your assistant' },
  { id: 3, label: 'Review', description: 'Confirm and create' },
];

export default function ProjectWizard() {
  const navigate = useNavigate();
  const createProject = useProjectStore((state) => state.createProject);
  const isLoading = useProjectStore((state) => state.isLoading);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    path: '',
    description: '',
    agentType: null,
    initGit: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

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
