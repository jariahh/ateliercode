import { create } from 'zustand';
import type { MachineInfo } from '../services/serverConnection';
import { isWeb } from '../lib/platform';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated';

// Special machine ID for cloud/web mode
export const CLOUD_MACHINE_ID = 'cloud';

interface MachineState {
  // Connection to central server
  connectionState: ConnectionState;
  localMachineId: string | null;

  // Available machines
  machines: MachineInfo[];

  // Currently selected remote machine (null = local, 'cloud' = web mode)
  selectedMachineId: string | null;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setLocalMachineId: (id: string | null) => void;
  setMachines: (machines: MachineInfo[]) => void;
  updateMachineStatus: (machineId: string, isOnline: boolean) => void;
  selectMachine: (machineId: string | null) => void;

  // Computed
  isRemoteMode: () => boolean;
  isCloudMode: () => boolean;
  isWebWithoutMachine: () => boolean;
  getSelectedMachine: () => MachineInfo | null;
  getOnlineMachines: () => MachineInfo[];
}

export const useMachineStore = create<MachineState>()((set, get) => ({
  connectionState: 'disconnected',
  localMachineId: null,
  machines: [],
  selectedMachineId: null,

  setConnectionState: (connectionState) => set({ connectionState }),

  setLocalMachineId: (localMachineId) => set({ localMachineId }),

  setMachines: (machines) => set({ machines }),

  updateMachineStatus: (machineId, isOnline) =>
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, isOnline, lastSeen: new Date() } : m
      ),
    })),

  selectMachine: (selectedMachineId) => set({ selectedMachineId }),

  isRemoteMode: () => {
    const { selectedMachineId, localMachineId } = get();
    return selectedMachineId !== null && selectedMachineId !== localMachineId;
  },

  isCloudMode: () => {
    const { selectedMachineId } = get();
    return selectedMachineId === CLOUD_MACHINE_ID || isWeb();
  },

  isWebWithoutMachine: () => {
    const { selectedMachineId } = get();
    // In web mode with no machine selected (or cloud selected but no real machine)
    return isWeb() && (selectedMachineId === null || selectedMachineId === CLOUD_MACHINE_ID);
  },

  getSelectedMachine: () => {
    const { selectedMachineId, machines } = get();
    if (!selectedMachineId || selectedMachineId === CLOUD_MACHINE_ID) return null;
    return machines.find((m) => m.id === selectedMachineId) || null;
  },

  getOnlineMachines: () => {
    const { machines } = get();
    return machines.filter((m) => m.isOnline);
  },
}));
