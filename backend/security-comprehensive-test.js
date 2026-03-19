/**
 * Comprehensive Security & Functionality Test Suite
 * Tests all critical endpoints and security vulnerabilities
 */

const TEST_RESULTS = [];

function test(name, result, details = '') {
  const status = result ? '✓' : '✗';
  TEST_RESULTS.push({ name, result, details });
  console.log(`${status} ${name}${details ? ': ' + details : ''}`);
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE SECURITY & FUNCTIONALITY TEST SUITE            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const baseUrl = 'http://localhost:5000/api/auth';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: Input Validation - Email Format
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[1] INPUT VALIDATION TESTS');
  try {
    const invalidEmailTests = [
      { email: 'notanemail', desc: 'No @ symbol' },
      { email: 'test@', desc: 'No domain' },
      { email: '@example.com', desc: 'No local part' },
      { email: 'test @example.com', desc: 'Space in email' }
    ];

    for (const { email, desc } of invalidEmailTests) {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          email,
          password: 'TestPass123',
          passwordConfirm: 'TestPass123'
        })
      });
      const data = await res.json();
      test(`Email validation: ${desc}`, data.error && data.error.includes('email'), '');
    }
  } catch (err) {
    test('Email validation tests', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: Password Validation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[2] PASSWORD VALIDATION TESTS');
  const passwordTests = [
    { password: 'short', desc: 'Too short (< 12 chars)' },
    { password: 'alllowercase123', desc: 'No uppercase letters' },
    { password: 'ALLUPPERCASE123', desc: 'No lowercase letters' },
    { password: 'NoNumbers!', desc: 'No numbers' }
  ];

  for (const { password, desc } of passwordTests) {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password,
        passwordConfirm: password
      })
    });
    const data = await res.json();
    test(`Password validation: ${desc}`, data.error !== undefined, '');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: Successful Registration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[3] REGISTRATION FLOW');
  const testUser = {
    username: `testuser_${Date.now()}`,
    displayName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123',
    passwordConfirm: 'SecurePass123'
  };

  let registrationRes;
  try {
    registrationRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const data = await registrationRes.json();
    test('Successful registration', data.success === true, data.success ? 'User registered' : data.error);
    
    // Store userId for later tests
    testUser.userId = data.userId;
  } catch (err) {
    test('Successful registration', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: Duplicate Prevention
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[4] DUPLICATE PREVENTION');
  try {
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const dupData = await dupRes.json();
    test('Duplicate email blocked', dupData.error && dupData.error.includes('already'), 
      dupData.error || 'Duplicate not prevented!');
  } catch (err) {
    test('Duplicate email blocked', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: Rate Limiting
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[5] RATE LIMITING');
  try {
    let rateLimitHit = false;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `spam_${i}`,
          displayName: 'Spam',
          email: `spam${i}_${Date.now()}@example.com`,
          password: 'TestPass123',
          passwordConfirm: 'TestPass123'
        })
      });
      if (res.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    test('Rate limiting on registration (after 5 attempts)', rateLimitHit, 
      rateLimitHit ? 'Rate limited correctly' : 'Rate limit not enforced');
  } catch (err) {
    test('Rate limiting on registration', false, err.message);
  }

  // Wait to reset rate limit
  await delay(1000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: Email Verification
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[6] EMAIL VERIFICATION');
  try {
    // Test with invalid code format
    const invalidCodeRes = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        code: 'invalid'
      })
    });
    const invalidCodeData = await invalidCodeRes.json();
    test('Invalid verification code rejected', 
      invalidCodeData.error && (invalidCodeData.error.includes('Invalid') || invalidCodeData.error.includes('expired')), 
      invalidCodeData.error || 'Code accepted!');
  } catch (err) {
    test('Invalid verification code rejected', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 7: Login Before Verification
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[7] LOGIN SECURITY');
  try {
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const loginData = await loginRes.json();
    test('Login blocked before email verification', 
      loginData.error && (loginData.error.includes('verify') || loginRes.status === 403),
      loginData.error || 'Login allowed before verification!');
  } catch (err) {
    test('Login blocked before email verification', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 8: Login with Wrong Password
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[8] PASSWORD VALIDATION');
    try {
    const wrongPassRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword123'
      })
    });
    const wrongPassData = await wrongPassRes.json();
    // Should fail with 401 and generic error (not "user not found")
    test('Wrong password rejected with generic error', 
      wrongPassRes.status === 401 && wrongPassData.error && wrongPassData.error.includes('Invalid'),
      `Status: ${wrongPassRes.status}, Error: ${wrongPassData.error}`);
  } catch (err) {
    test('Wrong password rejected', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 9: Security Headers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[9] SECURITY HEADERS');
  try {
    const headerRes = await fetch(`${baseUrl}/login`, {
      method: 'OPTIONS'
    });
    const headers = {
      'X-Content-Type-Options': headerRes.headers.get('X-Content-Type-Options'),
      'X-Frame-Options': headerRes.headers.get('X-Frame-Options'),
      'X-XSS-Protection': headerRes.headers.get('X-XSS-Protection'),
      'Strict-Transport-Security': headerRes.headers.get('Strict-Transport-Security'),
      'Content-Security-Policy': headerRes.headers.get('Content-Security-Policy')
    };
    
    test('X-Content-Type-Options set', headers['X-Content-Type-Options'] === 'nosniff', 
      headers['X-Content-Type-Options'] || 'MISSING');
    test('X-Frame-Options set', headers['X-Frame-Options'] === 'DENY', 
      headers['X-Frame-Options'] || 'MISSING');
    test('X-XSS-Protection set', !!headers['X-XSS-Protection'], 
      headers['X-XSS-Protection'] || 'MISSING');
    test('HSTS header set', !!headers['Strict-Transport-Security'], 
      headers['Strict-Transport-Security'] ? 'Present' : 'MISSING');
    test('CSP header set', !!headers['Content-Security-Policy'], 
      headers['Content-Security-Policy'] ? 'Present' : 'MISSING');
  } catch (err) {
    test('Security headers test', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 10: Error Message Sanitization
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n[10] ERROR MESSAGE SANITIZATION');
  try {
    const nonexistentRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'any'
      })
    });
    const nonexistentData = await nonexistentRes.json();
    const hasDbError = nonexistentData.error && 
      (nonexistentData.error.toLowerCase().includes('database') || 
       nonexistentData.error.toLowerCase().includes('mongodb') ||
       nonexistentData.error.toLowerCase().includes('connection'));
    test('No database errors in responses', !hasDbError, 
      hasDbError ? `⚠ Found: ${nonexistentData.error}` : 'Generic error used');
  } catch (err) {
    test('Error message sanitization', false, err.message);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const passed = TEST_RESULTS.filter(r => r.result).length;
  const total = TEST_RESULTS.length;
  const percentage = Math.round((passed / total) * 100);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║                         TEST SUMMARY                           ║`);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Passed: ${passed}/${total} (${percentage}%)                                             ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (passed < total) {
    console.log('⚠ FAILED TESTS:');
    TEST_RESULTS.filter(r => !r.result).forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.details}`);
    });
    console.log('');
  }

  process.exit(passed === total ? 0 : 1);
}

// Start tests after a delay to ensure server is ready
setTimeout(runTests, 2000);
