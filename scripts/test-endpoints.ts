import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'http://localhost:3001/api';

async function generateTestToken(role: 'admin' | 'cadet') {
  // We'll generate a custom JWT using the Supabase JWT secret
  // Alternatively, we can use supabase.auth.admin.generateLink or create user and sign in.
  
  const email = role === 'admin' ? 'test-admin-api@ncc.com' : 'test-cadet-api@ncc.com';
  const password = 'Password@123';
  
  // 1. Create or ensure user exists
  const { data: userList } = await supabase.auth.admin.listUsers();
  let user = userList?.users.find(u => u.email === email);
  
  if (!user) {
    console.log(`Creating test ${role} user...`);
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Test ${role}` }
    });
    if (error) throw error;
    user = newUser.user;
    
    // Create public profile
    await supabase.from('users').insert({
      id: user.id,
      email,
      full_name: `Test ${role.toUpperCase()}`,
      role: role,
      company: 'Testing',
      wing: 'army',
      chest_number: role === 'admin' ? 'ADM001' : 'CDT001',
      is_active: true
    });
    
    // Small delay to allow RLS replication
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // 2. Sign in to get token
  // Since we are using the service_role key to initialize the client, we need a separate ANON client to sign in
  const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) throw signInError;
  return signInData.session!.access_token;
}

async function fetchApi(endpoint: string, token: string, method = 'GET', body?: any) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();
    
    console.log(`[${method}] ${endpoint} => ${res.status}`);
    if (!res.ok) console.error(data);
    return { status: res.status, data };
  } catch (err: any) {
    console.error(`[${method}] ${endpoint} FAILED =>`, err.message);
    return { status: 500, error: err.message };
  }
}

async function runTests() {
  try {
    console.log('--- STARTING API TESTS ---');
    console.log('Checking health...', BASE_URL);
    const health = await fetch(`${BASE_URL}/health`).then(r => r.json());
    console.log('Health:', health.status);

    console.log('\n--- Generating Tokens ---');
    console.log('Setting up Admin...');
    const adminToken = await generateTestToken('admin');
    console.log('Admin token generated.');
    
    console.log('Setting up Cadet...');
    const cadetToken = await generateTestToken('cadet');
    console.log('Cadet token generated.');

    console.log('\n--- Testing Endpoints (Admin) ---');
    // Auth
    await fetchApi('/auth/me', adminToken);
    
    // Users
    await fetchApi('/users', adminToken);
    
    // Events
    await fetchApi('/events', adminToken);
    const newEvent = await fetchApi('/events', adminToken, 'POST', {
      title: 'Automated Test Event',
      description: 'Testing event creation',
      type: 'camp',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      location: 'Test Ground',
      mandatory: false
    });
    
    // Community
    await fetchApi('/community/news', adminToken);
    
    console.log('\n--- Testing Endpoints (Cadet) ---');
    // Auth profile
    await fetchApi('/auth/me', cadetToken);
    
    // Events (read-only)
    await fetchApi('/events', cadetToken);
    
    // Disallowed endpoint (Should 403)
    console.log('Testing RBAC (Cadet accessing Users list -> expecting 403)');
    await fetchApi('/users', cadetToken);

    console.log('\n--- FINISHED ---');
  } catch (err) {
    console.error('Test Suite Failed:', err);
  }
}

runTests();
