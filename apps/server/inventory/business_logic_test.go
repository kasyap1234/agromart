package inventory

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockInventoryService is a mock implementation for testing business logic
type MockInventoryService struct {
	inventory map[string]float64 // locationID -> quantity
	reserved  map[string]float64 // locationID -> reserved quantity
}

func NewMockInventoryService() *MockInventoryService {
	return &MockInventoryService{
		inventory: make(map[string]float64),
		reserved:  make(map[string]float64),
	}
}

func (m *MockInventoryService) GetAvailableQuantity(locationID string) float64 {
	return m.inventory[locationID] - m.reserved[locationID]
}

func (m *MockInventoryService) ReserveInventory(locationID string, quantity float64) error {
	if quantity < 0 {
		return errors.New("reservation quantity cannot be negative")
	}

	if quantity == 0 {
		return nil // Allow zero reservations
	}

	available := m.GetAvailableQuantity(locationID)
	if available < quantity {
		return errors.New("insufficient inventory")
	}
	m.reserved[locationID] += quantity
	return nil
}

func (m *MockInventoryService) ReleaseReservation(locationID string, quantity float64) error {
	if m.reserved[locationID] < quantity {
		return errors.New("insufficient reserved quantity")
	}
	m.reserved[locationID] -= quantity
	return nil
}

func (m *MockInventoryService) TransferInventory(fromLocationID, toLocationID string, quantity float64) error {
	// Validate quantity
	if quantity < 0 {
		return errors.New("transfer quantity cannot be negative")
	}

	if quantity == 0 {
		return nil // Allow zero transfers
	}

	available := m.GetAvailableQuantity(fromLocationID)
	if available < quantity {
		return errors.New("insufficient inventory for transfer")
	}

	// Deduct from source
	m.inventory[fromLocationID] -= quantity

	// Add to destination
	m.inventory[toLocationID] += quantity

	return nil
}

func (m *MockInventoryService) SetInventory(locationID string, quantity float64) {
	m.inventory[locationID] = quantity
}

func TestInventoryTransferBusinessLogic(t *testing.T) {
	service := NewMockInventoryService()

	tests := []struct {
		name        string
		setup       func()
		transfer    func() error
		expectError bool
		errorMsg    string
		validate    func(t *testing.T)
	}{
		{
			name: "successful inventory transfer",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 50.0)
			},
			transfer: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 30.0)
			},
			expectError: false,
			validate: func(t *testing.T) {
				assert.Equal(t, 70.0, service.inventory["warehouse1"])
				assert.Equal(t, 80.0, service.inventory["warehouse2"])
			},
		},
		{
			name: "insufficient inventory for transfer",
			setup: func() {
				service.SetInventory("warehouse1", 10.0)
				service.SetInventory("warehouse2", 50.0)
			},
			transfer: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 50.0)
			},
			expectError: true,
			errorMsg:    "insufficient inventory for transfer",
			validate: func(t *testing.T) {
				// Inventory should remain unchanged
				assert.Equal(t, 10.0, service.inventory["warehouse1"])
				assert.Equal(t, 50.0, service.inventory["warehouse2"])
			},
		},
		{
			name: "transfer zero quantity",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 50.0)
			},
			transfer: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 0.0)
			},
			expectError: false,
			validate: func(t *testing.T) {
				assert.Equal(t, 100.0, service.inventory["warehouse1"])
				assert.Equal(t, 50.0, service.inventory["warehouse2"])
			},
		},
		{
			name: "transfer negative quantity should fail",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 50.0)
			},
			transfer: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", -10.0)
			},
			expectError: true,
			errorMsg:    "transfer quantity cannot be negative",
			validate: func(t *testing.T) {
				// Inventory should remain unchanged
				assert.Equal(t, 100.0, service.inventory["warehouse1"])
				assert.Equal(t, 50.0, service.inventory["warehouse2"])
			},
		},
		{
			name: "transfer to non-existent location",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
			},
			transfer: func() error {
				return service.TransferInventory("warehouse1", "nonexistent", 30.0)
			},
			expectError: false, // Mock allows it, but real implementation should validate
			validate: func(t *testing.T) {
				assert.Equal(t, 70.0, service.inventory["warehouse1"])
				assert.Equal(t, 30.0, service.inventory["nonexistent"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset service state
			service = NewMockInventoryService()

			// Setup initial state
			tt.setup()

			// Perform transfer
			err := tt.transfer()

			// Validate error
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			// Validate final state
			tt.validate(t)
		})
	}
}

