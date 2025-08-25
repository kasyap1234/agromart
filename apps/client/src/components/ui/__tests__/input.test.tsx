import { test, expect, describe } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Input } from '../input';

describe('Input Component', () => {
  test('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'border');
  });

  test('handles value changes', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(<Input onChange={handleChange} placeholder="Type here" />);
    
    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'test value');
    
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test value');
  });

  test('handles controlled input', () => {
    const { rerender } = render(<Input value="controlled" onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('controlled');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('controlled');
    
    rerender(<Input value="updated" onChange={() => {}} />);
    expect(input).toHaveValue('updated');
  });

  test('supports different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    
    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');
    
    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  test('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />);
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  test('applies custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    
    const input = screen.getByPlaceholderText('Custom');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('border'); // Should still have default classes
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    
    render(<Input ref={ref} placeholder="Ref input" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe('Ref input');
  });

  test('supports focus and blur events', async () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Input 
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Focus test"
      />
    );
    
    const input = screen.getByPlaceholderText('Focus test');
    
    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(<Input placeholder="Keyboard test" />);
    
    const input = screen.getByPlaceholderText('Keyboard test');
    
    await user.tab();
    expect(input).toHaveFocus();
    
    await user.keyboard('Hello');
    expect(input).toHaveValue('Hello');
    
    await user.keyboard('{Backspace}{Backspace}');
    expect(input).toHaveValue('Hel');
  });

  test('handles special characters and unicode', async () => {
    const user = userEvent.setup();
    
    render(<Input placeholder="Unicode test" />);
    
    const input = screen.getByPlaceholderText('Unicode test');
    await user.type(input, 'Hello 世界 🌍 #@$%');
    
    expect(input).toHaveValue('Hello 世界 🌍 #@$%');
  });

  test('supports maxLength attribute', async () => {
    const user = userEvent.setup();
    
    render(<Input maxLength={5} placeholder="Max length" />);
    
    const input = screen.getByPlaceholderText('Max length');
    await user.type(input, '1234567890');
    
    expect(input).toHaveValue('12345');
    expect(input).toHaveAttribute('maxLength', '5');
  });

  test('supports required attribute', () => {
    render(<Input required placeholder="Required input" />);
    
    const input = screen.getByPlaceholderText('Required input');
    expect(input).toHaveAttribute('required');
    expect(input).toBeRequired();
  });

  test('supports readonly attribute', async () => {
    const user = userEvent.setup();
    
    render(<Input readOnly value="readonly" placeholder="Readonly input" />);
    
    const input = screen.getByDisplayValue('readonly');
    expect(input).toHaveAttribute('readonly');
    
    await user.type(input, 'should not change');
    expect(input).toHaveValue('readonly');
  });

  test('maintains accessibility attributes', () => {
    render(
      <Input 
        aria-label="Accessible input"
        aria-describedby="input-help"
        aria-invalid="true"
        placeholder="Accessible"
      />
    );
    
    const input = screen.getByPlaceholderText('Accessible');
    expect(input).toHaveAttribute('aria-label', 'Accessible input');
    expect(input).toHaveAttribute('aria-describedby', 'input-help');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('handles form integration', () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    
    render(
      <form onSubmit={handleSubmit}>
        <Input name="testInput" placeholder="Form input" />
        <button type="submit">Submit</button>
      </form>
    );
    
    const input = screen.getByPlaceholderText('Form input');
    expect(input).toHaveAttribute('name', 'testInput');
    
    fireEvent.submit(screen.getByRole('button'));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
