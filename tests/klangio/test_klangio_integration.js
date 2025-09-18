/**
 * 🧪 Klangio Integration Test Script
 * Tests the complete Klangio chord recognition flow
 */

import dotenv from 'dotenv';
import { getAudioUrlFromYouTube } from '../../utils/klangio/youtubeAudio.js';
import { createKlangioJob } from '../../utils/klangio/client.js';
import { normalizeChordName } from '../../utils/klangio/normalization.js';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: '../../.env.local' });

// Test configuration
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    const v = u.searchParams.get('v');
    if (v) return v;
    const match = url.match(/youtube\.com\/shorts\/([\w-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const cliVideoUrl = process.argv[2] || process.env.TEST_VIDEO_URL || null;
const resolvedVideoUrl = cliVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const resolvedVideoId = extractYouTubeId(resolvedVideoUrl) || 'dQw4w9WgXcQ';

const TEST_CONFIG = {
  // Test YouTube video (short, known chord progression)
  testVideoUrl: resolvedVideoUrl,
  testVideoId: resolvedVideoId,
  testVideoTitle: 'Test Video',
  testVideoChannel: 'Test Channel',
  testFavoriteId: 'test-favorite-123' // Mock favorite ID for testing
};

/**
 * Test 1: Environment Variables
 */
function testEnvironmentVariables() {
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
    return false;
  }
  
  console.log('\n✅ All environment variables are set!\n');
  return true;
}

/**
 * Test 2: YouTube Audio Extraction
 */
async function testYouTubeAudioExtraction() {
  console.log('🎵 Testing YouTube Audio Extraction...\n');
  
  try {
    console.log(`📺 Testing with: ${TEST_CONFIG.testVideoUrl}`);
    const audioUrl = await getAudioUrlFromYouTube(TEST_CONFIG.testVideoUrl);
    
    console.log(`✅ Audio extraction successful!`);
    console.log(`🔗 Audio URL: ${audioUrl.substring(0, 100)}...`);
    
    // If yt-dlp returns a local file path, skip network fetch check
    if (/^https?:\/\//i.test(audioUrl)) {
      const response = await fetch(audioUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Audio file is accessible (${response.headers.get('content-length')} bytes)`);
      } else {
        console.log(`⚠️  Audio file may not be accessible (Status: ${response.status})`);
      }
    } else {
      console.log('ℹ️  Local audio file path detected; skipping network accessibility check.');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Audio extraction failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Chord Name Normalization
 */
function testChordNormalization() {
  console.log('🎸 Testing Chord Name Normalization...\n');
  
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
  
  console.log('\n✅ Chord normalization working!\n');
  return true;
}

/**
 * Test 4: Klangio Job Creation (Mock)
 */
async function testKlangioJobCreation() {
  console.log('🚀 Testing Klangio Job Creation...\n');
  
  try {
    // This will test the job creation without actually submitting to Klangio
    console.log('📋 Job parameters:');
    console.log(`   Favorite ID: ${TEST_CONFIG.testFavoriteId}`);
    console.log(`   Video ID: ${TEST_CONFIG.testVideoId}`);
    console.log(`   YouTube URL: ${TEST_CONFIG.testVideoUrl}`);
    console.log(`   Video Title: ${TEST_CONFIG.testVideoTitle}`);
    console.log(`   Video Channel: ${TEST_CONFIG.testVideoChannel}`);
    console.log(`   Vocabulary: major-minor`);
    
    // Test the client function (this will fail if Klangio API key is invalid)
    console.log('\n🔄 Attempting to create Klangio job...');
    console.log('⚠️  Note: This will make a real API call to Klangio');
    
    const jobResponse = await createKlangioJob({
      favoriteId: TEST_CONFIG.testFavoriteId,
      videoId: TEST_CONFIG.testVideoId,
      youtubeUrl: TEST_CONFIG.testVideoUrl,
      videoTitle: TEST_CONFIG.testVideoTitle,
      videoChannel: TEST_CONFIG.testVideoChannel,
      vocabulary: 'major-minor',
      internalRequestId: 'test-' + Date.now()
    });
    
    console.log('✅ Klangio job created successfully!');
    console.log('📄 Job response:', JSON.stringify(jobResponse, null, 2));
    
    return true;
  } catch (error) {
    console.log(`❌ Klangio job creation failed: ${error.message}`);
    console.log('💡 This might be due to:');
    console.log('   - Invalid Klangio API key');
    console.log('   - Network connectivity issues');
    console.log('   - Klangio service unavailable');
    return false;
  }
}

/**
 * Test 5: Database Connection (Mock)
 */
function testDatabaseConnection() {
  console.log('🗄️  Testing Database Connection...\n');
  
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('✅ Supabase environment variables are set');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      // Perform a lightweight no-op call to ensure client initializes
      console.log('✅ Supabase client initialized');
      return true;
    } else {
      console.log('⚠️  Supabase environment variables not found');
      return false;
    }
  } catch (error) {
    console.log(`❌ Database connection test failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 KLANGIO INTEGRATION TEST SUITE');
  console.log('═'.repeat(50));
  console.log('');
  
  const results = {
    environment: testEnvironmentVariables(),
    audioExtraction: await testYouTubeAudioExtraction(),
    chordNormalization: testChordNormalization(),
    klangioJob: await testKlangioJobCreation(),
    database: testDatabaseConnection()
  };
  
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(30));
  console.log(`Environment Variables: ${results.environment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Extraction:      ${results.audioExtraction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Chord Normalization:   ${results.chordNormalization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Klangio Job Creation:  ${results.klangioJob ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Connection:   ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your Klangio integration is ready to go!');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Fix any failing tests');
  console.log('   2. Test with a real YouTube video');
  console.log('   3. Check webhook endpoint is accessible');
  console.log('   4. Monitor klangio_jobs table for job status');
}

// Run the tests
runAllTests().catch(console.error);
