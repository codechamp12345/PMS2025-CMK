import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lylifxrrvrhzwmiirxnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGlmeHJydnJoendtaWlyeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk1MTIsImV4cCI6MjA3NDk2NTUxMn0.4HODDcN912VwSzk122g8-6Gixj-mgGMdiv0mcybDFcA';

try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully');

  // Test basic connection
  supabase.from('users').select('count').single().then(result => {
    console.log('✅ Database connection successful');
  }).catch(error => {
    console.log('❌ Database connection failed:', error.message);
  });
} catch (error) {
  console.log('❌ Supabase client creation failed:', error.message);
}
