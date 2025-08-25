/**
 * Route Scanner Utility
 * Analyzes the Next.js app directory structure to discover all routes
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';

export interface RouteInfo {
  path: string;
  type: 'page' | 'api' | 'layout' | 'loading' | 'error' | 'not-found';
  fullPath: string;
  parameters: string[];
  isProtected: boolean;
  hasLayout: boolean;
  hasLoading: boolean;
  hasError: boolean;
  methods?: string[];
  middleware?: string[];
}

export interface RouteScanResult {
  routes: RouteInfo[];
  summary: {
    totalRoutes: number;
    pageRoutes: number;
    apiRoutes: number;
    protectedRoutes: number;
    dynamicRoutes: number;
  };
}

export class RouteScanner {
  private appDir: string;
  private routes: RouteInfo[] = [];

  constructor(appDirectory: string = './src/app') {
    this.appDir = appDirectory;
  }

  /**
   * Scan the entire app directory for routes
   */
  async scanRoutes(): Promise<RouteScanResult> {
    this.routes = [];
    await this.scanDirectory(this.appDir, '');
    
    return {
      routes: this.routes,
      summary: this.generateSummary()
    };
  }

  /**
   * Recursively scan directory for route files
   */
  private async scanDirectory(dirPath: string, routePath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Handle route groups (folders in parentheses) and dynamic routes
          const folderName = entry.name;
          let newRoutePath = routePath;
          
          if (folderName.startsWith('(') && folderName.endsWith(')')) {
            // Route group - doesn't affect URL
            newRoutePath = routePath;
          } else if (folderName.startsWith('[') && folderName.endsWith(']')) {
            // Dynamic route
            newRoutePath = `${routePath}/${folderName}`;
          } else {
            // Regular folder
            newRoutePath = `${routePath}/${folderName}`;
          }
          
          await this.scanDirectory(fullPath, newRoutePath);
        } else if (entry.isFile()) {
          await this.processRouteFile(fullPath, routePath, entry.name);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  /**
   * Process individual route files
   */
  private async processRouteFile(filePath: string, routePath: string, fileName: string): Promise<void> {
    // Skip non-route files
    if (fileName.startsWith('.') || fileName.includes('.test.') || fileName.includes('.spec.')) {
      return;
    }

    const routeInfo: Partial<RouteInfo> = {
      fullPath: filePath,
      parameters: this.extractParameters(routePath),
      hasLayout: false,
      hasLoading: false,
      hasError: false,
      isProtected: false,
      middleware: []
    };

    // Determine route type based on filename
    if (fileName === 'page.tsx' || fileName === 'page.ts') {
      routeInfo.type = 'page';
      routeInfo.path = routePath || '/';
    } else if (fileName === 'route.ts' || fileName === 'route.tsx') {
      routeInfo.type = 'api';
      routeInfo.path = `/api${routePath}`;
      routeInfo.methods = await this.extractApiMethods(filePath);
    } else if (fileName === 'layout.tsx' || fileName === 'layout.ts') {
      routeInfo.type = 'layout';
      routeInfo.path = routePath || '/';
      routeInfo.hasLayout = true;
    } else if (fileName === 'loading.tsx' || fileName === 'loading.ts') {
      routeInfo.type = 'loading';
      routeInfo.path = routePath || '/';
      routeInfo.hasLoading = true;
    } else if (fileName === 'error.tsx' || fileName === 'error.ts') {
      routeInfo.type = 'error';
      routeInfo.path = routePath || '/';
      routeInfo.hasError = true;
    } else if (fileName === 'not-found.tsx' || fileName === 'not-found.ts') {
      routeInfo.type = 'not-found';
      routeInfo.path = routePath || '/';
    } else {
      // Skip other files
      return;
    }

    // Check if route is protected
    routeInfo.isProtected = await this.isProtectedRoute(filePath);
    
    // Check for middleware
    routeInfo.middleware = await this.extractMiddleware(filePath);

    this.routes.push(routeInfo as RouteInfo);
  }

  /**
   * Extract dynamic parameters from route path
   */
  private extractParameters(routePath: string): string[] {
    const parameters: string[] = [];
    const segments = routePath.split('/');
    
    for (const segment of segments) {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const param = segment.slice(1, -1);
        if (param.startsWith('...')) {
          parameters.push(`...${param.slice(3)}`); // Catch-all route
        } else {
          parameters.push(param);
        }
      }
    }
    
    return parameters;
  }

  /**
   * Extract HTTP methods from API route file
   */
  private async extractApiMethods(filePath: string): Promise<string[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const methods: string[] = [];
      
      // Look for exported HTTP method handlers
      const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      
      for (const method of httpMethods) {
        if (content.includes(`export async function ${method}`) || 
            content.includes(`export function ${method}`)) {
          methods.push(method);
        }
      }
      
      return methods;
    } catch (error) {
      console.error(`Error reading API route file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Check if route requires authentication
   */
  private async isProtectedRoute(filePath: string): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Look for authentication-related imports and usage
      const authIndicators = [
        'useAuth',
        'requireAuth',
        'withAuth',
        'ProtectedRoute',
        'AuthGuard',
        'middleware',
        'auth.required',
        'getServerSession'
      ];
      
      return authIndicators.some(indicator => content.includes(indicator));
    } catch (error) {
      console.error(`Error checking protection status for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Extract middleware information
   */
  private async extractMiddleware(filePath: string): Promise<string[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const middleware: string[] = [];
      
      // Look for middleware imports and usage
      if (content.includes('middleware')) {
        const middlewareMatches = content.match(/middleware\s*:\s*\[([^\]]+)\]/g);
        if (middlewareMatches) {
          for (const match of middlewareMatches) {
            const middlewareNames = match.match(/['"`]([^'"`]+)['"`]/g);
            if (middlewareNames) {
              middleware.push(...middlewareNames.map(name => name.slice(1, -1)));
            }
          }
        }
      }
      
      return middleware;
    } catch (error) {
      console.error(`Error extracting middleware from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(): RouteScanResult['summary'] {
    const summary = {
      totalRoutes: this.routes.length,
      pageRoutes: 0,
      apiRoutes: 0,
      protectedRoutes: 0,
      dynamicRoutes: 0
    };

    for (const route of this.routes) {
      if (route.type === 'page') summary.pageRoutes++;
      if (route.type === 'api') summary.apiRoutes++;
      if (route.isProtected) summary.protectedRoutes++;
      if (route.parameters.length > 0) summary.dynamicRoutes++;
    }

    return summary;
  }

  /**
   * Export routes to JSON file
   */
  async exportToJson(outputPath: string): Promise<void> {
    const result = await this.scanRoutes();
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`Routes exported to ${outputPath}`);
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(): Promise<string> {
    const result = await this.scanRoutes();
    
    let report = '# Frontend Routes Analysis\n\n';
    report += `## Summary\n\n`;
    report += `- **Total Routes**: ${result.summary.totalRoutes}\n`;
    report += `- **Page Routes**: ${result.summary.pageRoutes}\n`;
    report += `- **API Routes**: ${result.summary.apiRoutes}\n`;
    report += `- **Protected Routes**: ${result.summary.protectedRoutes}\n`;
    report += `- **Dynamic Routes**: ${result.summary.dynamicRoutes}\n\n`;

    // Page Routes Table
    report += '## Page Routes\n\n';
    report += '| Path | Parameters | Protected | Has Layout | File |\n';
    report += '|------|------------|-----------|------------|------|\n';
    
    const pageRoutes = result.routes.filter(r => r.type === 'page');
    for (const route of pageRoutes) {
      const params = route.parameters.length > 0 ? route.parameters.join(', ') : 'None';
      const protected_ = route.isProtected ? '✅' : '❌';
      const hasLayout = route.hasLayout ? '✅' : '❌';
      const relativePath = relative(process.cwd(), route.fullPath);
      report += `| ${route.path} | ${params} | ${protected_} | ${hasLayout} | ${relativePath} |\n`;
    }

    // API Routes Table
    report += '\n## API Routes\n\n';
    report += '| Path | Methods | Parameters | File |\n';
    report += '|------|---------|------------|----- |\n';
    
    const apiRoutes = result.routes.filter(r => r.type === 'api');
    for (const route of apiRoutes) {
      const methods = route.methods?.join(', ') || 'Unknown';
      const params = route.parameters.length > 0 ? route.parameters.join(', ') : 'None';
      const relativePath = relative(process.cwd(), route.fullPath);
      report += `| ${route.path} | ${methods} | ${params} | ${relativePath} |\n`;
    }

    // Protected Routes
    report += '\n## Protected Routes\n\n';
    const protectedRoutes = result.routes.filter(r => r.isProtected);
    if (protectedRoutes.length > 0) {
      report += '| Path | Type | Middleware |\n';
      report += '|------|------|------------|\n';
      for (const route of protectedRoutes) {
        const middleware = route.middleware?.join(', ') || 'Default';
        report += `| ${route.path} | ${route.type} | ${middleware} |\n`;
      }
    } else {
      report += 'No protected routes detected.\n';
    }

    // Dynamic Routes
    report += '\n## Dynamic Routes\n\n';
    const dynamicRoutes = result.routes.filter(r => r.parameters.length > 0);
    if (dynamicRoutes.length > 0) {
      report += '| Path | Parameters | Type |\n';
      report += '|------|------------|------|\n';
      for (const route of dynamicRoutes) {
        const params = route.parameters.join(', ');
        report += `| ${route.path} | ${params} | ${route.type} |\n`;
      }
    } else {
      report += 'No dynamic routes detected.\n';
    }

    return report;
  }
}

/**
 * CLI interface for the route scanner
 */
export async function scanRoutesFromCLI(): Promise<void> {
  const scanner = new RouteScanner();
  
  try {
    console.log('Scanning frontend routes...\n');
    
    const result = await scanner.scanRoutes();
    
    console.log('=== ROUTE SCAN RESULTS ===\n');
    console.log(`Total Routes Found: ${result.summary.totalRoutes}`);
    console.log(`├── Page Routes: ${result.summary.pageRoutes}`);
    console.log(`├── API Routes: ${result.summary.apiRoutes}`);
    console.log(`├── Protected Routes: ${result.summary.protectedRoutes}`);
    console.log(`└── Dynamic Routes: ${result.summary.dynamicRoutes}\n`);
    
    // Export results
    await scanner.exportToJson('./route-scan-results.json');
    
    const report = await scanner.generateMarkdownReport();
    const fs = await import('fs/promises');
    await fs.writeFile('./FRONTEND_ROUTES_ANALYSIS.md', report);
    console.log('Markdown report generated: FRONTEND_ROUTES_ANALYSIS.md');
    
  } catch (error) {
    console.error('Error scanning routes:', error);
    process.exit(1);
  }
}

// Export default scanner instance
export default RouteScanner;