package locations

import (
	"context"
	"database/sql"

	"agromart2/db"
	"github.com/google/uuid"
)

type LocationsService struct {
	db *db.Queries
}

func NewLocationsService(db *db.Queries) *LocationsService {
	return &LocationsService{db: db}
}

// LocationParams represents the parameters for creating/updating a location
type LocationParams struct {
	TenantID              uuid.UUID
	Name                  string
	Address               *string
	City                  *string
	State                 *string
	PostalCode            *string
	Country               *string
	Phone                 *string
	Email                 *string
	LocationType          string
	Capacity              *string
	CapacityUnit          *string
	ManagerID             *uuid.UUID
	OperatingHours        *string
	TemperatureControlled bool
	SecurityLevel         *string
	IsActive              bool
	Notes                 *string
}

// CreateLocation creates a new location
func (s *LocationsService) CreateLocation(ctx context.Context, params LocationParams) (db.Location, error) {
	// Convert pointers to sql.Null types
	var address, city, state, postalCode, country, phone, email, capacity, capacityUnit, operatingHours, securityLevel, notes sql.NullString
	var managerID uuid.NullUUID

	if params.Address != nil {
		address = sql.NullString{String: *params.Address, Valid: true}
	}
	if params.City != nil {
		city = sql.NullString{String: *params.City, Valid: true}
	}
	if params.State != nil {
		state = sql.NullString{String: *params.State, Valid: true}
	}
	if params.PostalCode != nil {
		postalCode = sql.NullString{String: *params.PostalCode, Valid: true}
	}
	if params.Country != nil {
		country = sql.NullString{String: *params.Country, Valid: true}
	}
	if params.Phone != nil {
		phone = sql.NullString{String: *params.Phone, Valid: true}
	}
	if params.Email != nil {
		email = sql.NullString{String: *params.Email, Valid: true}
	}
	if params.Capacity != nil {
		capacity = sql.NullString{String: *params.Capacity, Valid: true}
	}
	if params.CapacityUnit != nil {
		capacityUnit = sql.NullString{String: *params.CapacityUnit, Valid: true}
	}
	if params.ManagerID != nil {
		managerID = uuid.NullUUID{UUID: *params.ManagerID, Valid: true}
	}
	if params.OperatingHours != nil {
		operatingHours = sql.NullString{String: *params.OperatingHours, Valid: true}
	}
	if params.SecurityLevel != nil {
		securityLevel = sql.NullString{String: *params.SecurityLevel, Valid: true}
	}
	if params.Notes != nil {
		notes = sql.NullString{String: *params.Notes, Valid: true}
	}

	return s.db.CreateLocation(ctx, db.CreateLocationParams{
		TenantID:             params.TenantID,
		Name:                 params.Name,
		Address:              address,
		City:                 city,
		State:                state,
		PostalCode:           postalCode,
		Country:              country,
		Phone:                phone,
		Email:                email,
		LocationType:         params.LocationType,
		Capacity:             capacity,
		CapacityUnit:         capacityUnit,
		ManagerID:            managerID,
		OperatingHours:       operatingHours,
		TemperatureControlled: params.TemperatureControlled,
		SecurityLevel:        securityLevel,
		IsActive:             params.IsActive,
		Notes:                notes,
	})
}

// GetLocationByID retrieves a location by ID
func (s *LocationsService) GetLocationByID(ctx context.Context, tenantID, locationID uuid.UUID) (db.Location, error) {
	return s.db.GetLocationByID(ctx, db.GetLocationByIDParams{
		ID:       locationID,
		TenantID: tenantID,
	})
}

