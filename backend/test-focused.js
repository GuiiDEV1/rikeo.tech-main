/**
 * Focused Security Issues Test
 */

async function test() {
  const base = 'http://localhost:5000/api/auth';
  
  console.log('\n=== TESTING EMAIL VALIDATION WITH SPACES ===');
  const spaceEmailRes = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      displayName: 'Test User',
      email: 'test @example.com',  // Space before @
      password: 'TestPass123',
      passwordConfirm: 'TestPass123'
    })
  });
  const spaceData = await spaceEmailRes.json();
  console.log('Space in email response:', spaceData);
  
  console.log('\n=== TESTING VALID REGISTRATION ===');
  const email = `test_${Date.now()}@test.com`;
  const regRes = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `user_${Date.now()}`,
      displayName: 'Test User',
      email,
      password: 'SecurePass123',
      passwordConfirm: 'SecurePass123'
    })
  });
  const regData = await regRes.json();
  console.log('Registration response:', JSON.stringify(regData, null, 2));
  
  if (regData.success) {
    console.log('\n=== TESTING LOGIN WITHOUT VERIFICATION ===');
    const loginRes = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', loginData);
  }
  
  process.exit(0);
}

setTimeout(test, 1000);
