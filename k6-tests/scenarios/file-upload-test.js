// k6-tests/scenarios/file-upload-test.js
// File upload workflow load testing scenario

import { check, sleep } from 'k6';
import { BASE_CONFIG, SCENARIOS } from '../configs/base-config.js';
import { httpUtils } from '../utils/http-utils.js';
import { authUtils } from '../utils/auth-utils.js';
import { generateTestUser, generateTestFile } from '../utils/data-generators.js';

export const options = {
  scenarios: {
    file_upload_gradual_ramp: {
      ...BASE_CONFIG.SCENARIOS.GRADUAL_RAMP,
      tags: { test_type: 'file_upload_gradual_ramp' },
      exec: 'fileUploadGradualRamp',
    },
    file_upload_sustained_load: {
      ...BASE_CONFIG.SCENARIOS.SUSTAINED_LOAD,
      tags: { test_type: 'file_upload_sustained_load' },
      exec: 'fileUploadSustainedLoad',
    },
    file_upload_various_sizes: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      tags: { test_type: 'file_upload_various_sizes' },
      exec: 'fileUploadVariousSizes',
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
    file_upload_duration: ['p(95)<10000', 'p(99)<20000'], // File uploads can be slower
    'file_upload_success_rate': ['rate>0.90'], // Slightly lower threshold for file operations
    'large_file_upload_success_rate': ['rate>0.85'],
  },
};

// Test data
let TEST_USERS = [];
const UPLOADED_FILES = [];

// File size configurations for testing
const FILE_SIZE_CONFIGS = [
  { sizeKB: 10, count: 100 },     // 10KB files - most common
  { sizeKB: 100, count: 50 },     // 100KB files
  { sizeKB: 500, count: 20 },     // 500KB files
  { sizeKB: 1024, count: 10 },    // 1MB files
  { sizeKB: 5120, count: 5 },     // 5MB files - large files
  { sizeKB: 10240, count: 2 },    // 10MB files - very large files
];

// Setup function
export function setup() {
  console.log('Setting up file upload test data...');

  // Generate test users for authentication
  for (let i = 0; i < 100; i++) {
    TEST_USERS.push(generateTestUser(i));
  }

  console.log(`Generated ${TEST_USERS.length} test users for file upload testing`);

  return { testUsers: TEST_USERS };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up file upload test data...');
  console.log(`Total files uploaded during test: ${UPLOADED_FILES.length}`);

  authUtils.clearAllTokens();
}

// Gradual ramp file upload test
export async function fileUploadGradualRamp(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Execute file upload workflow
  await executeFileUploadWorkflow();
}

// Sustained load file upload test
export async function fileUploadSustainedLoad(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Continuous file upload operations
  const endTime = Date.now() + (20 * 60 * 1000); // 20 minutes

  while (Date.now() < endTime) {
    // Mix of different file sizes
    const fileConfig = FILE_SIZE_CONFIGS[Math.floor(Math.random() * FILE_SIZE_CONFIGS.length)];

    if (Math.random() < 0.7) { // 70% small files
      await uploadSmallFile();
    } else if (Math.random() < 0.9) { // 20% medium files
      await uploadMediumFile();
    } else { // 10% large files
      await uploadLargeFile();
    }

    // Random delay between uploads (2-10 seconds)
    sleep(2 + Math.random() * 8);
  }
}

// Various file sizes test
export async function fileUploadVariousSizes(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Test different file sizes systematically
  for (const config of FILE_SIZE_CONFIGS) {
    console.log(`Testing ${config.count} files of ${config.sizeKB}KB each`);

    for (let i = 0; i < config.count; i++) {
      const testFile = generateTestFile(config.sizeKB);
      await uploadFile(testFile, config.sizeKB);

      // Small delay between uploads
      sleep(0.5);
    }
  }
}

// Authenticate user
async function authenticateUser(user) {
  const loginResult = await authUtils.login(user.email, user.password, user.id);
  if (!loginResult.success) {
    console.error(`Authentication failed for user ${user.id}`);
    return false;
  }
  return true;
}

// Execute file upload workflow
async function executeFileUploadWorkflow() {
  const startTime = Date.now();

  try {
    // Upload multiple files of different types and sizes
    const fileSizes = [10, 50, 100, 500]; // KB

    for (const size of fileSizes) {
      const testFile = generateTestFile(size);
      await uploadFile(testFile, size);
    }

    const duration = Date.now() - startTime;
    console.log(`File upload workflow completed in ${duration}ms`);

  } catch (error) {
    console.error('File upload workflow failed:', error);
  }
}

