import { useState, useRef, useEffect } from 'react';
import { Monitor, ChevronDown, Wifi, WifiOff, Cloud, CloudOff, Globe } from 'lucide-react';
import { useMachineStore, CLOUD_MACHINE_ID } from '../stores/machineStore';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import { serverConnection } from '../services/serverConnection';
import { peerConnection } from '../services/peerConnection';
import { switchToWebRTCBackend, switchToTauriBackend, isTauriAvailable } from '../services/backend';

// More reliable Tauri detection - check multiple indicators for Tauri v1 and v2
function isDefinitelyTauri(): boolean {
  if (typeof window === 'undefined') return false;
  // Tauri v2 uses __TAURI_INTERNALS__
  if ('__TAURI_INTERNALS__' in window) return true;
  // Tauri v1 uses __TAURI__
  if ('__TAURI__' in window) return true;
  // Check using backend detection
  return isTauriAvailable();
}
import { isWeb } from '../lib/platform';

interface MachineSelectorProps {
  isCollapsed: boolean;
}

export default function MachineSelector({ isCollapsed }: MachineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const connectionState = useMachineStore((state) => state.connectionState);
  const machines = useMachineStore((state) => state.machines);
  const selectedMachineId = useMachineStore((state) => state.selectedMachineId);
  const localMachineId = useMachineStore((state) => state.localMachineId);
  const selectMachine = useMachineStore((state) => state.selectMachine);

  const { isAuthenticated } = useAuthStore();
  const loadProjects = useProjectStore((state) => state.loadProjects);
  // Use more reliable detection - if Tauri is available, we're NOT in web mode
  const tauriAvailable = isDefinitelyTauri();
  const webMode = !tauriAvailable;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // In Tauri mode, always show (local machine is always available)
  // In web mode, always show (to prompt sign in or show machines)

  // In web mode, show even if not authenticated (will show "Sign in to see machines")
  const isCloudSelected = selectedMachineId === CLOUD_MACHINE_ID;

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);
  const isLocalSelected = !selectedMachineId || selectedMachineId === localMachineId;

  const handleSelectMachine = async (machineId: string | null) => {
    selectMachine(machineId);
    setIsOpen(false);

    // If selecting a remote machine, initiate WebRTC connection
    if (machineId && machineId !== localMachineId && machineId !== CLOUD_MACHINE_ID) {
      try {
        console.log('[MachineSelector] Connecting to remote machine:', machineId);
        const connected = await peerConnection.connect(machineId);

        if (connected) {
          console.log('[MachineSelector] WebRTC connected, switching backend');
          switchToWebRTCBackend();
          // Reload projects from the remote machine
          await loadProjects();
        } else {
          console.error('[MachineSelector] Failed to connect to remote machine');
        }
      } catch (error) {
        console.error('[MachineSelector] Connection error:', error);
      }
    } else if (!machineId || machineId === localMachineId) {
      // Switching back to local machine
      if (isTauriAvailable()) {
        console.log('[MachineSelector] Switching to local Tauri backend');
        switchToTauriBackend();
        await loadProjects();
      }
    }
  };

  // Platform icon based on OS
  const getPlatformIcon = (platform: 'windows' | 'macos' | 'linux') => {
    switch (platform) {
      case 'windows':
        return '🪟';
      case 'macos':
        return '🍎';
      case 'linux':
        return '🐧';
      default:
        return '💻';
    }
  };

  if (isCollapsed) {
    // Collapsed state - just show icon with connection indicator
    return (
      <div className="p-2">
        <div
          className="relative flex items-center justify-center p-2 rounded-lg bg-base-300 cursor-pointer hover:bg-base-300/80"
          onClick={() => setIsOpen(!isOpen)}
          title={isLocalSelected ? 'Local Machine' : selectedMachine?.name || 'Select Machine'}
        >
          <Monitor className="w-5 h-5" />
          {/* Connection status dot */}
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              isLocalSelected ? 'bg-success' : selectedMachine?.isOnline ? 'bg-info' : 'bg-warning'
            }`}
          />
        </div>

        {/* Collapsed dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-20 top-2 z-50 bg-base-200 border border-base-300 rounded-lg shadow-xl min-w-64"
          >
            <MachineList
              machines={machines}
              localMachineId={localMachineId}
              selectedMachineId={selectedMachineId}
              onSelect={handleSelectMachine}
              getPlatformIcon={getPlatformIcon}
            />
          </div>
        )}
      </div>
    );
  }

  // Expanded state - full dropdown
  return (
    <div className="p-2" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-base-300 hover:bg-base-300/80 transition-colors"
      >
        {/* Machine Icon */}
        <div className="relative">
          {webMode && isCloudSelected ? (
            <Globe className="w-5 h-5 text-primary" />
          ) : isLocalSelected ? (
            <Monitor className="w-5 h-5" />
          ) : (
            <Cloud className="w-5 h-5 text-info" />
          )}
        </div>

        {/* Machine Name */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">
            {webMode && isCloudSelected
              ? 'Cloud'
              : isLocalSelected
                ? 'This Machine'
                : selectedMachine?.name || 'Select Machine'}
          </div>
          <div className="text-xs text-base-content/60 truncate">
            {webMode && isCloudSelected ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Select a machine
              </span>
            ) : isLocalSelected ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                Local
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {selectedMachine?.isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-success" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-warning" />
                    Offline
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-2 right-2 mt-1 z-50 bg-base-200 border border-base-300 rounded-lg shadow-xl">
          <MachineList
            machines={machines}
            localMachineId={localMachineId}
            selectedMachineId={selectedMachineId}
            onSelect={handleSelectMachine}
            getPlatformIcon={getPlatformIcon}
            webMode={webMode}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )}
    </div>
  );
}

// Reusable machine list component
interface MachineListProps {
  machines: Array<{
    id: string;
    name: string;
    platform: 'windows' | 'macos' | 'linux';
    isOnline: boolean;
    isOwn: boolean;
  }>;
  localMachineId: string | null;
  selectedMachineId: string | null;
  onSelect: (machineId: string | null) => void;
  getPlatformIcon: (platform: 'windows' | 'macos' | 'linux') => string;
  webMode?: boolean;
  isAuthenticated?: boolean;
}

function MachineList({
  machines,
  localMachineId,
  selectedMachineId,
  onSelect,
  getPlatformIcon,
  webMode = false,
  isAuthenticated = false,
}: MachineListProps) {
  const isLocalSelected = !selectedMachineId || selectedMachineId === localMachineId;
  // Filter out local machine from remote list - but only if localMachineId is set
  const remoteMachines = localMachineId
    ? machines.filter((m) => m.id !== localMachineId)
    : machines;

  console.log('[MachineList] localMachineId:', localMachineId, 'selectedMachineId:', selectedMachineId, 'machines:', machines.length, 'remoteMachines:', remoteMachines.length);

  // In web mode and not authenticated, show sign in prompt
  if (webMode && !isAuthenticated) {
    return (
      <div className="py-1">
        <div className="px-3 py-4 text-center text-sm text-base-content/60">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Sign in to see your machines</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Header */}
      <div className="px-3 py-2 text-xs font-semibold text-base-content/60 uppercase tracking-wider">
        {webMode ? 'Select Machine' : 'My Machines'}
      </div>

      {/* Local Machine Option - only show in Tauri mode */}
      {!webMode && (
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-base-300 transition-colors ${
            isLocalSelected ? 'bg-base-300' : ''
          }`}
        >
          <Monitor className="w-5 h-5" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">This Machine</div>
            <div className="text-xs text-base-content/60">Local</div>
          </div>
          <span className="w-2 h-2 rounded-full bg-success" />
        </button>
      )}

      {/* Divider */}
      {!webMode && remoteMachines.length > 0 && <div className="divider my-1 px-3" />}

      {/* Remote Machines */}
      {remoteMachines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => onSelect(machine.id)}
            disabled={!machine.isOnline}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-base-300 transition-colors ${
              selectedMachineId === machine.id ? 'bg-base-300' : ''
            } ${!machine.isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Platform Icon */}
            <span className="text-lg">{getPlatformIcon(machine.platform)}</span>

            {/* Machine Info */}
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">{machine.name}</div>
              <div className="text-xs text-base-content/60 flex items-center gap-1">
                {machine.isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-success" />
                    Online
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3 h-3 text-warning" />
                    Offline
                  </>
                )}
              </div>
            </div>

            {/* Selection indicator */}
            {selectedMachineId === machine.id && (
              <span className="w-2 h-2 rounded-full bg-info" />
            )}
          </button>
        ))}

      {/* Empty State */}
      {remoteMachines.length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-base-content/60">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{webMode ? 'No machines online' : 'No other machines registered'}</p>
          <p className="text-xs mt-1">
            {webMode
              ? 'Start AtelierCode on a machine to connect'
              : 'Run AtelierCode on another device to connect'}
          </p>
        </div>
      )}
    </div>
  );
}
