package examples

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/db"
)

// BEFORE: Your service was tightly coupled to the concrete implementation
type OldProductService struct {
	queries *db.Queries // Concrete type - hard to mock!
}

// AFTER: Your service can now use the interface for better testability
type ProductService struct {
	queries db.Querier // Interface - easy to mock!
}

// NewProductService now accepts any implementation of the Querier interface
func NewProductService(q db.Querier) *ProductService {
	return &ProductService{queries: q}
}

// Example showing the power of JSON tags - can directly return as JSON
func (s *ProductService) GetProductAsJSON(ctx context.Context, id, tenantID uuid.UUID) ([]byte, error) {
	product, err := s.queries.GetProductByID(ctx, db.GetProductByIDParams{
		ID:       id,
		TenantID: tenantID,
	})
	if err != nil {
		return nil, err
	}

	// No need to create separate response structs - JSON tags are built-in!
	return json.Marshal(product)
}

// Example showing empty slices feature
func (s *ProductService) ListProductsSafe(ctx context.Context, tenantID uuid.UUID) ([]db.Product, error) {
	products, err := s.queries.ListProducts(ctx, db.ListProductsParams{
		TenantID: tenantID,
		Limit:    10,
		Offset:   0,
	})
	if err != nil {
		return nil, err
	}
	
	// products is always []db.Product{} never nil, so safe to return directly
	// No need for: if products == nil { return []db.Product{}, nil }
	return products, nil
}

// BONUS: Mock for testing (you would generate this or use a mocking library)
type MockQuerier struct {
	products []db.Product
}

func (m *MockQuerier) GetProductByID(ctx context.Context, arg db.GetProductByIDParams) (db.Product, error) {
	// Mock implementation
	return db.Product{
		ID:       arg.ID,
		TenantID: arg.TenantID,
		Name:     "Mocked Product",
		// JSON tags make this ready for API responses!
	}, nil
}

func (m *MockQuerier) ListProducts(ctx context.Context, arg db.ListProductsParams) ([]db.Product, error) {
	return m.products, nil // Always returns slice, never nil thanks to emit_empty_slices
}

func (m *MockQuerier) AddInventoryQuantity(ctx context.Context, arg db.AddInventoryQuantityParams) error {
	return nil
}

func (m *MockQuerier) CheckProductExists(ctx context.Context, arg db.CheckProductExistsParams) (bool, error) {
	return true, nil
}

func (m *MockQuerier) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	return int64(len(m.products)), nil
}

func (m *MockQuerier) CreateBatch(ctx context.Context, arg db.CreateBatchParams) (db.Batch, error) {
	return db.Batch{}, nil
}

func (m *MockQuerier) CreateCustomer(ctx context.Context, arg db.CreateCustomerParams) (db.Customer, error) {
	return db.Customer{}, nil
}

func (m *MockQuerier) CreateInventoryLog(ctx context.Context, arg db.CreateInventoryLogParams) error {
	return nil
}

func (m *MockQuerier) CreateLocation(ctx context.Context, arg db.CreateLocationParams) (db.Location, error) {
	return db.Location{}, nil
}

func (m *MockQuerier) CreateProduct(ctx context.Context, arg db.CreateProductParams) (db.Product, error) {
	return db.Product{}, nil
}

func (m *MockQuerier) CreatePurchaseOrder(ctx context.Context, arg db.CreatePurchaseOrderParams) (db.PurchaseOrder, error) {
	return db.PurchaseOrder{}, nil
}

func (m *MockQuerier) CreatePurchaseOrderItem(ctx context.Context, arg db.CreatePurchaseOrderItemParams) (db.PurchaseOrderItem, error) {
	return db.PurchaseOrderItem{}, nil
}

func (m *MockQuerier) CreateSalesOrder(ctx context.Context, arg db.CreateSalesOrderParams) (db.SalesOrder, error) {
	return db.SalesOrder{}, nil
}

func (m *MockQuerier) CreateSalesOrderItem(ctx context.Context, arg db.CreateSalesOrderItemParams) (db.SalesOrderItem, error) {
	return db.SalesOrderItem{}, nil
}

func (m *MockQuerier) CreateSupplier(ctx context.Context, arg db.CreateSupplierParams) (db.Supplier, error) {
	return db.Supplier{}, nil
}

func (m *MockQuerier) CreateTenant(ctx context.Context, arg db.CreateTenantParams) (db.Tenant, error) {
	return db.Tenant{}, nil
}

func (m *MockQuerier) CreateUnit(ctx context.Context, arg db.CreateUnitParams) (db.Unit, error) {
	return db.Unit{}, nil
}

func (m *MockQuerier) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	return db.User{}, nil
}

