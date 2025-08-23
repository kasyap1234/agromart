package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"agromart2/apps/server/services"
)

// UploadHandler handles file upload endpoints
type UploadHandler struct {
	uploadService *services.FileUploadService
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(uploadService *services.FileUploadService) *UploadHandler {
	return &UploadHandler{
		uploadService: uploadService,
	}
}

// RegisterRoutes registers upload routes
func (h *UploadHandler) RegisterRoutes(protected *echo.Group) {
	// File upload endpoints
	protected.POST("/files/upload", h.UploadFile)
	protected.GET("/files/:id", h.GetFile)
	protected.DELETE("/files/:id", h.DeleteFile)
	protected.GET("/files", h.ListFiles)

	// Signed URL endpoints
	protected.POST("/files/signed-url", h.GetSignedUploadURL)
	protected.GET("/files/:id/url", h.GetSignedFileURL)
}

// UploadFile handles file uploads
func (h *UploadHandler) UploadFile(c echo.Context) error {
	// Get tenant and user context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	// Parse tenant and user UUIDs
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid tenant ID")
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid user ID")
	}

	// Get form parameters
	entityType := c.FormValue("entity_type")
	if entityType == "" {
		entityType = services.EntityTypeGeneral
	}

	entityIDStr := c.FormValue("entity_id")
	if entityIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "entity_id is required")
	}

	entityID, err := uuid.Parse(entityIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid entity ID")
	}

	fileType := c.FormValue("file_type")
	if fileType == "" {
		fileType = services.FileTypeGeneral
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "failed to get uploaded file: "+err.Error())
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to open uploaded file: "+err.Error())
	}
	defer src.Close()

	// Create upload request
	uploadReq := &services.UploadRequest{
		File:       src,
		Header:     file,
		EntityType: entityType,
		EntityID:   entityID,
		FileType:   fileType,
		UserID:     userUUID,
		TenantID:   tenantUUID,
	}

	// Process upload
	ctx := c.Request().Context()
	response, err := h.uploadService.ProcessUpload(ctx, uploadReq)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to process upload: "+err.Error())
	}

	// Return success response
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"file_id":   response.FileID,
			"file_name": response.FileName,
			"file_path": response.FilePath,
			"file_url":  response.FileURL,
			"file_size": response.FileSize,
		},
		"message": "File uploaded successfully",
	})
}

// GetFile retrieves file information
func (h *UploadHandler) GetFile(c echo.Context) error {
	// Get tenant context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	// Parse file ID
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid file ID")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid tenant ID")
	}

	// Get expiry parameter (default 1 hour)
	expiryStr := c.QueryParam("expiry")
	expiry := 1 * time.Hour
	if expiryStr != "" {
		if parsedExpiry, err := time.ParseDuration(expiryStr); err == nil {
			expiry = parsedExpiry
		}
	}

	// Get file URL
	ctx := c.Request().Context()
	fileURL, err := h.uploadService.GetFileURL(ctx, fileID, tenantUUID, expiry)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "file not found: "+err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"file_id":  fileID,
			"file_url": fileURL,
			"expiry":   expiry.String(),
		},
	})
}

// DeleteFile deletes a file
func (h *UploadHandler) DeleteFile(c echo.Context) error {
	// Get tenant context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	// Parse file ID
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid file ID")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid tenant ID")
	}

	// Delete file
	ctx := c.Request().Context()
	err = h.uploadService.DeleteFile(ctx, fileID, tenantUUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete file: "+err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "File deleted successfully",
	})
}

// ListFiles lists files for the current tenant
func (h *UploadHandler) ListFiles(c echo.Context) error {
	// Get tenant context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	// Parse query parameters
	entityType := c.QueryParam("entity_type")
	entityIDStr := c.QueryParam("entity_id")
	fileType := c.QueryParam("file_type")
	_ = entityType  // parsed but not used in placeholder implementation
	_ = entityIDStr // parsed but not used in placeholder implementation
	_ = fileType    // parsed but not used in placeholder implementation

	// Parse pagination
	page := 1
	if pageStr := c.QueryParam("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit
	_ = offset // offset is calculated but not used in placeholder implementation

	// For now, return a placeholder response
	// In a full implementation, you'd query the database for files
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"files": []map[string]interface{}{},
			"pagination": map[string]interface{}{
				"page":     page,
				"limit":    limit,
				"total":    0,
				"has_more": false,
			},
		},
		"message": "Files retrieved successfully",
	})
}

// GetSignedUploadURL generates a signed URL for uploading directly to MinIO
func (h *UploadHandler) GetSignedUploadURL(c echo.Context) error {
	// Get tenant context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	// Parse request body
	var req struct {
		FileName   string `json:"file_name"`
		ContentType string `json:"content_type"`
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		FileType   string `json:"file_type"`
	}

	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body: "+err.Error())
	}

	// Validate required fields
	if req.FileName == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "file_name is required")
	}

	if req.ContentType == "" {
		req.ContentType = "application/octet-stream"
	}

	if req.EntityType == "" {
		req.EntityType = services.EntityTypeGeneral
	}

	if req.EntityID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "entity_id is required")
	}

	if req.FileType == "" {
		req.FileType = services.FileTypeGeneral
	}

	// Parse entity ID
	entityID, err := uuid.Parse(req.EntityID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid entity_id")
	}

	// Generate object key
	objectKey := fmt.Sprintf("%s/%s/%s_%d_%s",
		req.EntityType,
		entityID,
		req.FileName,
		time.Now().Unix(),
		req.FileName,
	)

	// Get MinIO service from context or create a new one
	// This is a simplified implementation
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"upload_url": fmt.Sprintf("/api/files/direct-upload?key=%s", objectKey),
			"object_key": objectKey,
			"content_type": req.ContentType,
		},
		"message": "Signed upload URL generated successfully",
	})
}

// GetSignedFileURL generates a signed URL for accessing a file
func (h *UploadHandler) GetSignedFileURL(c echo.Context) error {
	// Get tenant context
	tenantID, ok := c.Get("tenant_id").(string)
	if !ok || tenantID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant context")
	}

	// Parse file ID
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid file ID")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid tenant ID")
	}

	// Get expiry parameter (default 1 hour)
	expiryStr := c.QueryParam("expiry")
	expiry := 1 * time.Hour
	if expiryStr != "" {
		if parsedExpiry, err := time.ParseDuration(expiryStr); err == nil {
			expiry = parsedExpiry
		}
	}

	// Get file URL
	ctx := c.Request().Context()
	fileURL, err := h.uploadService.GetFileURL(ctx, fileID, tenantUUID, expiry)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "file not found: "+err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"file_url": fileURL,
			"expiry":   expiry.String(),
		},
		"message": "Signed file URL generated successfully",
	})
}