import { useState } from 'react';
import { FolderOpen } from 'lucide-react';

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export default function FolderPicker({
  value,
  onChange,
  label = 'Project Location',
  placeholder = 'Select a folder...',
  error,
  required = false,
}: FolderPickerProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleBrowse = async () => {
    setIsSelecting(true);

    try {
      // TODO: Replace with actual Tauri dialog API call
      // const selected = await open({
      //   directory: true,
      //   multiple: false,
      //   title: 'Select Project Folder',
      // });

      // Mock implementation for now
      // In production, this will open the native file picker
      const mockPath = 'C:\\Users\\YourName\\Projects\\my-new-project';

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 300));

      // For now, just show an alert
      alert('Folder picker will use Tauri dialog API. For now, please type the path manually.');

      // Uncomment when Tauri backend is ready:
      // if (selected && typeof selected === 'string') {
      //   onChange(selected);
      // }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-medium">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="join w-full">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input input-bordered join-item flex-1 ${
            error ? 'input-error' : ''
          }`}
          required={required}
        />
        <button
          type="button"
          onClick={handleBrowse}
          disabled={isSelecting}
          className="btn btn-primary join-item"
        >
          <FolderOpen className="w-4 h-4" />
          {isSelecting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            'Browse'
          )}
        </button>
      </div>

      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}

      <label className="label">
        <span className="label-text-alt text-base-content/60">
          Choose where to create your project
        </span>
      </label>
    </div>
  );
}
