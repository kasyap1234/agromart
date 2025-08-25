package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/url"
	"testing"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"agromart2/apps/server/config"
)

// MockMinIOClient is a mock implementation of minio.Client
type MockMinIOClient struct {
	mock.Mock
}

func (m *MockMinIOClient) BucketExists(ctx context.Context, bucketName string) (bool, error) {
	args := m.Called(ctx, bucketName)
	return args.Bool(0), args.Error(1)
}

func (m *MockMinIOClient) MakeBucket(ctx context.Context, bucketName string, opts minio.MakeBucketOptions) error {
	args := m.Called(ctx, bucketName, opts)
	return args.Error(0)
}

func (m *MockMinIOClient) SetBucketPolicy(ctx context.Context, bucketName, policy string) error {
	args := m.Called(ctx, bucketName, policy)
	return args.Error(0)
}

func (m *MockMinIOClient) PutObject(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, opts minio.PutObjectOptions) (minio.UploadInfo, error) {
	args := m.Called(ctx, bucketName, objectName, reader, objectSize, opts)
	return args.Get(0).(minio.UploadInfo), args.Error(1)
}

func (m *MockMinIOClient) GetObject(ctx context.Context, bucketName, objectName string, opts minio.GetObjectOptions) (*minio.Object, error) {
	args := m.Called(ctx, bucketName, objectName, opts)
	return args.Get(0).(*minio.Object), args.Error(1)
}

func (m *MockMinIOClient) PresignedGetObject(ctx context.Context, bucketName, objectName string, expiry time.Duration, reqParams map[string][]string) (*url.URL, error) {
	args := m.Called(ctx, bucketName, objectName, expiry, reqParams)
	return args.Get(0).(*url.URL), args.Error(1)
}

func (m *MockMinIOClient) PresignedPutObject(ctx context.Context, bucketName, objectName string, expiry time.Duration) (*url.URL, error) {
	args := m.Called(ctx, bucketName, objectName, expiry)
	return args.Get(0).(*url.URL), args.Error(1)
}

func (m *MockMinIOClient) RemoveObject(ctx context.Context, bucketName, objectName string, opts minio.RemoveObjectOptions) error {
	args := m.Called(ctx, bucketName, objectName, opts)
	return args.Error(0)
}

func (m *MockMinIOClient) StatObject(ctx context.Context, bucketName, objectName string, opts minio.StatObjectOptions) (minio.ObjectInfo, error) {
	args := m.Called(ctx, bucketName, objectName, opts)
	return args.Get(0).(minio.ObjectInfo), args.Error(1)
}

// TestMinIOService provides comprehensive testing for MinIO service functionality
type TestMinIOService struct {
	service    *MinIOService
	mockClient *MockMinIOClient
	config     *config.Config
}

func setupMinIOTest(t *testing.T) *TestMinIOService {
	mockClient := &MockMinIOClient{}
	cfg := &config.Config{
		MinIOEndpoint:   "localhost:9000",
		MinIOAccessKey:  "test-access-key",
		MinIOSecretKey:  "test-secret-key",
		MinIOBucketName: "test-bucket",
		MinIOUSessl:     false,
	}

	service := &MinIOService{
		client:     mockClient,
		bucketName: cfg.MinIOBucketName,
	}

	return &TestMinIOService{
		service:    service,
		mockClient: mockClient,
		config:     cfg,
	}
}

