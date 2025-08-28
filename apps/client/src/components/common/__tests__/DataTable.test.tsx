import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, Column } from '../DataTable';

// Mock UI components
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: any) => <td className={className} data-testid="table-cell">{children}</td>,
  TableHead: ({ children, className }: any) => <th className={className} data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
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

jest.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }: any) => (
    <input className={className} data-testid="input" {...props} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button onClick={() => onValueChange && onValueChange('20')}>Change Limit</button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className }: any) => <button className={className} data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton">Loading...</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  SearchIcon: (props: any) => <div data-testid="search-icon" {...props} />,
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  debounce: (fn: any, delay: any) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  },
}));

interface TestData {
  id: number;
  name: string;
  email: string;
  status: string;
}

describe('DataTable', () => {
  const mockData: TestData[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ];

  const columns: Column<TestData>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
  ];

  const mockActions = jest.fn((item: TestData) => (
    <button data-testid={`action-${item.id}`}>Edit {item.name}</button>
  ));

  const mockOnSearch = jest.fn();
  const mockOnPageChange = jest.fn();
  const mockOnLimitChange = jest.fn();

  const defaultProps = {
    data: mockData,
    columns,
    loading: false,
    error: undefined,
    searchable: false,
    searchPlaceholder: 'Search...',
    onSearch: mockOnSearch,
    pagination: {
      page: 1,
      limit: 10,
      total: 25,
      onPageChange: mockOnPageChange,
      onLimitChange: mockOnLimitChange,
    },
    actions: mockActions,
    emptyState: undefined,
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders table with correct headers', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders data rows correctly', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders actions column when actions prop is provided', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByTestId('action-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-2')).toBeInTheDocument();
      expect(screen.getByTestId('action-3')).toBeInTheDocument();
    });

    it('does not render actions column when actions prop is not provided', () => {
      render(<DataTable {...defaultProps} actions={undefined} />);

      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('action-1')).not.toBeInTheDocument();
    });

    it('applies custom className to container', () => {
      render(<DataTable {...defaultProps} />);

      const container = screen.getByTestId('card').parentElement;
      expect(container).toHaveClass('test-class');
    });
  });

  describe('Custom Cell Rendering', () => {
    it('renders custom cell content when cell function is provided', () => {
      const customColumns: Column<TestData>[] = [
        {
          key: 'status',
          header: 'Status',
          cell: (item) => (
            <span data-testid={`status-${item.id}`}>
              {item.status === 'Active' ? '✅' : '❌'} {item.status}
            </span>
          ),
        },
      ];

      render(<DataTable {...defaultProps} columns={customColumns} />);

      expect(screen.getByTestId('status-1')).toHaveTextContent('✅ Active');
      expect(screen.getByTestId('status-2')).toHaveTextContent('❌ Inactive');
    });
  });

  describe('Search Functionality', () => {
    it('renders search input when searchable is true', () => {
      render(<DataTable {...defaultProps} searchable={true} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('does not render search input when searchable is false', () => {
      render(<DataTable {...defaultProps} searchable={false} />);

      expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('input')).not.toBeInTheDocument();
    });

    it('calls onSearch with debounced value when search input changes', async () => {
      jest.useFakeTimers();

      render(<DataTable {...defaultProps} searchable={true} />);

      const searchInput = screen.getByTestId('input');
      await userEvent.type(searchInput, 'john');

      // Fast-forward debounce timer
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('john');
      });

      jest.useRealTimers();
    });

    it('uses custom search placeholder', () => {
      render(<DataTable {...defaultProps} searchable={true} searchPlaceholder="Custom search..." />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('placeholder', 'Custom search...');
    });
  });

  describe('Loading State', () => {
    it('renders skeleton loading when loading is true', () => {
      render(<DataTable {...defaultProps} loading={true} />);

      expect(screen.getAllByTestId('skeleton')).toHaveLength(15); // 5 rows * 3 columns
    });

    it('does not render table content when loading', () => {
      render(<DataTable {...defaultProps} loading={true} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders custom empty state when provided', () => {
      const customEmptyState = <div data-testid="custom-empty">No items found</div>;

      render(<DataTable {...defaultProps} data={[]} emptyState={customEmptyState} />);

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders default empty state when no custom empty state provided', () => {
      render(<DataTable {...defaultProps} data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('does not render empty state when data exists', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message and retry button when error is provided', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(<DataTable {...defaultProps} error="Failed to load data" />);

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls window.location.reload when retry button is clicked', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(<DataTable {...defaultProps} error="Error occurred" />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls when pagination prop is provided', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText('Rows per page')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('calls onPageChange when Previous button is clicked', async () => {
      render(<DataTable {...defaultProps} pagination={{ ...defaultProps.pagination!, page: 2 }} />);

      const previousButton = screen.getByText('Previous');
      await userEvent.click(previousButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange when Next button is clicked', async () => {
      render(<DataTable {...defaultProps} />);

      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('disables Previous button on first page', () => {
      render(<DataTable {...defaultProps} />);

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('disables Next button when data length is less than limit', () => {
      render(<DataTable {...defaultProps} data={mockData.slice(0, 2)} />);

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('calls onLimitChange when rows per page selection changes', () => {
      render(<DataTable {...defaultProps} />);

      const selectContainer = screen.getByTestId('select');
      const changeButton = selectContainer.querySelector('button');

      if (changeButton) {
        fireEvent.click(changeButton);
        expect(mockOnLimitChange).toHaveBeenCalledWith(20);
      }
    });

    it('does not render pagination when pagination prop is not provided', () => {
      render(<DataTable {...defaultProps} pagination={undefined} />);

      expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('does not render pagination when loading', () => {
      render(<DataTable {...defaultProps} loading={true} />);

      expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
    });

    it('does not render pagination when no data', () => {
      render(<DataTable {...defaultProps} data={[]} />);

      expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
    });
  });

  describe('Column Configuration', () => {
    it('applies custom className to table headers', () => {
      const columnsWithClass: Column<TestData>[] = [
        { key: 'name', header: 'Name', className: 'custom-header-class' },
      ];

      render(<DataTable {...defaultProps} columns={columnsWithClass} />);

      const header = screen.getByText('Name');
      expect(header).toHaveClass('custom-header-class');
    });

    it('applies custom className to table cells', () => {
      const columnsWithClass: Column<TestData>[] = [
        { key: 'status', header: 'Status', className: 'custom-cell-class' },
      ];

      render(<DataTable {...defaultProps} columns={columnsWithClass} />);

      const cells = screen.getAllByTestId('table-cell');
      expect(cells.some(cell => cell.className.includes('custom-cell-class'))).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getAllByTestId('table-row')).toHaveLength(4); // 3 data rows + 1 header row
    });

    it('has proper table headers', () => {
      render(<DataTable {...defaultProps} />);

      const headers = screen.getAllByTestId('table-head');
      expect(headers).toHaveLength(5); // 4 columns + 1 actions column
    });
  });

  describe('Edge Cases', () => {
    it('handles empty columns array', () => {
      render(<DataTable {...defaultProps} columns={[]} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.queryByTestId('table-head')).not.toBeInTheDocument();
    });

    it('handles null or undefined values in data', () => {
      const dataWithNulls = [
        { id: 1, name: null as any, email: undefined as any, status: 'Active' },
      ];

      render(<DataTable {...defaultProps} data={dataWithNulls} />);

      expect(screen.getByText('null')).toBeInTheDocument();
      expect(screen.getByText('undefined')).toBeInTheDocument();
    });

    it('handles large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: i % 2 === 0 ? 'Active' : 'Inactive',
      }));

      render(<DataTable {...defaultProps} data={largeData} />);

      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 100')).toBeInTheDocument();
    });

    it('handles columns with complex keys', () => {
      const complexData = [{ 'user.name': 'John', 'user.email': 'john@example.com' }];
      const complexColumns: Column<any>[] = [
        { key: 'user.name', header: 'Name' },
        { key: 'user.email', header: 'Email' },
      ];

      render(<DataTable data={complexData} columns={complexColumns} loading={false} />);

      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('debounces search calls efficiently', async () => {
      jest.useFakeTimers();

      render(<DataTable {...defaultProps} searchable={true} />);

      const searchInput = screen.getByTestId('input');

      await userEvent.type(searchInput, 'test');
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'final');

      // Should only call onSearch once after debounce
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledTimes(1);
        expect(mockOnSearch).toHaveBeenCalledWith('final');
      });

      jest.useRealTimers();
    });
  });
});