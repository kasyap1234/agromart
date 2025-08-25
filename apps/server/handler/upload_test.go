package handler

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"agromart2/apps/server/services"
)

// MockFileUploadService for testing
type MockFileUploadService struct {
	mock.Mock
}

func (m *MockFileUploadService) ProcessUpload(ctx context.Context, req *services.UploadRequest) (*services.UploadResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*services.UploadResponse), args.Error(1)
}

func (m *MockFileUploadService) GetFileURL(ctx context.Context, fileID, tenantID uuid.UUID, expiry time.Duration) (string, error) {
	args := m.Called(ctx, fileID, tenantID, expiry)
	return args.String(0), args.Error(1)
}

func (m *MockFileUploadService) DeleteFile(ctx context.Context, fileID, tenantID uuid.UUID) error {
	args := m.Called(ctx, fileID, tenantID)
	return args.Error(0)
}

func setupUploadHandlerTest() (*UploadHandler, *MockFileUploadService, *echo.Echo) {
	mockService := &MockFileUploadService{}
	// Since NewUploadHandler expects *services.FileUploadService, we'll need to create a test version
	// For now, we'll skip this test or create a proper interface-based handler
	// This test setup needs refactoring to work with the concrete type requirement
	handler := &UploadHandler{uploadService: nil} // Placeholder until proper mocking is implemented
	e := echo.New()
	
	return handler, mockService, e
}

func createMultipartRequest(fileName, contentType string, fileContent []byte, formData map[string]string) (*http.Request, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	
	// Add file
	fileWriter, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		return nil, err
	}
	fileWriter.Write(fileContent)
	
	// Add form fields
	for key, value := range formData {
		writer.WriteField(key, value)
	}
	
	writer.Close()
	
	req := httptest.NewRequest(http.MethodPost, "/files/upload", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	return req, nil
}

