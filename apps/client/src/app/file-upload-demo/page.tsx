"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { ProductImageUpload } from '@/components/ui/product-image-upload'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  Shield,
  Image,
  File,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import type { UploadedFile } from '@/components/ui/file-upload'

export default function FileUploadDemoPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<string[]>([])

  const handleFileUploadComplete = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files])
  }

  const handleFileUploadError = (error: string) => {
    console.error('Upload error:', error)
  }

  const clearAllUploads = () => {
    setUploadedFiles([])
    setAvatarUrl(null)
    setProductImages([])
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Secure File Upload System</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive file upload solution with image compression, virus scanning, MinIO storage, and secure access controls
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-1 text-green-500" />
            Virus Scanning
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-blue-500" />
            Image Compression
          </div>
          <div className="flex items-center">
            <Upload className="h-4 w-4 mr-1 text-purple-500" />
            MinIO Storage
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            System Features
          </CardTitle>
          <CardDescription>
            Complete security and performance features implemented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                Security Features
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Server-side file type validation</li>
                <li>• ClamAV virus scanning integration</li>
                <li>• Signed URLs for secure access</li>
                <li>• Rate limiting protection</li>
                <li>• File size and type restrictions</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Image className="h-4 w-4 mr-2 text-blue-500" />
                Image Processing
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic image compression</li>
                <li>• Multiple format support (JPEG, PNG, WebP)</li>
                <li>• Smart resizing for optimization</li>
                <li>• Quality preservation</li>
                <li>• Metadata extraction</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Upload className="h-4 w-4 mr-2 text-purple-500" />
                Storage & Access
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• MinIO object storage</li>
                <li>• Scalable cloud storage</li>
                <li>• Presigned URLs</li>
                <li>• CDN-ready architecture</li>
                <li>• Multi-tenant support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Demos */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General Upload</TabsTrigger>
          <TabsTrigger value="avatar">Avatar Upload</TabsTrigger>
          <TabsTrigger value="product">Product Images</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <File className="h-5 w-5 mr-2" />
                General File Upload
              </CardTitle>
              <CardDescription>
                Drag-and-drop file upload with real-time progress, validation, and preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept="image/*,.pdf,.doc,.docx,.txt"
                maxSize={5}
                maxFiles={5}
                entityType="demo"
                entityId="general-upload"
                onUploadComplete={handleFileUploadComplete}
                onUploadError={handleFileUploadError}
                showPreview={true}
                allowMultiple={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avatar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2" />
                User Avatar Upload
              </CardTitle>
              <CardDescription>
                Single image upload optimized for user profile pictures with immediate preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AvatarUpload
                  accept="image/*"
                  maxSize={2}
                  onChange={(file) => {
                    if (file) {
                      // In a real app, this would be the uploaded URL
                      const url = URL.createObjectURL(file)
                      setAvatarUrl(url)
                    } else {
                      setAvatarUrl(null)
                    }
                  }}
                  value={avatarUrl}
                  placeholder="Upload Avatar"
                />

                {avatarUrl && (
                  <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700">
                      Avatar uploaded successfully! URL: {avatarUrl}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="product" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2" />
                Product Image Gallery
              </CardTitle>
              <CardDescription>
                Multiple image upload system for product catalogs with grid layout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ProductImageUpload
                  accept="image/*"
                  maxSize={5}
                  maxImages={5}
                  onChange={setProductImages}
                  value={productImages}
                />

                {productImages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Uploaded Product Images:</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {productImages.map((url, index) => (
                        <div key={index} className="aspect-square">
                          <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover rounded border"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Summary</CardTitle>
              <CardDescription>
                Overview of all uploaded files and system status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadedFiles.length}
                  </div>
                  <div className="text-sm text-muted-foreground">General Files</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {avatarUrl ? 1 : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Avatar Uploads</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {productImages.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Product Images</div>
                </div>
              </div>

              <Separator />

              {/* Recent Uploads */}
              {uploadedFiles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent General Uploads:</h4>
                  <div className="space-y-2">
                    {uploadedFiles.slice(-5).map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <File className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">Uploaded</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Status */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  System Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>MinIO Storage: Connected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Image Compression: Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>Virus Scanning: Demo Mode</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Rate Limiting: Enabled</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button onClick={clearAllUploads} variant="outline">
                  Clear All Uploads
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technical Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            Backend and frontend technologies used in this system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-700">Backend (Go)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Echo web framework</li>
                <li>• MinIO client for S3-compatible storage</li>
                <li>• Image processing with Go standard library</li>
                <li>• PostgreSQL with SQLC for type safety</li>
                <li>• JWT authentication middleware</li>
                <li>• Multi-tenant architecture</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-blue-700">Frontend (React/Next.js)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Next.js 15 with TypeScript</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Radix UI components</li>
                <li>• React Hook Form integration</li>
                <li>• Real-time upload progress</li>
                <li>• Drag-and-drop functionality</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}