// UpdateLocation updates an existing location
func (s *LocationsService) UpdateLocation(ctx context.Context, locationID uuid.UUID, params LocationParams) (db.Location, error) {
	// Convert pointers to sql.Null types
	var address, city, state, postalCode, country, phone, email, capacity, capacityUnit, operatingHours, securityLevel, notes sql.NullString
	var managerID uuid.NullUUID

	if params.Address != nil {
		address = sql.NullString{String: *params.Address, Valid: true}
	}
	if params.City != nil {
		city = sql.NullString{String: *params.City, Valid: true}
	}
	if params.State != nil {
		state = sql.NullString{String: *params.State, Valid: true}
	}
	if params.PostalCode != nil {
		postalCode = sql.NullString{String: *params.PostalCode, Valid: true}
	}
	if params.Country != nil {
		country = sql.NullString{String: *params.Country, Valid: true}
	}
	if params.Phone != nil {
		phone = sql.NullString{String: *params.Phone, Valid: true}
	}
	if params.Email != nil {
		email = sql.NullString{String: *params.Email, Valid: true}
	}
	if params.Capacity != nil {
		capacity = sql.NullString{String: *params.Capacity, Valid: true}
	}
	if params.CapacityUnit != nil {
		capacityUnit = sql.NullString{String: *params.CapacityUnit, Valid: true}
	}
	if params.ManagerID != nil {
		managerID = uuid.NullUUID{UUID: *params.ManagerID, Valid: true}
	}
	if params.OperatingHours != nil {
		operatingHours = sql.NullString{String: *params.OperatingHours, Valid: true}
	}
	if params.SecurityLevel != nil {
		securityLevel = sql.NullString{String: *params.SecurityLevel, Valid: true}
	}
	if params.Notes != nil {
		notes = sql.NullString{String: *params.Notes, Valid: true}
	}

	return s.db.UpdateLocation(ctx, db.UpdateLocationParams{
		ID:                   locationID,
		TenantID:             params.TenantID,
		Name:                 params.Name,
		Address:              address,
		City:                 city,
		State:                state,
		PostalCode:           postalCode,
		Country:              country,
		Phone:                phone,
		Email:                email,
		LocationType:         params.LocationType,
		Capacity:             capacity,
		CapacityUnit:         capacityUnit,
		ManagerID:            managerID,
		OperatingHours:       operatingHours,
		TemperatureControlled: params.TemperatureControlled,
		SecurityLevel:        securityLevel,
		IsActive:             params.IsActive,
		Notes:                notes,
	})
}

// DeleteLocation soft deletes a location by setting is_active to false
func (s *LocationsService) DeleteLocation(ctx context.Context, tenantID, locationID uuid.UUID) error {
	return s.db.DeleteLocation(ctx, db.DeleteLocationParams{
		ID:       locationID,
		TenantID: tenantID,
	})
}

// ListLocations retrieves locations with filtering and pagination
func (s *LocationsService) ListLocations(ctx context.Context, tenantID uuid.UUID, locationType string, isActive bool, limit, offset int) ([]db.Location, error) {
	return s.db.ListLocations(ctx, db.ListLocationsParams{
		TenantID:     tenantID,
		LocationType: locationType,
		IsActive:     isActive,
		Limit:        int32(limit),
		Offset:       int32(offset),
	})
}

// ListLocationsByType retrieves locations by type
func (s *LocationsService) ListLocationsByType(ctx context.Context, tenantID uuid.UUID, locationType string) ([]db.Location, error) {
	return s.db.ListLocationsByType(ctx, db.ListLocationsByTypeParams{
		TenantID:     tenantID,
		LocationType: locationType,
	})
}

// ListActiveLocations retrieves all active locations
func (s *LocationsService) ListActiveLocations(ctx context.Context, tenantID uuid.UUID) ([]db.Location, error) {
	return s.db.ListActiveLocations(ctx, tenantID)
}

// GetLocationsByManager retrieves locations managed by a specific user
func (s *LocationsService) GetLocationsByManager(ctx context.Context, tenantID, managerID uuid.UUID) ([]db.Location, error) {
	return s.db.GetLocationsByManager(ctx, db.GetLocationsByManagerParams{
		TenantID:  tenantID,
		ManagerID: uuid.NullUUID{UUID: managerID, Valid: true},
	})
}

// GetLocationsWithCapacity retrieves locations that have capacity information
func (s *LocationsService) GetLocationsWithCapacity(ctx context.Context, tenantID uuid.UUID) ([]db.Location, error) {
	return s.db.GetLocationsWithCapacity(ctx, tenantID)
}

// Helper functions for default values
func getDefaultLocationParams() LocationParams {
	defaultLocationType := "WAREHOUSE"
	defaultSecurityLevel := "STANDARD"

	return LocationParams{
		LocationType:  defaultLocationType,
		SecurityLevel: &defaultSecurityLevel,
		IsActive:      true,
	}
}