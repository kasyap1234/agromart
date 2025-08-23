package locations

import (
	"context"
	"fmt"
	"testing"

	"agromart2/apps/server/tests"
	"github.com/google/uuid"
)

func TestLocationsService_CreateLocation(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	tests := []struct {
		name        string
		params      LocationParams
		expectError bool
	}{
		{
			name: "valid location creation",
			params: LocationParams{
				TenantID:     tenant.ID,
				Name:         "Main Warehouse",
				LocationType: "WAREHOUSE",
				Address:      stringPtr("123 Main St"),
				City:         stringPtr("Springfield"),
				IsActive:     true,
			},
			expectError: false,
		},
		{
			name: "location with temperature control",
			params: LocationParams{
				TenantID:              tenant.ID,
				Name:                  "Cold Storage",
				LocationType:          "WAREHOUSE",
				TemperatureControlled: true,
				SecurityLevel:         stringPtr("HIGH"),
				IsActive:              true,
			},
			expectError: false,
		},
		{
			name: "location with capacity",
			params: LocationParams{
				TenantID:     tenant.ID,
				Name:         "Small Store",
				LocationType: "STORE",
				Capacity:     stringPtr("1000"),
				CapacityUnit: stringPtr("sqft"),
				IsActive:     true,
			},
			expectError: false,
		},
		{
			name:        "empty name should fail",
			params: LocationParams{
				TenantID:     tenant.ID,
				Name:         "",
				LocationType: "WAREHOUSE",
				IsActive:     true,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			location, err := service.CreateLocation(context.Background(), tt.params)

			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if location.Name != tt.params.Name {
				t.Errorf("Expected name %s, got %s", tt.params.Name, location.Name)
			}

			if location.TenantID != tt.params.TenantID {
				t.Errorf("Expected tenant ID %s, got %s", tt.params.TenantID, location.TenantID)
			}

			if location.LocationType != tt.params.LocationType {
				t.Errorf("Expected location type %s, got %s", tt.params.LocationType, location.LocationType)
			}
		})
	}
}

func TestLocationsService_GetLocationByID(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Create a test location
	location := tests.CreateTestLocation(t, testDB, tenant.ID, "Test Warehouse", "WAREHOUSE")

	tests := []struct {
		name        string
		tenantID    uuid.UUID
		locationID  uuid.UUID
		expectError bool
	}{
		{
			name:        "valid location retrieval",
			tenantID:    tenant.ID,
			locationID:  location.ID,
			expectError: false,
		},
		{
			name:        "wrong tenant should fail",
			tenantID:    uuid.New(),
			locationID:  location.ID,
			expectError: true,
		},
		{
			name:        "non-existent location should fail",
			tenantID:    tenant.ID,
			locationID:  uuid.New(),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.GetLocationByID(context.Background(), tt.tenantID, tt.locationID)

			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result.ID != tt.locationID {
				t.Errorf("Expected location ID %s, got %s", tt.locationID, result.ID)
			}
		})
	}
}

func TestLocationsService_UpdateLocation(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Create a test location
	location := tests.CreateTestLocation(t, testDB, tenant.ID, "Original Warehouse", "WAREHOUSE")

	updateParams := LocationParams{
		TenantID:              tenant.ID,
		Name:                  "Updated Warehouse",
		LocationType:          "DISTRIBUTION_CENTER",
		Address:               stringPtr("456 Updated St"),
		City:                  stringPtr("Updated City"),
		TemperatureControlled: true,
		SecurityLevel:         stringPtr("HIGH"),
		IsActive:              true,
	}

	updatedLocation, err := service.UpdateLocation(context.Background(), location.ID, updateParams)
	if err != nil {
		t.Fatalf("Failed to update location: %v", err)
	}

	if updatedLocation.Name != updateParams.Name {
		t.Errorf("Expected name %s, got %s", updateParams.Name, updatedLocation.Name)
	}

	if updatedLocation.LocationType != updateParams.LocationType {
		t.Errorf("Expected location type %s, got %s", updateParams.LocationType, updatedLocation.LocationType)
	}

	if updatedLocation.TemperatureControlled != updateParams.TemperatureControlled {
		t.Errorf("Expected temperature controlled %t, got %t", updateParams.TemperatureControlled, updatedLocation.TemperatureControlled)
	}
}

