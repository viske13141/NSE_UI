import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, UserRole, labelToApiRole } from '@/hooks/useAuth';

const customerAccounts = [
  { email: 'rocklandmani@gmail.com', password: 'pavan123', name: 'Mani' },
];

const demoAccounts = [
  { role: 'broker' as UserRole, label: 'Authorized Person', email: 'mike@example.com', password: 'demo123' },
  { role: 'consultant' as UserRole, label: 'Consultant', email: 'emma@example.com', password: 'demo123' },
  // Angel & VC's
  { role: 'admin' as UserRole, label: "Angel & VC's", email: 'angel@example.com', password: 'demo123' },
  { role: 'admin' as UserRole, label: "Angel & VC's", email: 'deepakdash@lendrixventech.com', password: 'demo123' },
  // Admin
  { role: 'admin' as UserRole, label: 'Admin', email: 'admin@example.com', password: 'demo123' },
  { role: 'admin' as UserRole, label: 'Admin', email: 'deepakdash@lendrixventech.com', password: 'demo123' },
  // Lendrix Team Access
  { role: 'dsa' as UserRole, label: 'Lendrix Team Access', email: 'staff@example.com', password: 'demo123' },
  // Compliance Team
  { role: 'riskCompliance' as UserRole, label: 'Compliance Team', email: 'risk@example.com', password: 'demo123' },
  { role: 'riskCompliance' as UserRole, label: 'Compliance Team', email: 'prachibothra@lendrixventech.com', password: 'demo123' },
  { role: 'riskCompliance' as UserRole, label: 'Compliance Team', email: 'poonamdash@lendrixventech.com', password: 'demo123' },
  { role: 'riskCompliance' as UserRole, label: 'Compliance Team', email: 'lakshminathkothuri@lendrixventech.com', password: 'demo123' },
  { role: 'riskCompliance' as UserRole, label: 'Compliance Team', email: 'manikantakalguri@lendrixventech.com', password: 'demo123' },
  { role: 'riskCompliance2' as UserRole, label: 'Compliance Team', email: 'risk2@lendrix.com', password: 'demo123' },
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const pending = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { loginWithApi, login, setRole } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const timeoutReason = searchParams.get('reason');
  
  const isCustomer = roleParam === 'customer';
  const isAdmin = roleParam === 'admin';

  const adminRoles = [
    { label: "Angel & VC's",      apiRole: 'angel' },
    { label: 'Lendrix Team Access', apiRole: 'team_access' },
    { label: 'Compliance Team',     apiRole: 'compliance_team' },
  ];

  const visibleAccounts = isCustomer
    ? demoAccounts.filter(a => a.role === 'customer')
    : isAdmin
    ? demoAccounts.filter(a => a.role !== 'customer')
    : demoAccounts;

  useEffect(() => {
    if (isCustomer) setSelectedAccount('customer');
    if (isAdmin) setSelectedAccount("Angel & VC's");
  }, [isCustomer, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => setShowPopup(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccount = (account: typeof demoAccounts[0]) => {
    if (account.email) {
      setEmail(account.email);
      setPassword(account.password);
    }
    setSelectedAccount(account.label);
    setDropdownOpen(false);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || pending.current) return;
    pending.current = true;
    setApiError('');
    setLoading(true);
    const apiRole = isCustomer
      ? 'customer'
      : isAdmin
      ? (adminRoles.find(r => r.label === selectedAccount)?.apiRole ?? 'team_access')
      : (labelToApiRole[selectedAccount] ?? 'customer');
    try {
      await loginWithApi(email, password, apiRole);
      const isCompliance = apiRole === 'compliance_team' || apiRole === 'compliance';
      navigate(isCompliance ? '/dashboard/risk-compliance' : '/dashboard');
    } catch (err: any) {
      if (isCustomer) {
        const match = customerAccounts.find(a => a.email === email && a.password === password);
        if (match) {
          localStorage.setItem('lendrix_reg_name', match.name);
          localStorage.setItem('lendrix_reg_email', match.email);
          setRole('customer');
          setLoading(false);
          navigate('/dashboard');
          return;
        }
        setApiError('Invalid email or password.');
        setLoading(false);
        return;
      }
      const msg = err?.message;
      const isNetworkError = !msg || typeof msg !== 'string';
      setApiError(isNetworkError ? 'Unable to reach the server. Check your connection and try again.' : msg);
      setLoading(false);
    } finally {
      pending.current = false;
    }
  }, [email, password, selectedAccount, isCustomer, isAdmin, loginWithApi, login, setRole, navigate, adminRoles]);

  return (
    <div className="min-h-screen flex">
      {/* Under Development Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPopup(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚧</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Website Under Development</h2>
                <p className="text-muted-foreground mb-6">
                  We're working hard to bring you the best experience. Some features may be limited.
                </p>
                <Button onClick={() => setShowPopup(false)} className="w-full">
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="Lendrix Ventech" className="w-10 h-10" />
            </div>
            <div>
              <div className="font-bold text-2xl text-foreground">Lendrix Ventech</div>
              <div className="text-sm text-muted-foreground">Empowering Entrepreneurs & Ecosystem</div>
            </div>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to access your financial dashboard
          </p>

{/* Accounts Dropdown - shown for all non-customer roles */}
          {!isCustomer && (
            <div className="space-y-2" ref={dropdownRef}>
              <p className="text-sm font-semibold text-foreground">Accounts Type</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg text-sm transition-all ${
                    dropdownOpen 
                      ? 'border-[#1E3A6D] border-2' 
                      : 'border-border hover:border-[#1E3A6D] hover:border-2'
                  } hover:bg-muted/30`}
                >
                  <span className={selectedAccount ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedAccount || 'Select your Role'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden"
                    >
                      {isAdmin
                        ? adminRoles.map(r => (
                            <li key={r.apiRole}>
                              <button
                                type="button"
                                onClick={() => { setSelectedAccount(r.label); setDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#2A938F] hover:text-white transition-colors"
                              >
                                {r.label}
                              </button>
                            </li>
                          ))
                        : visibleAccounts.map((account) => (
                            <li key={account.role}>
                              <button
                                type="button"
                                onClick={() => handleSelectAccount(account)}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#2A938F] hover:text-white transition-colors"
                              >
                                {account.label}
                              </button>
                            </li>
                          ))
                      }
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedAccount === 'Compliance Team' && (
                <p className="text-xs text-muted-foreground">
                  Alice: <span className="font-medium">risk@lendrix.com</span> &nbsp;|&nbsp; Bob: <span className="font-medium">risk2@lendrix.com</span> &nbsp;— password: <span className="font-medium">demo123</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {apiError && (
              <p className="text-sm text-red-500 text-center">{apiError}</p>
            )}
            <Button type="submit" disabled={loading || !selectedAccount || !email || !password} className="w-full gradient-primary text-primary-foreground">
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <FcGoogle className="mr-2 w-5 h-5" />
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-20" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-6 max-w-sm mx-auto border border-white/20">
                <div className="text-4xl font-bold mb-2 number-display text-white">₹24,85,000</div>
                <div className="text-white/70">Total Portfolio Value</div>
                <div className="flex items-center justify-center gap-2 mt-4 text-green-400">
                  <span className="text-sm">+12.5% this month</span>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">
              Your financial journey awaits
            </h2>
            <p className="text-white/80 max-w-sm">
              Access loans, investments, real estate opportunities, and expert consultancy all in one place.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