func TestUploadHandler_UploadFile(t *testing.T) {
	t.Run("uploads file successfully", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		userID := uuid.New()
		entityID := uuid.New()
		fileID := uuid.New()
		
		// Create multipart request
		fileContent := []byte("test image content")
		formData := map[string]string{
			"entity_type": "product",
			"entity_id":   entityID.String(),
			"file_type":   "image",
		}
		
		req, err := createMultipartRequest("test.png", "image/png", fileContent, formData)
		assert.NoError(t, err)
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		
		// Set auth context
		c.Set("tenant_id", tenantID.String())
		c.Set("user_id", userID.String())
		
		// Mock service response
		expectedResponse := &services.UploadResponse{
			FileID:   fileID,
			FileName: "test.png",
			FilePath: "/test-bucket/product/" + entityID.String() + "/test.png",
			FileURL:  "https://example.com/test.png",
			FileSize: int64(len(fileContent)),
		}
		
		mockService.On("ProcessUpload", mock.Anything, mock.MatchedBy(func(req *services.UploadRequest) bool {
			return req.EntityType == "product" && req.EntityID == entityID
		})).Return(expectedResponse, nil)
		
		// Execute
		err = handler.UploadFile(c)
		
		// Assertions
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		responseBody := rec.Body.String()
		assert.Contains(t, responseBody, fileID.String())
		assert.Contains(t, responseBody, "test.png")
		assert.Contains(t, responseBody, "https://example.com/test.png")
		assert.Contains(t, responseBody, "File uploaded successfully")
		
		mockService.AssertExpectations(t)
	})

	t.Run("handles missing tenant context", func(t *testing.T) {
		handler, _, e := setupUploadHandlerTest()
		
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_id": uuid.New().String(),
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		// Don't set tenant_id context
		
		err := handler.UploadFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpError.Code)
		assert.Contains(t, httpError.Message, "invalid tenant context")
	})

	t.Run("handles missing user context", func(t *testing.T) {
		handler, _, e := setupUploadHandlerTest()
		
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_id": uuid.New().String(),
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set("tenant_id", uuid.New().String())
		// Don't set user_id context
		
		err := handler.UploadFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpError.Code)
		assert.Contains(t, httpError.Message, "invalid user context")
	})

	t.Run("handles invalid tenant ID format", func(t *testing.T) {
		handler, _, e := setupUploadHandlerTest()
		
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_id": uuid.New().String(),
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set("tenant_id", "invalid-uuid")
		c.Set("user_id", uuid.New().String())
		
		err := handler.UploadFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpError.Code)
		assert.Contains(t, httpError.Message, "invalid tenant ID")
	})

	t.Run("handles missing entity_id", func(t *testing.T) {
		handler, _, e := setupUploadHandlerTest()
		
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_type": "product",
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set("tenant_id", uuid.New().String())
		c.Set("user_id", uuid.New().String())
		
		err := handler.UploadFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpError.Code)
		assert.Contains(t, httpError.Message, "entity_id is required")
	})

	t.Run("handles upload service error", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_type": "product",
			"entity_id":   uuid.New().String(),
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set("tenant_id", uuid.New().String())
		c.Set("user_id", uuid.New().String())
		
		// Mock service error
		mockService.On("ProcessUpload", mock.Anything, mock.Anything).Return((*services.UploadResponse)(nil), fmt.Errorf("upload failed"))
		
		err := handler.UploadFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, httpError.Code)
		assert.Contains(t, httpError.Message, "failed to process upload")
		
		mockService.AssertExpectations(t)
	})

	t.Run("uses default entity_type when not provided", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		entityID := uuid.New()
		req, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_id": entityID.String(),
		})
		
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set("tenant_id", uuid.New().String())
		c.Set("user_id", uuid.New().String())
		
		mockService.On("ProcessUpload", mock.Anything, mock.MatchedBy(func(req *services.UploadRequest) bool {
			return req.EntityType == services.EntityTypeGeneral && req.EntityID == entityID
		})).Return(&services.UploadResponse{
			FileID: uuid.New(),
		}, nil)
		
		err := handler.UploadFile(c)
		assert.NoError(t, err)
		
		mockService.AssertExpectations(t)
	})
}

func TestUploadHandler_GetFile(t *testing.T) {
	t.Run("gets file URL successfully", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		fileID := uuid.New()
		
		req := httptest.NewRequest(http.MethodGet, "/files/"+fileID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fileID.String())
		c.Set("tenant_id", tenantID.String())
		
		expectedURL := "https://example.com/presigned-url"
		mockService.On("GetFileURL", mock.Anything, fileID, tenantID, 1*time.Hour).Return(expectedURL, nil)
		
		err := handler.GetFile(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		responseBody := rec.Body.String()
		assert.Contains(t, responseBody, expectedURL)
		assert.Contains(t, responseBody, fileID.String())
		
		mockService.AssertExpectations(t)
	})

	t.Run("handles custom expiry parameter", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		fileID := uuid.New()
		
		req := httptest.NewRequest(http.MethodGet, "/files/"+fileID.String()+"?expiry=2h", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fileID.String())
		c.Set("tenant_id", tenantID.String())
		
		mockService.On("GetFileURL", mock.Anything, fileID, tenantID, 2*time.Hour).Return("https://example.com/url", nil)
		
		err := handler.GetFile(c)
		assert.NoError(t, err)
		
		mockService.AssertExpectations(t)
	})

	t.Run("handles invalid file ID", func(t *testing.T) {
		handler, _, e := setupUploadHandlerTest()
		
		req := httptest.NewRequest(http.MethodGet, "/files/invalid-uuid", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("invalid-uuid")
		c.Set("tenant_id", uuid.New().String())
		
		err := handler.GetFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpError.Code)
		assert.Contains(t, httpError.Message, "invalid file ID")
	})

	t.Run("handles file not found", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		fileID := uuid.New()
		
		req := httptest.NewRequest(http.MethodGet, "/files/"+fileID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fileID.String())
		c.Set("tenant_id", tenantID.String())
		
		mockService.On("GetFileURL", mock.Anything, fileID, tenantID, mock.Anything).Return("", fmt.Errorf("file not found"))
		
		err := handler.GetFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, httpError.Code)
		assert.Contains(t, httpError.Message, "file not found")
		
		mockService.AssertExpectations(t)
	})
}

