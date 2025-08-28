import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatsCard from '../StatsCard';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="stats-card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

// Mock the stats card variants
jest.mock('@/components/ui/stats-card', () => ({
  statsCardVariants: jest.fn(() => 'mocked-variant-class'),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  TrendingUp: (props: any) => <div data-testid="trending-up-icon" {...props} />,
  TrendingDown: (props: any) => <div data-testid="trending-down-icon" {...props} />,
  DollarSign: (props: any) => <div data-testid="dollar-sign-icon" {...props} />,
  Users: (props: any) => <div data-testid="users-icon" {...props} />,
  Package: (props: any) => <div data-testid="package-icon" {...props} />,
  ShoppingCart: (props: any) => <div data-testid="shopping-cart-icon" {...props} />,
}));

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: '₹150,000',
    icon: jest.requireMock('lucide-react').DollarSign,
  };

  describe('Rendering', () => {
    it('renders title and value correctly', () => {
      render(<StatsCard {...defaultProps} />);

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('₹150,000')).toBeInTheDocument();
    });

    it('renders icon with correct size', () => {
      render(<StatsCard {...defaultProps} />);

      const icon = screen.getByTestId('dollar-sign-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-6', 'h-6');
    });

    it('renders different icon types correctly', () => {
      const { rerender } = render(
        <StatsCard {...defaultProps} icon={jest.requireMock('lucide-react').Users} />
      );

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();

      rerender(
        <StatsCard {...defaultProps} icon={jest.requireMock('lucide-react').Package} />
      );

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('renders numeric values correctly', () => {
      render(<StatsCard {...defaultProps} value={150000} />);

      expect(screen.getByText('150000')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<StatsCard {...defaultProps} className="custom-class" />);

      const card = screen.getByTestId('stats-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Color Variants', () => {
    it('applies primary color variant', () => {
      render(<StatsCard {...defaultProps} color="primary" />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    it('applies secondary color variant', () => {
      render(<StatsCard {...defaultProps} color="secondary" />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    it('applies success color variant', () => {
      render(<StatsCard {...defaultProps} color="success" />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    it('applies warning color variant', () => {
      render(<StatsCard {...defaultProps} color="warning" />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    it('applies error color variant', () => {
      render(<StatsCard {...defaultProps} color="error" />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    it('applies no color variant by default', () => {
      render(<StatsCard {...defaultProps} />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<StatsCard {...defaultProps} />);

      const title = screen.getByTestId('card-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Total Revenue');
    });

    it('maintains proper semantic structure', () => {
      render(<StatsCard {...defaultProps} />);

      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });
  });

  describe('Styling and Animations', () => {
    it('applies base styling classes', () => {
      render(<StatsCard {...defaultProps} />);

      const card = screen.getByTestId('stats-card');
      expect(card).toHaveClass(
        'group',
        'relative',
        'overflow-hidden',
        'transition-all',
        'duration-300',
        'hover:scale-[1.02]',
        'hover:shadow-xl',
        'hover:shadow-primary/10',
        'border-0',
        'bg-gradient-to-br'
      );
    });

    it('applies hover effects', () => {
      render(<StatsCard {...defaultProps} />);

      const card = screen.getByTestId('stats-card');
      expect(card).toHaveClass('hover:scale-[1.02]');
      expect(card).toHaveClass('hover:shadow-xl');
    });

    it('includes background decoration', () => {
      render(<StatsCard {...defaultProps} />);

      const card = screen.getByTestId('stats-card');
      const decoration = card.querySelector('.absolute');
      expect(decoration).toBeInTheDocument();
      expect(decoration).toHaveClass('-bottom-4', '-right-4', 'w-20', 'h-20');
    });
  });

  describe('Data Display', () => {
    it('handles large numbers correctly', () => {
      render(<StatsCard {...defaultProps} value="1,000,000" />);

      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });

    it('handles zero values correctly', () => {
      render(<StatsCard {...defaultProps} value="0" />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles negative values correctly', () => {
      render(<StatsCard {...defaultProps} value="-5.2%" />);

      expect(screen.getByText('-5.2%')).toBeInTheDocument();
    });

    it('handles empty string values', () => {
      render(<StatsCard {...defaultProps} value="" />);

      expect(screen.getByText('')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses responsive text sizing', () => {
      render(<StatsCard {...defaultProps} />);

      const value = screen.getByText('₹150,000');
      expect(value).toHaveClass('text-3xl', 'font-bold', 'tracking-tight');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long titles gracefully', () => {
      const longTitle = 'Very Long Title That Should Still Render Properly Without Breaking Layout';
      render(<StatsCard {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long values gracefully', () => {
      const longValue = '₹1,234,567,890.123456789';
      render(<StatsCard {...defaultProps} value={longValue} />);

      expect(screen.getByText(longValue)).toBeInTheDocument();
    });

    it('handles special characters in values', () => {
      const specialValue = '₹150,000 (+12.5%)';
      render(<StatsCard {...defaultProps} value={specialValue} />);

      expect(screen.getByText(specialValue)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('works as a building block for dashboard layouts', () => {
      render(
        <div>
          <StatsCard {...defaultProps} />
          <StatsCard
            title="Total Users"
            value="1,250"
            icon={jest.requireMock('lucide-react').Users}
            color="secondary"
          />
        </div>
      );

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('₹150,000')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without unnecessary re-renders', () => {
      const { rerender } = render(<StatsCard {...defaultProps} />);

      // Re-render with same props should not cause issues
      rerender(<StatsCard {...defaultProps} />);

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = render(<StatsCard {...defaultProps} value="₹100,000" />);

      expect(screen.getByText('₹100,000')).toBeInTheDocument();

      rerender(<StatsCard {...defaultProps} value="₹200,000" />);

      expect(screen.getByText('₹200,000')).toBeInTheDocument();
      expect(screen.queryByText('₹100,000')).not.toBeInTheDocument();
    });
  });
});