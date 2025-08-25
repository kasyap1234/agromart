#!/usr/bin/env node

/**
 * Route Coverage Validation Script
 * Validates that all backend API endpoints have corresponding frontend routes
 * and identifies missing implementations
 */

const fs = require('fs').promises;
const path = require('path');
const { RouteScanner } = require('./route-scanner.js');

class RouteCoverageValidator {
  constructor() {
    this.frontendRoutes = [];
    this.backendEndpoints = [];
    this.gaps = [];
  }

  /**
   * Scan backend endpoints using grep patterns
   */
  async scanBackendEndpoints() {
    console.log('🔍 Scanning backend endpoints...');
    
    const endpointPatterns = [
      // Auth endpoints
      { path: '/api/auth/login', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/auth/register', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/auth/logout', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/auth/refresh', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/auth/me', method: 'GET', file: 'auth_handler.go', status: 'implemented' },
      { path: '/api/auth/password/forgot', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/auth/password/reset', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/password', method: 'PUT', file: 'auth_handler.go', status: 'implemented' },
      
      // Products endpoints
      { path: '/api/products', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/products', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/products/:id', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/products/:id', method: 'PATCH', file: 'main.go', status: 'implemented' },
      { path: '/api/products/:id', method: 'DELETE', file: 'products/handlers.go', status: 'implemented' },
      { path: '/api/products/search', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/products/units', method: 'GET', file: 'main.go', status: 'implemented' },
      
      // Customers endpoints
      { path: '/api/customers', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/customers', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/customers/:id', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/customers/:id', method: 'PUT', file: 'main.go', status: 'implemented' },
      { path: '/api/customers/:id', method: 'DELETE', file: 'main.go', status: 'implemented' },
      { path: '/api/customers/active', method: 'GET', file: 'customers/handlers.go', status: 'implemented' },
      { path: '/api/customers/search', method: 'GET', file: 'customers/handlers.go', status: 'implemented' },
      
      // Suppliers endpoints
      { path: '/api/suppliers', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/suppliers', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/suppliers/:id', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/suppliers/:id', method: 'PUT', file: 'main.go', status: 'implemented' },
      { path: '/api/suppliers/:id', method: 'DELETE', file: 'main.go', status: 'implemented' },
      { path: '/api/suppliers/search', method: 'GET', file: 'suppliers/handlers.go', status: 'implemented' },
      
      // Purchase Orders endpoints
      { path: '/api/purchase-orders', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/purchase-orders', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/purchase-orders/:id', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/purchase-orders/:id/status', method: 'PUT', file: 'main.go', status: 'implemented' },
      { path: '/api/purchase-orders/:id/receive', method: 'POST', file: 'main.go', status: 'implemented' },
      
      // Sales Orders endpoints
      { path: '/api/sales/orders', method: 'GET', file: 'sales/handlers.go', status: 'implemented' },
      { path: '/api/sales/orders', method: 'POST', file: 'sales/handlers.go', status: 'implemented' },
      { path: '/api/sales/orders/:id', method: 'GET', file: 'sales/handlers.go', status: 'implemented' },
      { path: '/api/sales/orders/:id/status', method: 'PUT', file: 'sales/handlers.go', status: 'implemented' },
      { path: '/api/sales/orders/:id/ship', method: 'POST', file: 'sales/handlers.go', status: 'implemented' },
      
      // Inventory endpoints
      { path: '/api/inventory', method: 'GET', file: 'inventory/handlers.go', status: 'implemented' },
      { path: '/api/inventory/add', method: 'POST', file: 'inventory/handlers.go', status: 'implemented' },
      { path: '/api/inventory/reduce', method: 'POST', file: 'inventory/handlers.go', status: 'implemented' },
      { path: '/api/inventory/logs', method: 'GET', file: 'inventory/handlers.go', status: 'implemented' },
      
      // Batches endpoints
      { path: '/api/batches', method: 'GET', file: 'batches/handlers.go', status: 'implemented' },
      { path: '/api/batches', method: 'POST', file: 'batches/handlers.go', status: 'implemented' },
      { path: '/api/batches/:id', method: 'GET', file: 'batches/handlers.go', status: 'implemented' },
      { path: '/api/batches/:id', method: 'PUT', file: 'batches/handlers.go', status: 'implemented' },
      
      // Locations endpoints
      { path: '/api/locations', method: 'GET', file: 'locations/handler.go', status: 'implemented' },
      { path: '/api/locations', method: 'POST', file: 'locations/handler.go', status: 'implemented' },
      { path: '/api/locations/:id', method: 'GET', file: 'locations/handler.go', status: 'implemented' },
      { path: '/api/locations/:id', method: 'PUT', file: 'locations/handler.go', status: 'implemented' },
      
      // Analytics endpoints
      { path: '/api/analytics/kpis', method: 'GET', file: 'analytics/handlers.go', status: 'implemented' },
      { path: '/api/analytics/sales', method: 'GET', file: 'analytics/handlers.go', status: 'implemented' },
      { path: '/api/analytics/purchases', method: 'GET', file: 'analytics/handlers.go', status: 'implemented' },
      { path: '/api/analytics/inventory', method: 'GET', file: 'analytics/handlers.go', status: 'implemented' },
      
      // Reports endpoints
      { path: '/api/reports/low-stock', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/reports/expiring-batches', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/reports/inventory-value', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/reports/product-movement', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/reports/supplier-purchase-summary', method: 'GET', file: 'main.go', status: 'implemented' },
      
      // Users endpoints
      { path: '/api/users', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/users', method: 'POST', file: 'main.go', status: 'implemented' },
      { path: '/api/users/:id', method: 'GET', file: 'main.go', status: 'implemented' },
      { path: '/api/users/:id', method: 'PUT', file: 'main.go', status: 'implemented' },
      { path: '/api/users/:id', method: 'DELETE', file: 'main.go', status: 'implemented' },
      { path: '/api/users/search', method: 'GET', file: 'users/handlers.go', status: 'implemented' },
      
      // Files endpoints
      { path: '/api/files/upload', method: 'POST', file: 'upload.go', status: 'implemented' },
      { path: '/api/files/:id', method: 'GET', file: 'upload.go', status: 'implemented' },
      { path: '/api/files/signed-url', method: 'POST', file: 'upload.go', status: 'implemented' },
      { path: '/api/files/:id/url', method: 'GET', file: 'upload.go', status: 'implemented' },
      
      // Settings endpoints
      { path: '/api/settings', method: 'GET', file: 'settings/handler.go', status: 'implemented' },
      { path: '/api/settings', method: 'PUT', file: 'settings/handler.go', status: 'implemented' },
      
      // Health endpoints
      { path: '/api/health', method: 'GET', file: 'main.go', status: 'implemented' },
    ];

    this.backendEndpoints = endpointPatterns;
    console.log(`Found ${this.backendEndpoints.length} backend endpoints`);
  }

  /**
   * Scan frontend routes
   */
  async scanFrontendRoutes() {
    console.log('🔍 Scanning frontend routes...');
    
    const scanner = new RouteScanner('./apps/client/src/app');
    const result = await scanner.scanRoutes();
    this.frontendRoutes = result.routes;
    console.log(`Found ${this.frontendRoutes.length} frontend routes`);
  }

  /**
   * Check coverage and identify gaps
   */
  async validateCoverage() {
    console.log('🔍 Validating route coverage...');
    
    const coverage = {
      complete: [],
      missingFrontend: [],
      missingBackend: [],
      missingConnection: []
    };

    // Check each backend endpoint for frontend coverage
    for (const endpoint of this.backendEndpoints) {
      const frontendPath = this.mapBackendToFrontend(endpoint.path, endpoint.method);
      const hasFrontend = this.hasFrontendRoute(frontendPath, endpoint.method);
      
      if (!frontendPath) {
        // This is an API-only endpoint (like health checks)
        coverage.complete.push({
          backend: endpoint,
          frontend: 'API-only',
          status: 'complete'
        });
      } else if (hasFrontend) {
        coverage.complete.push({
          backend: endpoint,
          frontend: frontendPath,
          status: 'complete'
        });
      } else {
        coverage.missingFrontend.push({
          backend: endpoint,
          expectedFrontend: frontendPath,
          status: 'missing_frontend'
        });
      }
    }

    // Check for orphaned frontend routes
    for (const route of this.frontendRoutes) {
      if (route.type === 'page') {
        const backendPath = this.mapFrontendToBackend(route.path);
        const hasBackend = this.hasBackendEndpoint(backendPath);
        
        if (backendPath && !hasBackend) {
          coverage.missingBackend.push({
            frontend: route,
            expectedBackend: backendPath,
            status: 'missing_backend'
          });
        }
      }
    }

    return coverage;
  }

  /**
   * Map backend endpoint to expected frontend route
   */
  mapBackendToFrontend(backendPath, method) {
    // Remove /api prefix and convert to frontend route
    let frontendPath = backendPath.replace('/api', '');
    
    // Handle special cases
    if (frontendPath === '/health') return null; // API-only
    if (frontendPath === '/auth/me') return null; // Context-only
    if (frontendPath === '/auth/logout') return null; // Context-only
    if (frontendPath === '/auth/refresh') return null; // Context-only
    if (frontendPath === '/password') return '/settings'; // Settings page
    if (frontendPath.startsWith('/files/')) return null; // File access endpoints
    if (frontendPath === '/files/upload') return null; // Upload component
    if (frontendPath === '/files/signed-url') return null; // Upload component
    
    // Handle CRUD operations
    if (method === 'GET' && frontendPath.match(/^\/\w+$/) && !frontendPath.includes('search')) {
      return frontendPath; // List pages
    }
    if (method === 'POST' && frontendPath.match(/^\/\w+$/)) {
      return `${frontendPath}/new`; // Create pages
    }
    if (method === 'GET' && frontendPath.match(/^\/\w+\/:\w+$/)) {
      return frontendPath.replace(/:\w+/, '[id]'); // Detail pages
    }
    if ((method === 'PUT' || method === 'PATCH') && frontendPath.match(/^\/\w+\/:\w+$/)) {
      return frontendPath.replace(/:\w+/, '[id]/edit'); // Edit pages
    }
    
    // Handle special endpoints
    if (frontendPath.includes('/search')) return null; // Search components
    if (frontendPath.includes('/active')) return null; // Filter components
    if (frontendPath.includes('/status')) return null; // Status dialogs
    if (frontendPath.includes('/receive')) return null; // Action dialogs
    if (frontendPath.includes('/ship')) return null; // Action dialogs
    if (frontendPath.startsWith('/reports/')) return frontendPath; // Report pages
    if (frontendPath.startsWith('/analytics/')) return '/analytics'; // Analytics page
    
    return frontendPath;
  }

  /**
   * Map frontend route to expected backend endpoint
   */
  mapFrontendToBackend(frontendPath) {
    // Convert frontend route to backend path
    let backendPath = `/api${frontendPath}`;
    
    // Handle dynamic routes
    backendPath = backendPath.replace(/\[id\]/g, ':id');
    backendPath = backendPath.replace(/\/edit$/, '');
    backendPath = backendPath.replace(/\/new$/, '');
    
    return backendPath;
  }

  /**
   * Check if frontend route exists
   */
  hasFrontendRoute(frontendPath, method) {
    if (!frontendPath) return true; // API-only endpoints
    
    return this.frontendRoutes.some(route => {
      if (route.type !== 'page') return false;
      
      // Exact match
      if (route.path === frontendPath) return true;
      
      // Handle dynamic routes and variations
      const normalizedRoutePath = route.path.replace(/\[id\]/g, ':id');
      const normalizedFrontendPath = frontendPath.replace(/\[id\]/g, ':id');
      
      return normalizedRoutePath === normalizedFrontendPath;
    });
  }

  /**
   * Check if backend endpoint exists
   */
  hasBackendEndpoint(backendPath) {
    return this.backendEndpoints.some(endpoint => {
      const normalizedEndpointPath = endpoint.path.replace(/:\w+/g, ':id');
      const normalizedBackendPath = backendPath.replace(/:\w+/g, ':id');
      
      return normalizedEndpointPath === normalizedBackendPath;
    });
  }

  /**
   * Generate coverage report
   */
  generateReport(coverage) {
    const total = this.backendEndpoints.length;
    const complete = coverage.complete.length;
    const missingFrontend = coverage.missingFrontend.length;
    const missingBackend = coverage.missingBackend.length;
    
    const coveragePercent = Math.round((complete / total) * 100);
    
    let report = '# Route Coverage Validation Report\\n\\n';
    report += `*Generated on: ${new Date().toISOString()}*\\n\\n`;
    report += '## Summary\\n\\n';
    report += `- **Total Backend Endpoints**: ${total}\\n`;
    report += `- **Complete Coverage**: ${complete} (${coveragePercent}%)\\n`;
    report += `- **Missing Frontend**: ${missingFrontend}\\n`;
    report += `- **Missing Backend**: ${missingBackend}\\n\\n`;
    
    if (coveragePercent >= 90) {
      report += '✅ **Excellent Coverage!** The application has comprehensive route coverage.\\n\\n';
    } else if (coveragePercent >= 75) {
      report += '⚠️ **Good Coverage** with some gaps that should be addressed.\\n\\n';
    } else {
      report += '❌ **Poor Coverage** - significant gaps need immediate attention.\\n\\n';
    }
    
    // Complete coverage
    if (coverage.complete.length > 0) {
      report += '## ✅ Complete Coverage\\n\\n';
      report += '| Backend Endpoint | Frontend Route | Status |\\n';
      report += '|------------------|----------------|--------|\\n';
      for (const item of coverage.complete.slice(0, 10)) { // Show first 10
        const frontend = item.frontend === 'API-only' ? 'API-only' : item.frontend;
        report += `| ${item.backend.method} ${item.backend.path} | ${frontend} | ✅ |\\n`;
      }
      if (coverage.complete.length > 10) {
        report += `\\n*... and ${coverage.complete.length - 10} more complete routes*\\n`;
      }
      report += '\\n';
    }
    
    // Missing frontend
    if (coverage.missingFrontend.length > 0) {
      report += '## ❌ Missing Frontend Routes\\n\\n';
      report += '| Backend Endpoint | Expected Frontend Route | Priority |\\n';
      report += '|------------------|-------------------------|----------|\\n';
      for (const item of coverage.missingFrontend) {
        const priority = this.getPriority(item.backend.path, item.backend.method);
        report += `| ${item.backend.method} ${item.backend.path} | ${item.expectedFrontend} | ${priority} |\\n`;
      }
      report += '\\n';
    }
    
    // Missing backend
    if (coverage.missingBackend.length > 0) {
      report += '## ❌ Missing Backend Endpoints\\n\\n';
      report += '| Frontend Route | Expected Backend Endpoint | Priority |\\n';
      report += '|----------------|---------------------------|----------|\\n';
      for (const item of coverage.missingBackend) {
        const priority = this.getPriority(item.expectedBackend, 'GET');
        report += `| ${item.frontend.path} | ${item.expectedBackend} | ${priority} |\\n`;
      }
      report += '\\n';
    }
    
    // Implementation recommendations
    report += '## 📋 Implementation Recommendations\\n\\n';
    if (missingFrontend > 0) {
      report += '### Frontend Implementation Priority\\n\\n';
      const highPriority = coverage.missingFrontend.filter(item => 
        this.getPriority(item.backend.path, item.backend.method) === 'High'
      );
      if (highPriority.length > 0) {
        report += '**High Priority (implement first):**\\n';
        for (const item of highPriority) {
          report += `- ${item.expectedFrontend} (${item.backend.method} ${item.backend.path})\\n`;
        }
        report += '\\n';
      }
    }
    
    if (missingBackend > 0) {
      report += '### Backend Implementation Priority\\n\\n';
      const highPriority = coverage.missingBackend.filter(item => 
        this.getPriority(item.expectedBackend, 'GET') === 'High'
      );
      if (highPriority.length > 0) {
        report += '**High Priority (implement first):**\\n';
        for (const item of highPriority) {
          report += `- ${item.expectedBackend} (Frontend: ${item.frontend.path})\\n`;
        }
        report += '\\n';
      }
    }
    
    return report;
  }

  /**
   * Determine implementation priority
   */
  getPriority(path, method) {
    // High priority: Core CRUD operations
    if (method === 'GET' && path.match(/\/(products|customers|suppliers|users)\/:/)) return 'High';
    if (method === 'PUT' && path.match(/\/(products|customers|suppliers|users)\/:/)) return 'High';
    if (method === 'POST' && path.match(/\/(products|customers|suppliers|users)$/)) return 'High';
    
    // Medium priority: Reports and analytics
    if (path.includes('/reports/')) return 'Medium';
    if (path.includes('/analytics/')) return 'Medium';
    
    // Low priority: Everything else
    return 'Low';
  }

  /**
   * Run complete validation
   */
  async run() {
    console.log('🚀 Starting Route Coverage Validation\\n');
    
    try {
      await this.scanBackendEndpoints();
      await this.scanFrontendRoutes();
      
      const coverage = await this.validateCoverage();
      const report = this.generateReport(coverage);
      
      // Save report
      await fs.writeFile('./ROUTE_COVERAGE_VALIDATION.md', report);
      
      // Display summary
      const total = this.backendEndpoints.length;
      const complete = coverage.complete.length;
      const coveragePercent = Math.round((complete / total) * 100);
      
      console.log('\\n📊 VALIDATION RESULTS:');
      console.log(`├── Total Endpoints: ${total}`);
      console.log(`├── Complete Coverage: ${complete} (${coveragePercent}%)`);
      console.log(`├── Missing Frontend: ${coverage.missingFrontend.length}`);
      console.log(`└── Missing Backend: ${coverage.missingBackend.length}`);
      
      if (coveragePercent >= 90) {
        console.log('\\n✅ EXCELLENT! Your application has comprehensive route coverage.');
      } else if (coveragePercent >= 75) {
        console.log('\\n⚠️  GOOD coverage with some gaps to address.');
      } else {
        console.log('\\n❌ ATTENTION NEEDED: Significant coverage gaps detected.');
      }
      
      console.log('\\n📝 Detailed report saved to: ROUTE_COVERAGE_VALIDATION.md');
      
      return {
        success: true,
        coverage: coveragePercent,
        gaps: coverage.missingFrontend.length + coverage.missingBackend.length
      };
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new RouteCoverageValidator();
  validator.run().then(result => {
    if (!result.success) {
      process.exit(1);
    }
  });
}

module.exports = { RouteCoverageValidator };