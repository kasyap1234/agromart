package services

// FileType constants for file categorization
const (
	FileTypeGeneral = "general"
	FileTypeTemp    = "temp"
	FileTypeImage   = "image"
	FileTypeDoc     = "document"
	FileTypePDF     = "pdf"
)

// EntityType constants for file entity associations
const (
	EntityTypeGeneral = "general"
	EntityTypeProduct = "product"
	EntityTypeUser    = "user"
	EntityTypeOrder   = "order"
	EntityTypeCustomer = "customer"
	EntityTypeSupplier = "supplier"
)

// VirusScanStatus constants for virus scanning states
const (
	VirusScanStatusPending  = "pending"
	VirusScanStatusClean    = "clean"
	VirusScanStatusInfected = "infected"
	VirusScanStatusError    = "error"
)