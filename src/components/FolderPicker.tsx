import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import * as tauriApi from '../lib/tauri';

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
      if (tauriApi.isTauriAvailable()) {
        // Use Tauri native folder picker
        const selected = await tauriApi.selectFolder();

        if (selected) {
          onChange(selected);
        }
        // If null, user cancelled - do nothing
      } else {
        // Browser dev mode - show alert
        alert('Folder picker requires Tauri. Please run in app mode or type the path manually.');
      }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
      alert('Failed to open folder picker. Please type the path manually.');
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
