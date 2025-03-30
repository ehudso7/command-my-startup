import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
  
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('renders disabled button', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });
  
  it('displays loading state', () => {
    render(<Button isLoading>Click Me</Button>);
    
    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Button should be disabled when loading
    expect(screen.getByText('Click Me')).toBeDisabled();
  });
  
  it('applies custom className', () => {
    render(<Button className="test-class">Click Me</Button>);
    expect(screen.getByText('Click Me')).toHaveClass('test-class');
  });
  
  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByText('Default')).toHaveClass('bg-primary');
    
    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveClass('border');
    
    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByText('Ghost')).not.toHaveClass('bg-primary');
  });
});
