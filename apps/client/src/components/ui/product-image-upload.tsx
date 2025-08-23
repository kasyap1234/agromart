"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, Image, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Alert, AlertDescription } from './alert'

export interface ProductImageUploadProps {
  value?: string[]
  onChange: (urls: string[]) => void
  accept?: string
  maxSize?: number // in MB
  maxImages?: number
  className?: string
  disabled?: boolean
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  value = [],
  onChange,
  accept = "image/*",
  maxSize = 5, // 5MB default for product images
  maxImages = 5,
  className,
  disabled = false
}) => {
  const [previews, setPreviews] = useState<string[]>(value)
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

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'product')
    formData.append('entity_id', 'current') // Will be replaced with actual product ID
    formData.append('file_type', 'image')

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
      return result.data.file_url
    } else {
      throw new Error(result.message || 'Upload failed')
    }
  }, [])

  const handleFiles = useCallback(async (files: FileList) => {
    setError('')

    const fileArray = Array.from(files)
    const remainingSlots = maxImages - previews.length

    if (fileArray.length > remainingSlots) {
      setError(`Maximum ${maxImages} images allowed. You can only add ${remainingSlots} more.`)
      return
    }

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    if (validFiles.length === 0) return

    setIsUploading(true)

    try {
      const uploadPromises = validFiles.map(uploadFile)
      const uploadedUrls = await Promise.all(uploadPromises)

      const newPreviews = [...previews, ...uploadedUrls]
      setPreviews(newPreviews)
      onChange(newPreviews)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [previews, maxImages, validateFile, uploadFile, onChange])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeImage = useCallback((index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index)
    setPreviews(newPreviews)
    onChange(newPreviews)
  }, [previews, onChange])

  const openFileDialog = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Existing Images */}
        {previews.map((preview, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={preview}
              alt={`Product image ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeImage(index)}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Upload Button */}
        {previews.length < maxImages && (
          <div
            className={cn(
              "relative aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors",
              disabled ? "opacity-50 cursor-not-allowed" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onClick={openFileDialog}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              onChange={handleFileInput}
              className="sr-only"
              disabled={disabled || isUploading}
            />

            <div className="flex flex-col items-center space-y-2 text-muted-foreground">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              ) : (
                <Plus className="h-6 w-6" />
              )}
              <span className="text-xs text-center">
                {isUploading ? 'Uploading...' : 'Add Image'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{previews.length} of {maxImages} images</span>
        <span>Max {maxSize}MB per image</span>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ProductImageUpload