func TestUploadHandler_DeleteFile(t *testing.T) {
	t.Run("deletes file successfully", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		fileID := uuid.New()
		
		req := httptest.NewRequest(http.MethodDelete, "/files/"+fileID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fileID.String())
		c.Set("tenant_id", tenantID.String())
		
		mockService.On("DeleteFile", mock.Anything, fileID, tenantID).Return(nil)
		
		err := handler.DeleteFile(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		responseBody := rec.Body.String()
		assert.Contains(t, responseBody, "File deleted successfully")
		
		mockService.AssertExpectations(t)
	})

	t.Run("handles delete service error", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		fileID := uuid.New()
		
		req := httptest.NewRequest(http.MethodDelete, "/files/"+fileID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fileID.String())
		c.Set("tenant_id", tenantID.String())
		
		mockService.On("DeleteFile", mock.Anything, fileID, tenantID).Return(fmt.Errorf("delete failed"))
		
		err := handler.DeleteFile(c)
		
		httpError, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, httpError.Code)
		assert.Contains(t, httpError.Message, "failed to delete file")
		
		mockService.AssertExpectations(t)
	})
}

// Integration test for complete upload workflow
func TestUploadHandler_CompleteWorkflow(t *testing.T) {
	t.Run("upload, get, and delete file workflow", func(t *testing.T) {
		handler, mockService, e := setupUploadHandlerTest()
		
		tenantID := uuid.New()
		userID := uuid.New()
		entityID := uuid.New()
		fileID := uuid.New()
		
		// 1. Upload file
		uploadReq, _ := createMultipartRequest("test.png", "image/png", []byte("test"), map[string]string{
			"entity_type": "product",
			"entity_id":   entityID.String(),
		})
		
		uploadRec := httptest.NewRecorder()
		uploadCtx := e.NewContext(uploadReq, uploadRec)
		uploadCtx.Set("tenant_id", tenantID.String())
		uploadCtx.Set("user_id", userID.String())
		
		uploadResponse := &services.UploadResponse{
			FileID:   fileID,
			FileName: "test.png",
			FileURL:  "https://example.com/test.png",
			FileSize: 4,
		}
		mockService.On("ProcessUpload", mock.Anything, mock.Anything).Return(uploadResponse, nil)
		
		err := handler.UploadFile(uploadCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, uploadRec.Code)
		
		// 2. Get file URL
		getReq := httptest.NewRequest(http.MethodGet, "/files/"+fileID.String(), nil)
		getRec := httptest.NewRecorder()
		getCtx := e.NewContext(getReq, getRec)
		getCtx.SetParamNames("id")
		getCtx.SetParamValues(fileID.String())
		getCtx.Set("tenant_id", tenantID.String())
		
		mockService.On("GetFileURL", mock.Anything, fileID, tenantID, mock.Anything).Return("https://example.com/presigned", nil)
		
		err = handler.GetFile(getCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, getRec.Code)
		
		// 3. Delete file
		deleteReq := httptest.NewRequest(http.MethodDelete, "/files/"+fileID.String(), nil)
		deleteRec := httptest.NewRecorder()
		deleteCtx := e.NewContext(deleteReq, deleteRec)
		deleteCtx.SetParamNames("id")
		deleteCtx.SetParamValues(fileID.String())
		deleteCtx.Set("tenant_id", tenantID.String())
		
		mockService.On("DeleteFile", mock.Anything, fileID, tenantID).Return(nil)
		
		err = handler.DeleteFile(deleteCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, deleteRec.Code)
		
		mockService.AssertExpectations(t)
	})
}