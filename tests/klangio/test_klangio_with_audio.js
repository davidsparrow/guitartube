/**
 * 🧪 Klangio Integration Test with Direct Audio URL
 * Tests Klangio API with a direct audio URL (bypassing YouTube extraction)
 */

import dotenv from 'dotenv';
import { createKlangioJob } from '../../utils/klangio/client.js';

// Load environment variables from .env.local
dotenv.config({ path: '../../.env.local' });

console.log('🧪 Testing Klangio Integration with Direct Audio URL');
console.log('═'.repeat(60));
console.log('');

// Test with a direct audio URL (you can replace this with any MP3 URL)
const testAudioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'; // Short audio file for testing

console.log('🎵 Test Audio URL:', testAudioUrl);
console.log('🔧 Klangio API Key:', process.env.KLANGIO_API_KEY ? 'Set' : 'Not Set');
console.log('');

try {
  console.log('🔄 Creating Klangio job...');
  
  const jobResponse = await createKlangioJob({
    favoriteId: 'test-favorite-123',
    videoId: 'test-video-456',
    youtubeUrl: 'https://www.youtube.com/watch?v=test',
    videoTitle: 'Test Video',
    videoChannel: 'Test Channel',
    vocabulary: 'major-minor',
    internalRequestId: 'test-' + Date.now(),
    audioUrl: testAudioUrl // Use direct audio URL
  });
  
  console.log('✅ SUCCESS! Klangio job created');
  console.log('📄 Job Response:', JSON.stringify(jobResponse, null, 2));
  
} catch (error) {
  console.log('❌ FAILED:', error.message);
  console.log('');
  console.log('💡 This might be due to:');
  console.log('   - Invalid Klangio API key');
  console.log('   - Audio URL not accessible');
  console.log('   - Klangio service unavailable');
  console.log('   - Network connectivity issues');
}

console.log('\n🎯 Test completed!');