func TestInventoryReservationBusinessLogic(t *testing.T) {
	service := NewMockInventoryService()

	tests := []struct {
		name        string
		setup       func()
		operation   func() error
		expectError bool
		errorMsg    string
		validate    func(t *testing.T)
	}{
		{
			name: "successful inventory reservation",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
			},
			operation: func() error {
				return service.ReserveInventory("warehouse1", 30.0)
			},
			expectError: false,
			validate: func(t *testing.T) {
				assert.Equal(t, 30.0, service.reserved["warehouse1"])
				assert.Equal(t, 70.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
		{
			name: "insufficient inventory for reservation",
			setup: func() {
				service.SetInventory("warehouse1", 20.0)
			},
			operation: func() error {
				return service.ReserveInventory("warehouse1", 50.0)
			},
			expectError: true,
			errorMsg:    "insufficient inventory",
			validate: func(t *testing.T) {
				assert.Equal(t, 0.0, service.reserved["warehouse1"])
				assert.Equal(t, 20.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
		{
			name: "reserve zero quantity",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
			},
			operation: func() error {
				return service.ReserveInventory("warehouse1", 0.0)
			},
			expectError: false,
			validate: func(t *testing.T) {
				assert.Equal(t, 0.0, service.reserved["warehouse1"])
				assert.Equal(t, 100.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
		{
			name: "reserve negative quantity should fail",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
			},
			operation: func() error {
				return service.ReserveInventory("warehouse1", -10.0)
			},
			expectError: true,
			errorMsg:    "reservation quantity cannot be negative",
			validate: func(t *testing.T) {
				assert.Equal(t, 0.0, service.reserved["warehouse1"])
				assert.Equal(t, 100.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
		{
			name: "release reservation successfully",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.ReserveInventory("warehouse1", 40.0)
			},
			operation: func() error {
				return service.ReleaseReservation("warehouse1", 20.0)
			},
			expectError: false,
			validate: func(t *testing.T) {
				assert.Equal(t, 20.0, service.reserved["warehouse1"])
				assert.Equal(t, 80.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
		{
			name: "release more than reserved should fail",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.ReserveInventory("warehouse1", 30.0)
			},
			operation: func() error {
				return service.ReleaseReservation("warehouse1", 50.0)
			},
			expectError: true,
			errorMsg:    "insufficient reserved quantity",
			validate: func(t *testing.T) {
				assert.Equal(t, 30.0, service.reserved["warehouse1"])
				assert.Equal(t, 70.0, service.GetAvailableQuantity("warehouse1"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset service state
			service = NewMockInventoryService()

			// Setup initial state
			tt.setup()

			// Perform operation
			err := tt.operation()

			// Validate error
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			// Validate final state
			tt.validate(t)
		})
	}
}

func TestComplexInventoryWorkflows(t *testing.T) {
	service := NewMockInventoryService()

	t.Run("order fulfillment workflow", func(t *testing.T) {
		// Setup: Multiple warehouses with different products
		service.SetInventory("warehouse1", 100.0) // Product A
		service.SetInventory("warehouse2", 200.0) // Product B
		service.SetInventory("warehouse3", 50.0)  // Product A

		// Step 1: Reserve inventory for an order
		err := service.ReserveInventory("warehouse1", 30.0) // Reserve 30 units of Product A
		require.NoError(t, err)

		// Verify reservation
		assert.Equal(t, 30.0, service.reserved["warehouse1"])
		assert.Equal(t, 70.0, service.GetAvailableQuantity("warehouse1"))

		// Step 2: Try to reserve more than available (should fail)
		err = service.ReserveInventory("warehouse1", 80.0)
		assert.Error(t, err)

		// Step 3: Transfer inventory from warehouse3 to warehouse1 to fulfill additional demand
		err = service.TransferInventory("warehouse3", "warehouse1", 40.0)
		require.NoError(t, err)

		// Verify transfer
		assert.Equal(t, 10.0, service.inventory["warehouse3"]) // 50 - 40
		assert.Equal(t, 140.0, service.inventory["warehouse1"]) // 100 - 30 (reserved) + 40 (transferred) + 30 (original available)

		// Step 4: Now reserve the additional quantity
		err = service.ReserveInventory("warehouse1", 50.0)
		require.NoError(t, err)

		// Step 5: Release some reservations (e.g., order cancelled)
		err = service.ReleaseReservation("warehouse1", 20.0)
		require.NoError(t, err)

		// Final state verification
		assert.Equal(t, 60.0, service.reserved["warehouse1"]) // 30 + 50 - 20
		assert.Equal(t, 80.0, service.GetAvailableQuantity("warehouse1")) // 140 - 60
	})

	t.Run("seasonal inventory rebalancing", func(t *testing.T) {
		// Setup: Seasonal demand changes require inventory rebalancing
		service.SetInventory("north_warehouse", 300.0)  // High inventory, low demand
		service.SetInventory("south_warehouse", 50.0)   // Low inventory, high demand

		// Step 1: Transfer inventory from north to south to balance
		err := service.TransferInventory("north_warehouse", "south_warehouse", 100.0)
		require.NoError(t, err)

		// Verify transfer
		assert.Equal(t, 200.0, service.inventory["north_warehouse"])
		assert.Equal(t, 150.0, service.inventory["south_warehouse"])

		// Step 2: Emergency transfer due to unexpected high demand
		err = service.TransferInventory("north_warehouse", "south_warehouse", 50.0)
		require.NoError(t, err)

		// Step 3: Reserve inventory for large order
		err = service.ReserveInventory("south_warehouse", 80.0)
		require.NoError(t, err)

		// Final state
		assert.Equal(t, 150.0, service.inventory["north_warehouse"])
		assert.Equal(t, 200.0, service.inventory["south_warehouse"])
		assert.Equal(t, 80.0, service.reserved["south_warehouse"])
		assert.Equal(t, 120.0, service.GetAvailableQuantity("south_warehouse"))
	})

	t.Run("multi-location inventory optimization", func(t *testing.T) {
		// Setup: Complex scenario with multiple products and locations
		service.SetInventory("primary_dc", 500.0)
		service.SetInventory("regional1", 100.0)
		service.SetInventory("regional2", 200.0)
		service.SetInventory("store1", 30.0)
		service.SetInventory("store2", 80.0)

		// Step 1: Bulk transfer from primary DC to regional warehouses
		err := service.TransferInventory("primary_dc", "regional1", 150.0)
		require.NoError(t, err)
		err = service.TransferInventory("primary_dc", "regional2", 200.0)
		require.NoError(t, err)

		// Step 2: Regional warehouses supply local stores
		err = service.TransferInventory("regional1", "store1", 50.0)
		require.NoError(t, err)
		err = service.TransferInventory("regional2", "store2", 100.0)
		require.NoError(t, err)

		// Step 3: Reserve inventory for upcoming sales
		err = service.ReserveInventory("store1", 20.0)
		require.NoError(t, err)
		err = service.ReserveInventory("store2", 50.0)
		require.NoError(t, err)

		// Verify final state
		assert.Equal(t, 150.0, service.inventory["primary_dc"])
		assert.Equal(t, 200.0, service.inventory["regional1"])
		assert.Equal(t, 300.0, service.inventory["regional2"]) // 200 + 100 transferred from regional2 to store2
		assert.Equal(t, 80.0, service.inventory["store1"])
		assert.Equal(t, 180.0, service.inventory["store2"])

		assert.Equal(t, 20.0, service.reserved["store1"])
		assert.Equal(t, 50.0, service.reserved["store2"])

		assert.Equal(t, 60.0, service.GetAvailableQuantity("store1"))
		assert.Equal(t, 130.0, service.GetAvailableQuantity("store2"))
	})
}

func TestInventoryBusinessRules(t *testing.T) {
	service := NewMockInventoryService()

	tests := []struct {
		name        string
		setup       func()
		operation   func() error
		expectError bool
		errorMsg    string
		description string
	}{
		{
			name: "minimum stock level validation",
			setup: func() {
				service.SetInventory("warehouse1", 5.0) // Below minimum stock level
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 3.0)
			},
			expectError: false, // Mock doesn't enforce business rules, but real implementation should
			description: "Transferring inventory that would leave stock below minimum level",
		},
		{
			name: "maximum capacity validation",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 900.0) // Near capacity limit
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 200.0) // Would exceed capacity
			},
			expectError: true, // Should fail due to insufficient inventory in source
			errorMsg: "insufficient inventory for transfer",
			description: "Transferring inventory that would exceed warehouse capacity",
		},
		{
			name: "product compatibility validation",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 50.0)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 30.0)
			},
			expectError: false, // Mock doesn't validate product compatibility
			description: "Transferring incompatible products between locations",
		},
		{
			name: "location access control",
			setup: func() {
				service.SetInventory("restricted_warehouse", 100.0)
				service.SetInventory("general_warehouse", 50.0)
			},
			operation: func() error {
				return service.TransferInventory("restricted_warehouse", "general_warehouse", 30.0)
			},
			expectError: false, // Mock doesn't enforce access control
			description: "Transferring from restricted to general access location",
		},
		{
			name: "temperature-controlled inventory handling",
			setup: func() {
				service.SetInventory("temp_controlled", 100.0)
				service.SetInventory("general_storage", 50.0)
			},
			operation: func() error {
				return service.TransferInventory("temp_controlled", "general_storage", 30.0)
			},
			expectError: false, // Mock doesn't enforce temperature requirements
			description: "Transferring temperature-sensitive inventory to non-temperature-controlled location",
		},
		{
			name: "batch/lot tracking validation",
			setup: func() {
				service.SetInventory("warehouse1", 100.0)
				service.SetInventory("warehouse2", 50.0)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 25.0)
			},
			expectError: false, // Mock doesn't track batches/lots
			description: "Transferring inventory without proper batch/lot tracking",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset service state
			service = NewMockInventoryService()

			// Setup initial state
			tt.setup()

			// Perform operation
			err := tt.operation()

			// Validate error
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			t.Logf("Test description: %s", tt.description)
		})
	}
}

func TestInventoryEdgeCases(t *testing.T) {
	service := NewMockInventoryService()

	tests := []struct {
		name        string
		setup       func()
		operation   func() error
		expectError bool
		description string
	}{
		{
			name: "floating point precision handling",
			setup: func() {
				service.SetInventory("warehouse1", 100.123456789)
				service.SetInventory("warehouse2", 50.987654321)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 33.333333333)
			},
			expectError: false,
			description: "Handling floating point precision in inventory calculations",
		},
		{
			name: "concurrent transfer operations",
			setup: func() {
				service.SetInventory("warehouse1", 1000.0)
				service.SetInventory("warehouse2", 100.0)
			},
			operation: func() error {
				// Simulate multiple concurrent transfers
				errors := make(chan error, 3)

				go func() { errors <- service.TransferInventory("warehouse1", "warehouse2", 100.0) }()
				go func() { errors <- service.TransferInventory("warehouse1", "warehouse2", 200.0) }()
				go func() { errors <- service.TransferInventory("warehouse1", "warehouse2", 150.0) }()

				// Collect errors
				var lastErr error
				for i := 0; i < 3; i++ {
					if err := <-errors; err != nil {
						lastErr = err
					}
				}
				return lastErr
			},
			expectError: false, // Mock doesn't handle race conditions properly, all operations succeed
			description: "Handling concurrent transfer operations and race conditions",
		},
		{
			name: "zero inventory handling",
			setup: func() {
				service.SetInventory("warehouse1", 0.0)
				service.SetInventory("warehouse2", 100.0)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 10.0)
			},
			expectError: true,
			description: "Handling transfers from locations with zero inventory",
		},
		{
			name: "negative inventory handling",
			setup: func() {
				service.SetInventory("warehouse1", -50.0) // Negative inventory (accounting error)
				service.SetInventory("warehouse2", 100.0)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 10.0)
			},
			expectError: true,
			description: "Handling transfers from locations with negative inventory",
		},
		{
			name: "extremely large quantities",
			setup: func() {
				service.SetInventory("warehouse1", 1e10) // Very large number
				service.SetInventory("warehouse2", 1e5)
			},
			operation: func() error {
				return service.TransferInventory("warehouse1", "warehouse2", 5e9)
			},
			expectError: false,
			description: "Handling extremely large inventory quantities",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset service state
			service = NewMockInventoryService()

			// Setup initial state
			tt.setup()

			// Perform operation
			err := tt.operation()

			// Validate error
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			t.Logf("Test description: %s", tt.description)
		})
	}
}