func TestLocationsService_DeleteLocation(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Create a test location
	location := tests.CreateTestLocation(t, testDB, tenant.ID, "Delete Test Warehouse", "WAREHOUSE")

	// Delete the location
	err := service.DeleteLocation(context.Background(), tenant.ID, location.ID)
	if err != nil {
		t.Fatalf("Failed to delete location: %v", err)
	}

	// Try to retrieve the deleted location - should fail
	_, err = service.GetLocationByID(context.Background(), tenant.ID, location.ID)
	if err == nil {
		t.Error("Expected error when retrieving deleted location, but got none")
	}
}

func TestLocationsService_ListLocations(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Create multiple test locations
	tests.CreateTestLocation(t, testDB, tenant.ID, "Warehouse 1", "WAREHOUSE")
	tests.CreateTestLocation(t, testDB, tenant.ID, "Store 1", "STORE")
	tests.CreateTestLocation(t, testDB, tenant.ID, "Warehouse 2", "WAREHOUSE")

	// Test listing all locations
	locations, err := service.ListLocations(context.Background(), tenant.ID, "WAREHOUSE", true, 10, 0)
	if err != nil {
		t.Fatalf("Failed to list locations: %v", err)
	}

	if len(locations) != 2 {
		t.Errorf("Expected 2 warehouse locations, got %d", len(locations))
	}

	// Test listing by type
	storeLocations, err := service.ListLocationsByType(context.Background(), tenant.ID, "STORE")
	if err != nil {
		t.Fatalf("Failed to list store locations: %v", err)
	}

	if len(storeLocations) != 1 {
		t.Errorf("Expected 1 store location, got %d", len(storeLocations))
	}

	// Test listing active locations
	activeLocations, err := service.ListActiveLocations(context.Background(), tenant.ID)
	if err != nil {
		t.Fatalf("Failed to list active locations: %v", err)
	}

	if len(activeLocations) != 3 {
		t.Errorf("Expected 3 active locations, got %d", len(activeLocations))
	}
}

func TestLocationsService_LocationManagerOperations(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")
	user := tests.CreateTestUser(t, testDB, tenant.ID, "manager@example.com", "password", "manager")

	// Create a location with a manager
	locationParams := LocationParams{
		TenantID:     tenant.ID,
		Name:         "Managed Warehouse",
		LocationType: "WAREHOUSE",
		ManagerID:    &user.ID,
		IsActive:     true,
	}

	location, err := service.CreateLocation(context.Background(), locationParams)
	if err != nil {
		t.Fatalf("Failed to create location with manager: %v", err)
	}

	if !location.ManagerID.Valid || location.ManagerID.UUID != user.ID {
		t.Error("Location manager ID not set correctly")
	}

	// Test getting locations by manager
	managedLocations, err := service.GetLocationsByManager(context.Background(), tenant.ID, user.ID)
	if err != nil {
		t.Fatalf("Failed to get locations by manager: %v", err)
	}

	if len(managedLocations) != 1 {
		t.Errorf("Expected 1 managed location, got %d", len(managedLocations))
	}
}

func TestLocationsService_LocationWithCapacity(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Create a location with capacity
	locationParams := LocationParams{
		TenantID:     tenant.ID,
		Name:         "Capacitated Warehouse",
		LocationType: "WAREHOUSE",
		Capacity:     stringPtr("5000"),
		CapacityUnit: stringPtr("pallet"),
		IsActive:     true,
	}

	location, err := service.CreateLocation(context.Background(), locationParams)
	if err != nil {
		t.Fatalf("Failed to create location with capacity: %v", err)
	}

	if !location.Capacity.Valid || location.Capacity.String != "5000" {
		t.Error("Location capacity not set correctly")
	}

	if !location.CapacityUnit.Valid || location.CapacityUnit.String != "pallet" {
		t.Error("Location capacity unit not set correctly")
	}

	// Test getting locations with capacity
	capacityLocations, err := service.GetLocationsWithCapacity(context.Background(), tenant.ID)
	if err != nil {
		t.Fatalf("Failed to get locations with capacity: %v", err)
	}

	if len(capacityLocations) != 1 {
		t.Errorf("Expected 1 location with capacity, got %d", len(capacityLocations))
	}
}

