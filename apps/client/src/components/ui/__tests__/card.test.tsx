import React from 'react';
import { test, expect, describe, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    test('renders with default props', () => {
      render(
        <Card data-testid="card">
          <p>Card content</p>
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <Card className="custom-card" data-testid="card">
          Content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-card');
      expect(card).toHaveClass('rounded-lg'); // Should maintain default classes
    });

    test('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      
      render(
        <Card ref={ref} data-testid="card">
          Content
        </Card>
      );
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.textContent).toBe('Content');
    });
  });

  describe('CardHeader', () => {
    test('renders with default styling', () => {
      render(
        <CardHeader data-testid="card-header">
          <h1>Header</h1>
        </CardHeader>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="card-header">
          Header
        </CardHeader>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('custom-header');
      expect(header).toHaveClass('flex'); // Should maintain default classes
    });
  });

  describe('CardTitle', () => {
    test('renders with default styling', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    test('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      
      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass('text-2xl'); // Should maintain default classes
    });

    test('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      
      render(<CardTitle ref={ref}>Title with ref</CardTitle>);
      
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
      expect(ref.current?.textContent).toBe('Title with ref');
    });
  });

  describe('CardDescription', () => {
    test('renders with default styling', () => {
      render(<CardDescription>Card description text</CardDescription>);
      
      const description = screen.getByText('Card description text');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    test('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      
      const description = screen.getByText('Description');
      expect(description).toHaveClass('custom-desc');
      expect(description).toHaveClass('text-sm'); // Should maintain default classes
    });
  });

  describe('CardContent', () => {
    test('renders with default styling', () => {
      render(
        <CardContent data-testid="card-content">
          <p>Content text</p>
        </CardContent>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6', 'pt-0');
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <CardContent className="custom-content" data-testid="card-content">
          Content
        </CardContent>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveClass('p-6'); // Should maintain default classes
    });
  });

  describe('CardFooter', () => {
    test('renders with default styling', () => {
      render(
        <CardFooter data-testid="card-footer">
          <button>Footer Button</button>
        </CardFooter>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <CardFooter className="custom-footer" data-testid="card-footer">
          Footer
        </CardFooter>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toHaveClass('custom-footer');
      expect(footer).toHaveClass('flex'); // Should maintain default classes
    });
  });

  describe('Complete Card Integration', () => {
    test('renders complete card structure', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Product Card</CardTitle>
            <CardDescription>This is a product description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Product details and information</p>
          </CardContent>
          <CardFooter>
            <button>Add to Cart</button>
            <button>View Details</button>
          </CardFooter>
        </Card>
      );
      
      const card = screen.getByTestId('complete-card');
      expect(card).toBeInTheDocument();
      
      expect(screen.getByText('Product Card')).toBeInTheDocument();
      expect(screen.getByText('This is a product description')).toBeInTheDocument();
      expect(screen.getByText('Product details and information')).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    test('maintains proper semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Semantic Card</CardTitle>
          </CardHeader>
          <CardContent>
            Content area
          </CardContent>
          <CardFooter>
            Footer area
          </CardFooter>
        </Card>
      );
      
      // Check that all parts are rendered in the correct order
      const card = screen.getByText('Semantic Card').closest('[class*="rounded-lg"]');
      expect(card).toBeInTheDocument();
      
      // Verify content order
      const cardText = card?.textContent;
      expect(cardText).toMatch(/Semantic Card.*Content area.*Footer area/);
    });

    test('supports nested interactive elements', async () => {
      const handleHeaderClick = mock();
      const handleFooterClick = mock();
      
      render(
        <Card>
          <CardHeader onClick={handleHeaderClick}>
            <CardTitle>Interactive Header</CardTitle>
          </CardHeader>
          <CardContent>
            <input placeholder="Input in content" />
          </CardContent>
          <CardFooter>
            <button onClick={handleFooterClick}>Footer Button</button>
          </CardFooter>
        </Card>
      );
      
      // Test input interaction
      const input = screen.getByPlaceholderText('Input in content');
      expect(input).toBeInTheDocument();
      
      // Test button interaction
      const button = screen.getByText('Footer Button');
      button.click();
      expect(handleFooterClick).toHaveBeenCalledTimes(1);
      
      // Test header interaction
      const header = screen.getByText('Interactive Header').parentElement;
      header?.click();
      expect(handleHeaderClick).toHaveBeenCalledTimes(1);
    });
  });
});
