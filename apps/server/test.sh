#!/bin/bash

# Test registration endpoint
echo "Testing registration..."
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "buyer",
    "company": "Test Company"
  }'

# Test login endpoint
echo -e "\n\nTesting login..."
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "buyer"
  }'

# Test refresh token endpoint
echo -e "\n\nTesting token refresh..."
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "mock-refresh-token"
  }'

# Test logout endpoint
echo -e "\n\nTesting logout..."
curl -X POST http://localhost:8080/api/auth/logout

# Test me endpoint (requires auth token)
echo -e "\n\nTesting me endpoint..."
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer mock-access-token"

# Test password update endpoint (requires auth token)
echo -e "\n\nTesting password update..."
curl -X PUT http://localhost:8080/api/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-access-token" \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword123"
  }'