func TestLocationsService_Validation(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	tests := []struct {
		name        string
		params      LocationParams
		expectError bool
	}{
		{
			name: "location with all optional fields",
			params: LocationParams{
				TenantID:              tenant.ID,
				Name:                  "Complete Location",
				LocationType:          "WAREHOUSE",
				Address:               stringPtr("123 Test St"),
				City:                  stringPtr("Test City"),
				State:                 stringPtr("TS"),
				PostalCode:            stringPtr("12345"),
				Country:               stringPtr("Test Country"),
				Phone:                 stringPtr("+1234567890"),
				Email:                 stringPtr("test@example.com"),
				Capacity:              stringPtr("1000"),
				CapacityUnit:          stringPtr("sqm"),
				OperatingHours:        stringPtr("9-5"),
				TemperatureControlled: true,
				SecurityLevel:         stringPtr("HIGH"),
				IsActive:              true,
				Notes:                 stringPtr("Test notes"),
			},
			expectError: false,
		},
		{
			name: "location with minimal required fields",
			params: LocationParams{
				TenantID:     tenant.ID,
				Name:         "Minimal Location",
				LocationType: "STORE",
				IsActive:     true,
			},
			expectError: false,
		},
		{
			name: "location with default location type",
			params: LocationParams{
				TenantID: tenant.ID,
				Name:     "Default Type Location",
				IsActive: true,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			location, err := service.CreateLocation(context.Background(), tt.params)

			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if location.Name != tt.params.Name {
				t.Errorf("Expected name %s, got %s", tt.params.Name, location.Name)
			}
		})
	}
}

func TestLocationsService_EdgeCases(t *testing.T) {
	testDB := tests.SetupTestDBWithRealDB(t)
	defer testDB.CloseFn()

	service := NewLocationsService(testDB.DB)
	tenant := tests.CreateTestTenant(t, testDB, "TestTenant")

	// Test duplicate name within same tenant
	tests.CreateTestLocation(t, testDB, tenant.ID, "Duplicate Name", "WAREHOUSE")

	location2Params := LocationParams{
		TenantID:     tenant.ID,
		Name:         "Duplicate Name", // Same name as location1
		LocationType: "STORE",
		IsActive:     true,
	}

	_, err := service.CreateLocation(context.Background(), location2Params)
	if err == nil {
		t.Error("Expected error for duplicate location name within tenant, but got none")
	}

	// Test same name in different tenant should work
	tenant2 := tests.CreateTestTenant(t, testDB, "TestTenant2")
	location3Params := LocationParams{
		TenantID:     tenant2.ID,
		Name:         "Duplicate Name", // Same name as location1 but different tenant
		LocationType: "STORE",
		IsActive:     true,
	}

	_, err = service.CreateLocation(context.Background(), location3Params)
	if err != nil {
		t.Errorf("Unexpected error for same location name in different tenant: %v", err)
	}

	// Test pagination
	for i := 0; i < 15; i++ {
		params := LocationParams{
			TenantID:     tenant.ID,
			Name:         fmt.Sprintf("Pagination Test %d", i),
			LocationType: "WAREHOUSE",
			IsActive:     true,
		}
		_, err := service.CreateLocation(context.Background(), params)
		if err != nil {
			t.Fatalf("Failed to create location for pagination test: %v", err)
		}
	}

	// Test pagination with limit
	locations, err := service.ListLocations(context.Background(), tenant.ID, "WAREHOUSE", true, 5, 0)
	if err != nil {
		t.Fatalf("Failed to list locations with pagination: %v", err)
	}

	if len(locations) != 5 {
		t.Errorf("Expected 5 locations with limit 5, got %d", len(locations))
	}

	// Test pagination with offset
	locationsOffset, err := service.ListLocations(context.Background(), tenant.ID, "WAREHOUSE", true, 5, 5)
	if err != nil {
		t.Fatalf("Failed to list locations with offset: %v", err)
	}

	if len(locationsOffset) != 5 {
		t.Errorf("Expected 5 locations with offset 5, got %d", len(locationsOffset))
	}

	// Verify they're different sets
	if locations[0].ID == locationsOffset[0].ID {
		t.Error("Pagination offset not working correctly - got same results")
	}
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}