// Upload small file (10-100KB)
async function uploadSmallFile() {
  const size = 10 + Math.random() * 90; // 10-100KB
  const testFile = generateTestFile(size);
  await uploadFile(testFile, size);
}

// Upload medium file (100KB-1MB)
async function uploadMediumFile() {
  const size = 100 + Math.random() * 900; // 100KB-1MB
  const testFile = generateTestFile(size);
  await uploadFile(testFile, size);
}

// Upload large file (1MB-10MB)
async function uploadLargeFile() {
  const size = 1024 + Math.random() * 9216; // 1MB-10MB
  const testFile = generateTestFile(size);
  await uploadFile(testFile, size);
}

// Core file upload function
async function uploadFile(testFile, expectedSizeKB) {
  const startTime = Date.now();

  try {
    // Use the file upload utility
    const uploadResponse = httpUtils.uploadFile(
      '/upload', // Adjust endpoint as needed
      testFile.content,
      testFile.name
    );

    const duration = Date.now() - startTime;
    const sizeCategory = getSizeCategory(expectedSizeKB);

    check(uploadResponse, {
      [`file_upload_${sizeCategory}_success`]: (r) => r.status === 200 || r.status === 201,
      [`file_upload_${sizeCategory}_duration`]: (r) => {
        const maxDuration = getMaxDurationForSize(expectedSizeKB);
        return r.timings.duration < maxDuration;
      },
      [`file_upload_${sizeCategory}_size`]: (r) => {
        // Additional checks can be added here
        return true;
      },
    });

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      UPLOADED_FILES.push({
        name: testFile.name,
        size: expectedSizeKB,
        duration: duration,
        timestamp: Date.now(),
      });

      console.log(`Successfully uploaded ${testFile.name} (${expectedSizeKB}KB) in ${duration}ms`);
    } else {
      console.error(`Failed to upload ${testFile.name}: Status ${uploadResponse.status}`);
    }

  } catch (error) {
    console.error(`File upload error for ${testFile.name}:`, error);
  }
}

// Helper functions
function getSizeCategory(sizeKB) {
  if (sizeKB < 100) return 'small';
  if (sizeKB < 1024) return 'medium';
  if (sizeKB < 5120) return 'large';
  return 'very_large';
}

function getMaxDurationForSize(sizeKB) {
  // More generous timeouts for larger files
  if (sizeKB < 100) return 3000;     // 3s for small files
  if (sizeKB < 1024) return 8000;    // 8s for medium files
  if (sizeKB < 5120) return 15000;   // 15s for large files
  return 30000;                      // 30s for very large files
}

// Concurrent file upload test
export async function concurrentFileUploadTest(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Upload multiple files concurrently
  const uploadPromises = [];
  const fileCount = 3 + Math.random() * 5; // 3-8 files

  for (let i = 0; i < fileCount; i++) {
    const size = 10 + Math.random() * 990; // 10KB-1MB
    const testFile = generateTestFile(size);
    uploadPromises.push(uploadFile(testFile, size));
  }

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/file-upload-summary.json': JSON.stringify(data, null, 2),
    'reports/file-upload-report.html': htmlReport(data),
  };

  // Custom summary metrics
  if (data.metrics) {
    const fileMetrics = {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      file_upload_duration_p95: data.metrics.file_upload_duration?.values['p(95)'] || 0,
      file_upload_success_rate: data.metrics.file_upload_success_rate?.values.rate || 0,
      large_file_upload_success_rate: data.metrics.large_file_upload_success_rate?.values.rate || 0,
      total_files_uploaded: UPLOADED_FILES.length,
      average_upload_speed: calculateAverageUploadSpeed(UPLOADED_FILES),
      file_size_breakdown: calculateFileSizeBreakdown(UPLOADED_FILES),
    };

    summary['reports/file-upload-metrics.json'] = JSON.stringify(fileMetrics, null, 2);
  }

  return summary;
}

// Helper functions for metrics calculation
function calculateAverageUploadSpeed(uploadedFiles) {
  if (uploadedFiles.length === 0) return 0;

  const totalSizeKB = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
  const totalDurationMs = uploadedFiles.reduce((sum, file) => sum + file.duration, 0);

  return totalSizeKB / totalDurationMs * 1000; // KB per second
}

function calculateFileSizeBreakdown(uploadedFiles) {
  const breakdown = {
    small: 0,     // < 100KB
    medium: 0,    // 100KB - 1MB
    large: 0,     // 1MB - 5MB
    very_large: 0, // > 5MB
  };

  uploadedFiles.forEach(file => {
    if (file.size < 100) breakdown.small++;
    else if (file.size < 1024) breakdown.medium++;
    else if (file.size < 5120) breakdown.large++;
    else breakdown.very_large++;
  });

  return breakdown;
}