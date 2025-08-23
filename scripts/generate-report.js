// scripts/generate-report.js
// Report generation script for load testing results

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '..', 'k6-tests', 'reports');
    this.testDataDir = path.join(__dirname, '..', 'k6-tests', 'data');
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('📊 Generating comprehensive load testing report...');

    try {
      // Collect all test results
      const testResults = await this.collectTestResults();

      // Generate performance summary
      const performanceSummary = this.generatePerformanceSummary(testResults);

      // Generate compliance report
      const complianceReport = this.generateComplianceReport(testResults);

      // Generate recommendations
      const recommendations = this.generateRecommendations(testResults);

      // Create HTML report
      const htmlReport = this.generateHtmlReport({
        testResults,
        performanceSummary,
        complianceReport,
        recommendations,
      });

      // Create JSON report
      const jsonReport = this.generateJsonReport({
        testResults,
        performanceSummary,
        complianceReport,
        recommendations,
        generated_at: new Date().toISOString(),
      });

      // Write reports to files
      await this.writeReportFile('comprehensive-report.html', htmlReport);
      await this.writeReportFile('comprehensive-report.json', JSON.stringify(jsonReport, null, 2));

      console.log('✅ Comprehensive report generated successfully!');
      console.log(`📁 Reports saved to: ${this.reportsDir}`);

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Collect test results from various sources
   */
  async collectTestResults() {
    const results = {
      auth: {},
      products: {},
      files: {},
      dashboard: {},
      sessions: {},
      overall: {},
    };

    // Define result files to look for
    const resultFiles = [
      { key: 'auth', file: 'auth-load-test-results.json' },
      { key: 'products', file: 'products-load-test-results.json' },
      { key: 'files', file: 'file-upload-test-results.json' },
      { key: 'dashboard', file: 'dashboard-load-test-results.json' },
      { key: 'sessions', file: 'sessions-load-test-results.json' },
      { key: 'overall', file: 'comprehensive-test-results.json' },
    ];

    for (const { key, file } of resultFiles) {
      const filePath = path.join(this.reportsDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          results[key] = this.processTestResult(data);
        } catch (error) {
          console.warn(`Warning: Could not parse ${file}:`, error.message);
        }
      }
    }

    return results;
  }

  /**
   * Process individual test result
   */
  processTestResult(data) {
    if (!data.metrics) return {};

    const metrics = data.metrics;
    return {
      total_requests: metrics.http_reqs?.values.count || 0,
      failed_requests: metrics.http_req_failed?.values.rate || 0,
      avg_response_time: metrics.http_req_duration?.values.avg || 0,
      p95_response_time: metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: metrics.http_req_duration?.values['p(99)'] || 0,
      throughput: metrics.http_reqs?.values.rate || 0,
      error_rate: metrics.http_req_failed?.values.rate || 0,
      test_duration: data.duration || 0,
      timestamp: data.timestamp || Date.now(),
    };
  }

  /**
   * Generate performance summary
   */
  generatePerformanceSummary(testResults) {
    const summary = {
      overall_score: 0,
      performance_metrics: {},
      test_coverage: {},
      bottlenecks_identified: [],
    };

    // Calculate overall performance score
    let totalScore = 0;
    let scoreCount = 0;

    Object.entries(testResults).forEach(([testType, results]) => {
      if (Object.keys(results).length > 0) {
        const score = this.calculateTestScore(results);
        summary.performance_metrics[testType] = {
          ...results,
          performance_score: score,
        };
        totalScore += score;
        scoreCount++;
      }
    });

    summary.overall_score = scoreCount > 0 ? totalScore / scoreCount : 0;

    // Identify bottlenecks
    summary.bottlenecks_identified = this.identifyBottlenecks(testResults);

    return summary;
  }

  /**
   * Calculate performance score for a test
   */
  calculateTestScore(results) {
    let score = 100;

    // Response time penalties
    if (results.p95_response_time > 2000) score -= 20;
    else if (results.p95_response_time > 1500) score -= 10;

    if (results.p99_response_time > 4000) score -= 20;
    else if (results.p99_response_time > 3000) score -= 10;

    // Error rate penalties
    if (results.error_rate > 0.05) score -= 30;
    else if (results.error_rate > 0.01) score -= 10;

    // Throughput bonuses
    if (results.throughput > 1000) score += 10;
    else if (results.throughput > 500) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(testResults) {
    const bottlenecks = [];

    // Check for high response times
    Object.entries(testResults).forEach(([testType, results]) => {
      if (results.p95_response_time > 2000) {
        bottlenecks.push({
          type: 'high_response_time',
          test: testType,
          metric: 'p95_response_time',
          value: results.p95_response_time,
          threshold: 2000,
          severity: 'high',
        });
      }
    });

    // Check for high error rates
    Object.entries(testResults).forEach(([testType, results]) => {
      if (results.error_rate > 0.05) {
        bottlenecks.push({
          type: 'high_error_rate',
          test: testType,
          metric: 'error_rate',
          value: results.error_rate,
          threshold: 0.05,
          severity: 'critical',
        });
      }
    });

    // Check for low throughput
    Object.entries(testResults).forEach(([testType, results]) => {
      if (results.throughput < 100) {
        bottlenecks.push({
          type: 'low_throughput',
          test: testType,
          metric: 'throughput',
          value: results.throughput,
          threshold: 100,
          severity: 'medium',
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(testResults) {
    const targets = {
      response_time_p95: 1500,
      response_time_p99: 3000,
      error_rate_max: 0.01,
      throughput_min: 500,
    };

    const compliance = {
      overall_compliant: true,
      targets_met: 0,
      total_targets: 0,
      compliance_breakdown: {},
    };

    // Check each test result against targets
    Object.entries(testResults).forEach(([testType, results]) => {
      if (Object.keys(results).length === 0) return;

      compliance.compliance_breakdown[testType] = {
        response_time_p95_compliant: results.p95_response_time <= targets.response_time_p95,
        response_time_p99_compliant: results.p99_response_time <= targets.response_time_p99,
        error_rate_compliant: results.error_rate <= targets.error_rate_max,
        throughput_compliant: results.throughput >= targets.throughput_min,
      };

      // Update overall compliance
      const testCompliant = Object.values(compliance.compliance_breakdown[testType]).every(c => c);
      if (!testCompliant) {
        compliance.overall_compliant = false;
      }

      compliance.total_targets += 4; // 4 targets per test
      compliance.targets_met += Object.values(compliance.compliance_breakdown[testType]).filter(c => c).length;
    });

    compliance.compliance_percentage = compliance.total_targets > 0
      ? Math.round((compliance.targets_met / compliance.total_targets) * 100)
      : 0;

    return compliance;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(testResults) {
    const recommendations = [];

    // Check for optimization opportunities
    Object.entries(testResults).forEach(([testType, results]) => {
      if (results.p95_response_time > 1500) {
        recommendations.push({
          priority: 'high',
          category: 'performance',
          test: testType,
          recommendation: `Optimize ${testType} endpoints - P95 response time (${results.p95_response_time}ms) exceeds target (1500ms)`,
          estimated_impact: 'High',
        });
      }

      if (results.error_rate > 0.01) {
        recommendations.push({
          priority: 'critical',
          category: 'reliability',
          test: testType,
          recommendation: `Reduce error rate for ${testType} - Current rate (${(results.error_rate * 100).toFixed(2)}%) exceeds target (1%)`,
          estimated_impact: 'Critical',
        });
      }

      if (results.throughput < 500) {
        recommendations.push({
          priority: 'medium',
          category: 'scalability',
          test: testType,
          recommendation: `Improve throughput for ${testType} - Consider horizontal scaling or infrastructure upgrades`,
          estimated_impact: 'Medium',
        });
      }
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agromart Load Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; color: #2c3e50; }
        .score.excellent { color: #27ae60; }
        .score.good { color: #f39c12; }
        .score.poor { color: #e74c3c; }
        .section { margin: 30px 0; }
        .section h2 { color: #2c3e50; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .metric-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .metric-value { font-size: 24px; font-weight: bold; color: #3498db; }
        .compliance-status { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        .compliant { background: #d5edda; color: #155724; }
        .non-compliant { background: #f8d7da; color: #721c24; }
        .bottleneck { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .recommendation { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .priority-critical { border-left-color: #f44336; background: #ffebee; }
        .priority-high { border-left-color: #ff9800; background: #fff3e0; }
        .priority-medium { border-left-color: #ff9800; background: #fff3e0; }
        .priority-low { border-left-color: #4caf50; background: #e8f5e8; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .footer { text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Agromart Load Testing Report</h1>
            <div class="score ${this.getScoreClass(data.performanceSummary.overall_score)}">
                ${Math.round(data.performanceSummary.overall_score)}/100
            </div>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>

        <div class="section">
            <h2>📊 Performance Summary</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <h3>Overall Score</h3>
                    <div class="metric-value">${Math.round(data.performanceSummary.overall_score)}/100</div>
                </div>
                <div class="metric-card">
                    <h3>Compliance Rate</h3>
                    <div class="metric-value">${data.complianceReport.compliance_percentage}%</div>
                </div>
                <div class="metric-card">
                    <h3>Targets Met</h3>
                    <div class="metric-value">${data.complianceReport.targets_met}/${data.complianceReport.total_targets}</div>
                </div>
                <div class="metric-card">
                    <h3>Bottlenecks Found</h3>
                    <div class="metric-value">${data.performanceSummary.bottlenecks_identified.length}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📈 Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Type</th>
                        <th>Total Requests</th>
                        <th>P95 Response Time</th>
                        <th>P99 Response Time</th>
                        <th>Error Rate</th>
                        <th>Throughput</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(data.performanceSummary.performance_metrics).map(([testType, metrics]) => `
                        <tr>
                            <td>${this.capitalizeFirst(testType)}</td>
                            <td>${metrics.total_requests?.toLocaleString() || 0}</td>
                            <td>${Math.round(metrics.p95_response_time || 0)}ms</td>
                            <td>${Math.round(metrics.p99_response_time || 0)}ms</td>
                            <td>${((metrics.error_rate || 0) * 100).toFixed(2)}%</td>
                            <td>${Math.round(metrics.throughput || 0)} req/s</td>
                            <td>${Math.round(metrics.performance_score || 0)}/100</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${data.performanceSummary.bottlenecks_identified.length > 0 ? `
            <div class="section">
                <h2>⚠️ Performance Bottlenecks</h2>
                ${data.performanceSummary.bottlenecks_identified.map(bottleneck => `
                    <div class="bottleneck">
                        <strong>${this.capitalizeFirst(bottleneck.type.replace('_', ' '))}</strong> in ${bottleneck.test}<br>
                        ${bottleneck.metric}: ${bottleneck.value} (threshold: ${bottleneck.threshold})<br>
                        <small>Severity: ${bottleneck.severity.toUpperCase()}</small>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="section">
            <h2>✅ Recommendations</h2>
            ${data.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <strong>[${rec.priority.toUpperCase()}] ${rec.category.toUpperCase()}</strong><br>
                    ${rec.recommendation}<br>
                    <small>Impact: ${rec.estimated_impact}</small>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📋 Compliance Status</h2>
            <div class="metric-grid">
                ${Object.entries(data.complianceReport.compliance_breakdown).map(([testType, compliance]) => `
                    <div class="metric-card">
                        <h3>${this.capitalizeFirst(testType)}</h3>
                        <p>P95 Response Time: <span class="compliance-status ${compliance.response_time_p95_compliant ? 'compliant' : 'non-compliant'}">
                            ${compliance.response_time_p95_compliant ? 'PASS' : 'FAIL'}
                        </span></p>
                        <p>P99 Response Time: <span class="compliance-status ${compliance.response_time_p99_compliant ? 'compliant' : 'non-compliant'}">
                            ${compliance.response_time_p99_compliant ? 'PASS' : 'FAIL'}
                        </span></p>
                        <p>Error Rate: <span class="compliance-status ${compliance.error_rate_compliant ? 'compliant' : 'non-compliant'}">
                            ${compliance.error_rate_compliant ? 'PASS' : 'FAIL'}
                        </span></p>
                        <p>Throughput: <span class="compliance-status ${compliance.throughput_compliant ? 'compliant' : 'non-compliant'}">
                            ${compliance.throughput_compliant ? 'PASS' : 'FAIL'}
                        </span></p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            <p>Generated by Agromart Load Testing Suite v1.0.0</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(data) {
    return {
      report_metadata: {
        generated_at: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      summary: data.performanceSummary,
      compliance: data.complianceReport,
      recommendations: data.recommendations,
      test_results: data.testResults,
    };
  }

  /**
   * Write report file
   */
  async writeReportFile(filename, content) {
    const filePath = path.join(this.reportsDir, filename);
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          console.error(`Error writing ${filename}:`, err);
          reject(err);
        } else {
          console.log(`  Generated: ${path.relative(process.cwd(), filePath)}`);
          resolve();
        }
      });
    });
  }

  /**
   * Helper methods
   */
  getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    return 'poor';
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Run report generation if called directly
if (require.main === module) {
  const generator = new ReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = ReportGenerator;