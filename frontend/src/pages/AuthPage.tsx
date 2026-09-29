import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export interface AuthPageProps {
  onAuthenticated?: () => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { login, register } = useAuth();

  // Mode: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('student');
  const [adminSecret, setAdminSecret] = useState<string>('');

  // Password Reset states
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await login(email, password);
      if (onAuthenticated) onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        adminSecret
      });
      if (onAuthenticated) onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message || 'Verification OTP code dispatched to your email.');
      setOtpCode(''); // User must check email and manually enter 6-digit code
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.resetPassword(email, otpCode, newPassword);
      setSuccessMsg(res.message || 'Password reset successfully! Please sign in with your new password.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0b0e] text-slate-900 dark:text-white flex items-center justify-center p-4 sm:p-6 transition-colors selection:bg-blue-600 selection:text-white">
      
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          
          {/* Logo Frame */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-xl bg-white dark:bg-[#141418] p-1 transition-transform duration-300 group-hover:scale-105">
              <img 
                src="/findora_logo.jpg" 
                alt="Findora AI Logo" 
                className="w-full h-full object-cover rounded-2xl" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md border-2 border-white dark:border-[#0b0b0e]">
              ✓
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Findora Vault
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-0.5">
              CAMPUS RECOVERY &amp; VERIFICATION PORTAL
            </p>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] p-6 sm:p-8 shadow-xl space-y-5">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0b0b0e] border border-slate-200/80 dark:border-[#26262e] text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login' || mode === 'forgot' || mode === 'reset'
                  ? 'bg-white dark:bg-[#1a1a20] text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register' 
                  ? 'bg-white dark:bg-[#1a1a20] text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
              }`}
            >
              Register
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  CAMPUS EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@campus.edu or student@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                    className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{loading ? 'Authenticating...' : 'Sign In to Findora Vault'}</span>
              </button>

              {/* Quick 3-Role Demo Credentials Selector */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#26262e] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono text-center">
                  QUICK FILL 3-ROLE DEMO CREDENTIALS
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('tharunkumark42007@gmail.com');
                      setPassword('Findora2026!');
                    }}
                    className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-all text-center cursor-pointer"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('sivakumar463703@gmail.com');
                      setPassword('Findora2026!');
                    }}
                    className="p-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all text-center cursor-pointer"
                  >
                    Officer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('ramkishoresm@gmail.com');
                      setPassword('Findora2026!');
                    }}
                    className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all text-center cursor-pointer"
                  >
                    Student
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  CAMPUS EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. student@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Create a strong password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  ACCOUNT ROLE
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="student">Student / Campus Member (Claimant / Finder)</option>
                  <option value="verification_officer">Verification Officer (Custody &amp; Claims)</option>
                  <option value="admin">System Administrator (Security Chief)</option>
                </select>
              </div>

              {(role === 'admin' || role === 'verification_officer') && (
                <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <label className="text-[11px] font-bold text-blue-700 dark:text-sky-300 font-mono block">
                    {role === 'admin' ? 'ADMIN AUTHORIZATION PASSKEY' : 'OFFICER AUTHORIZATION PASSKEY'}
                  </label>
                  <input
                    type="password"
                    placeholder="Enter institutional authorization passkey"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#141418] border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-blue-600 dark:text-sky-400">
                    Restricts institutional privileges to authorized campus personnel.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#00875A] hover:bg-[#007048] text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD (OTP REQUEST) */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reset Account Password</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Enter your registered campus email. A 6-digit OTP code will be sent via Brevo SMTP.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  CAMPUS EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered campus email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-[#26262e] text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1a1a20]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Sending OTP...' : 'Send Reset Code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. VERIFY OTP & RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Verify Code &amp; Set New Password</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Enter the 6-digit code received at <strong>{email}</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  6-DIGIT OTP CODE
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 795745"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-black font-mono py-2.5 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-blue-600 dark:text-sky-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                  NEW PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200 dark:border-[#26262e] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-[#26262e] text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1a1a20]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
          FINDORA AI • Zero-Knowledge Verification Network • 2026
        </div>

      </div>

    </div>
  );
}
