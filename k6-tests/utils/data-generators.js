// k6-tests/utils/data-generators.js
// Test data generators for k6 load testing

/**
 * Generate realistic test user data
 */
export function generateTestUser(index = 0) {
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily',
    'James', 'Maria', 'William', 'Jessica', 'Richard', 'Jennifer', 'Charles',
    'Patricia', 'Daniel', 'Linda', 'Matthew', 'Elizabeth', 'Anthony', 'Susan',
    'Mark', 'Dorothy', 'Donald', 'Barbara', 'Steven', 'Margaret', 'Paul', 'Ruth'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez'
  ];

  const companies = [
    'TechCorp', 'Global Industries', 'Innovate Ltd', 'Prime Solutions',
    'Elite Enterprises', 'Smart Systems', 'NextGen Technologies', 'Dynamic Corp',
    'Future Works', 'Advanced Solutions', 'Pioneer Group', 'Summit Industries',
    'Vertex Systems', 'Horizon Technologies', 'Apex Solutions'
  ];

  const domains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com',
    'enterprise.org', 'business.net', 'corp.com', 'industries.org', 'tech.com'
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const company = companies[index % companies.length];
  const domain = domains[index % domains.length];

  return {
    id: `user_${index + 1}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${domain}`,
    password: `password${index}123`,
    first_name: firstName,
    last_name: lastName,
    company_name: company,
    phone: generatePhoneNumber(),
  };
}

/**
 * Generate realistic product data
 */
export function generateTestProduct(index = 0) {
  const products = [
    { name: 'Organic Tomatoes', category: 'Vegetables', basePrice: 2.50 },
    { name: 'Free Range Eggs', category: 'Dairy', basePrice: 6.00 },
    { name: 'Whole Milk', category: 'Dairy', basePrice: 3.50 },
    { name: 'Brown Rice', category: 'Grains', basePrice: 4.00 },
    { name: 'Organic Apples', category: 'Fruits', basePrice: 1.80 },
    { name: 'Chicken Breast', category: 'Meat', basePrice: 8.50 },
    { name: 'Whole Wheat Bread', category: 'Bakery', basePrice: 3.20 },
    { name: 'Fresh Salmon', category: 'Seafood', basePrice: 12.00 },
    { name: 'Organic Spinach', category: 'Vegetables', basePrice: 2.20 },
    { name: 'Greek Yogurt', category: 'Dairy', basePrice: 4.50 },
    { name: 'Quinoa', category: 'Grains', basePrice: 5.50 },
    { name: 'Avocados', category: 'Fruits', basePrice: 2.00 },
    { name: 'Ground Beef', category: 'Meat', basePrice: 7.00 },
    { name: 'Sweet Potatoes', category: 'Vegetables', basePrice: 1.50 },
    { name: 'Cheddar Cheese', category: 'Dairy', basePrice: 5.00 }
  ];

  const units = ['kg', 'lbs', 'pieces', 'liters', 'boxes', 'bags', 'bottles'];
  const brands = [
    'Organic Farms', 'Nature\'s Best', 'Fresh Harvest', 'Premium Select',
    'Golden Valley', 'Green Acres', 'Pure Nature', 'Farm Fresh', 'Quality Choice',
    'Natural Foods', 'Healthy Harvest', 'Prime Quality', 'Superior Foods'
  ];

  const product = products[index % products.length];
  const sku = `SKU${String(index + 1).padStart(6, '0')}`;

  return {
    sku,
    name: `${product.name} ${index + 1}`,
    description: `High-quality ${product.name.toLowerCase()} sourced from trusted suppliers. ${generateRandomDescription()}`,
    selling_price: parseFloat((product.basePrice + (Math.random() * 2 - 1)).toFixed(2)),
    cost_price: parseFloat((product.basePrice * 0.7 + (Math.random() * 1)).toFixed(2)),
    unit_id: `unit_${(index % units.length) + 1}`,
    brand: brands[index % brands.length],
    category: product.category,
    tax_rate: parseFloat((Math.random() * 0.1).toFixed(3)),
    min_stock_level: Math.floor(Math.random() * 50) + 10,
    max_stock_level: Math.floor(Math.random() * 200) + 100,
    reorder_point: Math.floor(Math.random() * 30) + 5,
  };
}

/**
 * Generate customer data
 */
export function generateTestCustomer(index = 0) {
  const customerTypes = ['retail', 'wholesale', 'distributor', 'restaurant', 'hotel'];
  const customer = generateTestUser(index);

  return {
    id: `customer_${index + 1}`,
    name: `${customer.first_name} ${customer.last_name}`,
    email: customer.email,
    phone: customer.phone,
    address: generateAddress(),
    customer_type: customerTypes[index % customerTypes.length],
    credit_limit: Math.floor(Math.random() * 10000) + 1000,
    payment_terms: generatePaymentTerms(),
  };
}

/**
 * Generate supplier data
 */
export function generateTestSupplier(index = 0) {
  const supplierTypes = ['manufacturer', 'distributor', 'wholesaler', 'importer', 'local_farm'];
  const supplier = generateTestUser(index);

  return {
    id: `supplier_${index + 1}`,
    name: supplier.company_name,
    email: supplier.email,
    phone: supplier.phone,
    address: generateAddress(),
    supplier_type: supplierTypes[index % supplierTypes.length],
    payment_terms: generatePaymentTerms(),
    credit_limit: Math.floor(Math.random() * 50000) + 5000,
  };
}

/**
 * Generate purchase order data
 */
