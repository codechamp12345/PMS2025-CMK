// Test authentication workflow in frontend context
import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './src/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Simple test component
function TestAuth() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div>Test Authentication</div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Test if AuthProvider renders without errors
function testAuthProvider() {
  console.log('🧪 Testing AuthProvider...');

  try {
    render(<TestAuth />);
    console.log('✅ AuthProvider renders successfully');
    return true;
  } catch (error) {
    console.error('❌ AuthProvider failed:', error.message);
    return false;
  }
}

// Test environment variables
function testEnvironment() {
  console.log('🧪 Testing environment variables...');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is not set');
    return false;
  }

  if (!supabaseKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
    return false;
  }

  console.log('✅ Environment variables are set');
  console.log(`   URL: ${supabaseUrl}`);
  return true;
}

// Run all tests
async function runTests() {
  console.log('🚀 Running authentication workflow tests...\n');

  const results = [];

  // Test 1: Environment variables
  results.push({ name: 'Environment Variables', result: testEnvironment() });

  // Test 2: AuthProvider rendering
  results.push({ name: 'AuthProvider Rendering', result: testAuthProvider() });

  // Test 3: Supabase client creation
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client created successfully');
    results.push({ name: 'Supabase Client', result: true });
  } catch (error) {
    console.error('❌ Supabase client creation failed:', error.message);
    results.push({ name: 'Supabase Client', result: false });
  }

  // Summary
  console.log('\n📋 Test Results Summary:');
  results.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
  });

  const passed = results.filter(r => r.result).length;
  const total = results.length;
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All authentication tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
}

runTests();
