import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarUpload } from '../avatar-upload';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({
          target: {
            result: 'data:image/png;base64,mockImageData'
          }
        });
      }
    }, 100);
  }
}

global.FileReader = MockFileReader as any;

describe('AvatarUpload Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  const defaultProps = {
    onChange: mockOnChange,
  };

  it('renders default avatar when no value provided', () => {
    render(<AvatarUpload {...defaultProps} />);
    
    expect(screen.getByText('UP')).toBeInTheDocument(); // Default initials for "Upload photo"
  });

  it('renders existing avatar when value provided', () => {
    render(<AvatarUpload {...defaultProps} value="https://example.com/avatar.jpg" />);
    
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('opens file dialog when avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} />);
    
    const avatar = screen.getByRole('button');
    await user.click(avatar);
    
    // Check that file input is present
    const fileInput = screen.getByRole('button', { hidden: true });
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('handles file selection and shows preview', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'data:image/png;base64,mockImageData');
    });
  });

  it('validates file size correctly', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} maxSize={1} />);
    
    // Create a file larger than 1MB
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.png', { 
      type: 'image/png' 
    });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, largeFile);
    
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 1MB/)).toBeInTheDocument();
    });
  });

  it('validates file type correctly', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} accept="image/*" />);
    
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, textFile);
    
    await waitFor(() => {
      expect(screen.getByText(/Only image files are allowed/)).toBeInTheDocument();
    });
  });

  it('handles successful upload to server', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          file_id: 'avatar-123',
          file_name: 'avatar.png',
          file_url: 'https://example.com/uploaded-avatar.png',
          file_size: 1024,
        }
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/files/upload', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      }));
    });
    
    await waitFor(() => {
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'https://example.com/uploaded-avatar.png');
    });
    
    expect(mockOnChange).toHaveBeenCalledWith(file);
  });

  it('handles upload error correctly', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({
        success: false,
        message: 'Upload failed'
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('handles network error correctly', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows upload progress indicator', async () => {
    const user = userEvent.setup();
    // Mock a delayed response to show loading state
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              file_url: 'https://example.com/avatar.png'
            }
          })
        }), 500)
      )
    );
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    // Should show loading indicator
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('allows clearing the avatar', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} value="https://example.com/avatar.jpg" />);
    
    // Should have an existing avatar
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    
    // Find and click remove button (usually an X icon)
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('is disabled when disabled prop is true', () => {
    render(<AvatarUpload {...defaultProps} disabled={true} />);
    
    const avatar = screen.getByRole('button');
    expect(avatar).toBeDisabled();
  });

  it('uses custom placeholder text', () => {
    render(<AvatarUpload {...defaultProps} placeholder="Profile Picture" />);
    
    expect(screen.getByText('PP')).toBeInTheDocument(); // Initials for "Profile Picture"
  });

  it('accepts custom file types', () => {
    render(<AvatarUpload {...defaultProps} accept="image/jpeg,image/png" />);
    
    const input = screen.getByRole('button', { hidden: true });
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');
  });

  it('handles file reader error', async () => {
    const user = userEvent.setup();
    
    // Mock FileReader to trigger error
    class MockFileReaderError {
      onerror: ((event: any) => void) | null = null;
      
      readAsDataURL(file: File) {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('FileReader error'));
          }
        }, 100);
      }
    }
    
    global.FileReader = MockFileReaderError as any;
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to read file/)).toBeInTheDocument();
    });
  });

  it('maintains aspect ratio for avatar display', () => {
    render(<AvatarUpload {...defaultProps} value="https://example.com/avatar.jpg" />);
    
    const avatarContainer = screen.getByRole('button');
    expect(avatarContainer).toHaveClass('aspect-square');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} />);
    
    const avatar = screen.getByRole('button');
    
    // Should be focusable
    await user.tab();
    expect(avatar).toHaveFocus();
    
    // Should activate with Enter key
    await user.keyboard('{Enter}');
    
    // Check that file input is available
    const fileInput = screen.getByRole('button', { hidden: true });
    expect(fileInput).toBeInTheDocument();
  });

  it('sends correct form data in upload request', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { file_url: 'https://example.com/avatar.png' }
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    
    render(<AvatarUpload {...defaultProps} />);
    
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/files/upload', {
        method: 'POST',
        body: expect.any(FormData),
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
    });
  });
});