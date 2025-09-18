/**
 * 🎵 Simple YouTube Audio Extraction Test
 * Tests just the YouTube to MP3 conversion without Klangio
 */

import dotenv from 'dotenv';
import { getAudioUrlFromYouTube } from '../../utils/klangio/youtubeAudio.js';

// Load environment variables from .env.local
dotenv.config({ path: '../../.env.local' });

// Test with a short YouTube video
const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// Test with a different API endpoint that might work better
const alternativeApiUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('🧪 Testing YouTube Audio Extraction');
console.log('═'.repeat(40));
console.log('');

console.log('📺 Test Video:', testVideoUrl);
console.log('🔧 Provider Base:', process.env.YT2MP3_PROVIDER_BASE);
console.log('');

try {
  console.log('🔄 Extracting audio...');
  const audioUrl = await getAudioUrlFromYouTube(testVideoUrl);
  
  console.log('✅ SUCCESS!');
  console.log('🔗 Audio URL:', audioUrl);
  console.log('');
  
  // Test if the URL is accessible
  console.log('🔍 Testing audio file accessibility...');
  const response = await fetch(audioUrl, { method: 'HEAD' });
  
  if (response.ok) {
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    console.log('✅ Audio file is accessible!');
    console.log('📊 File size:', contentLength ? `${Math.round(contentLength / 1024 / 1024 * 100) / 100} MB` : 'Unknown');
    console.log('📄 Content type:', contentType || 'Unknown');
  } else {
    console.log('⚠️  Audio file may not be accessible (Status:', response.status, ')');
  }
  
} catch (error) {
  console.log('❌ FAILED:', error.message);
  console.log('');
  console.log('💡 Troubleshooting:');
  console.log('   1. Check YT2MP3_PROVIDER_BASE is set correctly');
  console.log('   2. Verify the YouTube URL is valid');
  console.log('   3. Check your internet connection');
  console.log('   4. Try a different YouTube video');
}