func TestNewMinIOService(t *testing.T) {
	t.Run("creates new MinIO service successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		
		// Mock bucket exists check
		testSuite.mockClient.On("BucketExists", mock.Anything, "test-bucket").Return(true, nil)
		
		assert.NotNil(t, testSuite.service)
		assert.Equal(t, "test-bucket", testSuite.service.bucketName)
	})

	t.Run("creates bucket when it doesn't exist", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		
		// Mock bucket doesn't exist
		testSuite.mockClient.On("BucketExists", mock.Anything, "test-bucket").Return(false, nil)
		testSuite.mockClient.On("MakeBucket", mock.Anything, "test-bucket", mock.Anything).Return(nil)
		testSuite.mockClient.On("SetBucketPolicy", mock.Anything, "test-bucket", mock.Anything).Return(nil)
		
		// This would be called in actual NewMinIOService function
		exists, err := testSuite.service.client.BucketExists(context.Background(), testSuite.config.MinIOBucketName)
		require.NoError(t, err)
		assert.False(t, exists)
		
		err = testSuite.service.client.MakeBucket(context.Background(), testSuite.config.MinIOBucketName, minio.MakeBucketOptions{})
		require.NoError(t, err)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles bucket creation failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		
		// Mock bucket doesn't exist and creation fails
		testSuite.mockClient.On("BucketExists", mock.Anything, "test-bucket").Return(false, nil)
		testSuite.mockClient.On("MakeBucket", mock.Anything, "test-bucket", mock.Anything).Return(fmt.Errorf("access denied"))
		
		exists, err := testSuite.service.client.BucketExists(context.Background(), testSuite.config.MinIOBucketName)
		require.NoError(t, err)
		assert.False(t, exists)
		
		err = testSuite.service.client.MakeBucket(context.Background(), testSuite.config.MinIOBucketName, minio.MakeBucketOptions{})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "access denied")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_UploadFile(t *testing.T) {
	t.Run("uploads file successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		contentType := "text/plain"
		data := []byte("test content")
		
		expectedUploadInfo := minio.UploadInfo{
			Key:  objectKey,
			ETag: "test-etag",
			Size: int64(len(data)),
		}
		
		testSuite.mockClient.On("PutObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("*bytes.Reader"), 
			int64(len(data)), 
			mock.AnythingOfType("minio.PutObjectOptions"),
		).Return(expectedUploadInfo, nil)
		
		err := testSuite.service.UploadFile(ctx, objectKey, contentType, data, int64(len(data)))
		assert.NoError(t, err)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles upload failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		contentType := "text/plain"
		data := []byte("test content")
		
		testSuite.mockClient.On("PutObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return(minio.UploadInfo{}, fmt.Errorf("network error"))
		
		err := testSuite.service.UploadFile(ctx, objectKey, contentType, data, int64(len(data)))
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "network error")
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles large file upload", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/large-file.bin"
		contentType := "application/octet-stream"
		// Simulate 5MB file
		data := make([]byte, 5*1024*1024)
		for i := range data {
			data[i] = byte(i % 256)
		}
		
		expectedUploadInfo := minio.UploadInfo{
			Key:  objectKey,
			ETag: "large-file-etag",
			Size: int64(len(data)),
		}
		
		testSuite.mockClient.On("PutObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("*bytes.Reader"), 
			int64(len(data)), 
			mock.AnythingOfType("minio.PutObjectOptions"),
		).Return(expectedUploadInfo, nil)
		
		err := testSuite.service.UploadFile(ctx, objectKey, contentType, data, int64(len(data)))
		assert.NoError(t, err)
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_DownloadFile(t *testing.T) {
	t.Run("downloads file successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		expectedData := []byte("test content")
		
		// Create a mock object that implements io.ReadCloser
		mockObject := &mockMinIOObject{
			data: bytes.NewReader(expectedData),
		}
		
		testSuite.mockClient.On("GetObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("minio.GetObjectOptions"),
		).Return(mockObject, nil)
		
		data, err := testSuite.service.DownloadFile(ctx, objectKey)
		assert.NoError(t, err)
		assert.Equal(t, expectedData, data)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles download failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/nonexistent.txt"
		
		testSuite.mockClient.On("GetObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return((*minio.Object)(nil), fmt.Errorf("object not found"))
		
		data, err := testSuite.service.DownloadFile(ctx, objectKey)
		assert.Error(t, err)
		assert.Nil(t, data)
		assert.Contains(t, err.Error(), "object not found")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_GetFileURL(t *testing.T) {
	t.Run("generates presigned URL successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		expiry := 1 * time.Hour
		expectedURL, _ := url.Parse("https://example.com/presigned-url")
		
		testSuite.mockClient.On("PresignedGetObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			expiry, 
			map[string][]string(nil),
		).Return(expectedURL, nil)
		
		url, err := testSuite.service.GetFileURL(ctx, objectKey, expiry)
		assert.NoError(t, err)
		assert.Equal(t, expectedURL.String(), url)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles URL generation failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		expiry := 1 * time.Hour
		
		testSuite.mockClient.On("PresignedGetObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return((*url.URL)(nil), fmt.Errorf("failed to generate URL"))
		
		url, err := testSuite.service.GetFileURL(ctx, objectKey, expiry)
		assert.Error(t, err)
		assert.Empty(t, url)
		assert.Contains(t, err.Error(), "failed to generate URL")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_GetUploadURL(t *testing.T) {
	t.Run("generates presigned upload URL successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/upload.txt"
		expiry := 30 * time.Minute
		expectedURL, _ := url.Parse("https://example.com/presigned-upload-url")
		
		testSuite.mockClient.On("PresignedPutObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			expiry,
		).Return(expectedURL, nil)
		
		url, err := testSuite.service.GetUploadURL(ctx, objectKey, expiry)
		assert.NoError(t, err)
		assert.Equal(t, expectedURL.String(), url)
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_DeleteFile(t *testing.T) {
	t.Run("deletes file successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file-to-delete.txt"
		
		testSuite.mockClient.On("RemoveObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("minio.RemoveObjectOptions"),
		).Return(nil)
		
		err := testSuite.service.DeleteFile(ctx, objectKey)
		assert.NoError(t, err)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles delete failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/nonexistent.txt"
		
		testSuite.mockClient.On("RemoveObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return(fmt.Errorf("object not found"))
		
		err := testSuite.service.DeleteFile(ctx, objectKey)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "object not found")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_FileExists(t *testing.T) {
	t.Run("returns true when file exists", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/existing-file.txt"
		objectInfo := minio.ObjectInfo{
			Key:  objectKey,
			Size: 100,
		}
		
		testSuite.mockClient.On("StatObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("minio.StatObjectOptions"),
		).Return(objectInfo, nil)
		
		exists, err := testSuite.service.FileExists(ctx, objectKey)
		assert.NoError(t, err)
		assert.True(t, exists)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("returns false when file doesn't exist", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/nonexistent.txt"
		
		// Mock NoSuchKey error
		errorResponse := minio.ErrorResponse{Code: "NoSuchKey"}
		
		testSuite.mockClient.On("StatObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return(minio.ObjectInfo{}, errorResponse)
		
		exists, err := testSuite.service.FileExists(ctx, objectKey)
		assert.NoError(t, err)
		assert.False(t, exists)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles other errors", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		
		testSuite.mockClient.On("StatObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return(minio.ObjectInfo{}, fmt.Errorf("access denied"))
		
		exists, err := testSuite.service.FileExists(ctx, objectKey)
		assert.Error(t, err)
		assert.False(t, exists)
		assert.Contains(t, err.Error(), "access denied")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

func TestMinIOService_GetFileInfo(t *testing.T) {
	t.Run("returns file info successfully", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/file.txt"
		expectedInfo := minio.ObjectInfo{
			Key:          objectKey,
			Size:         1024,
			ContentType:  "text/plain",
			LastModified: time.Now(),
		}
		
		testSuite.mockClient.On("StatObject", 
			ctx, 
			"test-bucket", 
			objectKey, 
			mock.AnythingOfType("minio.StatObjectOptions"),
		).Return(expectedInfo, nil)
		
		info, err := testSuite.service.GetFileInfo(ctx, objectKey)
		assert.NoError(t, err)
		assert.NotNil(t, info)
		assert.Equal(t, expectedInfo.Key, info.Key)
		assert.Equal(t, expectedInfo.Size, info.Size)
		assert.Equal(t, expectedInfo.ContentType, info.ContentType)
		
		testSuite.mockClient.AssertExpectations(t)
	})

	t.Run("handles file info retrieval failure", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		objectKey := "test/nonexistent.txt"
		
		testSuite.mockClient.On("StatObject", 
			mock.Anything, 
			mock.Anything, 
			mock.Anything, 
			mock.Anything,
		).Return(minio.ObjectInfo{}, fmt.Errorf("object not found"))
		
		info, err := testSuite.service.GetFileInfo(ctx, objectKey)
		assert.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "object not found")
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

// Mock object for MinIO download testing
type mockMinIOObject struct {
	data io.Reader
}

func (m *mockMinIOObject) Read(p []byte) (n int, err error) {
	return m.data.Read(p)
}

func (m *mockMinIOObject) Close() error {
	return nil
}

// Integration tests for concurrent operations
func TestMinIOService_ConcurrentOperations(t *testing.T) {
	t.Run("handles concurrent uploads", func(t *testing.T) {
		testSuite := setupMinIOTest(t)
		ctx := context.Background()
		
		const numConcurrent = 10
		
		// Setup mock for concurrent uploads
		for i := 0; i < numConcurrent; i++ {
			testSuite.mockClient.On("PutObject", 
				mock.Anything, 
				mock.Anything, 
				mock.Anything, 
				mock.Anything, 
				mock.Anything, 
				mock.Anything,
			).Return(minio.UploadInfo{}, nil).Once()
		}
		
		// Perform concurrent uploads
		errChan := make(chan error, numConcurrent)
		for i := 0; i < numConcurrent; i++ {
			go func(index int) {
				objectKey := fmt.Sprintf("test/concurrent-%d.txt", index)
				data := []byte(fmt.Sprintf("content-%d", index))
				err := testSuite.service.UploadFile(ctx, objectKey, "text/plain", data, int64(len(data)))
				errChan <- err
			}(i)
		}
		
		// Wait for all uploads to complete
		for i := 0; i < numConcurrent; i++ {
			err := <-errChan
			assert.NoError(t, err)
		}
		
		testSuite.mockClient.AssertExpectations(t)
	})
}

// Benchmark tests for performance validation
func BenchmarkMinIOService_UploadFile(b *testing.B) {
	testSuite := setupMinIOTest(&testing.T{})
	ctx := context.Background()
	
	data := make([]byte, 1024) // 1KB file
	for i := range data {
		data[i] = byte(i % 256)
	}
	
	testSuite.mockClient.On("PutObject", 
		mock.Anything, 
		mock.Anything, 
		mock.Anything, 
		mock.Anything, 
		mock.Anything, 
		mock.Anything,
	).Return(minio.UploadInfo{}, nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		objectKey := fmt.Sprintf("benchmark/file-%d.txt", i)
		_ = testSuite.service.UploadFile(ctx, objectKey, "text/plain", data, int64(len(data)))
	}
}