import { LogIn, X, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function AuthDialog() {
  const {
    showAuthDialog,
    setShowAuthDialog,
    login,
    error,
    setError,
  } = useAuthStore();

  const handleLogin = () => {
    setError(null);
    login();
  };

  const handleClose = () => {
    setShowAuthDialog(false);
    setError(null);
  };

  if (!showAuthDialog) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button
          onClick={handleClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h3 className="font-bold text-xl">Sign in to AtelierCode</h3>
          <p className="text-base-content/60 mt-2">
            Connect to your machines from anywhere
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="btn btn-primary w-full"
        >
          <LogIn className="w-4 h-4" />
          Sign In with AtelierCode
        </button>

        <div className="divider text-xs text-base-content/40">OR</div>

        <button
          type="button"
          onClick={handleClose}
          className="btn btn-ghost btn-sm w-full"
        >
          Continue without signing in
        </button>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={handleClose} />
    </div>
  );
}
