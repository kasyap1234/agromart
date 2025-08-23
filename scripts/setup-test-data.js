// scripts/setup-test-data.js
// Test data setup script for load testing

const fs = require('fs');
const path = require('path');

class TestDataSetup {
  constructor() {
    this.testDataDir = path.join(__dirname, '..', 'k6-tests', 'data');
    this.reportsDir = path.join(__dirname, '..', 'k6-tests', 'reports');
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('🚀 Setting up load testing environment...');

    try {
      // Create necessary directories
      await this.createDirectories();

      // Generate test data files
      await this.generateTestData();

      // Validate setup
      await this.validateSetup();

      console.log('✅ Load testing environment setup completed successfully!');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    console.log('📁 Creating directories...');

    const directories = [
      this.testDataDir,
      this.reportsDir,
      path.join(this.reportsDir, 'auth'),
      path.join(this.reportsDir, 'products'),
      path.join(this.reportsDir, 'files'),
      path.join(this.reportsDir, 'dashboard'),
      path.join(this.reportsDir, 'sessions'),
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  Created: ${dir}`);
      }
    }
  }

  /**
   * Generate test data files
   */
  async generateTestData() {
    console.log('📊 Generating test data...');

    // Generate users data
    const usersData = this.generateUsersData(1000);
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-users.json'),
      usersData
    );

    // Generate products data
    const productsData = this.generateProductsData(5000);
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-products.json'),
      productsData
    );

    // Generate customers data
    const customersData = this.generateCustomersData(2000);
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-customers.json'),
      customersData
    );

    // Generate suppliers data
    const suppliersData = this.generateSuppliersData(1000);
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-suppliers.json'),
      suppliersData
    );

    // Generate orders data
    const ordersData = this.generateOrdersData(3000);
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-orders.json'),
      ordersData
    );

    // Generate test configuration
    const configData = this.generateTestConfig();
    await this.writeJsonFile(
      path.join(this.testDataDir, 'test-config.json'),
      configData
    );
  }

  /**
   * Generate test users data
   */
  generateUsersData(count) {
    const users = [];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const companies = ['TechCorp', 'Global Industries', 'Innovate Ltd', 'Prime Solutions'];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const company = companies[i % companies.length];

      users.push({
        id: `user_${i + 1}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        password: `password${i}123`,
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        phone: this.generatePhoneNumber(),
        role: i % 10 === 0 ? 'admin' : 'user',
        is_active: Math.random() > 0.1, // 10% inactive users
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { users, metadata: { count, generated_at: new Date().toISOString() } };
  }

  /**
   * Generate test products data
   */
  generateProductsData(count) {
    const products = [];
    const productNames = [
      'Organic Tomatoes', 'Free Range Eggs', 'Whole Milk', 'Brown Rice',
      'Organic Apples', 'Chicken Breast', 'Whole Wheat Bread', 'Fresh Salmon',
      'Organic Spinach', 'Greek Yogurt', 'Quinoa', 'Avocados', 'Ground Beef'
    ];
    const categories = ['Vegetables', 'Dairy', 'Grains', 'Fruits', 'Meat', 'Seafood', 'Bakery'];
    const units = ['kg', 'lbs', 'pieces', 'liters', 'boxes', 'bags', 'bottles'];

    for (let i = 0; i < count; i++) {
      const name = productNames[i % productNames.length];
      const category = categories[i % categories.length];
      const unit = units[i % units.length];

      products.push({
        id: `product_${i + 1}`,
        sku: `SKU${String(i + 1).padStart(6, '0')}`,
        name: `${name} ${i + 1}`,
        description: `High-quality ${name.toLowerCase()} sourced from trusted suppliers.`,
        selling_price: parseFloat((Math.random() * 20 + 5).toFixed(2)),
        cost_price: parseFloat((Math.random() * 15 + 3).toFixed(2)),
        unit_id: `unit_${(i % units.length) + 1}`,
        category,
        brand: `Brand${(i % 5) + 1}`,
        tax_rate: parseFloat((Math.random() * 0.1).toFixed(3)),
        min_stock_level: Math.floor(Math.random() * 50) + 10,
        max_stock_level: Math.floor(Math.random() * 200) + 100,
        reorder_point: Math.floor(Math.random() * 30) + 5,
        is_active: Math.random() > 0.05, // 5% inactive products
        created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { products, metadata: { count, generated_at: new Date().toISOString() } };
  }

  /**
   * Generate test customers data
   */
  generateCustomersData(count) {
    const customers = [];
    const customerTypes = ['retail', 'wholesale', 'distributor', 'restaurant', 'hotel'];

    for (let i = 0; i < count; i++) {
      const customer = this.generateUsersData(1).users[0];

      customers.push({
        id: `customer_${i + 1}`,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone,
        address: this.generateAddress(),
        customer_type: customerTypes[i % customerTypes.length],
        credit_limit: Math.floor(Math.random() * 10000) + 1000,
        payment_terms: this.generatePaymentTerms(),
        is_active: Math.random() > 0.1, // 10% inactive customers
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { customers, metadata: { count, generated_at: new Date().toISOString() } };
  }

  /**
   * Generate test suppliers data
   */
  generateSuppliersData(count) {
    const suppliers = [];
    const supplierTypes = ['manufacturer', 'distributor', 'wholesaler', 'importer', 'local_farm'];

    for (let i = 0; i < count; i++) {
      const supplier = this.generateUsersData(1).users[0];

      suppliers.push({
        id: `supplier_${i + 1}`,
        name: supplier.company_name,
        email: supplier.email,
        phone: supplier.phone,
        address: this.generateAddress(),
        supplier_type: supplierTypes[i % supplierTypes.length],
        payment_terms: this.generatePaymentTerms(),
        credit_limit: Math.floor(Math.random() * 50000) + 5000,
        is_active: Math.random() > 0.05, // 5% inactive suppliers
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { suppliers, metadata: { count, generated_at: new Date().toISOString() } };
  }

  /**
   * Generate test orders data
   */
  generateOrdersData(count) {
    const orders = [];
    const statuses = ['draft', 'pending', 'approved', 'ordered', 'received', 'completed', 'cancelled'];
    const orderTypes = ['purchase', 'sales'];

    for (let i = 0; i < count; i++) {
      const orderType = orderTypes[i % orderTypes.length];
      const status = statuses[i % statuses.length];

      const order = {
        id: `${orderType}_order_${i + 1}`,
        order_type: orderType,
        status,
        order_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        total_amount: parseFloat((Math.random() * 1000 + 100).toFixed(2)),
        items_count: Math.floor(Math.random() * 10) + 1,
        is_active: status !== 'cancelled',
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (orderType === 'purchase') {
        order.supplier_id = `supplier_${(i % 100) + 1}`;
      } else {
        order.customer_id = `customer_${(i % 200) + 1}`;
      }

      orders.push(order);
    }

    return { orders, metadata: { count, generated_at: new Date().toISOString() } };
  }

  /**
   * Generate test configuration
   */
  generateTestConfig() {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      api_base_url: process.env.API_BASE_URL || 'http://localhost:8080/api',
      test_data_counts: {
        users: 1000,
        products: 5000,
        customers: 2000,
        suppliers: 1000,
        orders: 3000,
      },
      performance_targets: {
        response_time_p95: 1500,
        response_time_p99: 3000,
        error_rate_max: 0.01,
        cpu_usage_max: 0.8,
        memory_usage_max: 0.85,
        throughput_min: 500,
      },
      load_test_scenarios: {
        auth: { vus: 1000, duration: '10m' },
        products: { vus: 500, duration: '15m' },
        files: { vus: 100, duration: '12m' },
        dashboard: { vus: 200, duration: '15m' },
        sessions: { vus: 1000, duration: '20m' },
      },
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Helper functions
   */
  generatePhoneNumber() {
    return `+1${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  generateAddress() {
    const streets = ['Main St', 'Oak Ave', 'Elm St', 'Maple Dr', 'Pine St'];
    const cities = ['Springfield', 'Riverside', 'Oakwood', 'Greenville', 'Fairview'];
    const states = ['CA', 'NY', 'TX', 'FL', 'IL'];
    const zipCodes = ['12345', '67890', '11111', '22222', '33333'];

    return {
      street: `${Math.floor(Math.random() * 999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: states[Math.floor(Math.random() * states.length)],
      zip_code: zipCodes[Math.floor(Math.random() * zipCodes.length)],
      country: 'USA',
    };
  }

  generatePaymentTerms() {
    const terms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', '2/10 Net 30', 'COD'];
    return terms[Math.floor(Math.random() * terms.length)];
  }

  /**
   * Write JSON file
   */
  async writeJsonFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) {
          console.error(`  Error writing ${filePath}:`, err);
          reject(err);
        } else {
          console.log(`  Generated: ${path.relative(process.cwd(), filePath)}`);
          resolve();
        }
      });
    });
  }

  /**
   * Validate setup
   */
  async validateSetup() {
    console.log('✅ Validating setup...');

    const requiredFiles = [
      path.join(this.testDataDir, 'test-users.json'),
      path.join(this.testDataDir, 'test-products.json'),
      path.join(this.testDataDir, 'test-config.json'),
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    console.log('  All required files generated successfully');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new TestDataSetup();
  setup.setup().catch(console.error);
}

module.exports = TestDataSetup;