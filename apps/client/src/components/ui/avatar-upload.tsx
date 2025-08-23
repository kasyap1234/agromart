"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { Alert, AlertDescription } from './alert'

export interface AvatarUploadProps {
  value?: string | null
  onChange: (file: File | null) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
  disabled?: boolean
  placeholder?: string
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  accept = "image/*",
  maxSize = 2, // 2MB default
  className,
  disabled = false,
  placeholder = "Upload photo"
}) => {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }

    return null
  }, [maxSize])

  const handleFileSelect = useCallback(async (file: File | null) => {
    setError('')

    if (!file) {
      setPreview(value || null)
      onChange(null)
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)

    // Upload file immediately
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', 'user')
      formData.append('entity_id', 'current') // Will be replaced with actual user ID
      formData.append('file_type', 'avatar')

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const result = await response.json()

      if (result.success) {
        // Update preview with actual uploaded URL
        setPreview(result.data.file_url)
        // For now, just pass the file - in a real app you'd want to pass the uploaded file info
        onChange(file)
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setPreview(value || null)
    } finally {
      setIsUploading(false)
    }
  }, [value, onChange, validateFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileSelect(file)
  }, [handleFileSelect])

  const clearFile = useCallback(() => {
    setPreview(null)
    setError('')
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onChange])

  const openFileDialog = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  const getInitials = (placeholder: string) => {
    return placeholder.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={preview || undefined} />
            <AvatarFallback className="text-lg">
              {preview ? <User className="h-8 w-8" /> : getInitials(placeholder)}
            </AvatarFallback>
          </Avatar>

          {(preview || value) && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={clearFile}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || isUploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={disabled || isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Choose Photo'}
          </Button>

          <p className="text-xs text-muted-foreground mt-1">
            {accept.replace('/*', '')} up to {maxSize}MB
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default AvatarUpload