export function generateTestPurchaseOrder(index = 0, supplierId = null, productIds = []) {
  const statuses = ['draft', 'pending', 'approved', 'ordered', 'received', 'completed', 'cancelled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  return {
    id: `po_${index + 1}`,
    supplier_id: supplierId || `supplier_${(index % 100) + 1}`,
    order_date: new Date().toISOString(),
    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
    notes: `Purchase order ${index + 1} for bulk supplies`,
    items: generatePurchaseOrderItems(productIds, Math.floor(Math.random() * 10) + 1),
  };
}

/**
 * Generate sales order data
 */
export function generateTestSalesOrder(index = 0, customerId = null, productIds = []) {
  const statuses = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
  const paymentMethods = ['cash', 'credit_card', 'bank_transfer', 'check', 'credit'];

  return {
    id: `so_${index + 1}`,
    customer_id: customerId || `customer_${(index % 100) + 1}`,
    order_date: new Date().toISOString(),
    status: statuses[index % statuses.length],
    payment_method: paymentMethods[index % paymentMethods.length],
    notes: `Sales order ${index + 1} for customer delivery`,
    items: generateSalesOrderItems(productIds, Math.floor(Math.random() * 5) + 1),
  };
}

/**
 * Generate batch data for products
 */
export function generateTestBatch(index = 0, productId = null) {
  const batchNumbers = ['BTCH', 'BATCH', 'LOT', 'PROD'];
  const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return {
    id: `batch_${index + 1}`,
    product_id: productId || `product_${(index % 500) + 1}`,
    batch_number: `${batchNumbers[index % batchNumbers.length]}${prefixes[index % prefixes.length]}${String(index + 1).padStart(6, '0')}`,
    expiry_date: new Date(Date.now() + (Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString(),
    cost: parseFloat((Math.random() * 50 + 10).toFixed(2)),
    quantity: Math.floor(Math.random() * 1000) + 100,
    manufactured_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate file data for upload testing
 */
export function generateTestFile(sizeInKB = 100) {
  const fileTypes = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
  };

  const extensions = Object.keys(fileTypes);
  const extension = extensions[Math.floor(Math.random() * extensions.length)];

  return {
    name: `test_file_${Date.now()}${extension}`,
    content: generateRandomContent(sizeInKB),
    type: fileTypes[extension],
    size: sizeInKB * 1024,
  };
}

/**
 * Helper functions
 */
function generatePhoneNumber() {
  return `+1${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function generateAddress() {
  const streets = ['Main St', 'Oak Ave', 'Elm St', 'Maple Dr', 'Pine St', 'Cedar Ln', 'Birch Ave'];
  const cities = ['Springfield', 'Riverside', 'Oakwood', 'Greenville', 'Fairview', 'Lakeside', 'Mountain View'];
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  const zipCodes = ['12345', '67890', '11111', '22222', '33333', '44444', '55555'];

  return {
    street: `${Math.floor(Math.random() * 999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    state: states[Math.floor(Math.random() * states.length)],
    zip_code: zipCodes[Math.floor(Math.random() * zipCodes.length)],
    country: 'USA',
  };
}

function generatePaymentTerms() {
  const terms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', '2/10 Net 30', 'COD'];
  return terms[Math.floor(Math.random() * terms.length)];
}

function generateRandomDescription() {
  const descriptions = [
    'Premium quality product with excellent freshness.',
    'Carefully selected and processed for maximum quality.',
    'Sourced from trusted suppliers with rigorous quality control.',
    'Fresh and natural ingredients for the best taste experience.',
    'Sustainable farming practices ensure superior product quality.',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function generatePurchaseOrderItems(productIds, count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      product_id: productIds[i % productIds.length] || `product_${(i % 500) + 1}`,
      quantity: Math.floor(Math.random() * 100) + 10,
      unit_price: parseFloat((Math.random() * 20 + 5).toFixed(2)),
    });
  }
  return items;
}

function generateSalesOrderItems(productIds, count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      product_id: productIds[i % productIds.length] || `product_${(i % 500) + 1}`,
      quantity: Math.floor(Math.random() * 50) + 1,
      unit_price: parseFloat((Math.random() * 15 + 8).toFixed(2)),
    });
  }
  return items;
}

function generateRandomContent(sizeInKB) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const contentSize = sizeInKB * 1024;
  let content = '';

  for (let i = 0; i < contentSize; i++) {
    content += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return content;
}

/**
 * Generate bulk test data for load testing
 */
export function generateBulkTestData() {
  const data = {
    users: [],
    products: [],
    customers: [],
    suppliers: [],
    purchaseOrders: [],
    salesOrders: [],
    batches: [],
  };

  // Generate users
  for (let i = 0; i < 1000; i++) {
    data.users.push(generateTestUser(i));
  }

  // Generate products
  for (let i = 0; i < 5000; i++) {
    data.products.push(generateTestProduct(i));
  }

  // Generate customers
  for (let i = 0; i < 2000; i++) {
    data.customers.push(generateTestCustomer(i));
  }

  // Generate suppliers
  for (let i = 0; i < 1000; i++) {
    data.suppliers.push(generateTestSupplier(i));
  }

  // Generate purchase orders
  for (let i = 0; i < 3000; i++) {
    data.purchaseOrders.push(generateTestPurchaseOrder(i));
  }

  // Generate sales orders
  for (let i = 0; i < 3000; i++) {
    data.salesOrders.push(generateTestSalesOrder(i));
  }

  // Generate batches
  for (let i = 0; i < 10000; i++) {
    data.batches.push(generateTestBatch(i));
  }

  return data;
}