import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useVerticalFilter } from '@/hooks/useVerticalFilter';
import { motion } from 'framer-motion';
import {
  Home,
  TrendingUp,
  Building2,
  Briefcase,
  CreditCard,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  FileText,
  PieChart,
  Wallet,
  HelpCircle,
  UserCircle,
  DollarSign,
  Crown,
  Store,
  Handshake,
  MessageSquare,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, roleLabels, roleColors, UserRole } from '@/hooks/useAuth';
import { usePolicyStore } from '@/hooks/usePolicyStore';
import { MF_MENU, MF_ADMIN_MENU } from '@/components/mutual-funds/MFSidebarConfig';

const getCustomerServices = (tier: 'normal' | 'premium') => {
  const base = [
    { title: 'Loans', icon: CreditCard, href: '/dashboard/customer-loans' },
    { title: 'Investment', icon: DollarSign, href: '/dashboard/investment' },
  ];
  if (tier === 'premium') {
    return [
      ...base,
      { title: 'Real Estate Legacy & Marketplace', icon: Building2, href: '/dashboard/real-estate' },
      { title: 'Venture Capital Advisory', icon: Briefcase, href: '/dashboard/venture-capital' },
    ];
  }
  return base;
};

const roleMenus: Record<UserRole, { label: string; items: { title: string; icon: any; href: string }[] }[]> = {
  customer: [
    {
      label: 'Overview',
      items: [
        { title: 'My Portfolio', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'My Loans', icon: CreditCard, href: '/dashboard/customer-loans' },
        { title: 'Applications', icon: FileText, href: '/dashboard/customer-applications' },
        { title: 'Payments', icon: CreditCard, href: '/dashboard/admin-payments' },
      ],
    },
    {
      label: 'Services',
      items: [], // Will be populated dynamically
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/shared-help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/shared-settings' },
      ],
    },
  ],
  investor: [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'Portfolio', icon: PieChart, href: '/dashboard/portfolio' },
        { title: 'Investments', icon: TrendingUp, href: '/dashboard/investments' },
      ],
    },
    {
      label: 'Invest',
      items: [
        { title: 'Mutual Funds', icon: TrendingUp, href: '/dashboard/mutual-funds' },
        { title: 'Bonds', icon: FileText, href: '/dashboard/bonds' },
        { title: 'Fixed Income', icon: Wallet, href: '/dashboard/fixed-income' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/shared-help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/shared-settings' },
      ],
    },
  ],
  broker: [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'My Listings', icon: Building2, href: '/dashboard/listings' },
        { title: 'Leads', icon: Users, href: '/dashboard/leads' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { title: 'Add Property', icon: Building2, href: '/dashboard/add-property' },
        { title: 'Inquiries', icon: FileText, href: '/dashboard/inquiries' },
        { title: 'Analytics', icon: PieChart, href: '/dashboard/broker-analytics' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/shared-help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/shared-settings' },
      ],
    },
  ],
  consultant: [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'Clients', icon: Users, href: '/dashboard/clients' },
        { title: 'Bookings', icon: FileText, href: '/dashboard/bookings' },
      ],
    },
    {
      label: 'Services',
      items: [
        { title: 'My Services', icon: Briefcase, href: '/dashboard/services' },
        { title: 'Calendar', icon: FileText, href: '/dashboard/calendar' },
        { title: 'Earnings', icon: Wallet, href: '/dashboard/earnings' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/shared-help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/shared-settings' },
      ],
    },
  ],
  admin: [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'Analytics', icon: PieChart, href: '/dashboard/analytics' },
        { title: 'Reports', icon: FileText, href: '/dashboard/reports' },
        { title: 'Process & Policies', icon: FileText, href: '/dashboard/process-policies' },
      ],
    },
    {
      label: 'Management',
      items: [
        { title: 'Users', icon: Users, href: '/dashboard/users' },
        { title: 'Leads', icon: Users, href: '/dashboard/admin-leads' },
        { title: 'Listings', icon: Building2, href: '/dashboard/listings' },
        { title: 'Loans', icon: CreditCard, href: '/dashboard/loans' },
        { title: 'Investments', icon: DollarSign, href: '/dashboard/admin-investments' },
        { title: 'Business Management', icon: Store, href: '/dashboard/business-management' },
        { title: 'Partner Submissions', icon: Handshake, href: '/dashboard/partner-submissions' },
        { title: 'Marketplace', icon: Store, href: '/dashboard/marketplace-submissions' },
        { title: 'Feedback', icon: MessageSquare, href: '/dashboard/feedback' },
        { title: 'Payments', icon: CreditCard, href: '/dashboard/admin-payments' },
      ],
    },
    {
      label: 'Admin Panel',
      items: [
        { title: 'User Management', icon: Users, href: '/dashboard/admin/users' },
        { title: 'Roles & Permissions', icon: Shield, href: '/dashboard/admin/roles' },
        { title: 'Vertical Config', icon: Settings, href: '/dashboard/admin/vertical-config' },
        { title: 'Audit Logs', icon: FileText, href: '/dashboard/admin/audit-logs' },
      ],
    },
    {
      label: 'System',
      items: [
        { title: 'Chatbot Rules', icon: Settings, href: '/dashboard/chatbot-rules' },
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/admin-help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/admin-settings' },
      ],
    },
  ],
  dsa: [
    {
      label: 'CRM Core',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { title: 'Leads', icon: Users, href: '/dashboard/leads' },
        { title: 'Customers', icon: Users, href: '/dashboard/crm/customers' },
        { title: 'Activities', icon: FileText, href: '/dashboard/crm/activities' },
        { title: 'Tasks', icon: FileText, href: '/dashboard/crm/tasks' },
        { title: 'Notifications', icon: Bell, href: '/dashboard/crm/notifications' },
        { title: 'Process & Policies', icon: FileText, href: '/dashboard/crm/process-policies' },
      ],
    },
    {
      label: 'Verticals',
      items: [
        { title: 'Lending', icon: CreditCard, href: '/dashboard/verticals/lending' },
        { title: 'Investing', icon: TrendingUp, href: '/dashboard/verticals/investing' },
        { title: 'Real Estate', icon: Building2, href: '/dashboard/verticals/real-estate' },
        { title: 'VC & Consulting', icon: Briefcase, href: '/dashboard/verticals/vc-consulting' },
      ],
    },
    {
      label: 'Pipeline',
      items: [
        { title: 'Stage Config', icon: Settings, href: '/dashboard/pipeline/stage-config' },
        { title: 'Customer Acquisition', icon: LayoutDashboard, href: '/dashboard/pipeline/kanban' },
        { title: 'Automation', icon: Settings, href: '/dashboard/pipeline/automation' },
        { title: 'SLA Tracking', icon: FileText, href: '/dashboard/pipeline/sla-tracking' },
      ],
    },
    {
      label: 'Documents',
      items: [
        { title: 'Upload & Storage', icon: FileText, href: '/dashboard/documents/upload' },
        { title: 'OCR Processing', icon: FileText, href: '/dashboard/documents/ocr' },
        { title: 'Verification', icon: FileText, href: '/dashboard/documents/verification' },
        { title: 'Expiry Tracking', icon: FileText, href: '/dashboard/documents/expiry' },
      ],
    },
    {
      label: 'Deals & Commission',
      items: [
        { title: 'Deal Creation', icon: Handshake, href: '/dashboard/deals/create' },
        { title: 'Agent Statements', icon: FileText, href: '/dashboard/deals/agent-statements' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/settings' },
      ],
    },
  ],
  trader: [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      ],
    },
  ],
  riskCompliance: [
    {
      label: 'Risk & Compliance',
      items: [
        { title: 'Process & Policies', icon: FileText, href: '/dashboard/risk-compliance' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/risk-compliance/help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/risk-compliance/settings' },
      ],
    },
  ],
  riskCompliance2: [
    {
      label: 'Risk & Compliance',
      items: [
        { title: 'Process & Policies', icon: FileText, href: '/dashboard/risk-compliance' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help & Support', icon: HelpCircle, href: '/dashboard/risk-compliance/help' },
        { title: 'Settings', icon: Settings, href: '/dashboard/risk-compliance/settings' },
      ],
    },
  ],
};

const allRoles: UserRole[] = ['customer', 'investor', 'broker', 'consultant', 'admin', 'dsa', 'riskCompliance'];

const MFSidebar: React.FC = () => {
  const location = useLocation();
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="Lendrix Ventech" className="w-7 h-7" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg text-sidebar-foreground">Lendrix Ventech</div>
              <div className="text-xs text-sidebar-foreground/60">Mutual Funds</div>
            </div>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Mutual Funds</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MF_MENU.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Advanced & Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MF_ADMIN_MENU.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const isMFRoute = location.pathname.startsWith('/dashboard/mf');
  if (isMFRoute) return <MFSidebar />;

  const { user, switchRole, toggleCustomerTier } = useAuth();
  const role = user?.role || 'customer';
  const customerTier = user?.customerTier || 'normal';

  // Deep-copy menus to avoid mutating the constant
  const menus = roleMenus[role].map(g => ({ ...g, items: [...g.items] }));
  if (role === 'customer') {
    const servicesGroup = menus.find(group => group.label === 'Services');
    if (servicesGroup) {
      servicesGroup.items = getCustomerServices(customerTier);
    }
  }

  const { policies } = usePolicyStore();
  const pendingForCompliance = policies.filter(p => p.status === 'pending' || p.status === 'rectified').length;
  const underReviewForAdmin = policies.filter(p => p.status === 'under-review').length;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="Lendrix Ventech" className="w-7 h-7" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg text-sidebar-foreground">Lendrix Ventech</div>
              <div className="text-xs text-sidebar-foreground/60">Empowering Entrepreneurs & Ecosystem</div>
            </div>
          </Link>
        </div>

        {/* Menu Items */}
        {menus.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel className="text-sidebar-foreground/60">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isProcessPoliciesAdmin = role === 'admin' && item.href === '/dashboard/process-policies';
                  const isCompliancePage = (role === 'riskCompliance' || role === 'riskCompliance2') && item.href === '/dashboard/risk-compliance';
                  const badge = isProcessPoliciesAdmin && underReviewForAdmin > 0 ? underReviewForAdmin
                    : isCompliancePage && pendingForCompliance > 0 ? pendingForCompliance
                    : null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.href}>
                        <Link to={item.href} className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span className="flex-1">{item.title}</span>
                          {badge !== null && (
                            <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Bottom Items */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard/profile" className="flex items-center gap-3">
                  <UserCircle className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const verticals = [
  { key: 'LD' as const, label: 'Lending', color: 'bg-red-500', ring: 'ring-red-400' },
  { key: 'IE' as const, label: 'Investing', color: 'bg-green-500', ring: 'ring-green-400' },
  { key: 'RE' as const, label: 'Real Estate', color: 'bg-blue-500', ring: 'ring-blue-400' },
  { key: 'VC' as const, label: 'VC & Consulting', color: 'bg-yellow-500', ring: 'ring-yellow-400' },
];

const DashboardInner: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, upgradeToPremium } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery } = useVerticalFilter();
  const isKanban = location.pathname === '/dashboard/pipeline/kanban';

  // Listen for premium upgrade signal from the checkout tab
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lendrix_premium_paid' && e.newValue === 'true') {
        upgradeToPremium();
        localStorage.removeItem('lendrix_premium_paid');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [upgradeToPremium]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isKanban ? 'Search by ID, name, loan type...' : 'Search...'}
                  className="pl-9 w-64 bg-muted/50"
                  value={isKanban ? searchQuery : ''}
                  onChange={e => isKanban && setSearchQuery(e.target.value)}
                />
              </div>
              {location.pathname === '/dashboard/pipeline/kanban' && <VerticalFilterButtons />}
            </div>

   <div className="flex items-center gap-2">
  {user?.role === "customer" && (
    <Button
      size="sm"
      asChild
      className="gap-2 rounded-xl border-0 bg-teal-500 text-white shadow-md transition-colors duration-200 hover:bg-teal-600"
    >
      <Link to="/dashboard/premium-plans">
        <Crown className="h-4 w-4" />
        Premium
      </Link>
    </Button>
  )}

              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-auto py-1.5 px-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-semibold leading-tight">{user?.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{user?.email || ''}</span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.name}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile">
                      <UserCircle className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

const DashboardLayout: React.FC = () => (
  <SidebarProvider>
    <DashboardInner />
  </SidebarProvider>
);

const VerticalFilterButtons: React.FC = () => {
  const { activeVertical, setActiveVertical } = useVerticalFilter();
  return (
    <div className="flex items-center gap-1.5 ml-2">
      {verticals.map(v => (
        <button
          key={v.key}
          title={v.label}
          onClick={() => setActiveVertical(v.key)}
          className={`w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center transition-all ${v.color} ${
            activeVertical === v.key ? `ring-2 ring-offset-1 ${v.ring} scale-110` : 'opacity-60 hover:opacity-100'
          }`}
        >
          {v.key}
        </button>
      ))}
    </div>
  );
};

export default DashboardLayout;
