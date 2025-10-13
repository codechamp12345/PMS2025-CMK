// Script to create test users for development
// Run this in the browser console or as a Node.js script

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lylifxrrvrhzwmiirxnm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGlmeHJydnJoenhtaWlyeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyNzQwNzcsImV4cCI6MjA1MDg1MDA3N30.8qWJjQwQzQwQzQwQzQwQzQwQzQwQzQwQzQwQzQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestUsers() {
  console.log('Creating test users...')
  
  const testUsers = [
    {
      email: 'mentee@git-india.edu.in',
      password: 'password123',
      name: 'Test Mentee',
      role: 'mentee'
    },
    {
      email: 'mentor@git-india.edu.in',
      password: 'password123',
      name: 'Test Mentor',
      role: 'mentor'
    },
    {
      email: 'hod@git-india.edu.in',
      password: 'password123',
      name: 'Test HOD',
      role: 'hod'
    },
    {
      email: 'coordinator@git-india.edu.in',
      password: 'password123',
      name: 'Test Coordinator',
      role: 'project_coordinator'
    }
  ]

  for (const userData of testUsers) {
    try {
      console.log(`Creating user: ${userData.email}`)
      
      // Try to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`User ${userData.email} already exists`)
        } else {
          console.error(`Error creating ${userData.email}:`, error.message)
        }
      } else {
        console.log(`Successfully created user: ${userData.email}`)
      }
    } catch (err) {
      console.error(`Unexpected error creating ${userData.email}:`, err)
    }
  }
}

// Also create some test users with non-institutional emails for development
async function createDevelopmentTestUsers() {
  console.log('Creating development test users...')
  
  const devUsers = [
    {
      email: 'test@gmail.com',
      password: 'password123',
      name: 'Test User',
      role: 'mentee'
    },
    {
      email: 'admin@gmail.com',
      password: 'password123',
      name: 'Admin User',
      role: 'hod'
    }
  ]

  for (const userData of devUsers) {
    try {
      console.log(`Creating dev user: ${userData.email}`)
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`Dev user ${userData.email} already exists`)
        } else {
          console.error(`Error creating dev user ${userData.email}:`, error.message)
        }
      } else {
        console.log(`Successfully created dev user: ${userData.email}`)
      }
    } catch (err) {
      console.error(`Unexpected error creating dev user ${userData.email}:`, err)
    }
  }
}

// Test authentication
async function testAuthentication() {
  console.log('Testing authentication...')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'mentee@git-india.edu.in',
      password: 'password123'
    })

    if (error) {
      console.error('Authentication test failed:', error.message)
    } else {
      console.log('Authentication test successful:', data.user.email)
      console.log('User profile:', data.user.user_metadata)
    }
  } catch (err) {
    console.error('Authentication test error:', err)
  }
}

// Run all functions
async function runAll() {
  await createTestUsers()
  await createDevelopmentTestUsers()
  await testAuthentication()
}

runAll()
