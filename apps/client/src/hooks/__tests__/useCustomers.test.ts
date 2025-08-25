import { renderHook, waitFor } from '@testing-library/react';
import { useCustomers } from '../useCustomers';

// Mock the API client
const mockApiClient = {
  customers: {
    list: mock(() => Promise.resolve({ data: [] }))
  }
};

// Mock SWR
const mockMutate = mock();
const mockUseSWR = mock(() => ({
  data: null,
  error: null,
  isLoading: true,
  mutate: mockMutate
}));

mock.module('@/lib/api', () => ({
  apiClient: mockApiClient
}));

mock.module('swr', () => ({
  default: mockUseSWR
}));

describe('useCustomers Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockApiClient.customers.list.mockClear();
    mockMutate.mockClear();
    mockUseSWR.mockClear();
  });

  afterEach(() => {
    // Clean up after each test
    mockApiClient.customers.list.mockClear();
    mockMutate.mockClear();
    mockUseSWR.mockClear();
  });

  test('returns default state when loading', () => {
    mockUseSWR.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
      mutate: mockMutate
    });

    const { result } = renderHook(() => useCustomers());

    expect(result.current).toEqual({
      customers: [],
      isLoading: true,
      error: null,
      mutate: mockMutate
    });
  });

  test('returns customers data when loaded', () => {
    const mockCustomers = [
      { id: 1, name: 'Customer 1', email: 'customer1@test.com' },
      { id: 2, name: 'Customer 2', email: 'customer2@test.com' }
    ];

    mockUseSWR.mockReturnValue({
      data: { data: mockCustomers },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    const { result } = renderHook(() => useCustomers());

    expect(result.current).toEqual({
      customers: mockCustomers,
      isLoading: false,
      error: null,
      mutate: mockMutate
    });
  });

  test('handles direct data format (without nested data property)', () => {
    const mockCustomers = [
      { id: 1, name: 'Customer 1', email: 'customer1@test.com' }
    ];

    mockUseSWR.mockReturnValue({
      data: mockCustomers, // Direct data format
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    const { result } = renderHook(() => useCustomers());

    expect(result.current.customers).toEqual(mockCustomers);
  });

  test('returns error state when API fails', () => {
    const mockError = new Error('API Error');

    mockUseSWR.mockReturnValue({
      data: null,
      error: mockError,
      isLoading: false,
      mutate: mockMutate
    });

    const { result } = renderHook(() => useCustomers());

    expect(result.current).toEqual({
      customers: [],
      isLoading: false,
      error: mockError,
      mutate: mockMutate
    });
  });

  test('uses default limit parameter', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    renderHook(() => useCustomers());

    expect(mockUseSWR).toHaveBeenCalledWith(
      ['customers:list', 1000],
      expect.any(Function)
    );
  });

  test('accepts custom limit parameter', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    renderHook(() => useCustomers({ limit: 50 }));

    expect(mockUseSWR).toHaveBeenCalledWith(
      ['customers:list', 50],
      expect.any(Function)
    );
  });

  test('calls API with correct parameters', async () => {
    const mockFetcher = mock(() => Promise.resolve({ data: [] }));
    mockUseSWR.mockImplementation((key, fetcher) => {
      // Execute the fetcher function to test API call
      fetcher();
      return {
        data: { data: [] },
        error: null,
        isLoading: false,
        mutate: mockMutate
      };
    });

    renderHook(() => useCustomers({ limit: 100 }));

    expect(mockApiClient.customers.list).toHaveBeenCalledWith({ limit: 100 });
  });

  test('provides mutate function for cache invalidation', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    const { result } = renderHook(() => useCustomers());

    expect(typeof result.current.mutate).toBe('function');
    expect(result.current.mutate).toBe(mockMutate);
  });

  test('handles empty params object', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    renderHook(() => useCustomers({}));

    expect(mockUseSWR).toHaveBeenCalledWith(
      ['customers:list', 1000], // Should use default limit
      expect.any(Function)
    );
  });

  test('handles undefined params', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    renderHook(() => useCustomers(undefined));

    expect(mockUseSWR).toHaveBeenCalledWith(
      ['customers:list', 1000], // Should use default limit
      expect.any(Function)
    );
  });

  test('maintains referential stability of SWR key', () => {
    mockUseSWR.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      mutate: mockMutate
    });

    const { rerender } = renderHook(
      ({ limit }) => useCustomers({ limit }),
      { initialProps: { limit: 50 } }
    );

    const firstCall = mockUseSWR.mock.calls[0];

    // Rerender with same props
    rerender({ limit: 50 });

    const secondCall = mockUseSWR.mock.calls[1];

    // Keys should be equivalent (same structure and values)
    expect(firstCall[0]).toEqual(secondCall[0]);
  });
});
