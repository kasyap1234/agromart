package services

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"mime/multipart"
	"net/textproto"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"agromart2/apps/server/config"
	"agromart2/db"
)

// MockMinIOService for testing
type MockMinIOService struct {
	mock.Mock
}

func (m *MockMinIOService) UploadFile(ctx context.Context, objectKey, contentType string, data []byte, size int64) error {
	args := m.Called(ctx, objectKey, contentType, data, size)
	return args.Error(0)
}

func (m *MockMinIOService) GetFileURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	args := m.Called(ctx, objectKey, expiry)
	return args.String(0), args.Error(1)
}

func (m *MockMinIOService) DeleteFile(ctx context.Context, objectKey string) error {
	args := m.Called(ctx, objectKey)
	return args.Error(0)
}

// MockQueries for database operations
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) GetFileByChecksum(ctx context.Context, params db.GetFileByChecksumParams) (db.File, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(db.File), args.Error(1)
}

func (m *MockQueries) CreateFile(ctx context.Context, params db.CreateFileParams) (db.File, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(db.File), args.Error(1)
}

func (m *MockQueries) GetFileByID(ctx context.Context, id uuid.UUID) (db.File, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(db.File), args.Error(1)
}

func (m *MockQueries) DeleteFile(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// Mock multipart.File
type MockMultipartFile struct {
	*bytes.Reader
}

func (m *MockMultipartFile) Close() error {
	return nil
}

func setupFileUploadTest(t *testing.T) (*FileUploadService, *MockMinIOService, *MockQueries) {
	mockMinIO := &MockMinIOService{}
	mockQueries := &MockQueries{}
	
	cfg := &config.Config{
		MinIOBucketName:   "test-bucket",
		MaxFileSize:       2 * 1024 * 1024, // 2MB
		AllowedImageTypes: "image/jpeg,image/png,image/gif",
	}
	
	// Create service with interface types by creating a wrapper or using type assertions
	service := &FileUploadService{
		minioService: (*MinIOService)(nil), // We'll set this manually in tests
		config:       cfg,
		queries:      (*db.Queries)(nil), // We'll set this manually in tests
	}
	
	return service, mockMinIO, mockQueries
}

func createMockRequest(fileName, contentType string, data []byte, tenantID, userID, entityID uuid.UUID) *UploadRequest {
	header := &multipart.FileHeader{
		Filename: fileName,
		Size:     int64(len(data)),
		Header:   make(textproto.MIMEHeader),
	}
	header.Header.Set("Content-Type", contentType)
	
	return &UploadRequest{
		File:       &MockMultipartFile{bytes.NewReader(data)},
		Header:     header,
		EntityType: "test-entity",
		EntityID:   entityID,
		FileType:   "image",
		UserID:     userID,
		TenantID:   tenantID,
	}
}

func TestFileUploadService_ProcessUpload(t *testing.T) {
	t.Run("uploads new file successfully", func(t *testing.T) {
		service, mockMinIO, mockQueries := setupFileUploadTest(t)
		ctx := context.Background()
		
		tenantID, userID, entityID, fileID := uuid.New(), uuid.New(), uuid.New(), uuid.New()
		data := []byte("test image data")
		req := createMockRequest("test.png", "image/png", data, tenantID, userID, entityID)
		
		// Mock no existing file
		mockQueries.On("GetFileByChecksum", ctx, mock.MatchedBy(func(params db.GetFileByChecksumParams) bool {
			return params.TenantID == tenantID
		})).Return(db.File{}, sql.ErrNoRows)
		
		// Mock MinIO upload
		mockMinIO.On("UploadFile", ctx, mock.AnythingOfType("string"), "image/png", data, int64(len(data))).Return(nil)
		
		// Mock database creation
		expectedFile := db.File{
			ID:         fileID,
			TenantID:   tenantID,
			FileName:   "test.png",
			ObjectKey:  "test-entity/" + entityID.String() + "/test.png",
		}
		mockQueries.On("CreateFile", ctx, mock.Anything).Return(expectedFile, nil)
		
		// Mock URL generation
		mockMinIO.On("GetFileURL", ctx, mock.AnythingOfType("string"), 24*time.Hour).Return("https://example.com/file.png", nil)
		
		response, err := service.ProcessUpload(ctx, req)
		
		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.Equal(t, fileID, response.FileID)
		assert.Equal(t, "https://example.com/file.png", response.FileURL)
		
		mockMinIO.AssertExpectations(t)
		mockQueries.AssertExpectations(t)
	})

	t.Run("validates file size", func(t *testing.T) {
		service, _, _ := setupFileUploadTest(t)
		ctx := context.Background()
		
		// Create oversized file
		data := make([]byte, 3*1024*1024) // 3MB
		req := createMockRequest("large.png", "image/png", data, uuid.New(), uuid.New(), uuid.New())
		
		response, err := service.ProcessUpload(ctx, req)
		
		assert.Error(t, err)
		assert.Nil(t, response)
		assert.Contains(t, err.Error(), "file validation failed")
	})

	t.Run("handles MinIO upload failure", func(t *testing.T) {
		service, mockMinIO, mockQueries := setupFileUploadTest(t)
		ctx := context.Background()
		
		data := []byte("test")
		req := createMockRequest("test.png", "image/png", data, uuid.New(), uuid.New(), uuid.New())
		
		mockQueries.On("GetFileByChecksum", ctx, mock.Anything).Return(db.File{}, sql.ErrNoRows)
		mockMinIO.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(fmt.Errorf("MinIO error"))
		
		response, err := service.ProcessUpload(ctx, req)
		
		assert.Error(t, err)
		assert.Nil(t, response)
		assert.Contains(t, err.Error(), "failed to upload to MinIO")
	})
}

func TestFileUploadService_GetFileURL(t *testing.T) {
	t.Run("generates URL successfully", func(t *testing.T) {
		service, mockMinIO, mockQueries := setupFileUploadTest(t)
		ctx := context.Background()
		
		fileID, tenantID := uuid.New(), uuid.New()
		objectKey := "test/file.png"
		
		dbFile := db.File{ID: fileID, TenantID: tenantID, ObjectKey: objectKey}
		mockQueries.On("GetFileByID", ctx, fileID).Return(dbFile, nil)
		mockMinIO.On("GetFileURL", ctx, objectKey, 2*time.Hour).Return("https://example.com/url", nil)
		
		url, err := service.GetFileURL(ctx, fileID, tenantID, 2*time.Hour)
		
		assert.NoError(t, err)
		assert.Equal(t, "https://example.com/url", url)
	})

	t.Run("handles file not found", func(t *testing.T) {
		service, _, mockQueries := setupFileUploadTest(t)
		ctx := context.Background()
		
		mockQueries.On("GetFileByID", ctx, uuid.New()).Return(db.File{}, sql.ErrNoRows)
		
		url, err := service.GetFileURL(ctx, uuid.New(), uuid.New(), time.Hour)
		
		assert.Error(t, err)
		assert.Empty(t, url)
	})
}

func TestFileUploadService_DeleteFile(t *testing.T) {
	t.Run("deletes file successfully", func(t *testing.T) {
		service, mockMinIO, mockQueries := setupFileUploadTest(t)
		ctx := context.Background()
		
		fileID, tenantID := uuid.New(), uuid.New()
		objectKey := "test/file.png"
		
		dbFile := db.File{ID: fileID, TenantID: tenantID, ObjectKey: objectKey}
		mockQueries.On("GetFileByID", ctx, fileID).Return(dbFile, nil)
		mockMinIO.On("DeleteFile", ctx, objectKey).Return(nil)
		mockQueries.On("DeleteFile", ctx, fileID).Return(nil)
		
		err := service.DeleteFile(ctx, fileID, tenantID)
		
		assert.NoError(t, err)
		mockMinIO.AssertExpectations(t)
		mockQueries.AssertExpectations(t)
	})
}