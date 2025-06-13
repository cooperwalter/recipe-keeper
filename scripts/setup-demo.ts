// Simple script to create demo account and recipes
// Run with: npx tsx scripts/setup-demo.ts

const API_URL = 'http://localhost:3002';

async function createDemoAccount() {
  console.log('Setting up demo account...\n');

  const demoEmail = 'demo@recipekeeper.com';
  const demoPassword = 'DemoRecipes2024!';

  // First, try to sign up the demo user
  console.log('Creating demo user...');
  
  const signupResponse = await fetch(`${API_URL}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword })
  });

  if (!signupResponse.ok) {
    console.log('Demo user might already exist, trying to login...');
  }

  // Login as demo user
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword })
  });

  if (!loginResponse.ok) {
    console.error('Failed to login. Please create the account manually.');
    console.log('\n📧 Demo Email:', demoEmail);
    console.log('🔑 Demo Password:', demoPassword);
    return;
  }

  console.log('\n✅ Demo account ready!');
  console.log('📧 Email:', demoEmail);
  console.log('🔑 Password:', demoPassword);
  console.log('\nYou can now login with these credentials at http://localhost:3002/auth/login');
}

createDemoAccount().catch(console.error);