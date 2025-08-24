"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Alert, AlertDescription } from './alert'
import { Progress } from './progress'

export interface FileUploadProps {
  accept?: string
  maxSize?: number // in MB
  maxFiles?: number
  entityType?: string
  entityId?: string
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: string) => void
  className?: string
  showPreview?: boolean
  allowMultiple?: boolean
  disabled?: boolean
}

export interface UploadedFile {
  id: string
  name: string
  url: string
  size: number
  type: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = "image/*",
  maxSize = 2, // 2MB default
  maxFiles = 1,
  entityType = "general",
  entityId = "",
  onUploadComplete,
  onUploadError,
  className,
  showPreview = true,
  allowMultiple = false,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    if (accept !== "*/*") {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const isValidType = acceptedTypes.some(acceptedType => {
        if (acceptedType.endsWith('/*')) {
          const mainType = acceptedType.slice(0, -2)
          return file.type.startsWith(mainType)
        }
        return file.type === acceptedType
      })

      if (!isValidType) {
        return `File type not supported. Accepted types: ${accept}`
      }
    }

    return null
  }, [maxSize, accept])

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)

    // Check max files limit
    if (!allowMultiple && fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`)
      return
    }

    if (allowMultiple && files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
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
      onUploadError?.(errors.join('\n'))
    }

    if (validFiles.length === 0) return

    // Update files state
    const updatedFiles = allowMultiple ? [...files, ...validFiles] : validFiles
    setFiles(updatedFiles)

    // Generate previews for images
    if (showPreview && accept.includes('image/')) {
      const newPreviews: string[] = []

      for (const file of validFiles) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              newPreviews.push(e.target.result as string)
              if (newPreviews.length === validFiles.length) {
                setPreviews(allowMultiple ? [...previews, ...newPreviews] : newPreviews)
              }
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [files, previews, validateFile, allowMultiple, maxFiles, showPreview, accept, onUploadError])

  const uploadFile = useCallback(async (file: File, index: number): Promise<UploadedFile | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)
    formData.append('entity_id', entityId)
    formData.append('file_type', file.type.startsWith('image/') ? 'avatar' : 'document')

    try {
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
        return {
          id: result.data.file_id,
          name: result.data.file_name,
          url: result.data.file_url,
          size: result.data.file_size,
          type: file.type
        }
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }, [entityType, entityId])

  const uploadAllFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return

    setIsUploading(true)
    setError('')

    const progressUpdates: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))
    setUploadProgress(progressUpdates)

    const uploadedFiles: UploadedFile[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Update progress to uploading
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'uploading' as const, progress: 50 } : p
        ))

        const uploadedFile = await uploadFile(file!, i)

        if (uploadedFile) {
          uploadedFiles.push(uploadedFile)
          setUploadProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'completed' as const, progress: 100 } : p
          ))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        errors.push(`${file!.name}: ${errorMessage}`)
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' as const, progress: 0, error: errorMessage } : p
        ))
      }
    }

    setIsUploading(false)

    if (errors.length > 0) {
      setError(errors.join('\n'))
      onUploadError?.(errors.join('\n'))
    }

    if (uploadedFiles.length > 0) {
      onUploadComplete?.(uploadedFiles)
    }

    // Clear completed uploads
    if (uploadedFiles.length === files.length) {
      setFiles([])
      setPreviews([])
      setUploadProgress([])
    }
  }, [files, isUploading, uploadFile, onUploadComplete, onUploadError])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (showPreview) {
      setPreviews(prev => prev.filter((_, i) => i !== index))
    }
    setUploadProgress(prev => prev.filter((_, i) => i !== index))
  }, [showPreview])

  const clearAll = useCallback(() => {
    setFiles([])
    setPreviews([])
    setUploadProgress([])
    setError('')
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles, disabled])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const openFileDialog = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={allowMultiple}
          onChange={handleFileInput}
          className="sr-only"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-muted-foreground">
            {accept.replace(/\*/g, '').replace(/\//g, ' ')} up to {maxSize}MB
            {maxFiles > 1 && `, max ${maxFiles} files`}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {/* File Previews */}
      {showPreview && previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Files to upload ({files.length})</h4>
            {files.length > 1 && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => {
              const progress = uploadProgress.find(p => p.file === file)
              return (
                <div key={index} className="flex items-center space-x-3 p-2 border rounded-lg">
                  <div className="flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <File className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    {progress && (
                      <div className="mt-1">
                        <Progress value={progress.progress} className="h-1" />
                        {progress.error && (
                          <p className="text-xs text-destructive mt-1">{progress.error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {progress?.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {progress?.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end space-x-2">
          <Button
            onClick={uploadAllFiles}
            disabled={isUploading || disabled}
            className="min-w-[100px]"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length > 1 ? 'All' : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}

export default FileUpload