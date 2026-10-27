import {
  LayoutDashboard, TrendingUp, PieChart, Activity, PlusCircle,
  ArrowLeftRight, Receipt, BarChart2, Layers, FileText,
  UserCircle, Search, ShoppingCart, List, BookOpen,
  HelpCircle,
} from 'lucide-react';

export interface MFMenuItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Primary navigation — shown to all authenticated MF users */
export const MF_MENU: MFMenuItem[] = [
  { title: 'Overview',              path: '/dashboard/mf/overview',          icon: LayoutDashboard },
  { title: 'Explore Funds',         path: '/dashboard/mf/invest',            icon: Search          },
  { title: 'My Portfolio',          path: '/dashboard/mf/portfolio',         icon: PieChart        },
  { title: 'My SIPs',               path: '/dashboard/mf/sips',              icon: Activity        },
  { title: 'Start a SIP',           path: '/dashboard/mf/sips/register',     icon: PlusCircle      },
  { title: 'Place Order',           path: '/dashboard/mf/orders/purchase',   icon: ShoppingCart    },
  { title: 'Redeem',                path: '/dashboard/mf/orders/redeem',     icon: Receipt         },
  { title: 'Switch',                path: '/dashboard/mf/orders/switch',     icon: ArrowLeftRight  },
  { title: 'Order History',         path: '/dashboard/mf/orders/list',       icon: List            },
  { title: 'Transactions',          path: '/dashboard/mf/transactions',      icon: ArrowLeftRight  },
  { title: 'Capital Gains',         path: '/dashboard/mf/capital-gains',     icon: TrendingUp      },
  { title: 'Asset Allocation',      path: '/dashboard/mf/asset-allocation',  icon: Layers          },
  { title: 'Reports',               path: '/dashboard/mf/reports',           icon: FileText        },
  { title: 'Investor Profile',      path: '/dashboard/mf/investor-profile',  icon: UserCircle      },
  { title: 'Watchlist',             path: '/dashboard/mf/watchlist',         icon: BookOpen        },
];

/** Secondary / advanced navigation */
export const MF_ADMIN_MENU: MFMenuItem[] = [
  { title: 'Portfolio Returns',     path: '/dashboard/mf/portfolio-returns', icon: TrendingUp      },
  { title: 'Portfolio Journey',     path: '/dashboard/mf/portfolio-journey', icon: Activity        },
  { title: 'Portfolio Summary',     path: '/dashboard/mf/portfolio-summary', icon: PieChart        },
  { title: 'Investment Snapshot',   path: '/dashboard/mf/snapshot',          icon: BarChart2       },
  { title: 'Client Transactions',   path: '/dashboard/mf/client-transactions', icon: List          },
  { title: 'RTA Transactions',      path: '/dashboard/mf/rta-transactions',  icon: FileText        },
  { title: 'Scheme Factsheet',      path: '/dashboard/mf/scheme-factsheet',  icon: BookOpen        },
  { title: 'Portfolio Screener',    path: '/dashboard/mf/screener',          icon: Search          },
  { title: 'Browse Schemes',        path: '/dashboard/mf/scheme-browser',    icon: Search          },
  { title: 'Investor Master',       path: '/dashboard/mf/investor-master',   icon: UserCircle      },
  { title: 'User Master',           path: '/dashboard/mf/user-master',       icon: UserCircle      },
  { title: 'Help & Support',        path: '/dashboard/mf/help',              icon: HelpCircle      },
];
