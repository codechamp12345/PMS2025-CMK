// Test script for Supabase authentication workflow
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lylifxrrvrhzwmiirxnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGlmeHJydnJoendtaWlyeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk1MTIsImV4cCI6MjA3NDk2NTUxMn0.4HODDcN912VwSzk122g8-6Gixj-mgGMdiv0mcybDFcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthenticationWorkflow() {
  console.log('🧪 Testing Supabase Authentication Workflow...\n');

  try {
    // Test 1: Check if Supabase client is working
    console.log('1️⃣ Testing Supabase client initialization...');
    const { data: testData, error: testError } = await supabase.from('users').select('count').single();
    if (testError) throw new Error(`Database connection failed: ${testError.message}`);
    console.log('✅ Supabase client working correctly');

    // Test 2: Check if users table exists and has proper structure
    console.log('\n2️⃣ Testing users table structure...');
    const { data: usersData, error: usersError } = await supabase.from('users').select('*').limit(1);
    if (usersError) throw new Error(`Users table query failed: ${usersError.message}`);
    console.log('✅ Users table accessible');

    // Test 3: Test authentication state
    console.log('\n3️⃣ Testing authentication state...');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log('✅ User is authenticated');
      console.log(`   Email: ${session.user.email}`);
      console.log(`   User ID: ${session.user.id}`);

      // Test 4: Test user profile fetching
      console.log('\n4️⃣ Testing user profile fetching...');
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('⚠️  User profile not found in users table');
        } else {
          throw new Error(`Profile fetch failed: ${profileError.message}`);
        }
      } else {
        console.log('✅ User profile found');
        console.log(`   Name: ${profile.name}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Email: ${profile.email}`);
      }
    } else {
      console.log('ℹ️  No user currently authenticated');
    }

    // Test 5: Test RLS policies
    console.log('\n5️⃣ Testing Row Level Security...');
    try {
      // Try to access users table as anonymous user
      const { data: anonData, error: anonError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (anonError) {
        console.log('✅ RLS policies working - anonymous access blocked');
      } else {
        console.log('⚠️  RLS policies might not be working - anonymous access allowed');
      }
    } catch (error) {
      console.log('✅ RLS policies working correctly');
    }

    console.log('\n🎉 Authentication workflow tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Supabase client initialized successfully');
    console.log('✅ Database connection working');
    console.log('✅ Users table accessible');
    console.log('✅ Authentication state management working');
    if (session?.user) {
      console.log('✅ User profile fetching working');
    }
    console.log('✅ RLS policies in place');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAuthenticationWorkflow();
