import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';

// Mock dependencies
jest.mock('swr', () => jest.fn());

jest.mock('@/lib/api', () => ({
  apiClient: {
    reports: {
      dashboardStats: jest.fn(),
      lowStock: jest.fn(),
      expiringBatches: jest.fn(),
    },
    auditLogs: {
      list: jest.fn(),
    },
  },
}));

const mockUseSWR = require('swr');
const mockApiClient = require('@/lib/api').apiClient;

describe('useDashboardData', () => {
  const mockDashboardStats = {
    totalRevenue: 150000,
    totalOrders: 256,
    totalCustomers: 128,
    inventoryValue: 75000,
    lowStockItems: 12,
    pendingOrders: 8,
  };

  const mockLowStockItems = [
    {
      id: '1',
      name: 'Product A',
      sku: 'PROD-A',
      currentStock: 5,
      minStockLevel: 10,
    },
    {
      id: '2',
      name: 'Product B',
      sku: 'PROD-B',
      currentStock: 2,
      minStockLevel: 15,
    },
  ];

  const mockExpiringBatches = [
    {
      id: '1',
      productName: 'Product X',
      batchNumber: 'BATCH-001',
      expiryDate: '2023-12-31',
      quantity: 100,
    },
    {
      id: '2',
      productName: 'Product Y',
      batchNumber: 'BATCH-002',
      expiryDate: '2023-12-25',
      quantity: 50,
    },
  ];

  const mockRecentActivity = [
    {
      id: '1',
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      userId: 'user-1',
      timestamp: '2023-12-01T10:00:00Z',
      details: 'Created new product',
    },
    {
      id: '2',
      action: 'UPDATE',
      entityType: 'INVENTORY',
      entityId: 'inv-1',
      userId: 'user-2',
      timestamp: '2023-12-01T09:30:00Z',
      details: 'Updated inventory level',
    },
  ];

  const mockMutateStats = jest.fn();
  const mockMutateLowStock = jest.fn();
  const mockMutateExpiring = jest.fn();
  const mockMutateActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient.reports.dashboardStats.mockResolvedValue(mockDashboardStats);
    mockApiClient.reports.lowStock.mockResolvedValue(mockLowStockItems);
    mockApiClient.reports.expiringBatches.mockResolvedValue(mockExpiringBatches);
    mockApiClient.auditLogs.list.mockResolvedValue(mockRecentActivity);
  });

  describe('Basic Functionality', () => {
    it('should fetch all dashboard data successfully', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: mockExpiringBatches,
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity,
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.stats).toEqual(mockDashboardStats);
      expect(result.current.lowStock).toEqual(mockLowStockItems);
      expect(result.current.expiring).toEqual(mockExpiringBatches);
      expect(result.current.activity).toEqual(mockRecentActivity);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should configure SWR with correct options', () => {
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      }));

      renderHook(() => useDashboardData());

      expect(mockUseSWR).toHaveBeenCalledWith(
        '/reports/dashboard-stats',
        mockApiClient.reports.dashboardStats,
        expect.objectContaining({
          revalidateOnFocus: false,
          dedupingInterval: 30000,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
        })
      );

      expect(mockUseSWR).toHaveBeenCalledWith(
        '/reports/low-stock',
        expect.any(Function),
        expect.objectContaining({
          revalidateOnFocus: false,
          dedupingInterval: 60000,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
        })
      );

      expect(mockUseSWR).toHaveBeenCalledWith(
        '/reports/expiring-batches',
        expect.any(Function),
        expect.objectContaining({
          revalidateOnFocus: false,
          dedupingInterval: 60000,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
        })
      );

      expect(mockUseSWR).toHaveBeenCalledWith(
        '/inventory/logs',
        expect.any(Function),
        expect.objectContaining({
          revalidateOnFocus: false,
          dedupingInterval: 60000,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
        })
      );
    });
  });

  describe('Loading States', () => {
    it('should handle all loading states', () => {
      mockUseSWR.mockImplementation((key: string) => ({
        data: null,
        error: null,
        isLoading: true,
        mutate: jest.fn(),
      }));

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.statsLoading).toBe(true);
      expect(result.current.lowStockLoading).toBe(true);
      expect(result.current.expiringLoading).toBe(true);
      expect(result.current.recentActivityLoading).toBe(true);
    });

    it('should handle partial loading states', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: null,
              error: null,
              isLoading: true,
              mutate: mockMutateLowStock,
            };
          default:
            return {
              data: null,
              error: null,
              isLoading: false,
              mutate: jest.fn(),
            };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true); // Overall loading true if any is loading
      expect(result.current.statsLoading).toBe(false);
      expect(result.current.lowStockLoading).toBe(true);
      expect(result.current.expiringLoading).toBe(false);
      expect(result.current.recentActivityLoading).toBe(false);
    });

    it('should transition from loading to loaded state', () => {
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error: null,
        isLoading: true,
        mutate: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true);

      // Simulate loading completion
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: mockExpiringBatches,
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity,
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      rerender();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toEqual(mockDashboardStats);
    });
  });

  describe('Error Handling', () => {
    it('should handle all API errors', () => {
      const error = new Error('API Error');
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error,
        isLoading: false,
        mutate: jest.fn(),
      }));

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.hasError).toBe(true);
      expect(result.current.statsError).toBe(error);
      expect(result.current.lowStockError).toBe(error);
      expect(result.current.expiringError).toBe(error);
      expect(result.current.recentActivityError).toBe(error);
    });

    it('should handle partial errors', () => {
      const statsError = new Error('Stats API Error');
      
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: null,
              error: statsError,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          default:
            return {
              data: null,
              error: null,
              isLoading: false,
              mutate: jest.fn(),
            };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.hasError).toBe(true); // Overall error true if any has error
      expect(result.current.statsError).toBe(statsError);
      expect(result.current.lowStockError).toBeNull();
      expect(result.current.lowStock).toEqual(mockLowStockItems);
    });
  });

  describe('Data Normalization', () => {
    it('should handle stats data wrapped in data property', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: { data: mockDashboardStats },
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          default:
            return { data: [], error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.stats).toEqual(mockDashboardStats);
    });

    it('should handle direct stats data', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          default:
            return { data: [], error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.stats).toEqual(mockDashboardStats);
    });

    it('should handle array data types correctly', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/low-stock':
            return {
              data: mockLowStockItems, // Direct array
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: { data: mockExpiringBatches }, // Wrapped array
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity, // Direct array
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.lowStock).toEqual(mockLowStockItems);
      expect(result.current.expiring).toEqual(mockExpiringBatches);
      expect(result.current.activity).toEqual(mockRecentActivity);
    });

    it('should handle null/undefined data gracefully', () => {
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      }));

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.stats).toBeUndefined();
      expect(result.current.lowStock).toEqual([]);
      expect(result.current.expiring).toEqual([]);
      expect(result.current.activity).toEqual([]);
    });
  });

  describe('API Integration', () => {
    it('should call APIs with correct parameters', async () => {
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      }));

      renderHook(() => useDashboardData());

      // Get fetchers and call them
      const swrCalls = mockUseSWR.mock.calls;
      
      // Dashboard stats fetcher (direct function reference)
      expect(swrCalls.find(call => call[0] === '/reports/dashboard-stats')[1]).toBe(mockApiClient.reports.dashboardStats);
      
      // Low stock fetcher
      const lowStockFetcher = swrCalls.find(call => call[0] === '/reports/low-stock')[1];
      await lowStockFetcher();
      expect(mockApiClient.reports.lowStock).toHaveBeenCalledWith(5);
      
      // Expiring batches fetcher
      const expiringFetcher = swrCalls.find(call => call[0] === '/reports/expiring-batches')[1];
      await expiringFetcher();
      expect(mockApiClient.reports.expiringBatches).toHaveBeenCalledWith(5);
      
      // Recent activity fetcher
      const activityFetcher = swrCalls.find(call => call[0] === '/inventory/logs')[1];
      await activityFetcher();
      expect(mockApiClient.auditLogs.list).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('Refresh Functionality', () => {
    it('should provide individual refresh functions', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: mockExpiringBatches,
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity,
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      expect(typeof result.current.refreshStats).toBe('function');
      expect(typeof result.current.refreshLowStock).toBe('function');
      expect(typeof result.current.refreshExpiring).toBe('function');
      expect(typeof result.current.refreshActivity).toBe('function');
      expect(typeof result.current.refreshAll).toBe('function');
    });

    it('should call individual refresh functions', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: mockExpiringBatches,
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity,
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      result.current.refreshStats();
      expect(mockMutateStats).toHaveBeenCalledTimes(1);

      result.current.refreshLowStock();
      expect(mockMutateLowStock).toHaveBeenCalledTimes(1);

      result.current.refreshExpiring();
      expect(mockMutateExpiring).toHaveBeenCalledTimes(1);

      result.current.refreshActivity();
      expect(mockMutateActivity).toHaveBeenCalledTimes(1);
    });

    it('should refresh all data when refreshAll is called', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          case '/reports/low-stock':
            return {
              data: mockLowStockItems,
              error: null,
              isLoading: false,
              mutate: mockMutateLowStock,
            };
          case '/reports/expiring-batches':
            return {
              data: mockExpiringBatches,
              error: null,
              isLoading: false,
              mutate: mockMutateExpiring,
            };
          case '/inventory/logs':
            return {
              data: mockRecentActivity,
              error: null,
              isLoading: false,
              mutate: mockMutateActivity,
            };
          default:
            return { data: null, error: null, isLoading: false, mutate: jest.fn() };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      result.current.refreshAll();

      expect(mockMutateStats).toHaveBeenCalledTimes(1);
      expect(mockMutateLowStock).toHaveBeenCalledTimes(1);
      expect(mockMutateExpiring).toHaveBeenCalledTimes(1);
      expect(mockMutateActivity).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Value Structure', () => {
    it('should return all expected properties', () => {
      mockUseSWR.mockImplementation(() => ({
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      }));

      const { result } = renderHook(() => useDashboardData());

      // Data properties
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('lowStock');
      expect(result.current).toHaveProperty('expiring');
      expect(result.current).toHaveProperty('activity');
      
      // Loading state properties
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('statsLoading');
      expect(result.current).toHaveProperty('lowStockLoading');
      expect(result.current).toHaveProperty('expiringLoading');
      expect(result.current).toHaveProperty('recentActivityLoading');
      
      // Error state properties
      expect(result.current).toHaveProperty('hasError');
      expect(result.current).toHaveProperty('statsError');
      expect(result.current).toHaveProperty('lowStockError');
      expect(result.current).toHaveProperty('expiringError');
      expect(result.current).toHaveProperty('recentActivityError');
      
      // Action properties
      expect(result.current).toHaveProperty('refreshAll');
      expect(result.current).toHaveProperty('refreshStats');
      expect(result.current).toHaveProperty('refreshLowStock');
      expect(result.current).toHaveProperty('refreshExpiring');
      expect(result.current).toHaveProperty('refreshActivity');
    });

    it('should return correct types', () => {
      mockUseSWR.mockImplementation((key: string) => {
        switch (key) {
          case '/reports/dashboard-stats':
            return {
              data: mockDashboardStats,
              error: null,
              isLoading: false,
              mutate: mockMutateStats,
            };
          default:
            return {
              data: [],
              error: null,
              isLoading: false,
              mutate: jest.fn(),
            };
        }
      });

      const { result } = renderHook(() => useDashboardData());

      // Data types
      expect(typeof result.current.stats).toBe('object');
      expect(Array.isArray(result.current.lowStock)).toBe(true);
      expect(Array.isArray(result.current.expiring)).toBe(true);
      expect(Array.isArray(result.current.activity)).toBe(true);
      
      // Boolean types
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.hasError).toBe('boolean');
      
      // Function types
      expect(typeof result.current.refreshAll).toBe('function');
      expect(typeof result.current.refreshStats).toBe('function');
    });
  });

  describe('Performance Optimizations', () => {
    it('should use appropriate deduping intervals', () => {
      renderHook(() => useDashboardData());

      const swrCalls = mockUseSWR.mock.calls;
      
      // Dashboard stats should have shorter interval (30s)
      const statsCall = swrCalls.find(call => call[0] === '/reports/dashboard-stats');
      expect(statsCall[2].dedupingInterval).toBe(30000);
      
      // Other endpoints should have longer interval (60s)
      const lowStockCall = swrCalls.find(call => call[0] === '/reports/low-stock');
      expect(lowStockCall[2].dedupingInterval).toBe(60000);
    });

    it('should configure error retry appropriately', () => {
      renderHook(() => useDashboardData());

      const swrCalls = mockUseSWR.mock.calls;
      
      swrCalls.forEach(call => {
        expect(call[2].errorRetryCount).toBe(3);
        expect(call[2].errorRetryInterval).toBe(5000);
        expect(call[2].revalidateOnFocus).toBe(false);
      });
    });
  });
});