func (m *MockQuerier) GetBatchByID(ctx context.Context, arg db.GetBatchByIDParams) (db.Batch, error) {
	return db.Batch{}, nil
}

func (m *MockQuerier) GetCustomerByID(ctx context.Context, arg db.GetCustomerByIDParams) (db.Customer, error) {
	return db.Customer{}, nil
}

func (m *MockQuerier) GetCustomerSalesSummary(ctx context.Context, tenantID uuid.UUID) ([]db.GetCustomerSalesSummaryRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetInventoryByProductBatch(ctx context.Context, arg db.GetInventoryByProductBatchParams) (db.Inventory, error) {
	return db.Inventory{}, nil
}

func (m *MockQuerier) GetInventoryLogByBatch(ctx context.Context, arg db.GetInventoryLogByBatchParams) ([]db.InventoryLog, error) {
	return nil, nil
}

func (m *MockQuerier) GetInventoryLogByProduct(ctx context.Context, arg db.GetInventoryLogByProductParams) ([]db.InventoryLog, error) {
	return nil, nil
}

func (m *MockQuerier) GetLocationByID(ctx context.Context, arg db.GetLocationByIDParams) (db.Location, error) {
	return db.Location{}, nil
}

func (m *MockQuerier) GetLowStockReport(ctx context.Context, arg db.GetLowStockReportParams) ([]db.GetLowStockReportRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetProductBySKU(ctx context.Context, arg db.GetProductBySKUParams) (db.Product, error) {
	return db.Product{}, nil
}

func (m *MockQuerier) GetProductInventoryDetails(ctx context.Context, arg db.GetProductInventoryDetailsParams) ([]db.GetProductInventoryDetailsRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetProductMovementReport(ctx context.Context, tenantID uuid.UUID) ([]db.GetProductMovementReportRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetProductQuantity(ctx context.Context, arg db.GetProductQuantityParams) (interface{}, error) {
	return nil, nil
}

func (m *MockQuerier) GetPurchaseOrder(ctx context.Context, arg db.GetPurchaseOrderParams) (db.PurchaseOrder, error) {
	return db.PurchaseOrder{}, nil
}

func (m *MockQuerier) GetPurchaseOrderItemByID(ctx context.Context, arg db.GetPurchaseOrderItemByIDParams) (db.PurchaseOrderItem, error) {
	return db.PurchaseOrderItem{}, nil
}

func (m *MockQuerier) GetPurchaseOrderItems(ctx context.Context, arg db.GetPurchaseOrderItemsParams) ([]db.PurchaseOrderItem, error) {
	return nil, nil
}

func (m *MockQuerier) GetSalesOrderItems(ctx context.Context, arg db.GetSalesOrderItemsParams) ([]db.SalesOrderItem, error) {
	return nil, nil
}

func (m *MockQuerier) GetSalesOrder(ctx context.Context, arg db.GetSalesOrderParams) (db.SalesOrder, error) {
	return db.SalesOrder{}, nil
}

func (m *MockQuerier) GetSalesOrderItemByID(ctx context.Context, arg db.GetSalesOrderItemByIDParams) (db.SalesOrderItem, error) {
	return db.SalesOrderItem{}, nil
}

func (m *MockQuerier) GetSalesReportByDate(ctx context.Context, arg db.GetSalesReportByDateParams) ([]db.GetSalesReportByDateRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetSupplierByID(ctx context.Context, arg db.GetSupplierByIDParams) (db.Supplier, error) {
	return db.Supplier{}, nil
}

func (m *MockQuerier) GetSupplierByName(ctx context.Context, arg db.GetSupplierByNameParams) (db.Supplier, error) {
	return db.Supplier{}, nil
}

func (m *MockQuerier) GetSupplierPurchaseSummary(ctx context.Context, tenantID uuid.UUID) ([]db.GetSupplierPurchaseSummaryRow, error) {
	return nil, nil
}

func (m *MockQuerier) GetSupplierPurchaseSummary(ctx context.Context, tenantID uuid.UUID) ([]db.GetSupplierPurchaseSummaryRow, error) {
	return nil, nil
}

// Implement other interface methods...
// (In real code, you'd use a mocking library like testify/mock or gomock)

// Example test showing how easy mocking becomes
func ExampleTest() {
	mock := &MockQuerier{
		products: []db.Product{
			{ID: uuid.New(), Name: "Test Product 1"},
			{ID: uuid.New(), Name: "Test Product 2"},
		},
	}
	
	service := NewProductService(mock) // Uses interface!
	ctx := context.Background()
	
	products, _ := service.ListProductsSafe(ctx, uuid.New())
	// products will always be a valid slice, never nil
	// Each product has JSON tags ready for API responses
	
	jsonData, _ := json.Marshal(products)
	// Direct JSON marshaling works perfectly due to JSON tags
	_ = jsonData
}
