package services

import (
	"bytes"
	"context"
	"crypto/md5"
	"database/sql"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"agromart2/apps/server/config"
	"agromart2/db"
)

// FileUploadService handles file upload operations
type FileUploadService struct {
	minioService *MinIOService
	config       *config.Config
	queries      *db.Queries
}

// NewFileUploadService creates a new file upload service
func NewFileUploadService(minioService *MinIOService, config *config.Config, queries *db.Queries) *FileUploadService {
	return &FileUploadService{
		minioService: minioService,
		config:       config,
		queries:      queries,
	}
}

// UploadRequest represents a file upload request
type UploadRequest struct {
	File        multipart.File
	Header      *multipart.FileHeader
	EntityType  string
	EntityID    uuid.UUID
	FileType    string
	UserID      uuid.UUID
	TenantID    uuid.UUID
}

// UploadResponse represents the response after a successful upload
type UploadResponse struct {
	FileID   uuid.UUID
	FileName string
	FilePath string
	FileURL  string
	FileSize int64
}

// ProcessUpload processes a file upload with validation, compression, and storage
func (s *FileUploadService) ProcessUpload(ctx context.Context, req *UploadRequest) (*UploadResponse, error) {
	// Validate file
	if err := s.validateFile(req); err != nil {
		return nil, fmt.Errorf("file validation failed: %w", err)
	}

	// Read file data
	data, err := io.ReadAll(req.File)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Generate checksum
	checksum := fmt.Sprintf("%x", md5.Sum(data))

	// Check for duplicate files
	existingFile, err := s.queries.GetFileByChecksum(ctx, db.GetFileByChecksumParams{
		Checksum: sql.NullString{String: checksum, Valid: true},
		TenantID: req.TenantID,
	})
	if err == nil && existingFile.TenantID == req.TenantID {
		// Return existing file info
		fileURL, err := s.minioService.GetFileURL(ctx, existingFile.ObjectKey, 24*time.Hour)
		if err != nil {
			return nil, fmt.Errorf("failed to generate file URL: %w", err)
		}

		return &UploadResponse{
			FileID:   existingFile.ID,
			FileName: existingFile.FileName,
			FilePath: existingFile.FilePath,
			FileURL:  fileURL,
			FileSize: existingFile.FileSize,
		}, nil
	}

	// Process image if needed
	processedData := data
	var width, height *int
	var compressionApplied bool

	if strings.HasPrefix(req.Header.Header.Get("Content-Type"), "image/") {
		processedData, width, height, compressionApplied, err = s.processImage(data, req.Header.Filename)
		if err != nil {
			return nil, fmt.Errorf("image processing failed: %w", err)
		}
	}

	// Generate unique filename
	ext := filepath.Ext(req.Header.Filename)
	fileName := fmt.Sprintf("%s_%d%s", strings.TrimSuffix(req.Header.Filename, ext), time.Now().Unix(), ext)

	// Generate object key
	objectKey := fmt.Sprintf("%s/%s/%s", req.EntityType, req.EntityID, fileName)

	// Upload to MinIO
	contentType := req.Header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	err = s.minioService.UploadFile(ctx, objectKey, contentType, processedData, int64(len(processedData)))
	if err != nil {
		return nil, fmt.Errorf("failed to upload to MinIO: %w", err)
	}

	// Create file record in database
	filePath := fmt.Sprintf("/%s/%s", s.config.MinIOBucketName, objectKey)

	// Parse duration for expires_at (optional)
	var expiresAt *time.Time
	if req.FileType == FileTypeTemp {
		expiry := time.Now().Add(24 * time.Hour)
		expiresAt = &expiry
	}

	dbFile, err := s.queries.CreateFile(ctx, db.CreateFileParams{
		TenantID:           req.TenantID,
		OriginalName:       req.Header.Filename,
		FileName:           fileName,
		FilePath:           filePath,
		FileSize:           int64(len(processedData)),
		MimeType:           contentType,
		FileType:           req.FileType,
		EntityType:         req.EntityType,
		EntityID:           req.EntityID,
		Width:              int32ToNullInt32(width),
		Height:             int32ToNullInt32(height),
		CompressionApplied: sql.NullBool{Bool: compressionApplied, Valid: true},
		VirusScanned:       sql.NullBool{Bool: false, Valid: true},
		VirusScanStatus:    sql.NullString{String: VirusScanStatusPending, Valid: true},
		Checksum:           sql.NullString{String: checksum, Valid: true},
		BucketName:         s.config.MinIOBucketName,
		ObjectKey:          objectKey,
		IsPublic:           sql.NullBool{Bool: true, Valid: true},
		UploadedBy:         uuid.NullUUID{UUID: req.UserID, Valid: true},
		ExpiresAt:          timeToNullTime(expiresAt),
	})
	if err != nil {
		// Try to clean up uploaded file
		_ = s.minioService.DeleteFile(ctx, objectKey)
		return nil, fmt.Errorf("failed to create file record: %w", err)
	}

	// Generate file URL
	fileURL, err := s.minioService.GetFileURL(ctx, objectKey, 24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate file URL: %w", err)
	}

	return &UploadResponse{
		FileID:   dbFile.ID,
		FileName: dbFile.FileName,
		FilePath: dbFile.FilePath,
		FileURL:  fileURL,
		FileSize: dbFile.FileSize,
	}, nil
}

