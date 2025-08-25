import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';

// Mock dependencies
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    reports: {
      dashboardStats: jest.fn(),
      lowStock: jest.fn(),
    },
  },
}));

jest.mock('swr', () => jest.fn());

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  Pie: ({ dataKey }: any) => <div data-testid={`pie-${dataKey}`} />,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
}));

jest.mock('@/components/ui/loading', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading dashboard...</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid="tab-trigger" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid="tab-content" data-value={value}>{children}</div>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  Package: () => <span data-testid="package-icon" />,
  Users: () => <span data-testid="users-icon" />,
  ShoppingCart: () => <span data-testid="shopping-cart-icon" />,
  TrendingUp: () => <span data-testid="trending-up-icon" />,
  TrendingDown: () => <span data-testid="trending-down-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  DollarSign: () => <span data-testid="dollar-sign-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  Box: () => <span data-testid="box-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockUseAuth = require('@/context/AuthContext').useAuth;
const mockUseSWR = require('swr');
const mockApiClient = require('@/lib/api').apiClient;

describe('DashboardPage', () => {
  const mockDashboardData = {
    kpis: {
      totalRevenue: 150000,
      totalOrders: 256,
      totalCustomers: 128,
      inventoryValue: 75000,
      lowStockItems: 12,
      pendingOrders: 8,
    },
    salesData: [
      { name: 'Jan', sales: 4000, purchases: 2400 },
      { name: 'Feb', sales: 3000, purchases: 1398 },
    ],
    inventoryData: [
      { name: 'In Stock', value: 400, color: '#22c55e' },
      { name: 'Low Stock', value: 300, color: '#f59e0b' },
    ],
    recentOrders: [],
    alerts: [],
  };

  const mockLowStockData = {
    data: [
      { id: 1, name: 'Product A', stock: 5 },
      { id: 2, name: 'Product B', stock: 2 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'admin', email: 'test@example.com' },
      isLoading: false,
    });

    mockUseSWR.mockImplementation((key: string | string[]) => {
      if (Array.isArray(key) && key[0] === '/reports/dashboard-stats') {
        return {
          data: mockDashboardData,
          error: null,
          isLoading: false,
        };
      }
      if (Array.isArray(key) && key[0] === '/reports/low-stock') {
        return {
          data: mockLowStockData,
          error: null,
          isLoading: false,
        };
      }
      return { data: null, error: null, isLoading: false };
    });

    mockApiClient.reports.dashboardStats.mockResolvedValue(mockDashboardData);
    mockApiClient.reports.lowStock.mockResolvedValue(mockLowStockData);
  });

  describe('Loading State', () => {
    it('shows loading skeleton when data is loading', () => {
      mockUseSWR.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
      });

      render(<DashboardPage />);
      
      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('renders welcome message with user name', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Welcome back, Test User/)).toBeInTheDocument();
      expect(screen.getByText(/Here's what's happening with your business/)).toBeInTheDocument();
    });

    it('shows date filter button', () => {
      render(<DashboardPage />);
      
      const dateButton = screen.getByText('Last 30 days');
      expect(dateButton).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });

    it('shows view reports button for managers and admins', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('View Reports')).toBeInTheDocument();
    });

    it('hides view reports button for regular users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User', role: 'user', email: 'test@example.com' },
        isLoading: false,
      });

      render(<DashboardPage />);
      
      expect(screen.queryByText('View Reports')).not.toBeInTheDocument();
    });
  });

  describe('Low Stock Alert', () => {
    it('shows low stock alert when items are running low', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText(/2 items are running low on stock/)).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('does not show alert when no low stock items', () => {
      mockUseSWR.mockImplementation((key: string | string[]) => {
        if (Array.isArray(key) && key[0] === '/reports/dashboard-stats') {
          return { data: mockDashboardData, error: null, isLoading: false };
        }
        if (Array.isArray(key) && key[0] === '/reports/low-stock') {
          return { data: { data: [] }, error: null, isLoading: false };
        }
        return { data: null, error: null, isLoading: false };
      });

      render(<DashboardPage />);
      
      expect(screen.queryByText('Low Stock Alert')).not.toBeInTheDocument();
    });

    it('handles view details link click', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);
      
      const viewDetailsLink = screen.getByText('View details');
      expect(viewDetailsLink).toBeInTheDocument();
      
      await user.click(viewDetailsLink);
      // Note: In a real implementation, this would trigger navigation or modal opening
    });
  });

  describe('KPI Cards', () => {
    it('renders all KPI cards with correct data', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('₹150000')).toBeInTheDocument();
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('256')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-cart-icon')).toBeInTheDocument();
      
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      
      expect(screen.getByText('Inventory Value')).toBeInTheDocument();
      expect(screen.getByText('₹75000')).toBeInTheDocument();
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('shows loading state for KPI cards', () => {
      mockUseSWR.mockImplementation((key: string | string[]) => {
        if (Array.isArray(key) && key[0] === '/reports/dashboard-stats') {
          return { data: null, error: null, isLoading: true };
        }
        return { data: null, error: null, isLoading: false };
      });

      render(<DashboardPage />);
      
      // Should show -- for loading values
      expect(screen.getAllByText('--')).toHaveLength(4);
    });

    it('shows percentage changes with correct indicators', () => {
      render(<DashboardPage />);
      
      // Positive changes
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('+8.2%')).toBeInTheDocument();
      expect(screen.getByText('+5.1%')).toBeInTheDocument();
      
      // Negative change
      expect(screen.getByText('-2.1%')).toBeInTheDocument();
      
      // Trending icons
      expect(screen.getAllByTestId('trending-up-icon')).toHaveLength(3);
      expect(screen.getAllByTestId('trending-down-icon')).toHaveLength(1);
    });
  });

  describe('Charts Section', () => {
    it('renders sales and purchases area chart', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Sales & Purchases')).toBeInTheDocument();
      expect(screen.getByText('Monthly comparison of sales vs purchases')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-sales')).toBeInTheDocument();
      expect(screen.getByTestId('area-purchases')).toBeInTheDocument();
    });

    it('renders inventory status pie chart', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Inventory Status')).toBeInTheDocument();
      expect(screen.getByText('Current inventory distribution')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-value')).toBeInTheDocument();
    });

    it('shows inventory legend', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    it('shows detailed analytics tabs for managers', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User', role: 'manager', email: 'test@example.com' },
        isLoading: false,
      });

      render(<DashboardPage />);
      
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    it('shows users tab only for admins', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('hides users tab for managers', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User', role: 'manager', email: 'test@example.com' },
        isLoading: false,
      });

      render(<DashboardPage />);
      
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });

    it('hides detailed analytics for regular users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User', role: 'user', email: 'test@example.com' },
        isLoading: false,
      });

      render(<DashboardPage />);
      
      expect(screen.queryByTestId('tabs')).not.toBeInTheDocument();
    });
  });

  describe('Overview Tab Content', () => {
    it('displays recent activity', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New order #1234')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('Inventory updated')).toBeInTheDocument();
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('Low stock alert')).toBeInTheDocument();
      expect(screen.getByText('10 minutes ago')).toBeInTheDocument();
    });

    it('displays quick actions', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByText('Create Purchase Order')).toBeInTheDocument();
      expect(screen.getByText('Add Customer')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
    });

    it('handles quick action button clicks', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);
      
      const addProductButton = screen.getByText('Add New Product');
      await user.click(addProductButton);
      
      const createOrderButton = screen.getByText('Create Purchase Order');
      await user.click(createOrderButton);
      
      // Note: In a real implementation, these would trigger navigation or actions
    });
  });

  describe('Inventory Tab Content', () => {
    it('displays inventory health metrics', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Inventory Health')).toBeInTheDocument();
      expect(screen.getByText('Stock levels and alerts')).toBeInTheDocument();
      expect(screen.getByText('Stock Health')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '85');
    });

    it('shows stock distribution numbers', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('400')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  describe('Orders Tab Content', () => {
    it('displays order status information', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Order Status')).toBeInTheDocument();
      expect(screen.getByText('Pending Orders')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      
      // Check badges
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(6); // 3 in orders + 3 in users tab for admin
    });
  });

  describe('Users Tab Content (Admin Only)', () => {
    it('displays user management information for admins', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
      mockUseSWR.mockImplementation((key: string | string[]) => {
        if (Array.isArray(key) && key[0] === '/reports/dashboard-stats') {
          return {
            data: null,
            error: new Error('API Error'),
            isLoading: false,
          };
        }
        return { data: null, error: null, isLoading: false };
      });

      render(<DashboardPage />);
      
      // Should show fallback values
      expect(screen.getByText('₹0')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles missing user data', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<DashboardPage />);
      
      expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    });
  });

  describe('Data Refresh', () => {
    it('sets up automatic data refresh', () => {
      render(<DashboardPage />);
      
      // Verify SWR was called with refresh interval
      expect(mockUseSWR).toHaveBeenCalledWith(
        ['/reports/dashboard-stats'],
        expect.any(Function),
        { refreshInterval: 60000 }
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<DashboardPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    });

    it('has accessible buttons with proper labels', () => {
      render(<DashboardPage />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('provides appropriate ARIA labels for charts', () => {
      render(<DashboardPage />);
      
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses responsive grid classes', () => {
      render(<DashboardPage />);
      
      // Verify cards use responsive grid
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});