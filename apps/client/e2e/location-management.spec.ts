import { test, expect } from '@playwright/test';

interface LocationData {
  name: string;
  location_type: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  capacity?: string;
  capacity_unit?: string;
  temperature_controlled?: boolean;
  security_level?: string;
  is_active: boolean;
  notes?: string;
}

interface AuthTokens {
  token: string;
  refresh_token: string;
  user: any;
}

class LocationManagementTester {
  private baseURL = 'http://localhost:8080/api';
  private authToken = '';
  private tenantId = '';
  private testLocationId = '';

  async loginAndGetToken(page: any): Promise<AuthTokens> {
    console.log('🔐 Logging in to get authentication token...');

    const loginResponse = await page.request.post(`${this.baseURL}/auth/login`, {
      data: {
        email: 'admin@example.com',
        password: 'password'
      }
    });

    if (loginResponse.status() !== 200) {
      throw new Error(`Login failed: ${loginResponse.status()} ${loginResponse.statusText()}`);
    }

    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.data?.token) {
      throw new Error('Invalid login response structure');
    }

    this.authToken = loginData.data.token;
    this.tenantId = loginData.data.user?.tenant_id || '';

    console.log('✅ Login successful, token obtained');
    return loginData.data;
  }

  async createTestLocation(page: any, locationData: LocationData) {
    console.log('📍 Creating test location...');

    const response = await page.request.post(`${this.baseURL}/locations`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      data: locationData
    });

    const responseData = await response.json();
    console.log(`📍 Create location response: ${response.status()} - ${JSON.stringify(responseData)}`);

    if (response.status() === 201 && responseData.success) {
      this.testLocationId = responseData.data?.id || '';
      console.log('✅ Test location created successfully');
    } else {
      console.log('❌ Failed to create test location');
    }

    return { status: response.status(), data: responseData };
  }

  async getLocationById(page: any, locationId: string) {
    console.log(`📍 Getting location by ID: ${locationId}`);

    const response = await page.request.get(`${this.baseURL}/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 Get location response: ${response.status()} - ${JSON.stringify(responseData)}`);

    return { status: response.status(), data: responseData };
  }

  async updateLocation(page: any, locationId: string, updateData: Partial<LocationData>) {
    console.log(`📍 Updating location: ${locationId}`);

    const response = await page.request.put(`${this.baseURL}/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      data: updateData
    });

    const responseData = await response.json();
    console.log(`📍 Update location response: ${response.status()} - ${JSON.stringify(responseData)}`);

    return { status: response.status(), data: responseData };
  }

  async deleteLocation(page: any, locationId: string) {
    console.log(`📍 Deleting location: ${locationId}`);

    const response = await page.request.delete(`${this.baseURL}/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 Delete location response: ${response.status()} - ${JSON.stringify(responseData)}`);

    return { status: response.status(), data: responseData };
  }

  async listLocations(page: any, params?: { type?: string; active?: boolean; limit?: number; offset?: number }) {
    console.log('📍 Listing locations...');

    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `${this.baseURL}/locations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await page.request.get(url, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 List locations response: ${response.status()} - Found ${responseData.data?.length || 0} locations`);

    return { status: response.status(), data: responseData };
  }

  async listActiveLocations(page: any) {
    console.log('📍 Listing active locations...');

    const response = await page.request.get(`${this.baseURL}/locations/active`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 List active locations response: ${response.status()} - Found ${responseData.data?.length || 0} locations`);

    return { status: response.status(), data: responseData };
  }

  async listLocationsByType(page: any, locationType: string) {
    console.log(`📍 Listing locations by type: ${locationType}`);

    const response = await page.request.get(`${this.baseURL}/locations/types/${locationType}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 List locations by type response: ${response.status()} - Found ${responseData.data?.length || 0} locations`);

    return { status: response.status(), data: responseData };
  }

  async getLocationsWithCapacity(page: any) {
    console.log('📍 Getting locations with capacity...');

    const response = await page.request.get(`${this.baseURL}/locations/capacity`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const responseData = await response.json();
    console.log(`📍 Get locations with capacity response: ${response.status()} - Found ${responseData.data?.length || 0} locations`);

    return { status: response.status(), data: responseData };
  }

  // Test helper methods
  async testUnauthorizedAccess(page: any, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
    console.log(`🔒 Testing unauthorized access to ${method} ${endpoint}`);

    const requestConfig: any = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    let response;
    switch (method) {
      case 'GET':
        response = await page.request.get(`${this.baseURL}${endpoint}`, requestConfig);
        break;
      case 'POST':
        response = await page.request.post(`${this.baseURL}${endpoint}`, requestConfig);
        break;
      case 'PUT':
        response = await page.request.put(`${this.baseURL}${endpoint}`, requestConfig);
        break;
      case 'DELETE':
        response = await page.request.delete(`${this.baseURL}${endpoint}`, requestConfig);
        break;
    }

    const responseData = await response.json();
    console.log(`🔒 Unauthorized access response: ${response.status()} - ${JSON.stringify(responseData)}`);

    return { status: response.status(), data: responseData };
  }

  async testInvalidData(page: any, endpoint: string, invalidData: any) {
    console.log(`❌ Testing invalid data for ${endpoint}`);

    const response = await page.request.post(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      data: invalidData
    });

    const responseData = await response.json();
    console.log(`❌ Invalid data response: ${response.status()} - ${JSON.stringify(responseData)}`);

    return { status: response.status(), data: responseData };
  }

  getTestLocationId() {
    return this.testLocationId;
  }
}

