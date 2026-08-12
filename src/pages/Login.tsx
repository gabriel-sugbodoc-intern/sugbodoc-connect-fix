import React, { useState } from 'react';
import { useLocation } from '@/lib/router-compat';
import { HeartPulse, Loader as Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

type Mode = 'login' | 'register';

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        className="w-full px-4 py-3 pr-11 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Login({ initialMode = 'login' }: { initialMode?: Mode } = {}) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await apiClient.login(email.trim(), password);
      if (error) {
        toast.error(error);
        return;
      }
      if (data) {
        localStorage.setItem('sugbodoc_user', JSON.stringify(data.user));
        const role = String(data.user.role ?? '').toLowerCase();
        setLocation(
          ['admin', 'administrator'].includes(role) ? '/admin' : role === 'doctor' ? '/doctor' : '/dashboard',
        );
        toast.success(`Welcome back, ${data.user.name}!`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!regName.trim()) { toast.error('Full name is required.'); return; }
    if (!regEmail.trim() || !regEmail.includes('@')) { toast.error('Please enter a valid email address.'); return; }
    if (regPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (regPassword !== regConfirm) { toast.error('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      const { data, error } = await apiClient.register(regEmail.trim(), regName.trim(), regPassword, regPhone.trim() || undefined);
      if (error) {
        toast.error(error);
        return;
      }
      if (data) {
        localStorage.setItem('sugbodoc_user', JSON.stringify(data.user));
        toast.success('Account created! Welcome to SugboDoc.');
        setLocation('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <HeartPulse className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">SugboDoc</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">Your lifelong digital health record</p>
        </div>

        {/* Mode tabs */}
        <div className="flex border border-border rounded-lg overflow-hidden mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Create Account
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.com"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => toast.info('Contact the hospital billing office to reset your password.')}>
                  Forgot password?
                </button>
              </div>
              <PasswordInput value={password} onChange={setPassword} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg flex items-center justify-center min-h-[48px] transition-colors disabled:opacity-70 mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Juan dela Cruz"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="juan@example.com"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password <span className="text-muted-foreground font-normal">(min. 8 characters)</span></label>
              <PasswordInput value={regPassword} onChange={setRegPassword} placeholder="Create a strong password" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <PasswordInput value={regConfirm} onChange={setRegConfirm} placeholder="Re-enter your password" />
              {regConfirm && regPassword !== regConfirm && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || (!!regConfirm && regPassword !== regConfirm)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg flex items-center justify-center min-h-[48px] transition-colors disabled:opacity-70 mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>

            <p className="text-xs text-muted-foreground text-center pt-1">
              By creating an account, you agree to SugboDoc's terms of service and privacy policy.
            </p>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>A Philippine digital health initiative.</p>
        <p className="mt-1">© 2026 SugboDoc Regional Hospital</p>
      </div>
    </div>
  );
}
