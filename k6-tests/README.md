# Comprehensive Load Testing Suite for Agromart

This directory contains a comprehensive load testing suite using k6 for the Agromart application. The suite is designed to test performance under various load scenarios including 1000+ concurrent users.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Performance Targets](#performance-targets)
- [Monitoring](#monitoring)
- [CI/CD Integration](#cicd-integration)
- [Reporting](#reporting)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The load testing suite includes:

- **Authentication workflows** (login, logout, token refresh)
- **Product management** (CRUD operations, search, filtering)
- **File upload workflows** (various file sizes and types)
- **Dashboard and analytics** (real-time data loading)
- **Concurrent user sessions** (database connection pooling)
- **Performance monitoring** (CPU, memory, response times)
- **CI/CD integration** (automated regression testing)

## 📋 Prerequisites

### System Requirements
- Node.js 16.0.0 or higher
- k6 v0.45.0 or higher
- Docker and Docker Compose
- PostgreSQL database
- At least 8GB RAM recommended

### Installation

#### Install k6

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y k6
```

**Windows:**
```bash
choco install k6
```

#### Install dependencies:
```bash
npm install
```

## 🚀 Quick Start

1. **Start the application:**
```bash
docker-compose up -d
```

2. **Run a smoke test:**
```bash
npm run test:smoke
```

3. **Run authentication load test:**
```bash
npm run test:auth
```

4. **Run comprehensive load test:**
```bash
npm run test:comprehensive
```

## 📊 Test Scenarios

### 1. Authentication Workflow Test (`auth-workflow-test.js`)
Tests complete authentication flows including:
- User login/logout
- Token refresh mechanisms
- Session management
- Concurrent authentication

**Load Pattern:** Gradual ramp to 1000+ users

### 2. Product CRUD Operations Test (`product-crud-test.js`)
Tests product management operations:
- Create, Read, Update, Delete products
- Product search and filtering
- Bulk operations
- Data validation

**Load Pattern:** Sustained load with mixed read/write operations

### 3. File Upload Test (`file-upload-test.js`)
Tests file upload performance:
- Various file sizes (10KB to 10MB)
- Different file types
- Concurrent uploads
- Upload progress tracking

**Load Pattern:** Various file sizes with concurrent operations

### 4. Dashboard Analytics Test (`dashboard-analytics-test.js`)
Tests dashboard and reporting performance:
- Real-time dashboard loading
- Analytics data processing
- Report generation
- Chart rendering performance

**Load Pattern:** Realistic dashboard usage patterns

### 5. Concurrent Sessions Test (`concurrent-sessions-test.js`)
Tests concurrent user session handling:
- Database connection pooling
- Session state management
- Resource utilization
- Connection limits

**Load Pattern:** Stress testing with 1000+ concurrent sessions

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:8080/api` | Base API URL for testing |
| `TEST_ENV` | `development` | Test environment (development/staging/production) |
| `ENABLE_MONITORING` | `true` | Enable performance monitoring |
| `REPORTS_DIR` | `./reports` | Directory for test reports |
| `BASELINE_COMPARISON` | `false` | Compare results with baseline |

### Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Response Time (P95) | < 1.5s | 95th percentile response time |
| Response Time (P99) | < 3.0s | 99th percentile response time |
| Error Rate | < 1% | Maximum acceptable error rate |
| CPU Usage | < 80% | Maximum CPU utilization |
| Memory Usage | < 85% | Maximum memory utilization |
| Throughput | > 500 req/s | Minimum requests per second |

## 🏃 Running Tests

### Individual Test Scenarios

```bash
# Authentication tests
npm run test:auth

# Product CRUD tests
npm run test:products

# File upload tests
npm run test:files

# Dashboard analytics tests
npm run test:dashboard

# Concurrent sessions tests
npm run test:sessions
```

### Load Test Types

```bash
# Smoke test (10 users, 30 seconds)
npm run test:smoke

# Load test (100 users, 5 minutes)
npm run test:load

# Stress test (1000 users, 10 minutes)
npm run test:stress

# Spike test (2000 users, 2 minutes)
npm run test:spike
```

### Advanced Usage

```bash
# Run with custom parameters
k6 run \
  --vus 500 \
  --duration 10m \
  --out json=reports/custom-test.json \
  --out html=reports/custom-test-report.html \
  k6-tests/scenarios/auth-workflow-test.js

# Run with environment variables
K6_API_BASE_URL=http://staging.api.com/api \
K6_TEST_ENV=staging \
k6 run k6-tests/scenarios/auth-workflow-test.js

# Run distributed test
npm run test:distributed
```

## 📈 Monitoring

### Performance Metrics Collected

- **Response Times:** P50, P95, P99 percentiles
- **Error Rates:** HTTP error rates and custom error tracking
- **Throughput:** Requests per second
- **Resource Usage:** CPU and memory utilization
- **Custom Metrics:**
  - Authentication duration
  - Database query duration
  - File upload duration
  - Cache hit rates

### Real-time Monitoring

```bash
# Monitor test execution in real-time
k6 run --out web-dashboard k6-tests/scenarios/auth-workflow-test.js

# Or use built-in k6 dashboard
k6 run --out dashboard k6-tests/scenarios/auth-workflow-test.js
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The suite includes a comprehensive GitHub Actions workflow (`.github/workflows/load-testing.yml`) that:

- Runs on push/PR to main/develop branches
- Executes daily scheduled tests
- Supports manual trigger with custom parameters
- Generates detailed reports and artifacts
- Performs baseline comparisons
- Sends notifications on failures

### Manual CI/CD Trigger

```bash
# Trigger via GitHub CLI
gh workflow run load-testing.yml \
  -f test_type=comprehensive \
  -f vus=1000 \
  -f duration=15m
```

## 📊 Reporting

### Report Types

1. **JSON Reports:** Detailed metrics for analysis
2. **HTML Reports:** Visual performance dashboards
3. **Summary Reports:** Quick overview of results
4. **Trend Reports:** Performance trends over time
5. **Compliance Reports:** Performance target compliance

### Generating Reports

```bash
# Generate comprehensive report
npm run generate-report

# View HTML report
open reports/comprehensive-test-report.html

# Compare with baseline
npm run test:compare
```

### Report Contents

- Executive Summary
- Performance Metrics
- Error Analysis
- Resource Utilization
- Recommendations
- Compliance Status
- Trend Analysis

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if API is running
curl http://localhost:8080/api/health

# Start services
docker-compose up -d
```

#### 2. High Error Rates
```bash
# Check API logs
docker-compose logs backend

# Run with verbose output
k6 run --verbose k6-tests/scenarios/auth-workflow-test.js
```

#### 3. Performance Degradation
```bash
# Monitor system resources
top
htop

# Check database performance
docker-compose exec postgres pg_stat_activity
```

#### 4. Test Configuration Issues
```bash
# Validate configuration
npm run validate-config

# Check environment variables
echo $API_BASE_URL
```

### Debug Mode

```bash
# Run with debug output
K6_LOG_LEVEL=debug k6 run k6-tests/scenarios/auth-workflow-test.js

# Run with HTTP debug
K6_HTTP_DEBUG=true k6 run k6-tests/scenarios/auth-workflow-test.js
```

## 📁 Directory Structure

```
k6-tests/
├── configs/
│   └── base-config.js          # Base configuration
├── utils/
│   ├── http-utils.js           # HTTP utilities
│   ├── auth-utils.js           # Authentication utilities
│   ├── data-generators.js      # Test data generators
│   └── reporting-utils.js      # Reporting utilities
├── scenarios/
│   ├── auth-workflow-test.js   # Authentication tests
│   ├── product-crud-test.js    # Product CRUD tests
│   ├── file-upload-test.js     # File upload tests
│   ├── dashboard-analytics-test.js # Dashboard tests
│   └── concurrent-sessions-test.js # Session tests
├── data/
│   └── test-data.json          # Test data files
├── reports/
│   └── README.md              # Report documentation
├── scripts/
│   ├── setup-test-data.js     # Test data setup
│   ├── cleanup-test-data.js   # Test data cleanup
│   └── generate-report.js     # Report generation
├── main-test-runner.js        # Main test orchestrator
├── README.md                  # This file
└── package.json              # NPM configuration
```

## 🎯 Best Practices

### Test Design
1. **Realistic Scenarios:** Use actual user workflows
2. **Gradual Load:** Ramp up gradually to avoid thundering herd
3. **Proper Cleanup:** Always clean up test data
4. **Error Handling:** Handle errors gracefully in tests

### Performance Monitoring
1. **Baseline:** Establish performance baselines
2. **Thresholds:** Set appropriate performance thresholds
3. **Monitoring:** Monitor system resources during tests
4. **Analysis:** Analyze results and identify bottlenecks

### CI/CD Integration
1. **Automation:** Automate testing in CI/CD pipeline
2. **Gates:** Use performance gates for deployments
3. **Notifications:** Set up alerts for performance regressions
4. **Documentation:** Document performance requirements

## 🤝 Contributing

1. Follow the established directory structure
2. Add appropriate tests for new features
3. Update documentation for changes
4. Ensure tests pass before submitting PRs

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Include test logs and configuration

---

**Note:** This load testing suite is designed to simulate realistic user behavior and help identify performance bottlenecks before they impact production users.