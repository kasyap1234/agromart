import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  LoadingSpinner,
  LoadingOverlay,
  LoadingCard,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  DashboardSkeleton,
} from '../loading';

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('Loading Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2');
    });

    it('renders with different sizes', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      
      sizes.forEach((size) => {
        const { rerender } = render(<LoadingSpinner size={size} data-testid={`spinner-${size}`} />);
        
        const spinner = screen.getByTestId(`spinner-${size}`);
        expect(spinner).toBeInTheDocument();
        
        // Test that size class is applied (mocked cn function will include it)
        const expectedSizeClass = size === 'sm' ? 'w-4' : 
                                 size === 'md' ? 'w-6' :
                                 size === 'lg' ? 'w-8' : 'w-12';
        expect(spinner.className).toContain(expectedSizeClass);
        
        rerender(<div />); // Clear for next iteration
      });
    });

    it('renders with different variants', () => {
      const variants = ['default', 'primary', 'muted'] as const;
      
      variants.forEach((variant) => {
        const { rerender } = render(<LoadingSpinner variant={variant} data-testid={`spinner-${variant}`} />);
        
        const spinner = screen.getByTestId(`spinner-${variant}`);
        expect(spinner).toBeInTheDocument();
        
        rerender(<div />); // Clear for next iteration
      });
    });

    it('applies custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-spinner');
    });

    it('has proper accessibility attributes', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('LoadingOverlay', () => {
    it('renders with default message', () => {
      render(<LoadingOverlay />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingOverlay message="Processing your request..." />);
      
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders without message when message is empty', () => {
      render(<LoadingOverlay message="" />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has proper overlay styling', () => {
      const { container } = render(<LoadingOverlay />);
      
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass(
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center'
      );
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingOverlay className="custom-overlay" />);
      
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('custom-overlay');
    });

    it('contains a loading spinner', () => {
      render(<LoadingOverlay />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('LoadingCard', () => {
    it('renders with spinner only', () => {
      render(<LoadingCard />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders with title', () => {
      render(<LoadingCard title="Loading Products" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Loading Products');
    });

    it('renders with title and description', () => {
      render(
        <LoadingCard 
          title="Loading Products" 
          description="Please wait while we fetch your data..." 
        />
      );
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Loading Products');
      expect(screen.getByText('Please wait while we fetch your data...')).toBeInTheDocument();
    });

    it('has proper card styling', () => {
      const { container } = render(<LoadingCard />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'p-6');
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingCard className="custom-card" />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('Skeleton', () => {
    it('renders with default styling', () => {
      const { container } = render(<Skeleton />);
      
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted');
    });

    it('applies custom className', () => {
      const { container } = render(<Skeleton className="h-4 w-full" />);
      
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4', 'w-full');
    });
  });

  describe('TableSkeleton', () => {
    it('renders with default rows and columns', () => {
      const { container } = render(<TableSkeleton />);
      
      // Should have 5 rows + 1 header = 6 total rows
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(6); // 1 header + 5 data rows
    });

    it('renders with custom rows and columns', () => {
      const { container } = render(<TableSkeleton rows={3} columns={2} />);
      
      // Should have 3 rows + 1 header = 4 total rows
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(4); // 1 header + 3 data rows
      
      // Each row should have 2 columns
      const firstRow = rows[0];
      const cells = firstRow.children;
      expect(cells).toHaveLength(2);
    });

    it('has proper structure', () => {
      const { container } = render(<TableSkeleton />);
      
      const tableContainer = container.firstChild as HTMLElement;
      expect(tableContainer).toHaveClass('space-y-3');
    });
  });

  describe('CardSkeleton', () => {
    it('renders with proper structure', () => {
      const { container } = render(<CardSkeleton />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'p-6');
      
      // Should contain skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('has avatar and content sections', () => {
      const { container } = render(<CardSkeleton />);
      
      // Should have a circular skeleton for avatar
      const roundedSkeleton = container.querySelector('.rounded-full');
      expect(roundedSkeleton).toBeInTheDocument();
      expect(roundedSkeleton).toHaveClass('h-12', 'w-12');
    });
  });

  describe('DashboardSkeleton', () => {
    it('renders with proper structure', () => {
      const { container } = render(<DashboardSkeleton />);
      
      const dashboard = container.firstChild as HTMLElement;
      expect(dashboard).toHaveClass('space-y-8');
    });

    it('contains header section', () => {
      const { container } = render(<DashboardSkeleton />);
      
      // Should have skeleton elements for header
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('contains stats cards section', () => {
      const { container } = render(<DashboardSkeleton />);
      
      // Should have a grid layout for stats
      const grid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(grid).toBeInTheDocument();
    });

    it('contains charts section', () => {
      const { container } = render(<DashboardSkeleton />);
      
      // Should have a grid layout for charts
      const chartsGrid = container.querySelector('.grid.gap-6.md\\:grid-cols-2');
      expect(chartsGrid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('LoadingSpinner has proper ARIA attributes', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('LoadingOverlay is properly announced to screen readers', () => {
      render(<LoadingOverlay message="Loading content" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      
      const message = screen.getByText('Loading content');
      expect(message).toBeInTheDocument();
    });

    it('LoadingCard headings are properly structured', () => {
      render(<LoadingCard title="Loading Title" />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Loading Title');
    });
  });

  describe('Animation Classes', () => {
    it('LoadingSpinner has spin animation', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('Skeleton has pulse animation', () => {
      const { container } = render(<Skeleton />);
      
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('LoadingOverlay message has pulse animation', () => {
      render(<LoadingOverlay message="Loading..." />);
      
      const message = screen.getByText('Loading...');
      expect(message).toHaveClass('animate-pulse');
    });
  });

  describe('Performance Considerations', () => {
    it('renders multiple skeletons efficiently', () => {
      const { container } = render(<TableSkeleton rows={10} columns={5} />);
      
      // Should render without performance issues
      expect(container.firstChild).toBeInTheDocument();
      
      // Count total skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(55); // (10 + 1) * 5 = 55 total cells
    });

    it('DashboardSkeleton renders complex structure efficiently', () => {
      const { container } = render(<DashboardSkeleton />);
      
      expect(container.firstChild).toBeInTheDocument();
      
      // Should have multiple skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(10);
    });
  });
});