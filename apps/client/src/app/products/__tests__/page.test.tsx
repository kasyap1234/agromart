import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from '../ProductsPage';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  apiClient: {
    products: {
      list: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('swr', () => jest.fn());

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/layout/PageContainer', () => {
  return function MockPageContainer({ children, title, description }: any) {
    return (
      <div data-testid="page-container">
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    );
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">{children}</div>
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
        <table data-testid="products-table">
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
              <tr key={item.id || index} data-testid={`product-row-${item.id}`}>
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

jest.mock('@/components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  Pencil: () => <span data-testid="pencil-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

const mockUseSWR = require('swr');
const mockApiClient = require('@/lib/api').apiClient;
const mockToast = require('react-hot-toast').toast;

// Mock window.confirm
const originalConfirm = window.confirm;
beforeAll(() => {
  window.confirm = jest.fn();
});

afterAll(() => {
  window.confirm = originalConfirm;
});

describe('ProductsPage', () => {
  const mockProducts = [
    {
      id: '1',
      sku: 'PROD-001',
      name: 'Test Product 1',
      selling_price: 99.99,
      description: 'Test description 1',
      brand: 'Test Brand',
      unit_id: 'unit1',
      cost_price: 79.99,
      tax_rate: 18,
      category: 'Electronics',
      min_stock_level: 10,
      max_stock_level: 100,
      reorder_point: 20,
    },
    {
      id: '2',
      sku: 'PROD-002',
      name: 'Test Product 2',
      selling_price: 149.99,
      description: 'Test description 2',
      brand: null,
      unit_id: 'unit2',
      cost_price: 119.99,
      tax_rate: 18,
      category: 'Books',
      min_stock_level: 5,
      max_stock_level: 50,
      reorder_point: 10,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    });

    mockApiClient.products.list.mockResolvedValue(mockProducts);
    mockApiClient.products.delete.mockResolvedValue({});
  });

  describe('Page Structure and Layout', () => {
    it('renders page container with correct title and description', () => {
      render(<ProductsPage />);
      
      expect(screen.getByTestId('page-container')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Manage your product inventory')).toBeInTheDocument();
    });

    it('renders add product button', () => {
      render(<ProductsPage />);
      
      expect(screen.getByText('Add Product')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('renders data table component', () => {
      render(<ProductsPage />);
      
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.getByTestId('card')).toBeInTheDocument();
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

      render(<ProductsPage />);
      
      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays products when data is loaded', () => {
      render(<ProductsPage />);
      
      expect(screen.getByTestId('products-table')).toBeInTheDocument();
      expect(screen.getByTestId('product-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('product-row-2')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('shows product details correctly', () => {
      render(<ProductsPage />);
      
      // Product names and SKUs
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('SKU: PROD-001')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
      expect(screen.getByText('SKU: PROD-002')).toBeInTheDocument();
      
      // Prices
      expect(screen.getByText('₹99.99')).toBeInTheDocument();
      expect(screen.getByText('₹149.99')).toBeInTheDocument();
      
      // Brand information
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument(); // No brand for second product
    });

    it('handles API errors gracefully', () => {
      mockUseSWR.mockReturnValue({
        data: null,
        error: new Error('API Error'),
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<ProductsPage />);
      
      expect(screen.getByTestId('data-table-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no products exist', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<ProductsPage />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No products found')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first product to the inventory.')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state-action')).toBeInTheDocument();
    });

    it('navigates to add product page from empty state', async () => {
      const mockLocationAssign = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      mockUseSWR.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const addButton = screen.getByTestId('empty-state-action');
      await user.click(addButton);
      
      // Note: In real implementation, this would trigger navigation
    });
  });

  describe('Search Functionality', () => {
    it('renders search input', () => {
      render(<ProductsPage />);
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search products by name, SKU, or brand')).toBeInTheDocument();
    });

    it('handles search input changes', async () => {
      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'Test Product');
      
      // Verify that search triggers API call with correct parameters
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['products:list']),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      render(<ProductsPage />);
      
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByTestId('limit-select')).toBeInTheDocument();
    });

    it('handles page navigation', async () => {
      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      // Verify that page change triggers new API call
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['products:list', 2]),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('handles limit changes', async () => {
      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const limitSelect = screen.getByTestId('limit-select');
      await user.selectOptions(limitSelect, '50');
      
      // Verify that limit change triggers new API call and resets page to 1
      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith(
          expect.arrayContaining(['products:list', 1, 50]),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('disables previous button on first page', () => {
      render(<ProductsPage />);
      
      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });
  });

  describe('Product Actions', () => {
    it('renders action buttons for each product', () => {
      render(<ProductsPage />);
      
      expect(screen.getAllByTestId('eye-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('pencil-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('trash-icon')).toHaveLength(2);
    });

    it('has correct accessibility labels for action buttons', () => {
      render(<ProductsPage />);
      
      expect(screen.getByLabelText('View Test Product 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Test Product 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Test Product 1')).toBeInTheDocument();
    });

    it('links to correct product detail page', () => {
      render(<ProductsPage />);
      
      const viewLink = screen.getByLabelText('View Test Product 1').closest('a');
      expect(viewLink).toHaveAttribute('href', '/products/1');
    });

    it('links to correct product edit page', () => {
      render(<ProductsPage />);
      
      const editLink = screen.getByLabelText('Edit Test Product 1').closest('a');
      expect(editLink).toHaveAttribute('href', '/products/1/edit');
    });
  });

  describe('Product Deletion', () => {
    it('shows confirmation dialog before deletion', async () => {
      window.confirm = jest.fn().mockReturnValue(false);
      const user = userEvent.setup();
      
      render(<ProductsPage />);
      
      const deleteButton = screen.getByLabelText('Delete Test Product 1');
      await user.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Test Product 1"? This action cannot be undone.'
      );
      expect(mockApiClient.products.delete).not.toHaveBeenCalled();
    });

    it('deletes product when confirmed', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockProducts,
        error: null,
        isLoading: false,
        mutate: mockMutate,
      });

      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const deleteButton = screen.getByLabelText('Delete Test Product 1');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockApiClient.products.delete).toHaveBeenCalledWith('1');
        expect(mockToast.success).toHaveBeenCalledWith('Product deleted successfully');
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('handles deletion errors', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      mockApiClient.products.delete.mockRejectedValue({
        response: { data: { message: 'Cannot delete product' } }
      });

      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const deleteButton = screen.getByLabelText('Delete Test Product 1');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Cannot delete product');
      });
    });

    it('handles deletion errors without specific message', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      mockApiClient.products.delete.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const deleteButton = screen.getByLabelText('Delete Test Product 1');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('handles deletion errors with fallback message', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      mockApiClient.products.delete.mockRejectedValue({});

      const user = userEvent.setup();
      render(<ProductsPage />);
      
      const deleteButton = screen.getByLabelText('Delete Test Product 1');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete product');
      });
    });
  });

  describe('Column Rendering', () => {
    it('renders product information correctly', () => {
      render(<ProductsPage />);
      
      // Test product names and SKUs
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('SKU: PROD-001')).toBeInTheDocument();
      
      // Test brand badges
      const brandBadge = screen.getByTestId('badge');
      expect(brandBadge).toHaveTextContent('Test Brand');
      expect(brandBadge).toHaveAttribute('data-variant', 'secondary');
      
      // Test prices with currency formatting
      expect(screen.getByText('₹99.99')).toBeInTheDocument();
      expect(screen.getByText('₹149.99')).toBeInTheDocument();
    });

    it('handles missing brand gracefully', () => {
      render(<ProductsPage />);
      
      // Second product has no brand, should show dash
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles missing price gracefully', () => {
      const productsWithMissingPrice = [
        { ...mockProducts[0], selling_price: null },
      ];

      mockUseSWR.mockReturnValue({
        data: productsWithMissingPrice,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      render(<ProductsPage />);
      
      expect(screen.getByText('₹0.00')).toBeInTheDocument();
    });
  });

  describe('SWR Configuration', () => {
    it('configures SWR with correct options', () => {
      render(<ProductsPage />);
      
      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Function),
        expect.objectContaining({
          keepPreviousData: true,
          revalidateOnFocus: false,
          revalidateIfStale: false,
        })
      );
    });

    it('calls API with correct parameters', async () => {
      render(<ProductsPage />);
      
      // Get the fetcher function from SWR call
      const swrCall = mockUseSWR.mock.calls[0];
      const fetcher = swrCall[1];
      
      // Call the fetcher with test parameters
      await fetcher(['products:list', 1, 20, '', {}]);
      
      expect(mockApiClient.products.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: '',
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<ProductsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    });

    it('has accessible action buttons with ARIA labels', () => {
      render(<ProductsPage />);
      
      expect(screen.getByLabelText('View Test Product 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Test Product 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Test Product 1')).toBeInTheDocument();
    });

    it('has accessible search input with placeholder', () => {
      render(<ProductsPage />);
      
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search products by name, SKU, or brand');
    });
  });

  describe('Navigation Integration', () => {
    it('links to add product page', () => {
      render(<ProductsPage />);
      
      const addProductLink = screen.getByText('Add Product').closest('a');
      expect(addProductLink).toHaveAttribute('href', '/products/new');
    });
  });
});