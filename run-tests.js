#!/usr/bin/env node
// run-tests.js - Simple test runner with helpful output

const { spawn } = require('child_process')
const path = require('path')

console.log('🎬 GuitarTube Automated Testing Suite')
console.log('=====================================')

// Check if Playwright is installed
try {
  require('@playwright/test')
  console.log('✅ Playwright is installed')
} catch (error) {
  console.log('❌ Playwright not found. Installing...')
  console.log('Run: npm install -D @playwright/test && npx playwright install')
  process.exit(1)
}

// Check for environment variables
if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.log('⚠️  Warning: Test user credentials not found in environment')
  console.log('Create .env.local with:')
  console.log('TEST_USER_EMAIL=your-test-user@example.com')
  console.log('TEST_USER_PASSWORD=your-test-password')
  console.log('')
}

// Get command line arguments
const args = process.argv.slice(2)
const isHeaded = args.includes('--headed')
const isDebug = args.includes('--debug')
const isUI = args.includes('--ui')

let command = ['npx', 'playwright', 'test']

if (isHeaded) {
  command.push('--headed')
  console.log('🖥️  Running tests in headed mode (you\'ll see the browser)')
} else if (isDebug) {
  command.push('--debug')
  console.log('🐛 Running tests in debug mode')
} else if (isUI) {
  command.push('--ui')
  console.log('🎨 Opening Playwright UI mode')
} else {
  console.log('🤖 Running tests in headless mode')
}

console.log('🚀 Starting tests...')
console.log('')

// Run the tests
const testProcess = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  shell: true
})

testProcess.on('close', (code) => {
  console.log('')
  if (code === 0) {
    console.log('🎉 All tests passed!')
    console.log('📊 View detailed report: npm run test:report')
  } else {
    console.log('❌ Some tests failed')
    console.log('📊 View detailed report: npm run test:report')
    console.log('🐛 Debug failed tests: npm run test:debug')
  }
  
  process.exit(code)
})

testProcess.on('error', (error) => {
  console.error('❌ Failed to run tests:', error)
  process.exit(1)
})
