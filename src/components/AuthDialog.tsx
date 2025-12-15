import { useState } from 'react';
import { X, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function AuthDialog() {
  const {
    showAuthDialog,
    setShowAuthDialog,
    login,
    isLoading,
    error,
    setError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    await login(email, password);
  };

  const handleClose = () => {
    setShowAuthDialog(false);
    setError(null);
    setEmail('');
    setPassword('');
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input input-bordered w-full"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input input-bordered w-full"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="divider text-xs text-base-content/40">OR</div>

        <button
          type="button"
          onClick={handleClose}
          className="btn btn-ghost btn-sm w-full"
        >
          Continue without signing in
        </button>

        <p className="text-center text-sm text-base-content/60 mt-4">
          Don't have an account?{' '}
          <a
            href="https://ateliercode.dev/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Sign up
          </a>
        </p>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={handleClose} />
    </div>
  );
}
