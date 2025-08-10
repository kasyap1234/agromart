#!/bin/bash

# Comprehensive Test Runner for AgroMart Backend
# This script runs all tests with coverage reporting and generates detailed reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
MIN_COVERAGE=80

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Setup test environment
setup_test_env() {
    print_header "Setting up test environment"

    # Create directories
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$TEST_RESULTS_DIR"

    # Clean previous results
    rm -f "$COVERAGE_DIR"/*
    rm -f "$TEST_RESULTS_DIR"/*

    print_success "Test environment setup complete"
}

# Check dependencies
check_dependencies() {
    print_header "Checking dependencies"

    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed or not in PATH"
        exit 1
    fi

    # Check Go version
    GO_VERSION=$(go version | cut -d' ' -f3 | sed 's/go//')
    print_info "Go version: $GO_VERSION"

    # Check if required tools are available
    if ! go list -m github.com/stretchr/testify &> /dev/null; then
        print_info "Installing testify..."
        go get github.com/stretchr/testify@latest
    fi

    print_success "Dependencies check complete"
}

# Run unit tests
run_unit_tests() {
    print_header "Running unit tests"

    # Find all packages with tests
    TEST_PACKAGES=$(find . -name "*_test.go" -not -path "./integration/*" -not -path "./vendor/*" | xargs dirname | sort -u)

    if [ -z "$TEST_PACKAGES" ]; then
        print_warning "No unit test packages found"
        return
    fi

    echo "Found test packages:"
    for pkg in $TEST_PACKAGES; do
        echo "  - $pkg"
    done

    # Run tests with coverage
    print_info "Running unit tests with coverage..."

    # Create coverage profile
    COVERAGE_PROFILE="$COVERAGE_DIR/unit_coverage.out"

    # Run tests
    go test -v -race -coverprofile="$COVERAGE_PROFILE" -covermode=atomic \
        -timeout=30s \
        -json \
        $TEST_PACKAGES > "$TEST_RESULTS_DIR/unit_tests.json" 2>&1

    local test_exit_code=$?

    # Parse test results
    if [ $test_exit_code -eq 0 ]; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        # Show failed tests
        if command -v jq &> /dev/null; then
            echo "Failed tests:"
            jq -r 'select(.Action == "fail") | "  - \(.Package)/\(.Test // "unknown"): \(.Output // "")"' "$TEST_RESULTS_DIR/unit_tests.json" | head -10
        fi
    fi

    # Generate coverage report
    if [ -f "$COVERAGE_PROFILE" ]; then
        COVERAGE_PERCENT=$(go tool cover -func="$COVERAGE_PROFILE" | tail -1 | awk '{print $3}' | sed 's/%//')

        if (( $(echo "$COVERAGE_PERCENT >= $MIN_COVERAGE" | bc -l) )); then
            print_success "Coverage: $COVERAGE_PERCENT% (meets minimum $MIN_COVERAGE%)"
        else
            print_warning "Coverage: $COVERAGE_PERCENT% (below minimum $MIN_COVERAGE%)"
        fi

        # Generate HTML coverage report
        go tool cover -html="$COVERAGE_PROFILE" -o "$COVERAGE_DIR/unit_coverage.html"
        print_info "HTML coverage report: $COVERAGE_DIR/unit_coverage.html"
    fi

    return $test_exit_code
}

# Run integration tests
run_integration_tests() {
    print_header "Running integration tests"

    # Check if integration tests exist
    if [ ! -d "./integration" ]; then
        print_warning "No integration tests found"
        return 0
    fi

    print_info "Setting up test database..."

    # Check if docker is available for test database
    if command -v docker &> /dev/null; then
        # Start test database if docker-compose exists
        if [ -f "docker-compose.test.yml" ]; then
            print_info "Starting test database..."
            docker-compose -f docker-compose.test.yml up -d postgres
            sleep 5
        fi
    fi

    # Set test environment variables
    export DATABASE_URL="postgres://postgres:secret@localhost:5433/agromart_test?sslmode=disable"
    export APP_ENV="test"

    # Run integration tests
    print_info "Running integration tests..."

    INTEGRATION_COVERAGE="$COVERAGE_DIR/integration_coverage.out"

    go test -v -race -coverprofile="$INTEGRATION_COVERAGE" -covermode=atomic \
        -timeout=60s \
        -tags=integration \
        -json \
        ./integration/... > "$TEST_RESULTS_DIR/integration_tests.json" 2>&1

    local test_exit_code=$?

    # Cleanup test database
    if [ -f "docker-compose.test.yml" ] && command -v docker &> /dev/null; then
        docker-compose -f docker-compose.test.yml down -v
    fi

    if [ $test_exit_code -eq 0 ]; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        if command -v jq &> /dev/null; then
            echo "Failed integration tests:"
            jq -r 'select(.Action == "fail") | "  - \(.Package)/\(.Test // "unknown"): \(.Output // "")"' "$TEST_RESULTS_DIR/integration_tests.json" | head -5
        fi
    fi

    return $test_exit_code
}

# Run benchmark tests
run_benchmarks() {
    print_header "Running benchmark tests"

    print_info "Running benchmarks..."

    # Run benchmarks
    go test -bench=. -benchmem -timeout=60s \
        -json \
        ./... > "$TEST_RESULTS_DIR/benchmarks.json" 2>&1

    local bench_exit_code=$?

    if [ $bench_exit_code -eq 0 ]; then
        print_success "Benchmarks completed"

        # Parse benchmark results if jq is available
        if command -v jq &> /dev/null; then
            echo "Top 5 slowest benchmarks:"
            jq -r 'select(.Action == "output" and (.Output | contains("Benchmark"))) | .Output' "$TEST_RESULTS_DIR/benchmarks.json" | \
                grep -E "Benchmark.*-[0-9]+" | \
                sort -k3 -nr | \
                head -5
        fi
    else
        print_warning "Some benchmarks may have failed"
    fi

    return $bench_exit_code
}

# Run linting and static analysis
run_linting() {
    print_header "Running linting and static analysis"

    # Check if golangci-lint is available
    if ! command -v golangci-lint &> /dev/null; then
        print_info "Installing golangci-lint..."
        go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    fi

    print_info "Running golangci-lint..."

    golangci-lint run --out-format=json --issues-exit-code=0 > "$TEST_RESULTS_DIR/lint_results.json"

    # Count issues
    if command -v jq &> /dev/null; then
        ISSUE_COUNT=$(jq '.Issues | length' "$TEST_RESULTS_DIR/lint_results.json")
        if [ "$ISSUE_COUNT" -eq 0 ]; then
            print_success "No linting issues found"
        else
            print_warning "$ISSUE_COUNT linting issues found"
            echo "Top issues:"
            jq -r '.Issues[:5][] | "  - \(.Pos.Filename):\(.Pos.Line): \(.Text) (\(.FromLinter))"' "$TEST_RESULTS_DIR/lint_results.json"
        fi
    fi
}

# Run security scanning
run_security_scan() {
    print_header "Running security scan"

    # Check if gosec is available
    if ! command -v gosec &> /dev/null; then
        print_info "Installing gosec..."
        go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
    fi

    print_info "Running gosec security scan..."

    gosec -fmt json -out "$TEST_RESULTS_DIR/security_results.json" ./... 2>/dev/null || true

    if [ -f "$TEST_RESULTS_DIR/security_results.json" ] && command -v jq &> /dev/null; then
        SECURITY_ISSUES=$(jq '.Issues | length' "$TEST_RESULTS_DIR/security_results.json")
        if [ "$SECURITY_ISSUES" -eq 0 ]; then
            print_success "No security issues found"
        else
            print_warning "$SECURITY_ISSUES security issues found"
            echo "High/Medium severity issues:"
            jq -r '.Issues[] | select(.severity == "HIGH" or .severity == "MEDIUM") | "  - \(.file):\(.line): \(.details)"' "$TEST_RESULTS_DIR/security_results.json" | head -5
        fi
    fi
}

# Generate test report
generate_report() {
    print_header "Generating test report"

    REPORT_FILE="$TEST_RESULTS_DIR/test_report.txt"

    cat > "$REPORT_FILE" << EOF
AgroMart Backend Test Report
Generated: $(date)
========================================

SUMMARY:
EOF

    # Add unit test results
    if [ -f "$TEST_RESULTS_DIR/unit_tests.json" ] && command -v jq &> /dev/null; then
        PASSED_TESTS=$(jq -r 'select(.Action == "pass") | .Package' "$TEST_RESULTS_DIR/unit_tests.json" | wc -l)
        FAILED_TESTS=$(jq -r 'select(.Action == "fail") | .Package' "$TEST_RESULTS_DIR/unit_tests.json" | wc -l)
        echo "Unit Tests: $PASSED_TESTS passed, $FAILED_TESTS failed" >> "$REPORT_FILE"
    fi

    # Add coverage information
    if [ -f "$COVERAGE_DIR/unit_coverage.out" ]; then
        COVERAGE_PERCENT=$(go tool cover -func="$COVERAGE_DIR/unit_coverage.out" | tail -1 | awk '{print $3}')
        echo "Code Coverage: $COVERAGE_PERCENT" >> "$REPORT_FILE"
    fi

    # Add linting results
    if [ -f "$TEST_RESULTS_DIR/lint_results.json" ] && command -v jq &> /dev/null; then
        LINT_ISSUES=$(jq '.Issues | length' "$TEST_RESULTS_DIR/lint_results.json")
        echo "Linting Issues: $LINT_ISSUES" >> "$REPORT_FILE"
    fi

    # Add security results
    if [ -f "$TEST_RESULTS_DIR/security_results.json" ] && command -v jq &> /dev/null; then
        SECURITY_ISSUES=$(jq '.Issues | length' "$TEST_RESULTS_DIR/security_results.json")
        echo "Security Issues: $SECURITY_ISSUES" >> "$REPORT_FILE"
    fi

    echo "" >> "$REPORT_FILE"
    echo "Detailed results available in: $TEST_RESULTS_DIR/" >> "$REPORT_FILE"
    echo "Coverage report available in: $COVERAGE_DIR/" >> "$REPORT_FILE"

    print_success "Test report generated: $REPORT_FILE"

    # Display summary
    echo ""
    print_header "TEST SUMMARY"
    cat "$REPORT_FILE"
}

# Main execution
main() {
    local exit_code=0

    print_header "AgroMart Backend Test Suite"
    print_info "Starting comprehensive test run..."

    # Parse command line arguments
    RUN_UNIT=true
    RUN_INTEGRATION=true
    RUN_BENCHMARKS=false
    RUN_LINTING=true
    RUN_SECURITY=true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_INTEGRATION=false
                RUN_BENCHMARKS=false
                RUN_LINTING=false
                RUN_SECURITY=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                RUN_BENCHMARKS=false
                RUN_LINTING=false
                RUN_SECURITY=false
                shift
                ;;
            --with-benchmarks)
                RUN_BENCHMARKS=true
                shift
                ;;
            --no-lint)
                RUN_LINTING=false
                shift
                ;;
            --no-security)
                RUN_SECURITY=false
                shift
                ;;
            --coverage-min)
                MIN_COVERAGE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --unit-only      Run only unit tests"
                echo "  --integration-only Run only integration tests"
                echo "  --with-benchmarks Include benchmark tests"
                echo "  --no-lint        Skip linting"
                echo "  --no-security    Skip security scan"
                echo "  --coverage-min N Set minimum coverage percentage (default: 80)"
                echo "  --help           Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Setup
    setup_test_env
    check_dependencies

    # Run tests based on flags
    if [ "$RUN_UNIT" = true ]; then
        if ! run_unit_tests; then
            exit_code=1
        fi
    fi

    if [ "$RUN_INTEGRATION" = true ]; then
        if ! run_integration_tests; then
            exit_code=1
        fi
    fi

    if [ "$RUN_BENCHMARKS" = true ]; then
        run_benchmarks
    fi

    if [ "$RUN_LINTING" = true ]; then
        run_linting
    fi

    if [ "$RUN_SECURITY" = true ]; then
        run_security_scan
    fi

    # Generate final report
    generate_report

    # Final status
    echo ""
    if [ $exit_code -eq 0 ]; then
        print_success "All tests completed successfully!"
    else
        print_error "Some tests failed. Check the detailed results above."
    fi

    exit $exit_code
}

# Run main function with all arguments
main "$@"
