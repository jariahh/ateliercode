import { LogOut, Monitor, Globe } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useMachineStore } from '../stores/machineStore';
import { isWeb } from '../lib/platform';

export default function UserIndicator() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const connectionState = useMachineStore((state) => state.connectionState);
  const webMode = isWeb();

  // In web mode, show auth status
  // In desktop mode, show connection status to server
  const isConnected = webMode ? isAuthenticated : connectionState === 'authenticated';
  const displayName = user?.name || user?.email || 'Unknown User';

  if (!isConnected) {
    return null;
  }

  return (
    <div className="fixed top-3 right-4 z-50">
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors cursor-pointer"
        >
          {/* Platform indicator */}
          {webMode ? (
            <Globe className="w-4 h-4 text-info" />
          ) : (
            <Monitor className="w-4 h-4 text-success" />
          )}

          {/* User info */}
          <span className="text-sm font-medium max-w-32 truncate">
            {displayName}
          </span>

          {/* Status dot */}
          <span className="w-2 h-2 rounded-full bg-success" />
        </div>

        {/* Dropdown menu */}
        <ul
          tabIndex={0}
          className="dropdown-content z-50 mt-2 p-2 shadow-lg bg-base-200 border border-base-300 rounded-lg w-52"
        >
          <li className="px-3 py-2 text-xs text-base-content/60">
            {webMode ? 'Web Client' : 'Desktop App'}
          </li>
          {user?.email && (
            <li className="px-3 py-1 text-sm truncate">
              {user.email}
            </li>
          )}
          <li className="divider my-1"></li>
          <li>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded-lg transition-colors text-error"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
