import { useState, useRef, useEffect } from 'react';
import { Monitor, ChevronDown, Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useMachineStore } from '../stores/machineStore';
import { serverConnection } from '../services/serverConnection';

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

  // Don't render if not connected to server
  if (connectionState !== 'authenticated') {
    return null;
  }

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);
  const isLocalSelected = !selectedMachineId || selectedMachineId === localMachineId;

  const handleSelectMachine = (machineId: string | null) => {
    selectMachine(machineId);
    setIsOpen(false);

    // If selecting a remote machine, initiate connection
    if (machineId && machineId !== localMachineId) {
      serverConnection.connectToMachine(machineId);
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
          {isLocalSelected ? (
            <Monitor className="w-5 h-5" />
          ) : (
            <Cloud className="w-5 h-5 text-info" />
          )}
        </div>

        {/* Machine Name */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">
            {isLocalSelected ? 'This Machine' : selectedMachine?.name || 'Select Machine'}
          </div>
          <div className="text-xs text-base-content/60 truncate">
            {isLocalSelected ? (
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
}

function MachineList({
  machines,
  localMachineId,
  selectedMachineId,
  onSelect,
  getPlatformIcon,
}: MachineListProps) {
  const isLocalSelected = !selectedMachineId || selectedMachineId === localMachineId;

  return (
    <div className="py-1">
      {/* Header */}
      <div className="px-3 py-2 text-xs font-semibold text-base-content/60 uppercase tracking-wider">
        My Machines
      </div>

      {/* Local Machine Option */}
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

      {/* Divider */}
      {machines.length > 0 && <div className="divider my-1 px-3" />}

      {/* Remote Machines */}
      {machines
        .filter((m) => m.id !== localMachineId)
        .map((machine) => (
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
      {machines.filter((m) => m.id !== localMachineId).length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-base-content/60">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No other machines registered</p>
          <p className="text-xs mt-1">
            Run AtelierCode on another device to connect
          </p>
        </div>
      )}
    </div>
  );
}
