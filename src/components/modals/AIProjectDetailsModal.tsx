import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

export interface AIProjectDetails {
  name: string;
  description: string;
}

export interface AIProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (details: AIProjectDetails) => void;
  initialDetails: AIProjectDetails;
  isLoading?: boolean;
}

export default function AIProjectDetailsModal({
  isOpen,
  onClose,
  onApply,
  initialDetails,
  isLoading = false,
}: AIProjectDetailsModalProps) {
  const [name, setName] = useState(initialDetails.name || '');
  const [description, setDescription] = useState(initialDetails.description || '');

  // Update form fields when initialDetails changes
  useEffect(() => {
    setName(initialDetails.name || '');
    setDescription(initialDetails.description || '');
  }, [initialDetails]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ name, description });
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">AI-Generated Project Details</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/70">Analyzing project files...</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-base-content/70 mb-6">
              Review and edit the AI-generated project name and description before applying.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Project Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project description"
                />
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={onClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="btn btn-primary gap-2"
                disabled={!name.trim()}
              >
                <Sparkles className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