// validateFile validates the uploaded file
func (s *FileUploadService) validateFile(req *UploadRequest) error {
	// Check file size
	if req.Header.Size > s.config.MaxFileSize {
		return fmt.Errorf("file size %d exceeds maximum allowed size %d", req.Header.Size, s.config.MaxFileSize)
	}

	// Check file type
	contentType := req.Header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Validate image types
	if strings.HasPrefix(contentType, "image/") {
		allowedTypes := strings.Split(s.config.AllowedImageTypes, ",")
		validType := false
		for _, allowedType := range allowedTypes {
			if strings.TrimSpace(allowedType) == contentType {
				validType = true
				break
			}
		}
		if !validType {
			return fmt.Errorf("image type %s not allowed", contentType)
		}
	} else {
		// Validate document types
		allowedTypes := strings.Split(s.config.AllowedDocTypes, ",")
		validType := false
		for _, allowedType := range allowedTypes {
			if strings.TrimSpace(allowedType) == contentType {
				validType = true
				break
			}
		}
		if !validType {
			return fmt.Errorf("document type %s not allowed", contentType)
		}
	}

	return nil
}

// processImage processes and compresses images
func (s *FileUploadService) processImage(data []byte, filename string) ([]byte, *int, *int, bool, error) {
	// Decode image
	reader := bytes.NewReader(data)
	img, format, err := image.Decode(reader)
	if err != nil {
		return data, nil, nil, false, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get image dimensions
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Check if resizing is needed
	needsResize := width > s.config.MaxImageWidth || height > s.config.MaxImageHeight
	needsCompression := false

	// Resize if necessary
	if needsResize {
		// Calculate new dimensions maintaining aspect ratio
		ratio := float64(width) / float64(height)
		var newWidth, newHeight int

		if width > height {
			newWidth = s.config.MaxImageWidth
			newHeight = int(float64(newWidth) / ratio)
		} else {
			newHeight = s.config.MaxImageHeight
			newWidth = int(float64(newHeight) * ratio)
		}

		// For now, we'll use the original image and just log the resize need
		// In a production system, you'd want to use a proper image resizing library
		log.Printf("Image resize needed: %dx%d -> %dx%d", width, height, newWidth, newHeight)
	}

	// Compress image based on format
	var output bytes.Buffer
	switch format {
	case "jpeg":
		needsCompression = true
		err = jpeg.Encode(&output, img, &jpeg.Options{Quality: s.config.ImageQuality})
		if err != nil {
			return data, &width, &height, false, fmt.Errorf("failed to compress JPEG: %w", err)
		}
	case "png":
		needsCompression = true
		err = png.Encode(&output, img)
		if err != nil {
			return data, &width, &height, false, fmt.Errorf("failed to compress PNG: %w", err)
		}
	default:
		// For other formats, return original
		return data, &width, &height, false, nil
	}

	compressedData := output.Bytes()
	compressionRatio := float64(len(data)-len(compressedData)) / float64(len(data)) * 100

	log.Printf("Image compressed: %s -> %s (%.1f%% reduction)",
		formatBytes(len(data)), formatBytes(len(compressedData)), compressionRatio)

	return compressedData, &width, &height, needsCompression, nil
}

// GetFileURL generates a signed URL for file access
func (s *FileUploadService) GetFileURL(ctx context.Context, fileID uuid.UUID, tenantID uuid.UUID, expiry time.Duration) (string, error) {
	file, err := s.queries.GetFile(ctx, db.GetFileParams{
		ID:       fileID,
		TenantID: tenantID,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get file: %w", err)
	}

	return s.minioService.GetFileURL(ctx, file.ObjectKey, expiry)
}

// DeleteFile deletes a file from both database and storage
func (s *FileUploadService) DeleteFile(ctx context.Context, fileID uuid.UUID, tenantID uuid.UUID) error {
	// Get file info
	file, err := s.queries.GetFile(ctx, db.GetFileParams{
		ID:       fileID,
		TenantID: tenantID,
	})
	if err != nil {
		return fmt.Errorf("failed to get file: %w", err)
	}

	// Delete from MinIO
	err = s.minioService.DeleteFile(ctx, file.ObjectKey)
	if err != nil {
		log.Printf("Warning: failed to delete file from MinIO: %v", err)
	}

	// Delete from database
	return s.queries.DeleteFile(ctx, db.DeleteFileParams{
		ID:       fileID,
		TenantID: tenantID,
	})
}

// Helper functions
func int32ToNullInt32(val *int) sql.NullInt32 {
	if val == nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: int32(*val), Valid: true}
}

func timeToNullTime(val *time.Time) sql.NullTime {
	if val == nil {
		return sql.NullTime{Valid: false}
	}
	return sql.NullTime{Time: *val, Valid: true}
}

func formatBytes(bytes int) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}