package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"agromart2/apps/server/config"
)

// MinIOService handles file storage operations
type MinIOService struct {
	client     *minio.Client
	bucketName string
}

// NewMinIOService creates a new MinIO service instance
func NewMinIOService(cfg *config.Config) (*MinIOService, error) {
	// Initialize MinIO client
	minioClient, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUSessl,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	service := &MinIOService{
		client:     minioClient,
		bucketName: cfg.MinIOBucketName,
	}

	// Ensure bucket exists
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, cfg.MinIOBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = minioClient.MakeBucket(ctx, cfg.MinIOBucketName, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	// Set bucket policy for public access if needed
	// This is optional and depends on your security requirements
	policy := `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::` + cfg.MinIOBucketName + `/*"]
			}
		]
	}`

	err = minioClient.SetBucketPolicy(ctx, cfg.MinIOBucketName, policy)
	if err != nil {
		// Log warning but don't fail - policy might already be set
		fmt.Printf("Warning: failed to set bucket policy: %v\n", err)
	}

	return service, nil
}

// UploadFile uploads a file to MinIO
func (s *MinIOService) UploadFile(ctx context.Context, objectKey, contentType string, data []byte, size int64) error {
	reader := bytes.NewReader(data)

	_, err := s.client.PutObject(ctx, s.bucketName, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})

	return err
}

// UploadFileFromReader uploads a file from an io.Reader
func (s *MinIOService) UploadFileFromReader(ctx context.Context, objectKey, contentType string, reader io.Reader, size int64) error {
	_, err := s.client.PutObject(ctx, s.bucketName, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})

	return err
}

// DownloadFile downloads a file from MinIO
func (s *MinIOService) DownloadFile(ctx context.Context, objectKey string) ([]byte, error) {
	object, err := s.client.GetObject(ctx, s.bucketName, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer object.Close()

	return io.ReadAll(object)
}

// GetFileURL returns a presigned URL for accessing the file
func (s *MinIOService) GetFileURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.bucketName, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}

	return url.String(), nil
}

// GetUploadURL returns a presigned URL for uploading a file
func (s *MinIOService) GetUploadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	url, err := s.client.PresignedPutObject(ctx, s.bucketName, objectKey, expiry)
	if err != nil {
		return "", err
	}

	return url.String(), nil
}

// DeleteFile deletes a file from MinIO
func (s *MinIOService) DeleteFile(ctx context.Context, objectKey string) error {
	return s.client.RemoveObject(ctx, s.bucketName, objectKey, minio.RemoveObjectOptions{})
}

// FileExists checks if a file exists in MinIO
func (s *MinIOService) FileExists(ctx context.Context, objectKey string) (bool, error) {
	_, err := s.client.StatObject(ctx, s.bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// GetFileInfo gets file metadata from MinIO
func (s *MinIOService) GetFileInfo(ctx context.Context, objectKey string) (*minio.ObjectInfo, error) {
	info, err := s.client.StatObject(ctx, s.bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return nil, err
	}
	return &info, nil
}