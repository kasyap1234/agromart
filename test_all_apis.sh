#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-http://localhost:8080}
VERBOSE=${VERBOSE:-false}

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results storage
declare -a FAILED_TEST_DETAILS=()

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TEST_DETAILS+=("$1")
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test a single endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local data="${4:-}"
    local headers="${5:-}"
    local description="${6:-$method $endpoint}"

    ((TOTAL_TESTS++))

    local curl_cmd="curl -s -w '%{http_code}'"

    if [[ "$headers" != "" ]]; then
        curl_cmd="$curl_cmd $headers"
    fi

    if [[ "$data" != "" ]]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    curl_cmd="$curl_cmd -X $method '$BASE_URL$endpoint'"

    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Testing: $description"
        log_info "Command: $curl_cmd"
    fi

    local response
    response=$(eval "$curl_cmd")
    local status_code="${response: -3}"
    local body="${response%???}"

    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$description (HTTP $status_code)"
        if [[ "$VERBOSE" == "true" && "$body" != "" ]]; then
            echo "Response: $body" | head -c 200
            echo
        fi
    else
        log_error "$description - Expected: $expected_status, Got: $status_code"
        if [[ "$body" != "" ]]; then
            echo "Response: $body" | head -c 200
            echo
        fi
    fi
}

# Test with authentication
test_auth_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local token="$4"
    local data="${5:-}"
    local description="${6:-$method $endpoint}"

    local auth_header="-H 'Authorization: Bearer $token'"
    test_endpoint "$method" "$endpoint" "$expected_status" "$data" "$auth_header" "$description"
}