test.describe('Location Management API Tests', () => {
  let tester: LocationManagementTester;

  test.beforeEach(async ({ page }) => {
    tester = new LocationManagementTester();
    // Login first to get authentication token
    await tester.loginAndGetToken(page);
  });

  test('should create a new location successfully', async ({ page }) => {
    const locationData: LocationData = {
      name: 'Test Warehouse',
      location_type: 'WAREHOUSE',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      postal_code: '12345',
      country: 'Test Country',
      phone: '+1-234-567-8900',
      email: 'warehouse@test.com',
      capacity: '1000',
      capacity_unit: 'sqft',
      temperature_controlled: true,
      security_level: 'HIGH',
      is_active: true,
      notes: 'Test location for automated testing'
    };

    const result = await tester.createTestLocation(page, locationData);

    expect(result.status).toBe(201);
    expect(result.data.success).toBe(true);
    expect(result.data.data).toBeTruthy();
    expect(result.data.data.name).toBe(locationData.name);
    expect(result.data.data.location_type).toBe(locationData.location_type);
  });

  test('should get location by ID', async ({ page }) => {
    // First create a location
    const locationData: LocationData = {
      name: 'Get Test Location',
      location_type: 'WAREHOUSE',
      is_active: true
    };

    await tester.createTestLocation(page, locationData);
    const locationId = tester.getTestLocationId();

    expect(locationId).toBeTruthy();

    // Now get it by ID
    const result = await tester.getLocationById(page, locationId);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.id).toBe(locationId);
    expect(result.data.data.name).toBe(locationData.name);
  });

  test('should update location successfully', async ({ page }) => {
    // First create a location
    const locationData: LocationData = {
      name: 'Update Test Location',
      location_type: 'WAREHOUSE',
      is_active: true
    };

    await tester.createTestLocation(page, locationData);
    const locationId = tester.getTestLocationId();

    // Update the location
    const updateData: Partial<LocationData> = {
      name: 'Updated Test Location',
      capacity: '2000',
      notes: 'Updated location notes'
    };

    const result = await tester.updateLocation(page, locationId, updateData);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.name).toBe(updateData.name);
    expect(result.data.data.capacity).toBe(updateData.capacity);
  });

  test('should delete location successfully', async ({ page }) => {
    // First create a location
    const locationData: LocationData = {
      name: 'Delete Test Location',
      location_type: 'WAREHOUSE',
      is_active: true
    };

    await tester.createTestLocation(page, locationData);
    const locationId = tester.getTestLocationId();

    // Delete the location
    const result = await tester.deleteLocation(page, locationId);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toContain('deleted successfully');
  });

  test('should list locations with filtering', async ({ page }) => {
    // Create a few test locations first
    const locations = [
      { name: 'Warehouse A', location_type: 'WAREHOUSE', is_active: true },
      { name: 'Store B', location_type: 'STORE', is_active: true },
      { name: 'Office C', location_type: 'OFFICE', is_active: false }
    ];

    for (const loc of locations) {
      await tester.createTestLocation(page, loc as LocationData);
    }

    // Test listing all locations
    const allResult = await tester.listLocations(page);
    expect(allResult.status).toBe(200);
    expect(allResult.data.success).toBe(true);
    expect(Array.isArray(allResult.data.data)).toBe(true);

    // Test filtering by type
    const warehouseResult = await tester.listLocationsByType(page, 'WAREHOUSE');
    expect(warehouseResult.status).toBe(200);
    expect(warehouseResult.data.success).toBe(true);

    // Test listing active locations
    const activeResult = await tester.listActiveLocations(page);
    expect(activeResult.status).toBe(200);
    expect(activeResult.data.success).toBe(true);
  });

  test('should get locations with capacity information', async ({ page }) => {
    // Create a location with capacity
    const locationData: LocationData = {
      name: 'Capacity Test Location',
      location_type: 'WAREHOUSE',
      capacity: '5000',
      capacity_unit: 'sqft',
      is_active: true
    };

    await tester.createTestLocation(page, locationData);

    const result = await tester.getLocationsWithCapacity(page);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(Array.isArray(result.data.data)).toBe(true);
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Test without authentication token
    const result = await tester.testUnauthorizedAccess(page, '/locations');

    expect([401, 403]).toContain(result.status);
    expect(result.data.success).toBe(false);
  });

  test('should validate required fields on creation', async ({ page }) => {
    const invalidData = {
      location_type: 'WAREHOUSE',
      is_active: true
      // Missing required 'name' field
    };

    const result = await tester.testInvalidData(page, '/locations', invalidData);

    expect(result.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error.message).toContain('required');
  });

  test('should handle non-existent location ID', async ({ page }) => {
    const fakeId = '550e8400-e29b-41d4-a716-446655440000';
    const result = await tester.getLocationById(page, fakeId);

    expect([404, 400]).toContain(result.status);
    expect(result.data.success).toBe(false);
  });

  test('should handle pagination parameters', async ({ page }) => {
    // Create multiple locations
    for (let i = 0; i < 5; i++) {
      await tester.createTestLocation(page, {
        name: `Pagination Test Location ${i}`,
        location_type: 'WAREHOUSE',
        is_active: true
      });
    }

    // Test with limit and offset
    const result = await tester.listLocations(page, { limit: 2, offset: 1 });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data).toHaveLength(2);
    expect(result.data.meta).toBeTruthy();
    expect(result.data.meta.limit).toBe(2);
    expect(result.data.meta.offset).toBe(1);
  });
});