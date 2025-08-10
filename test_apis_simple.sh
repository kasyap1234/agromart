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

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"

    ((TOTAL_TESTS++))

    if [[ "$status" == "PASS" ]]; then
        log_success "$test_name"
    else
        log_error "$test_name - $details"
    fi

    if [[ "$VERBOSE" == "true" && "$details" != "" ]]; then
        echo "  Details: $details"
    fi
}

# Test function that returns result instead of exiting
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local data="${4:-}"
    local auth_header="${5:-}"
    local description="${6:-$method $endpoint}"

    local response
    local status_code

    if [[ "$auth_header" != "" && "$data" != "" ]]; then
        response=$(curl -s -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "$auth_header" \
            -d "$data" 2>/dev/null || echo "000")
    elif [[ "$auth_header" != "" ]]; then
        response=$(curl -s -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" \
            -H "$auth_header" 2>/dev/null || echo "000")
    elif [[ "$data" != "" ]]; then
        response=$(curl -s -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" 2>/dev/null || echo "000")
    fi

    status_code="${response: -3}"
    local body="${response%???}"

    if [[ "$status_code" == "$expected_status" ]]; then
        log_test "$description" "PASS" "HTTP $status_code"
        echo "$body"  # Return the response body for further processing
    else
        log_test "$description" "FAIL" "Expected HTTP $expected_status, got $status_code"
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Response body: $body" >&2
        fi
        echo ""
    fi
}

# Get authentication token
get_auth_token() {
    log_info "Setting up authentication..."

    # Try to register a test user (will fail if already exists, which is fine)
    local register_data='{"name":"Test Admin","email":"test-admin@example.com","password":"TestAdmin123!","phone":"+1234567890","company":"Test Company"}'
    curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "$register_data" >/dev/null 2>&1 || true

    # Login to get token
    local login_data='{"email":"test-admin@example.com","password":"TestAdmin123!"}'
    local login_response
    login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data" 2>/dev/null)

    # Extract token - look for "token":"..." pattern
    local token=$(echo "$login_response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to get authentication token"
        echo "Login response was: $login_response" >&2
        return 1
    fi

    log_success "Authentication token obtained"
    echo "$token"
}

run_health_tests() {
    log_info "Testing Health Endpoints"
    test_endpoint "GET" "/health" "200" "" "" "Health check"
    test_endpoint "GET" "/ready" "200" "" "" "Readiness check"
    test_endpoint "GET" "/live" "200" "" "" "Liveness check"
    test_endpoint "GET" "/api/health" "200" "" "" "API health check"
}

run_auth_tests() {
    log_info "Testing Authentication Endpoints"

    # Test invalid login
    local invalid_login='{"email":"nonexistent@test.com","password":"wrongpassword"}'
    test_endpoint "POST" "/api/auth/login" "401" "$invalid_login" "" "Invalid login"

    # Test logout (doesn't require auth in this implementation)
    test_endpoint "POST" "/api/auth/logout" "200" "" "" "Logout"

    # Test password forgot
    local forgot_data='{"email":"test@example.com"}'
    test_endpoint "POST" "/api/auth/password/forgot" "200" "$forgot_data" "" "Password forgot"
}

run_protected_tests() {
    local token="$1"
    local auth_header="Authorization: Bearer $token"

    log_info "Testing Protected Endpoints"

    # Auth endpoints
    test_endpoint "GET" "/api/auth/me" "200" "" "$auth_header" "Get current user"

    # Products
    test_endpoint "GET" "/api/products" "200" "" "$auth_header" "List products"
    test_endpoint "GET" "/api/products/search?q=test" "200" "" "$auth_header" "Search products"
    test_endpoint "GET" "/api/products/units" "200" "" "$auth_header" "List units"

    # Customers
    test_endpoint "GET" "/api/customers" "200" "" "$auth_header" "List customers"
    test_endpoint "GET" "/api/customers/active" "200" "" "$auth_header" "List active customers"
    test_endpoint "GET" "/api/customers/search?q=test" "200" "" "$auth_header" "Search customers"

    # Suppliers
    test_endpoint "GET" "/api/suppliers" "200" "" "$auth_header" "List suppliers"
    test_endpoint "GET" "/api/suppliers/search?q=test" "200" "" "$auth_header" "Search suppliers"

    # Inventory
    test_endpoint "GET" "/api/inventory" "200" "" "$auth_header" "List inventory"
    test_endpoint "GET" "/api/inventory/logs" "200" "" "$auth_header" "Get inventory logs"

    # Batches
    test_endpoint "GET" "/api/batches" "200" "" "$auth_header" "List batches"

    # Sales
    test_endpoint "GET" "/api/sales/orders" "200" "" "$auth_header" "List sales orders"

    # Purchase Orders
    test_endpoint "GET" "/api/purchase-orders" "200" "" "$auth_header" "List purchase orders"

    # Analytics
    test_endpoint "GET" "/api/analytics/kpis" "200" "" "$auth_header" "Get KPIs"
    test_endpoint "GET" "/api/analytics/sales" "200" "" "$auth_header" "Sales analytics"
    test_endpoint "GET" "/api/analytics/purchases" "200" "" "$auth_header" "Purchase analytics"
    test_endpoint "GET" "/api/analytics/inventory" "200" "" "$auth_header" "Inventory analytics"

    # Reports
    test_endpoint "GET" "/api/reports/dashboard-stats" "200" "" "$auth_header" "Dashboard stats"
    test_endpoint "GET" "/api/reports/low-stock?threshold=10" "200" "" "$auth_header" "Low stock report"
    test_endpoint "GET" "/api/reports/expiring-batches?days=30" "200" "" "$auth_header" "Expiring batches"
    test_endpoint "GET" "/api/reports/inventory-value" "200" "" "$auth_header" "Inventory value"
    test_endpoint "GET" "/api/reports/product-movement" "200" "" "$auth_header" "Product movement"
    test_endpoint "GET" "/api/reports/supplier-purchase-summary" "200" "" "$auth_header" "Supplier purchase summary"
}

run_create_tests() {
    local token="$1"
    local auth_header="Authorization: Bearer $token"

    log_info "Testing Create Operations"

    # Create customer
    local customer_data='{"name":"Test Customer","email":"customer@test.com","phone":"1234567890","address":"123 Test St"}'
    test_endpoint "POST" "/api/customers" "201" "$customer_data" "$auth_header" "Create customer"

    # Create supplier
    local supplier_data='{"name":"Test Supplier","email":"supplier@test.com","phone":"1234567890","address":"456 Supplier Ave"}'
    test_endpoint "POST" "/api/suppliers" "201" "$supplier_data" "$auth_header" "Create supplier"

    # Create product
    local product_data='{"sku":"TEST-PRODUCT-001","name":"Test Product","price":99.99,"unit_id":"11111111-1111-1111-1111-111111111111","description":"Test product description"}'
    local product_response
    product_response=$(test_endpoint "POST" "/api/products" "201" "$product_data" "$auth_header" "Create product")

    # Try to create a batch (will likely fail due to missing product, but tests the endpoint)
    local batch_data='{"product_id":"11111111-1111-1111-1111-111111111111","batch_number":"BATCH-TEST-001","quantity":100,"manufacturing_date":"2025-01-01","expiry_date":"2025-12-31"}'
    test_endpoint "POST" "/api/batches" "400" "$batch_data" "$auth_header" "Create batch (expected to fail)"
}

print_summary() {
    echo
    echo "========================================"
    echo -e "${BLUE}TEST SUMMARY${NC}"
    echo "========================================"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"

    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo -e "Success Rate: ${success_rate}%"
    fi

    echo
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some tests failed, but this might be expected for endpoints requiring existing data.${NC}"
        return 1
    fi
}

main() {
    echo "========================================"
    echo -e "${BLUE}AGROMART API TEST SUITE${NC}"
    echo "========================================"
    echo "Base URL: $BASE_URL"
    echo "Verbose: $VERBOSE"
    echo

    # Check server connectivity
    if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
        log_error "Cannot connect to server at $BASE_URL"
        echo "Please ensure the server is running."
        exit 1
    fi

    log_success "Server is reachable"
    echo

    # Run health tests (no auth needed)
    run_health_tests
    echo

    # Run auth tests
    run_auth_tests
    echo

    # Get token for protected tests
    local token
    if token=$(get_auth_token); then
        echo

        # Run protected read-only tests
        run_protected_tests "$token"
        echo

        # Run create tests (might have some failures due to missing dependencies)
        run_create_tests "$token"
        echo
    else
        log_error "Could not obtain authentication token, skipping protected tests"
        ((FAILED_TESTS += 20))  # Estimate of protected tests that would have run
        ((TOTAL_TESTS += 20))
    fi

    print_summary
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose    Enable verbose output"
            echo "  --base-url URL   Set base URL (default: http://localhost:8080)"
            echo "  -h, --help       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

main
