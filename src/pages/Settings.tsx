import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Mic, Key, Download, Check, Loader2, AlertCircle, ChevronRight, Globe, Monitor, Wifi, WifiOff, LogIn, UserPlus } from 'lucide-react';
import { useSettingsStore, type WhisperModel } from '../stores/settingsStore';
import { useMachineStore } from '../stores/machineStore';
import { serverConnection } from '../services/serverConnection';
import { invoke } from '@tauri-apps/api/core';

// Fetch hostname from system
async function getSystemHostname(): Promise<string> {
  try {
    return await invoke<string>('get_hostname');
  } catch {
    return 'My Machine';
  }
}

export default function Settings() {
  const {
    whisper,
    server,
    setWhisperProvider,
    setOpenAIApiKey,
    setLocalModel,
    setLocalInstalled,
    setLocalModelDownloaded,
    setServerEnabled,
    setServerUrl,
    setMachineName,
    isWhisperConfigured,
  } = useSettingsStore();

  const { connectionState, machines } = useMachineStore();

  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Server connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Auto-populate machine name from system hostname
  useEffect(() => {
    if (!server.machineName) {
      getSystemHostname().then((hostname) => {
        setMachineName(hostname);
      });
    }
  }, [server.machineName, setMachineName]);

  // Check if local Whisper is installed
  const checkLocalWhisper = async () => {
    setIsCheckingLocal(true);
    setError(null);

    try {
      const result = await invoke<{ installed: boolean; model_downloaded: boolean }>('check_whisper_installation');
      setLocalInstalled(result.installed);
      setLocalModelDownloaded(result.model_downloaded);

      if (!result.installed) {
        setError('Whisper is not installed. Click "Install Whisper" to set it up.');
      }
    } catch (err) {
      console.error('Failed to check Whisper installation:', err);
      setError('Failed to check Whisper installation. Please try again.');
    } finally {
      setIsCheckingLocal(false);
    }
  };

  // Install local Whisper
  const installLocalWhisper = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      // TODO: Implement actual installation via Tauri command
      // This would run: pip install openai-whisper
      await invoke('install_whisper', {
        model: whisper.localModel,
        onProgress: (progress: number) => setDownloadProgress(progress),
      });

      setLocalInstalled(true);
      setLocalModelDownloaded(true);
    } catch (err) {
      console.error('Failed to install Whisper:', err);
      setError('Failed to install Whisper. Please ensure Python is installed and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Connect to server
  const handleConnect = async () => {
    if (!server.url) {
      setServerError('Please enter a server URL');
      return;
    }

    setIsConnecting(true);
    setServerError(null);

    try {
      const connected = await serverConnection.connect(server.url);
      if (!connected) {
        setServerError('Could not connect to server. Check the URL and try again.');
        return;
      }

      // If we have a token, try to authenticate
      if (server.token) {
        const result = await serverConnection.loginWithToken(server.token);
        if (result.success) {
          if (server.machineName) {
            await serverConnection.registerMachine(server.machineName);
          }
          const machineList = await serverConnection.listMachines();
          useMachineStore.getState().setMachines(machineList);
        }
      }
    } catch (err) {
      console.error('Connection error:', err);
      setServerError('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Authenticate (login or register)
  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      setServerError('Please enter email and password');
      return;
    }

    if (authMode === 'register' && !authUsername) {
      setServerError('Please enter a username');
      return;
    }

    setIsConnecting(true);
    setServerError(null);

    try {
      const result = authMode === 'login'
        ? await serverConnection.login(authEmail, authPassword)
        : await serverConnection.register(authEmail, authUsername, authPassword);

      if (!result.success) {
        setServerError(result.error || 'Authentication failed');
        return;
      }

      // Auto-register this machine
      let machineName = server.machineName;
      if (!machineName) {
        machineName = await getSystemHostname();
        setMachineName(machineName);
      }
      await serverConnection.registerMachine(machineName);

      const machineList = await serverConnection.listMachines();
      useMachineStore.getState().setMachines(machineList);

      setAuthEmail('');
      setAuthUsername('');
      setAuthPassword('');
    } catch (err) {
      console.error('Auth error:', err);
      setServerError('Authentication failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from server
  const handleDisconnect = () => {
    serverConnection.disconnect();
    useMachineStore.getState().setMachines([]);
    // Clear the token so auto-reconnect doesn't happen
    useSettingsStore.getState().setServerToken('');
  };

  // Model size descriptions
  const modelDescriptions: Record<WhisperModel, { size: string; speed: string; accuracy: string }> = {
    tiny: { size: '~39 MB', speed: 'Fastest', accuracy: 'Basic' },
    base: { size: '~74 MB', speed: 'Fast', accuracy: 'Good' },
    small: { size: '~244 MB', speed: 'Medium', accuracy: 'Better' },
    medium: { size: '~769 MB', speed: 'Slow', accuracy: 'Great' },
    large: { size: '~1.5 GB', speed: 'Slowest', accuracy: 'Best' },
  };

  const isServerConnected = connectionState === 'connected' || connectionState === 'authenticated';
  const isAuthenticated = connectionState === 'authenticated';

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-base-content/60">Configure AtelierCode preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Multi-Machine Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Multi-Machine Access</h2>
            <span className="badge badge-sm badge-outline">Beta</span>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <p className="text-sm text-base-content/70 mb-4">
                Connect to the AtelierCode server to access your projects from multiple machines.
                This feature is optional - the app works fully offline without it.
              </p>

              {/* Enable Toggle */}
              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    checked={server.enabled}
                    onChange={(e) => setServerEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                  <div>
                    <span className="label-text font-medium">Enable Multi-Machine Access</span>
                    <p className="text-xs text-base-content/60">Connect to remote machines via WebRTC</p>
                  </div>
                </label>
              </div>

              {server.enabled && (
                <>
                  {/* Server URL */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Server URL</span>
                    </label>
                    <input
                      type="text"
                      value={server.url}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="wss://ateliercode.ai"
                      className="input input-bordered w-full"
                      disabled={isServerConnected}
                    />
                  </div>

                  {/* Machine Name */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Machine Name</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <Monitor className="w-5 h-5 text-base-content/60" />
                      <input
                        type="text"
                        value={server.machineName}
                        onChange={(e) => setMachineName(e.target.value)}
                        placeholder="My Desktop PC"
                        className="input input-bordered flex-1"
                      />
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="bg-base-300/50 rounded-lg p-4">
                    {!isServerConnected ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <WifiOff className="w-4 h-4 text-base-content/60" />
                          <span className="font-medium">Not Connected</span>
                        </div>
                        <button
                          onClick={handleConnect}
                          disabled={isConnecting || !server.url}
                          className="btn btn-primary btn-sm gap-2"
                        >
                          {isConnecting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</>
                          ) : (
                            <><Wifi className="w-4 h-4" />Connect to Server</>
                          )}
                        </button>
                      </>
                    ) : !isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <Wifi className="w-4 h-4 text-success" />
                          <span className="font-medium">Connected - Sign In Required</span>
                        </div>
                        <div className="tabs tabs-boxed mb-4 w-fit">
                          <button className={`tab ${authMode === 'login' ? 'tab-active' : ''}`} onClick={() => setAuthMode('login')}>
                            <LogIn className="w-4 h-4 mr-1" />Sign In
                          </button>
                          <button className={`tab ${authMode === 'register' ? 'tab-active' : ''}`} onClick={() => setAuthMode('register')}>
                            <UserPlus className="w-4 h-4 mr-1" />Register
                          </button>
                        </div>
                        <div className="space-y-3">
                          <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" className="input input-bordered input-sm w-full" />
                          {authMode === 'register' && (
                            <input type="text" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Username" className="input input-bordered input-sm w-full" />
                          )}
                          <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="input input-bordered input-sm w-full" />
                          <div className="flex gap-2">
                            <button onClick={handleAuth} disabled={isConnecting} className="btn btn-primary btn-sm">
                              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                            <button onClick={handleDisconnect} className="btn btn-ghost btn-sm">Disconnect</button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <Wifi className="w-4 h-4 text-success" />
                          <span className="font-medium text-success">Connected & Authenticated</span>
                        </div>
                        {machines.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-base-content/70 mb-2">Your Machines:</p>
                            <div className="flex flex-wrap gap-2">
                              {machines.map((machine) => (
                                <div key={machine.id} className={`badge ${machine.isOnline ? 'badge-success' : 'badge-ghost'} gap-1`}>
                                  <Monitor className="w-3 h-3" />{machine.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <button onClick={handleDisconnect} className="btn btn-ghost btn-sm">Disconnect</button>
                      </>
                    )}
                  </div>

                  {serverError && (
                    <div className="alert alert-error mt-4">
                      <AlertCircle className="w-5 h-5" /><span>{serverError}</span>
                    </div>
                  )}
                </>
              )}

              <div className="divider"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">Connection Status</span>
                {!server.enabled ? (
                  <div className="badge badge-ghost gap-1">Disabled</div>
                ) : isAuthenticated ? (
                  <div className="badge badge-success gap-1"><Wifi className="w-3 h-3" />Online</div>
                ) : isServerConnected ? (
                  <div className="badge badge-warning gap-1"><AlertCircle className="w-3 h-3" />Sign In Required</div>
                ) : (
                  <div className="badge badge-ghost gap-1"><WifiOff className="w-3 h-3" />Offline</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Voice Transcription Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Voice Transcription</h2>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <p className="text-sm text-base-content/70 mb-4">
                Configure how voice recordings are transcribed to text. You can use OpenAI's Whisper API
                (requires API key) or run Whisper locally on your machine (requires Python).
              </p>

              {/* Provider Selection */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-medium">Transcription Provider</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* None */}
                  <button
                    onClick={() => setWhisperProvider('none')}
                    className={`btn btn-outline justify-start h-auto py-4 ${
                      whisper.provider === 'none' ? 'btn-primary' : ''
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium">Disabled</div>
                      <div className="text-xs opacity-70">Voice input off</div>
                    </div>
                  </button>

                  {/* OpenAI API */}
                  <button
                    onClick={() => setWhisperProvider('openai')}
                    className={`btn btn-outline justify-start h-auto py-4 ${
                      whisper.provider === 'openai' ? 'btn-primary' : ''
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium">OpenAI API</div>
                      <div className="text-xs opacity-70">Fast, requires API key</div>
                    </div>
                  </button>

                  {/* Local */}
                  <button
                    onClick={() => setWhisperProvider('local')}
                    className={`btn btn-outline justify-start h-auto py-4 ${
                      whisper.provider === 'local' ? 'btn-primary' : ''
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium">Local (Python)</div>
                      <div className="text-xs opacity-70">Free, runs on your PC</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* OpenAI API Settings */}
              {whisper.provider === 'openai' && (
                <div className="bg-base-300/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="font-medium">OpenAI API Configuration</span>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">API Key</span>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-text-alt link link-primary"
                      >
                        Get API Key
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={whisper.openaiApiKey}
                        onChange={(e) => setOpenAIApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="input input-bordered w-full pr-20"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn btn-ghost btn-sm absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        {showApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Your API key is stored locally and never sent to our servers.
                      </span>
                    </label>
                  </div>

                  {whisper.openaiApiKey && (
                    <div className="flex items-center gap-2 mt-2 text-success">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">API key configured</span>
                    </div>
                  )}
                </div>
              )}

              {/* Local Whisper Settings */}
              {whisper.provider === 'local' && (
                <div className="bg-base-300/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Download className="w-4 h-4 text-primary" />
                    <span className="font-medium">Local Whisper Configuration</span>
                  </div>

                  {/* Model Selection */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Model Size</span>
                    </label>
                    <select
                      value={whisper.localModel}
                      onChange={(e) => setLocalModel(e.target.value as WhisperModel)}
                      className="select select-bordered w-full"
                    >
                      {Object.entries(modelDescriptions).map(([model, desc]) => (
                        <option key={model} value={model}>
                          {model.charAt(0).toUpperCase() + model.slice(1)} - {desc.size} ({desc.speed}, {desc.accuracy})
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Larger models are more accurate but slower and use more memory.
                      </span>
                    </label>
                  </div>

                  {/* Installation Status */}
                  <div className="flex flex-col gap-3">
                    {whisper.localInstalled && whisper.localModelDownloaded ? (
                      <div className="flex items-center gap-2 text-success">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Whisper is installed and ready</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={checkLocalWhisper}
                            disabled={isCheckingLocal}
                            className="btn btn-sm btn-outline gap-2"
                          >
                            {isCheckingLocal ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-4 h-4" />
                                Check Installation
                              </>
                            )}
                          </button>

                          <button
                            onClick={installLocalWhisper}
                            disabled={isDownloading}
                            className="btn btn-sm btn-primary gap-2"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Installing... {downloadProgress}%
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Install Whisper
                              </>
                            )}
                          </button>
                        </div>

                        {isDownloading && (
                          <progress
                            className="progress progress-primary w-full"
                            value={downloadProgress}
                            max="100"
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-base-content/60">
                    <p>Requirements:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Python 3.8 or higher</li>
                      <li>FFmpeg (for audio processing)</li>
                      <li>~{modelDescriptions[whisper.localModel].size} disk space</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Status Indicator */}
              <div className="divider"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">Voice Input Status</span>
                {isWhisperConfigured() ? (
                  <div className="badge badge-success gap-1">
                    <Check className="w-3 h-3" />
                    Ready
                  </div>
                ) : (
                  <div className="badge badge-warning gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Not Configured
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
