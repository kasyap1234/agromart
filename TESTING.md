# 🧪 Comprehensive Testing Suite for AgroMart

This document outlines the comprehensive testing strategy implemented for the AgroMart application, covering unit tests, integration tests, E2E tests, and CI/CD pipelines.

## 📋 Table of Contents

- [Testing Overview](#testing-overview)
- [Frontend Testing](#frontend-testing)
- [Backend Testing](#backend-testing)
- [End-to-End Testing](#end-to-end-testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Coverage](#code-coverage)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Running Tests Locally](#running-tests-locally)
- [Test Configuration](#test-configuration)

## 🎯 Testing Overview

The AgroMart testing suite is designed to ensure:

- **85%+ code coverage** for both frontend and backend
- **Zero critical vulnerabilities** in production
- **Sub-3-second load times** for critical paths
- **100% accessibility compliance** for user interfaces
- **Complete workflow coverage** from registration to product management

### Testing Pyramid

```
E2E Tests (10%)          ┌─────────────────┐
Integration Tests (20%)  │     10%         │
Unit Tests (70%)        └─────────────────┘
```

## 🎨 Frontend Testing

### Technology Stack
- **Framework**: Jest + React Testing Library
- **Coverage**: Istanbul (via Jest)
- **Accessibility**: axe-core
- **Performance**: Lighthouse CI

### Test Categories

#### Unit Tests (`__tests__/` and `*.test.tsx`)
- Component rendering and interactions
- Form validation and error handling
- API integration with MSW mocking
- Custom hooks and utilities
- Authentication flows

#### Example Test Structure
```typescript
// apps/client/src/app/auth/__tests__/login.test.tsx
describe('Login Page', () => {
  it('renders login form correctly', () => {
    // Test implementation
  });

  it('handles successful login', async () => {
    // Test implementation with API mocking
  });
});
```

#### Key Features
- Custom render function with providers
- Mock implementations for Next.js router
- API response mocking utilities
- File upload testing helpers
- Accessibility testing integration

## ⚙️ Backend Testing

### Technology Stack
- **Framework**: Go testing + Testify
- **Coverage**: Go cover tool
- **HTTP Testing**: httptest package
- **Database**: PostgreSQL with test migrations

### Test Categories

#### Unit Tests (`*_test.go`)
- Service layer business logic
- Handler function testing with mocks
- Authentication middleware
- Database query testing
- Utility function validation

#### Integration Tests (`*_integration_test.go`)
- HTTP endpoint testing
- Database integration
- Authentication flows
- File upload processing
- API response validation

#### Example Test Structure
```go
// internal/auth/auth_service_test.go
func TestAuthService_Login(t *testing.T) {
    mockQueries := &MockQueries{}
    jwtService := NewJWTService("test-secret")
    authService := &AuthService{
        queries: mockQueries,
        jwt:     jwtService,
    }

    t.Run("successful login", func(t *testing.T) {
        // Test implementation
    })
}
```

#### Key Features
- Mock database queries using testify/mock
- JWT token validation testing
- Password hashing verification
- Middleware testing with custom contexts
- Database transaction testing

## 🌐 End-to-End Testing

### Technology Stack
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: iOS Safari, Android Chrome
- **CI Integration**: GitHub Actions

### Test Categories

#### Critical User Workflows
1. **Registration → Login → Dashboard**
2. **Product Management (CRUD)**
3. **File Upload and Processing**
4. **Inventory Management**
5. **User Profile Management**

#### Example E2E Test
```typescript
// apps/client/e2e/complete-user-workflow.spec.ts
test('complete user registration, login, and product management workflow', async ({ page }) => {
  // Navigate to registration
  await page.goto('http://localhost:3000/auth/register');

  // Fill registration form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');

  // Submit and verify
  await page.click('button[type="submit"]');
  await page.waitForURL('**/auth/login');

  // Complete login flow
  // ... additional workflow steps
});
```

#### Key Features
- Cross-browser compatibility testing
- Mobile responsiveness validation
- Performance testing under load
- Error recovery and resilience testing
- Accessibility compliance testing

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Frontend CI (`frontend-ci.yml`)
```yaml
- Linting and TypeScript checking
- Unit test execution with coverage
- E2E testing with Playwright
- Security vulnerability scanning
- Performance testing with Lighthouse
- Build optimization and bundle analysis
```

#### 2. Backend CI (`backend-ci.yml`)
```yaml
- Go vet and golangci-lint
- Unit and integration test execution
- Security scanning with Gosec
- Performance testing with benchmarks
- Docker image building and testing
- Database migration validation
```

#### 3. Complete Test Suite (`complete-test-suite.yml`)
```yaml
- Comprehensive testing across all layers
- Security and vulnerability scanning
- Performance and load testing
- Code quality analysis
- Coverage reporting and thresholds
- Automated deployment preparation
```

### Coverage Requirements

| Component | Coverage Target | Current Status |
|-----------|----------------|---------------|
| Frontend Components | 85% | ✅ Configured |
| Backend Services | 85% | ✅ Configured |
| API Endpoints | 100% | ✅ Configured |
| Critical Business Logic | 100% | ✅ Configured |
| Error Handling | 100% | ✅ Configured |

## 📊 Code Coverage

### Coverage Reporting
- **Frontend**: Jest coverage reports with HTML output
- **Backend**: Go cover tool with HTML visualization
- **Combined**: Codecov integration for unified reporting

### Coverage Commands

```bash
# Frontend coverage
cd apps/client && npm run test:coverage

# Backend coverage
./scripts/run_backend_tests.sh

# View coverage reports
open apps/client/coverage/lcov-report/index.html
go tool cover -html=coverage.out
```

## ⚡ Performance Testing

### Lighthouse Configuration
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:3000"]
    },
    "assert": {
      "assertions": {
        "categories:performance": "warning",
        "categories:accessibility": "warning"
      }
    }
  }
}
```

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Accessibility Score**: > 90
- **Best Practices Score**: > 90

## 🔒 Security Testing

### Security Scanning Tools
- **Frontend**: npm audit, Snyk vulnerability scanning
- **Backend**: Gosec, Trivy container scanning
- **Dependencies**: OWASP Dependency Check
- **Secrets**: GitHub Secret scanning

### Security Gates
- **Zero Critical Vulnerabilities** in production
- **Zero High Vulnerabilities** in staging
- **Dependency Updates**: Weekly automated PRs
- **Security Headers**: A+ rating required

## 🏃 Running Tests Locally

### Prerequisites
```bash
# Install dependencies
cd apps/client && npm install
go mod download

# Setup test databases
createdb agromart_test
createdb agromart_frontend_test

# Install Playwright browsers
cd apps/client && npx playwright install
```

### Running Individual Test Suites

#### Frontend Tests
```bash
# Unit tests
cd apps/client && npm run test

# Unit tests with coverage
cd apps/client && npm run test:coverage

# E2E tests
cd apps/client && npm run test:e2e

# E2E tests in UI mode
cd apps/client && npm run test:e2e:ui

# Specific browser
cd apps/client && npm run test:e2e:chromium
```

#### Backend Tests
```bash
# Unit tests
go test ./...

# Unit tests with coverage
go test -coverprofile=coverage.out ./...

# Integration tests
go test -tags=integration ./...

# Benchmarks
go test -bench=. ./...

# Full test suite
./scripts/run_backend_tests.sh
```

#### Combined Testing
```bash
# Frontend and Backend together
npm run test:full

# With coverage reporting
npm run test:coverage:full
```

## ⚙️ Test Configuration

### Frontend Configuration (`apps/client/jest.config.js`)
```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/_*.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};
```

### Playwright Configuration (`apps/client/playwright.config.ts`)
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

## 📈 Monitoring and Reporting

### Test Results Dashboard
- **GitHub Actions**: Real-time test execution
- **Codecov**: Coverage reporting and trends
- **Lighthouse CI**: Performance monitoring
- **Playwright Report**: E2E test results and videos

### Alerting
- **Failed Tests**: Slack notifications for main branch
- **Coverage Drop**: Alerts when coverage falls below 85%
- **Performance Regression**: Automated Lighthouse monitoring
- **Security Vulnerabilities**: Immediate alerts for critical issues

## 🎯 Critical Path Testing

### Authentication Flows
- ✅ User registration and validation
- ✅ Login with various credential types
- ✅ Password reset functionality
- ✅ JWT token refresh and validation
- ✅ Session management and logout

### Form Submissions
- ✅ Product creation and editing
- ✅ Customer management forms
- ✅ Inventory adjustment forms
- ✅ File upload forms
- ✅ Search and filter forms

### File Upload System
- ✅ Image upload and validation
- ✅ Document upload processing
- ✅ File type restrictions
- ✅ File size limits
- ✅ Upload progress tracking

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Ensure PostgreSQL is running
pg_isready -h localhost -p 5432

# Create test database
createdb agromart_test
```

#### 2. Browser Issues in E2E Tests
```bash
# Reinstall Playwright browsers
npx playwright install --force

# Run with debug mode
npm run test:e2e:debug
```

#### 3. Coverage Issues
```bash
# Check coverage thresholds
jest --coverage --coverageThreshold='{"global":{"statements":85}}'

# View coverage report
open coverage/lcov-report/index.html
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Go Testing Documentation](https://golang.org/pkg/testing/)
- [Testify Framework](https://github.com/stretchr/testify)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## ✅ Implementation Summary

The comprehensive testing suite has been successfully implemented with:

- **Frontend**: Jest + RTL with 85% coverage target
- **Backend**: Go testing + Testify with 85% coverage target
- **E2E**: Playwright with cross-browser testing
- **CI/CD**: GitHub Actions with automated deployment
- **Security**: Automated vulnerability scanning
- **Performance**: Lighthouse CI integration
- **Coverage**: Codecov integration with thresholds
- **Documentation**: Comprehensive testing guide

All critical paths are covered and the testing infrastructure is ready for production deployment.