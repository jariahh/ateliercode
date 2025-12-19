/**
 * PluginSettingsModal - Modal for configuring plugin CLI flags
 */

import { useState, useEffect } from 'react';
import { X, Settings, Save, RotateCcw } from 'lucide-react';
import * as pluginSettingsApi from '../../api/pluginSettings';
import type { PluginFlag, FlagOption } from '../../api/pluginSettings';

interface PluginSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginName: string;
  pluginDisplayName: string;
  flags: PluginFlag[];
}

export default function PluginSettingsModal({
  isOpen,
  onClose,
  pluginName,
  pluginDisplayName,
  flags,
}: PluginSettingsModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current settings
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, pluginName]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await pluginSettingsApi.getPluginSettings(pluginName);

      // Initialize with defaults, then overlay saved values
      const initialValues: Record<string, string> = {};
      for (const flag of flags) {
        initialValues[flag.id] = settings.flags[flag.id] ?? flag.default_value;
      }
      setValues(initialValues);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load plugin settings:', error);
      // Use defaults on error
      const defaults: Record<string, string> = {};
      for (const flag of flags) {
        defaults[flag.id] = flag.default_value;
      }
      setValues(defaults);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (flagId: string, value: string) => {
    setValues(prev => ({ ...prev, [flagId]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await pluginSettingsApi.setPluginSettings(pluginName, values);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save plugin settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaults: Record<string, string> = {};
    for (const flag of flags) {
      defaults[flag.id] = flag.default_value;
    }
    setValues(defaults);
    setHasChanges(true);
  };

  // Group flags by category
  const groupedFlags = flags.reduce((acc, flag) => {
    const category = flag.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(flag);
    return acc;
  }, {} as Record<string, PluginFlag[]>);

  const renderFlagInput = (flag: PluginFlag) => {
    const currentValue = values[flag.id] ?? flag.default_value;

    switch (flag.flag_type) {
      case 'toggle':
        return (
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={currentValue === 'true'}
            onChange={(e) => handleChange(flag.id, e.target.checked ? 'true' : 'false')}
          />
        );

      case 'select':
        return (
          <select
            className="select select-bordered select-sm w-full max-w-xs"
            value={currentValue}
            onChange={(e) => handleChange(flag.id, e.target.value)}
          >
            {flag.options.map((option: FlagOption) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'string':
      default:
        return (
          <input
            type="text"
            className="input input-bordered input-sm w-full max-w-xs"
            value={currentValue}
            onChange={(e) => handleChange(flag.id, e.target.value)}
            placeholder={flag.default_value}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          {pluginDisplayName} Settings
        </h3>

        <p className="text-sm text-base-content/70 mb-4">
          Configure CLI flags for {pluginDisplayName}. These settings affect how the agent behaves.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold uppercase text-base-content/50 mb-3">
                  {category}
                </h4>
                <div className="space-y-4">
                  {categoryFlags.map((flag) => (
                    <div key={flag.id} className="form-control">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="label py-0">
                            <span className="label-text font-medium">{flag.label}</span>
                          </label>
                          <p className="text-xs text-base-content/60 mt-0.5">
                            {flag.description}
                          </p>
                          {flag.flag_type === 'select' && values[flag.id] && (
                            <p className="text-xs text-base-content/40 mt-1 font-mono">
                              {flag.flag} {values[flag.id]}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          {renderFlagInput(flag)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {flags.length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                <Settings className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No configurable settings available</p>
              </div>
            )}
          </div>
        )}

        <div className="modal-action flex justify-between">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleReset}
            disabled={isLoading || isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}