# Get authentication token
get_auth_token() {
    log_info "Getting authentication token..."

    # First, try to register admin user (may fail if already exists)
    local register_data='{"name":"Test Admin","email":"admin@test.com","password":"AdminPassword123!","phone":"+1234567890","company":"Test Company"}'
    curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "$register_data" > /dev/null || true

    # Login to get token
    local login_data='{"email":"admin@test.com","password":"AdminPassword123!"}'
    local login_response
    login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data")

    # Extract token using basic string manipulation
    local token
    token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\([^"]*\)"/\1/' | head -1)

    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to get authentication token"
        echo "Login response: $login_response"
        exit 1
    fi

    log_success "Authentication token obtained"
    echo "$token"
}

# Test health endpoints
test_health_endpoints() {
    log_info "Testing Health Endpoints..."

    test_endpoint "GET" "/health" "200" "" "" "Health check"
    test_endpoint "GET" "/ready" "200" "" "" "Readiness check"
    test_endpoint "GET" "/live" "200" "" "" "Liveness check"
    test_endpoint "GET" "/api/health" "200" "" "" "API health check"
}

# Test authentication endpoints
test_auth_endpoints() {
    log_info "Testing Authentication Endpoints..."

    # Test registration (may fail if user exists)
    local register_data='{"name":"New User","email":"newuser@test.com","password":"NewPassword123!","phone":"+1234567890","company":"Test Company"}'
    curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "$register_data" > /dev/null || true

    # Test login with valid credentials
    local login_data='{"email":"admin@test.com","password":"AdminPassword123!"}'
    test_endpoint "POST" "/api/auth/login" "200" "$login_data" "" "Login with valid credentials"

    # Test login with invalid credentials
    local invalid_login='{"email":"wrong@test.com","password":"wrongpass"}'
    test_endpoint "POST" "/api/auth/login" "401" "$invalid_login" "" "Login with invalid credentials"

    # Test logout
    test_endpoint "POST" "/api/auth/logout" "200" "" "" "Logout"

    # Test password forgot
    local forgot_data='{"email":"admin@test.com"}'
    test_endpoint "POST" "/api/auth/password/forgot" "200" "$forgot_data" "" "Password forgot"
}

# Test protected auth endpoints
test_protected_auth_endpoints() {
    local token="$1"
    log_info "Testing Protected Authentication Endpoints..."

    test_auth_endpoint "GET" "/api/auth/me" "200" "$token" "" "Get current user info"

    # Test password update
    local password_data='{"current_password":"AdminPassword123!","new_password":"NewAdminPassword123!"}'
    test_auth_endpoint "PUT" "/api/password" "200" "$token" "$password_data" "Update password"
}

# Test product endpoints
test_product_endpoints() {
    local token="$1"
    log_info "Testing Product Endpoints..."

    # Create a product
    local create_product='{"sku":"TEST-SKU-001","name":"Test Product","price":99.99,"unit_id":"11111111-1111-1111-1111-111111111111","description":"A test product"}'
    test_auth_endpoint "POST" "/api/products" "201" "$token" "$create_product" "Create product"

    # List products
    test_auth_endpoint "GET" "/api/products" "200" "$token" "" "List products"

    # Search products
    test_auth_endpoint "GET" "/api/products/search?q=Test" "200" "$token" "" "Search products"

    # List units
    test_auth_endpoint "GET" "/api/products/units" "200" "$token" "" "List units"

    # Get specific product (assuming some product exists)
    # This might fail if no products exist, but that's expected
    test_auth_endpoint "GET" "/api/products/11111111-1111-1111-1111-111111111111" "404" "$token" "" "Get non-existent product"
}

# Test customer endpoints
test_customer_endpoints() {
    local token="$1"
    log_info "Testing Customer Endpoints..."

    # Create a customer
    local create_customer='{"name":"Test Customer","email":"customer@test.com","phone":"1234567890","address":"123 Test Street"}'
    test_auth_endpoint "POST" "/api/customers" "201" "$token" "$create_customer" "Create customer"

    # List customers
    test_auth_endpoint "GET" "/api/customers" "200" "$token" "" "List customers"

    # List active customers
    test_auth_endpoint "GET" "/api/customers/active" "200" "$token" "" "List active customers"

    # Search customers
    test_auth_endpoint "GET" "/api/customers/search?q=Test" "200" "$token" "" "Search customers"
}

# Test supplier endpoints
test_supplier_endpoints() {
    local token="$1"
    log_info "Testing Supplier Endpoints..."

    # Create a supplier
    local create_supplier='{"name":"Test Supplier","email":"supplier@test.com","phone":"1234567890","address":"456 Supplier Lane"}'
    test_auth_endpoint "POST" "/api/suppliers" "201" "$token" "$create_supplier" "Create supplier"

    # List suppliers
    test_auth_endpoint "GET" "/api/suppliers" "200" "$token" "" "List suppliers"

    # Search suppliers
    test_auth_endpoint "GET" "/api/suppliers/search?q=Test" "200" "$token" "" "Search suppliers"
}

# Test inventory endpoints
test_inventory_endpoints() {
    local token="$1"
    log_info "Testing Inventory Endpoints..."

    # List inventory
    test_auth_endpoint "GET" "/api/inventory" "200" "$token" "" "List inventory"

    # Get inventory logs
    test_auth_endpoint "GET" "/api/inventory/logs" "200" "$token" "" "Get inventory logs"

    # Add inventory (might fail if product doesn't exist)
    local add_inventory='{"product_id":"11111111-1111-1111-1111-111111111111","quantity":100,"cost_per_unit":10.50}'
    test_auth_endpoint "POST" "/api/inventory/add" "400" "$token" "$add_inventory" "Add inventory (expected to fail)"

    # Reduce inventory (might fail if product doesn't exist)
    local reduce_inventory='{"product_id":"11111111-1111-1111-1111-111111111111","quantity":10}'
    test_auth_endpoint "POST" "/api/inventory/reduce" "400" "$token" "$reduce_inventory" "Reduce inventory (expected to fail)"
}

# Test batch endpoints
test_batch_endpoints() {
    local token="$1"
    log_info "Testing Batch Endpoints..."

    # List batches
    test_auth_endpoint "GET" "/api/batches" "200" "$token" "" "List batches"

    # Create batch (might fail if product doesn't exist)
    local create_batch='{"product_id":"11111111-1111-1111-1111-111111111111","batch_number":"BATCH-001","quantity":50,"manufacturing_date":"2025-01-01","expiry_date":"2025-12-31"}'
    test_auth_endpoint "POST" "/api/batches" "400" "$token" "$create_batch" "Create batch (expected to fail)"
}

# Test sales endpoints
test_sales_endpoints() {
    local token="$1"
    log_info "Testing Sales Endpoints..."

    # List sales orders
    test_auth_endpoint "GET" "/api/sales/orders" "200" "$token" "" "List sales orders"

    # Create sales order (might fail if customer/product doesn't exist)
    local create_sale='{"customer_id":"11111111-1111-1111-1111-111111111111","items":[{"product_id":"11111111-1111-1111-1111-111111111111","quantity":5,"unit_price":99.99}]}'
    test_auth_endpoint "POST" "/api/sales/orders" "400" "$token" "$create_sale" "Create sales order (expected to fail)"
}

# Test purchase order endpoints
test_purchase_order_endpoints() {
    local token="$1"
    log_info "Testing Purchase Order Endpoints..."

    # List purchase orders
    test_auth_endpoint "GET" "/api/purchase-orders" "200" "$token" "" "List purchase orders"

    # Create purchase order (might fail if supplier/product doesn't exist)
    local create_po='{"supplier_id":"11111111-1111-1111-1111-111111111111","items":[{"product_id":"11111111-1111-1111-1111-111111111111","quantity":100,"unit_cost":50.00}]}'
    test_auth_endpoint "POST" "/api/purchase-orders" "400" "$token" "$create_po" "Create purchase order (expected to fail)"
}

# Test analytics endpoints
test_analytics_endpoints() {
    local token="$1"
    log_info "Testing Analytics Endpoints..."

    test_auth_endpoint "GET" "/api/analytics/kpis" "200" "$token" "" "Get KPIs"
    test_auth_endpoint "GET" "/api/analytics/sales" "200" "$token" "" "Get sales analytics"
    test_auth_endpoint "GET" "/api/analytics/purchases" "200" "$token" "" "Get purchases analytics"
    test_auth_endpoint "GET" "/api/analytics/inventory" "200" "$token" "" "Get inventory analytics"
}

# Test reports endpoints
test_reports_endpoints() {
    local token="$1"
    log_info "Testing Reports Endpoints..."

    test_auth_endpoint "GET" "/api/reports/dashboard-stats" "200" "$token" "" "Dashboard stats"
    test_auth_endpoint "GET" "/api/reports/low-stock?threshold=10" "200" "$token" "" "Low stock report"
    test_auth_endpoint "GET" "/api/reports/expiring-batches?days=30" "200" "$token" "" "Expiring batches report"
    test_auth_endpoint "GET" "/api/reports/inventory-value" "200" "$token" "" "Inventory value report"
    test_auth_endpoint "GET" "/api/reports/product-movement" "200" "$token" "" "Product movement report"
    test_auth_endpoint "GET" "/api/reports/supplier-purchase-summary" "200" "$token" "" "Supplier purchase summary"
}

# Test swagger/docs endpoints (if in dev mode)
test_docs_endpoints() {
    log_info "Testing Documentation Endpoints..."

    # These might not be available in production
    test_endpoint "GET" "/swagger/" "200" "" "" "Swagger documentation (redirect)"
    test_endpoint "GET" "/metrics" "200" "" "" "Prometheus metrics (might not be available)"
}

# Print summary
print_summary() {
    echo
    echo "=================================="
    echo -e "${BLUE}TEST SUMMARY${NC}"
    echo "=================================="
    echo -e "Total Tests: ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        echo
        echo -e "${RED}Failed Tests:${NC}"
        for failure in "${FAILED_TEST_DETAILS[@]}"; do
            echo -e "  ${RED}•${NC} $failure"
        done
    fi

    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "Success Rate: ${success_rate}%"

    if [[ ${FAILED_TESTS} -eq 0 ]]; then
        echo -e "${GREEN}All tests passed! 🎉${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed. Please check the logs above.${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo "=================================="
    echo -e "${BLUE}AGROMART API TEST SUITE${NC}"
    echo "=================================="
    echo "Base URL: $BASE_URL"
    echo "Verbose: $VERBOSE"
    echo

    # Check if server is running
    if ! curl -s "$BASE_URL/health" > /dev/null; then
        log_error "Server is not responding at $BASE_URL"
        echo "Please ensure the server is running before running tests."
        exit 1
    fi

    log_success "Server is running"
    echo

    # Get authentication token
    local token
    token=$(get_auth_token)
    echo

    # Run all test suites
    test_health_endpoints
    echo

    test_auth_endpoints
    echo

    test_protected_auth_endpoints "$token"
    echo

    test_product_endpoints "$token"
    echo

    test_customer_endpoints "$token"
    echo

    test_supplier_endpoints "$token"
    echo

    test_inventory_endpoints "$token"
    echo

    test_batch_endpoints "$token"
    echo

    test_sales_endpoints "$token"
    echo

    test_purchase_order_endpoints "$token"
    echo

    test_analytics_endpoints "$token"
    echo

    test_reports_endpoints "$token"
    echo

    test_docs_endpoints
    echo

    print_summary
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --verbose, -v           Enable verbose output"
            echo "  --base-url URL          Set base URL (default: http://localhost:8080)"
            echo "  --help, -h              Show this help message"
            echo
            echo "Environment Variables:"
            echo "  BASE_URL                Base URL for the API (default: http://localhost:8080)"
            echo "  VERBOSE                 Enable verbose output (default: false)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
