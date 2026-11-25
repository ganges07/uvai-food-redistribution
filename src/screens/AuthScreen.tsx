import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button, Input } from '@/components/ui';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        setError(error);
      } else {
        setMode('login');
        setPassword('');
        setSuccess('Account created! Please sign in.');
      }
    }
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess('Password reset email sent! Check your inbox.');
      setShowReset(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/30 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v6m3-3v6m3-6v6m3-3v6m-9 6h12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">UVAI</h1>
          <p className="text-sm text-orange-600 font-medium">Unified Volunteer-Assisted Initiative</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 p-6 border border-gray-50">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); setShowReset(false); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login' && !showReset ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); setShowReset(false); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'signup' && !showReset ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600">{error}</div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-orange-50 text-orange-700">{success}</div>
          )}

          {showReset ? (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-gray-500">Enter your email to receive a password reset link.</p>
              <Input label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
              <Button fullWidth type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-sm text-orange-600 font-medium hover:underline block mx-auto"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <Input label="Full Name" value={fullName} onChange={setFullName} required placeholder="John Doe" />
                  <Input label="Phone Number (optional)" value={phone} onChange={setPhone} type="tel" placeholder="+1 234 567 890" />
                </>
              )}
              <Input label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
              <Input label="Password" type="password" value={password} onChange={setPassword} required placeholder="Minimum 6 characters" />
              <Button fullWidth type="submit" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setError(null); setSuccess(null); }}
                  className="text-sm text-orange-600 font-medium hover:underline block mx-auto"
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing, you agree to UVAI's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
