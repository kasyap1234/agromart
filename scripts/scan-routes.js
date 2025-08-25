#!/usr/bin/env node

/**
 * CLI Script for Route Scanner
 * Usage: node scripts/scan-routes.js
 */

const { RouteScanner } = require('./route-scanner.js');
const path = require('path');

async function main() {
  console.log('🔍 AgroMart Frontend Route Scanner\n');
  console.log('Analyzing Next.js app directory structure...\n');

  const appDir = path.join(__dirname, '../apps/client/src/app');
  const scanner = new RouteScanner(appDir);

  try {
    // Scan routes
    const startTime = Date.now();
    const result = await scanner.scanRoutes();
    const scanTime = Date.now() - startTime;

    // Display results
    console.log('✅ Scan completed successfully!\n');
    console.log(`⏱️  Scan time: ${scanTime}ms\n`);
    
    console.log('📊 SUMMARY:');
    console.log(`├── Total Routes: ${result.summary.totalRoutes}`);
    console.log(`├── Page Routes: ${result.summary.pageRoutes}`);
    console.log(`├── API Routes: ${result.summary.apiRoutes}`);
    console.log(`├── Protected Routes: ${result.summary.protectedRoutes}`);
    console.log(`└── Dynamic Routes: ${result.summary.dynamicRoutes}\n`);

    // Show route breakdown
    console.log('📄 PAGE ROUTES:');
    const pageRoutes = result.routes.filter(r => r.type === 'page');
    pageRoutes.forEach(route => {
      const protection = route.isProtected ? '🔒' : '🔓';
      const params = route.parameters.length > 0 ? ` [${route.parameters.join(', ')}]` : '';
      console.log(`  ${protection} ${route.path}${params}`);
    });

    console.log('\n🔌 API ROUTES:');
    const apiRoutes = result.routes.filter(r => r.type === 'api');
    apiRoutes.forEach(route => {
      const methods = route.methods?.join(', ') || 'Unknown';
      const params = route.parameters.length > 0 ? ` [${route.parameters.join(', ')}]` : '';
      console.log(`  📡 ${route.path}${params} (${methods})`);
    });

    // Export results
    console.log('\n📤 EXPORTING RESULTS:');
    
    // Export JSON
    const jsonPath = path.join(__dirname, '../route-scan-results.json');
    await scanner.exportToJson(jsonPath);
    console.log(`├── JSON export: ${path.relative(process.cwd(), jsonPath)}`);
    
    // Export Markdown report
    const report = await scanner.generateMarkdownReport();
    const fs = require('fs').promises;
    const reportPath = path.join(__dirname, '../FRONTEND_ROUTES_ANALYSIS.md');
    await fs.writeFile(reportPath, report);
    console.log(`└── Report: ${path.relative(process.cwd(), reportPath)}`);

    console.log('\n✨ Route scanning completed successfully!');

  } catch (error) {
    console.error('❌ Error during route scanning:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the scanner
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };