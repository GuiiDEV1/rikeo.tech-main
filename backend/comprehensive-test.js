/**
 * Comprehensive API Test Suite
 * Tests all authentication endpoints for functionality and security
 */

const http = require('http');

// Test user data
const testEmail = `test${Date.now()}@example.com`;
const testUsername = `user${Date.now()}`;
const testPassword = 'TestPass123!';

let verificationCode = null;
let authToken = null;
let userId = null;

// HTTP helper
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║      COMPREHENSIVE API SECURITY TEST SUITE          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // TEST 1: Registration
    console.log('TEST 1: Valid User Registration');
    console.log('─────────────────────────────────────────────────────');
    let result = await makeRequest('POST', '/api/auth/register', {
      username: testUsername,
      displayName: 'Test User',
      email: testEmail,
      password: testPassword,
      passwordConfirm: testPassword
    });
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.data.success}`);
    console.log(`Message: ${result.data.message}\n`);
    userId = result.data.userId;

    if (!result.data.success) {
      console.log('✗ FAILED: Registration did not succeed\n');
      return;
    }
    console.log('✓ PASSED: Registration successful\n');

    // TEST 2: Duplicate Prevention
    console.log('TEST 2: Duplicate Email Prevention');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/register', {
      username: 'anotheruser',
      displayName: 'Another User',
      email: testEmail, // Same email as test 1
      password: 'AnotherPass123!',
      passwordConfirm: 'AnotherPass123!'
    });
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${result.data.error || 'N/A'}`);
    if (result.status === 409 || result.data.error.includes('already')) {
      console.log('✓ PASSED: Duplicate prevention works\n');
    } else {
      console.log('✗ FAILED: Duplicate email was allowed\n');
    }

    // TEST 3: Password Requirements
    console.log('TEST 3: Password Strength Requirements');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/register', {
      username: 'weakpass',
      displayName: 'Weak Pass User',
      email: `weak${Date.now()}@example.com`,
      password: 'weak',
      passwordConfirm: 'weak'
    });
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${result.data.error || 'N/A'}`);
    if (result.status === 400 && (result.data.error.includes('12 characters') || result.data.error.includes('complexity'))) {
      console.log('✓ PASSED: Weak password rejected\n');
    } else {
      console.log('✗ FAILED: Weak password was accepted\n');
    }

    // TEST 4: Rate Limiting
    console.log('TEST 4: Rate Limiting on Login');
    console.log('─────────────────────────────────────────────────────');
    let rateLimitHit = false;
    for (let i = 0; i < 7; i++) {
      result = await makeRequest('POST', '/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
      if (result.status === 429) {
        console.log(`Attempt ${i + 1}: ${result.status} - Rate limited ✓`);
        rateLimitHit = true;
        break;
      }
    }
    if (rateLimitHit) {
      console.log('✓ PASSED: Rate limiting is active\n');
    } else {
      console.log('⚠ WARNING: Rate limiting may not be working correctly\n');
    }

    // TEST 5: Login (should fail - email not verified yet)
    console.log('TEST 5: Login Without Email Verification');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${result.data.error || 'N/A'}`);
    if (result.status === 403 && result.data.error.includes('verify')) {
      console.log('✓ PASSED: Login blocked until email is verified\n');
    } else {
      console.log('⚠ WARNING: Email verification might not be required\n');
    }

    // TEST 6: Email Verification
    console.log('TEST 6: Email Verification with Code');
    console.log('─────────────────────────────────────────────────────');
    // In test mode, use a demo code
    const demoCode = 'ABCDEF'; // Should fail
    result = await makeRequest('POST', '/api/auth/verify-email', {
      email: testEmail,
      code: demoCode
    });
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${result.data.error || 'Success'}`);
    console.log('Note: Using demo code - should fail in secure mode\n');

    // TEST 7: Input Validation - XSS attempt
    console.log('TEST 7: Input Validation - XSS Prevention');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/register', {
      username: 'xsstest',
      displayName: '<script>alert("XSS")</script>',
      email: `xss${Date.now()}@example.com`,
      password: 'ValidPass123!',
      passwordConfirm: 'ValidPass123!'
    });
    console.log(`Status: ${result.status}`);
    if (result.status === 400) {
      console.log('✓ PASSED: Malicious input rejected\n');
    } else {
      console.log('⚠ WARNING: Suspicious input was accepted\n');
    }

    // TEST 8: Input Validation - NoSQL Injection attempt
    console.log('TEST 8: Input Validation - NoSQL Injection Prevention');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/register', {
      username: '{"$ne": null}',
      displayName: 'Injection Test',
      email: `inj${Date.now()}@example.com`,
      password: 'ValidPass123!',
      passwordConfirm: 'ValidPass123!'
    });
    console.log(`Status: ${result.status}`);
    if (result.status === 400) {
      console.log('✓ PASSED: NoSQL injection attempt blocked\n');
    } else {
      console.log('⚠ WARNING: Injection payload may have been accepted\n');
    }

    // TEST 9: Error Message Hardening
    console.log('TEST 9: Error Message Hardening (No DB Info Leak)');
    console.log('─────────────────────────────────────────────────────');
    result = await makeRequest('POST', '/api/auth/login', {
      email: 'unknown@example.com',
      password: 'anypassword'
    });
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${result.data.error}`);
    if (result.data.error && !result.data.error.toLowerCase().includes('mongodb') && 
        !result.data.error.toLowerCase().includes('database connection')) {
      console.log('✓ PASSED: No database details leaked\n');
    } else {
      console.log('✗ FAILED: Error message may contain sensitive info\n');
    }

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║           TEST SUITE COMPLETED                     ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('✗ Test Error:', error.message);
  }
}

// Run tests
runTests();
