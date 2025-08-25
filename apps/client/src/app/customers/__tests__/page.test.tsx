import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import CustomersPage from '../page';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  apiClient: {
    customers: {
      list: jest.fn(),
    },
  },
}));

jest.mock('swr', () => jest.fn());

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, asChild, ...props }: any) => {
    if (asChild) {
      return <div data-testid="button-as-child" {...props}>{children}</div>;
    }
    return (
      <button 
        onClick={onClick} 
        data-variant={variant}
        data-size={size}
        data-testid="button"
        {...props}
      >
        {children}
      </button>
    );
  },
}));

jest.mock('@/components/common/DataTable', () => ({
  DataTable: ({ 
    data, 
    columns, 
    loading, 
    error, 
    searchable, 
    searchPlaceholder, 
    onSearch, 
    pagination, 
    actions, 
    emptyState 
  }: any) => (
    <div data-testid="data-table">
      {loading && <div data-testid="data-table-loading">Loading...</div>}
      {error && <div data-testid="data-table-error">{error}</div>}
      {searchable && (
        <input 
          data-testid="search-input"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      )}
      {data.length === 0 && !loading && emptyState}
      {data.length > 0 && (
        <table data-testid="customers-table">
          <thead>
            <tr>
              {columns.map((col: any, index: number) => (
                <th key={index}>{col.header}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, index: number) => (
              <tr key={item.id || index} data-testid={`customer-row-${item.id}`}>
                {columns.map((col: any, colIndex: number) => (
                  <td key={colIndex} className={col.className}>
                    {typeof col.cell === 'function' ? col.cell(item) : item[col.key]}
                  </td>
                ))}
                <td>{actions(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pagination && (
        <div data-testid="pagination">
          <button 
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span>Page {pagination.page}</span>
          <button onClick={() => pagination.onPageChange(pagination.page + 1)}>
            Next
          </button>
          <select 
            value={pagination.limit} 
            onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
            data-testid="limit-select"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
    </div>
  ),
}));

jest.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ icon, title, description, action }: any) => (
    <div data-testid="empty-state">
      <div data-testid="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button onClick={action.onClick} data-testid="empty-state-action">
          {action.label}
        </button>
      )}
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  PlusIcon: () => <span data-testid="plus-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
}));

const mockUseSWR = require('swr');
const mockApiClient = require('@/lib/api').apiClient;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('CustomersPage', () => {
  const mockCustomers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St, City, State',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: null,
      address: null,
      created_at: '2023-01-02T00:00:00Z',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: null,
      phone: '+0987654321',
      address: '456 Oak Ave, City, State',
      created_at: '2023-01-03T00:00:00Z',
    },
  ];

  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    
    mockUseSWR.mockReturnValue({
      data: mockCustomers,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    });

    mockApiClient.customers.list.mockResolvedValue(mockCustomers);
  });

  describe('Page Structure and Layout', () => {
    it('renders page title and description', () => {
      render(<CustomersPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
      expect(screen.getByText('Manage your customers')).toBeInTheDocument();
    });

    it('renders add customer button', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('Add Customer')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('renders data table component', () => {
      render(<CustomersPage />);
      
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('links add customer button to correct route', () => {
      render(<CustomersPage />);
      
      const addCustomerLink = screen.getByText('Add Customer').closest('a');
      expect(addCustomerLink).toHaveAttribute('href', '/customers/new');
    });
  });

  describe('Data Loading and Display', () => {
    it('shows loading state', () => {
      mockUseSWR.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays customers when data is loaded', () => {
      render(<CustomersPage />);
      
      expect(screen.getByTestId('customers-table')).toBeInTheDocument();
      expect(screen.getByTestId('customer-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('customer-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('customer-row-3')).toBeInTheDocument();
    });

    it('displays customer names correctly', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('displays contact information correctly', () => {
      render(<CustomersPage />);
      
      // John Doe has both email and phone
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      
      // Jane Smith has only email
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      
      // Bob Johnson has only phone
      expect(screen.getByText('+0987654321')).toBeInTheDocument();
    });

    it('displays addresses correctly', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('123 Main St, City, State')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave, City, State')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument(); // Jane Smith has no address
    });

    it('handles API errors gracefully', () => {
      mockUseSWR.mockReturnValue({
        data: null,
        error: new Error('API Error'),
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('data-table-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('handles data wrapped in data property', () => {
      mockUseSWR.mockReturnValue({
        data: { data: mockCustomers },
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('customers-table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles direct data array', () => {
      mockUseSWR.mockReturnValue({
        data: mockCustomers,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('customers-table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles null data gracefully', () => {
      mockUseSWR.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no customers exist', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No customers found')).toBeInTheDocument();
      expect(screen.getByText('Start building your customer base by adding your first customer.')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state-action')).toBeInTheDocument();
    });

    it('navigates to add customer page from empty state', async () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const addButton = screen.getByTestId('empty-state-action');
      await user.click(addButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/customers/new');
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with correct placeholder', () => {
      render(<CustomersPage />);
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search customers by name, email, or phone')).toBeInTheDocument();
    });

    it('handles search input changes', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'John');
      
      // Verify that search triggers API call with correct parameters
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['customers']),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('includes search parameter in API call when search term is provided', async () => {
      render(<CustomersPage />);
      
      // Simulate search
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test search');
      
      // Get the fetcher function from SWR call
      const swrCall = mockUseSWR.mock.calls.find((call: any) => 
        call[0].includes('customers')
      );
      const fetcher = swrCall[1];
      
      // Call fetcher with search parameters
      await fetcher();
      
      expect(mockApiClient.customers.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: expect.any(String),
      });
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      render(<CustomersPage />);
      
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByTestId('limit-select')).toBeInTheDocument();
    });

    it('handles page navigation', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      // Verify that page change triggers new API call
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['customers', 2]),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('handles limit changes and resets page', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const limitSelect = screen.getByTestId('limit-select');
      await user.selectOptions(limitSelect, '20');
      
      // Verify that limit change triggers new API call with page reset
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['customers', 1, 20]),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('disables previous button on first page', () => {
      render(<CustomersPage />);
      
      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });
  });

  describe('Customer Actions', () => {
    it('renders view action for each customer', () => {
      render(<CustomersPage />);
      
      expect(screen.getAllByTestId('eye-icon')).toHaveLength(3);
      expect(screen.getAllByText('View')).toHaveLength(3);
    });

    it('links to correct customer detail page', () => {
      render(<CustomersPage />);
      
      const viewLinks = screen.getAllByText('View');
      const firstViewLink = viewLinks[0]?.closest('a');
      
      expect(firstViewLink).toHaveAttribute('href', '/customers/1');
    });

    it('renders view buttons with correct styling', () => {
      render(<CustomersPage />);
      
      const viewButtons = screen.getAllByText('View');
      viewButtons.forEach(button => {
        const buttonElement = button.closest('div');
        expect(buttonElement).toHaveAttribute('data-testid', 'button-as-child');
      });
    });
  });

  describe('Column Rendering', () => {
    it('renders customer column correctly', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('renders contact column correctly', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('Contact')).toBeInTheDocument();
      
      // Check email and phone display
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('+0987654321')).toBeInTheDocument();
    });

    it('renders address column correctly', () => {
      render(<CustomersPage />);
      
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, City, State')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave, City, State')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument(); // No address case
    });

    it('handles missing contact information gracefully', () => {
      const customersWithMissingContact = [
        {
          id: '1',
          name: 'Test Customer',
          email: null,
          phone: null,
          address: null,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockUseSWR.mockReturnValue({
        data: customersWithMissingContact,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<CustomersPage />);
      
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('SWR Configuration', () => {
    it('configures SWR with correct options', () => {
      render(<CustomersPage />);
      
      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Function),
        expect.objectContaining({
          keepPreviousData: true,
          revalidateOnFocus: false,
        })
      );
    });

    it('calls API with correct parameters', async () => {
      render(<CustomersPage />);
      
      // Get the fetcher function from SWR call
      const swrCall = mockUseSWR.mock.calls[0];
      const fetcher = swrCall[1];
      
      // Call the fetcher
      await fetcher();
      
      expect(mockApiClient.customers.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('includes search parameter when search is provided', async () => {
      // Render with search state
      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'search term');
      
      await waitFor(() => {
        // Should call API with search parameter
        expect(mockApiClient.customers.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: expect.any(String),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<CustomersPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
    });

    it('has accessible search input', () => {
      render(<CustomersPage />);
      
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search customers by name, email, or phone');
    });

    it('has accessible action buttons', () => {
      render(<CustomersPage />);
      
      const viewButtons = screen.getAllByText('View');
      expect(viewButtons.length).toBeGreaterThan(0);
      
      viewButtons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('integrates with Next.js router', () => {
      render(<CustomersPage />);
      
      expect(mockUseRouter).toHaveBeenCalled();
    });

    it('uses router for empty state navigation', async () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const user = userEvent.setup();
      render(<CustomersPage />);
      
      const addButton = screen.getByTestId('empty-state-action');
      await user.click(addButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/customers/new');
    });
  });

  describe('Error Boundaries', () => {
    it('handles SWR key properly', () => {
      render(<CustomersPage />);
      
      expect(mockUseSWR).toHaveBeenCalledWith(
        ['customers', 1, 10, ''],
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('updates SWR key when state changes', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);
      
      // Change page
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          ['customers', 2, 10, ''],
          expect.any(Function),
          expect.any(Object)
        );
      });
    });
  });
});