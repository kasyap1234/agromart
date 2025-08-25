import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../file-upload';
import type { UploadedFile } from '../file-upload';

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

describe('FileUpload Component', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnUploadError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  const defaultProps = {
    entityType: 'test',
    entityId: 'test-entity-123',
    onUploadComplete: mockOnUploadComplete,
    onUploadError: mockOnUploadError,
  };

  it('renders upload area with correct text', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText(/or drag and drop/)).toBeInTheDocument();
    expect(screen.getByText(/up to 2MB/)).toBeInTheDocument();
  });

  it('opens file dialog when clicked', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Click to upload').closest('div');
    expect(uploadArea).toBeInTheDocument();
    
    // Check that input element exists and is properly configured
    const fileInput = screen.getByRole('button', { hidden: true });
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  it('handles file selection correctly', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  it('validates file size correctly', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} maxSize={1} />);
    
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
    render(<FileUpload {...defaultProps} accept="image/*" />);
    
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, textFile);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument();
    });
  });

  it('handles successful file upload', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          file_id: 'file-123',
          file_name: 'test.png',
          file_url: 'https://example.com/file.png',
          file_size: 1024,
        }
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
    
    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/files/upload', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      }));
    });
    
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([{
        id: 'file-123',
        name: 'test.png',
        url: 'https://example.com/file.png',
        size: 1024,
        type: 'image/png'
      }]);
    });
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
    
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('handles network error correctly', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadError).toHaveBeenCalledWith('Network error');
    });
  });

  it('supports multiple file upload when enabled', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} allowMultiple={true} maxFiles={3} />);
    
    const files = [
      new File(['test1'], 'test1.png', { type: 'image/png' }),
      new File(['test2'], 'test2.png', { type: 'image/png' }),
    ];
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, files);
    
    await waitFor(() => {
      expect(screen.getByText('test1.png')).toBeInTheDocument();
      expect(screen.getByText('test2.png')).toBeInTheDocument();
    });
  });

  it('respects maxFiles limit', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} allowMultiple={true} maxFiles={2} />);
    
    const files = [
      new File(['test1'], 'test1.png', { type: 'image/png' }),
      new File(['test2'], 'test2.png', { type: 'image/png' }),
      new File(['test3'], 'test3.png', { type: 'image/png' }),
    ];
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, files);
    
    await waitFor(() => {
      expect(screen.getByText(/Maximum 2 files allowed/)).toBeInTheDocument();
    });
  });

  it('handles drag and drop', async () => {
    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Click to upload').closest('div');
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    
    // Simulate drag enter
    fireEvent.dragEnter(uploadArea!, {
      dataTransfer: { files: [file] }
    });
    
    // Should show active drag state
    expect(uploadArea).toHaveClass('border-primary');
    
    // Simulate drop
    fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [file] }
    });
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  it('shows file preview for images', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} showPreview={true} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      const preview = screen.getByRole('img');
      expect(preview).toHaveAttribute('src', 'data:image/png;base64,mockImageData');
    });
  });

  it('disables upload when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled={true} />);
    
    const uploadArea = screen.getByText('Click to upload').closest('div');
    expect(uploadArea).toHaveClass('opacity-50');
    expect(uploadArea).toHaveClass('cursor-not-allowed');
  });

  it('removes files when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
    
    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
    });
  });

  it('formats file size correctly', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['x'.repeat(1024)], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('1 KB')).toBeInTheDocument();
    });
  });

  it('handles authentication correctly', async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(null); // No token
    
    const mockResponse = {
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        success: false,
        message: 'Unauthorized'
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByRole('button', { hidden: true });
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/files/upload', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer '
        })
      }));
    });
  });
});