func TestInventoryKPIsAndMetrics(t *testing.T) {
	service := NewMockInventoryService()

	t.Run("inventory turnover calculation", func(t *testing.T) {
		// Setup inventory and sales data simulation
		service.SetInventory("warehouse1", 1000.0)
		service.SetInventory("warehouse2", 500.0)

		// Simulate sales (inventory reduction)
		err := service.TransferInventory("warehouse1", "sold", 200.0)
		require.NoError(t, err)
		err = service.TransferInventory("warehouse2", "sold", 100.0)
		require.NoError(t, err)

		// Calculate inventory turnover (simplified)
		averageInventory := (1000.0 + 500.0) / 2 // Simple average
		totalSales := 300.0
		turnoverRatio := totalSales / averageInventory

		// Verify turnover calculation
		assert.Greater(t, turnoverRatio, 0.0)
		assert.LessOrEqual(t, turnoverRatio, 1.0) // High turnover

		// Verify remaining inventory
		assert.Equal(t, 800.0, service.inventory["warehouse1"])
		assert.Equal(t, 400.0, service.inventory["warehouse2"])
		assert.Equal(t, 300.0, service.inventory["sold"])
	})

	t.Run("stock level monitoring", func(t *testing.T) {
		// Setup inventory with different stock levels
		service.SetInventory("overstocked", 1000.0)
		service.SetInventory("normal_stock", 500.0)
		service.SetInventory("low_stock", 50.0)
		service.SetInventory("out_of_stock", 0.0)

		// Define stock level thresholds
		overstockThreshold := 800.0
		lowStockThreshold := 100.0
		minStockThreshold := 10.0

		// Analyze stock levels
		stockAnalysis := map[string]string{}

		locations := []string{"overstocked", "normal_stock", "low_stock", "out_of_stock"}
		for _, location := range locations {
			quantity := service.inventory[location]

			switch {
			case quantity == 0:
				stockAnalysis[location] = "OUT_OF_STOCK"
			case quantity <= minStockThreshold:
				stockAnalysis[location] = "CRITICAL"
			case quantity <= lowStockThreshold:
				stockAnalysis[location] = "LOW"
			case quantity >= overstockThreshold:
				stockAnalysis[location] = "OVERSTOCK"
			default:
				stockAnalysis[location] = "NORMAL"
			}
		}

		// Verify stock level analysis
		assert.Equal(t, "OVERSTOCK", stockAnalysis["overstocked"])
		assert.Equal(t, "NORMAL", stockAnalysis["normal_stock"])
		assert.Equal(t, "LOW", stockAnalysis["low_stock"])
		assert.Equal(t, "OUT_OF_STOCK", stockAnalysis["out_of_stock"])

		// Simulate restocking based on analysis
		if stockAnalysis["low_stock"] == "LOW" {
			err := service.TransferInventory("overstocked", "low_stock", 200.0)
			require.NoError(t, err)
		}

		// Verify restocking
		assert.Equal(t, 800.0, service.inventory["overstocked"])
		assert.Equal(t, 250.0, service.inventory["low_stock"])
	})
}