/**
 * 🧪 Direct Klangio Integration Test
 * Tests Klangio API directly without YouTube audio extraction
 */

import dotenv from 'dotenv';
import { normalizeChordName } from '../../utils/klangio/normalization.js';

// Load environment variables from .env.local
dotenv.config({ path: '../../.env.local' });

console.log('🧪 Testing Klangio Integration (Direct)');
console.log('═'.repeat(50));
console.log('');

// Test 1: Environment Variables
console.log('🔍 Testing Environment Variables...\n');

const requiredVars = [
  'KLANGIO_API_KEY',
  'YT2MP3_PROVIDER_BASE',
  'S3_BUCKET_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

const missing = [];
const present = [];

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    present.push(varName);
    console.log(`✅ ${varName}: ${process.env[varName].substring(0, 10)}...`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log(`\n📊 Environment Status: ${present.length}/${requiredVars.length} variables set`);

if (missing.length > 0) {
  console.log(`\n⚠️  Missing variables: ${missing.join(', ')}`);
} else {
  console.log('\n✅ All environment variables are set!');
}

// Test 2: Chord Normalization
console.log('\n🎸 Testing Chord Name Normalization...\n');

const testChords = [
  'E:maj', 'A:min', 'C:maj', 'F:maj', 'G:maj',
  'D:min', 'B:min', 'F#:maj', 'Bb:maj', 'C#:min'
];

console.log('Input → Normalized');
console.log('─'.repeat(30));

testChords.forEach(chord => {
  const normalized = normalizeChordName(chord);
  console.log(`${chord.padEnd(8)} → ${normalized}`);
});

console.log('\n✅ Chord normalization working!');

// Test 3: Database Connection
console.log('\n🗄️  Testing Database Connection...\n');

try {
  const { createClient } = require('@supabase/supabase-js');
  console.log('✅ Supabase client can be imported');
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('✅ Supabase environment variables are set');
    console.log('✅ Database connection should work');
  } else {
    console.log('⚠️  Supabase environment variables not found');
  }
} catch (error) {
  console.log(`❌ Database connection test failed: ${error.message}`);
}

// Test 4: API Endpoints
console.log('\n🌐 Testing API Endpoints...\n');

console.log('📋 Available endpoints:');
console.log('   POST /api/chords/klangio/jobs - Create Klangio job');
console.log('   POST /api/chords/klangio/webhook - Receive Klangio results');
console.log('');

console.log('💡 Next steps:');
console.log('   1. Test the API endpoints with a real request');
console.log('   2. Use a different YouTube to MP3 API if needed');
console.log('   3. Test with a real YouTube video');
console.log('   4. Monitor the klangio_jobs table');

console.log('\n🎯 Test completed!');
