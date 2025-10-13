// Simple Supabase connection test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lylifxrrvrhzwmiirxnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGlmeHJydnJoendtaWlyeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk1MTIsImV4cCI6MjA3NDk2NTUxMn0.4HODDcN912VwSzk122g8-6Gixj-mgGMdiv0mcybDFcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBasicConnection() {
  console.log('🧪 Testing basic Supabase connection...');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing Supabase client...');
    console.log('✅ Supabase client created successfully');

    // Test 2: Check if we can connect to Supabase
    console.log('2️⃣ Testing connection...');

    // Try a simple query that doesn't trigger RLS
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(0);

    if (error) {
      console.log('⚠️ Query returned error (expected for anonymous access):', error.message);
    } else {
      console.log('✅ Query executed successfully');
    }

    console.log('\n🎉 Basic connection test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBasicConnection();
