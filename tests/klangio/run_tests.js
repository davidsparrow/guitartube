/**
 * 🧪 Klangio Test Runner
 * Runs all Klangio integration tests in sequence
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const tests = [
  {
    name: 'YouTube Audio Extraction',
    file: 'test_youtube_audio.js',
    description: 'Tests yt-dlp audio extraction from YouTube'
  },
  {
    name: 'Direct Klangio API',
    file: 'test_klangio_direct.js',
    description: 'Tests Klangio API without audio extraction'
  },
  {
    name: 'Klangio with Audio',
    file: 'test_klangio_with_audio.js',
    description: 'Tests Klangio API with direct audio URL'
  },
  {
    name: 'Complete Integration',
    file: 'test_klangio_integration.js',
    description: 'Tests complete end-to-end integration'
  }
];

async function runTest(test) {
  console.log(`\n🧪 Running: ${test.name}`);
  console.log(`📝 Description: ${test.description}`);
  console.log('─'.repeat(60));
  
  try {
    const { stdout, stderr } = await execAsync(`node ${test.file}`);
    
    console.log('✅ SUCCESS');
    if (stdout) {
      console.log('📄 Output:', stdout.trim());
    }
    if (stderr) {
      console.log('⚠️  Warnings:', stderr.trim());
    }
    
    return { success: true, test: test.name };
  } catch (error) {
    console.log('❌ FAILED');
    console.log('💥 Error:', error.message);
    if (error.stdout) {
      console.log('📄 Output:', error.stdout.trim());
    }
    if (error.stderr) {
      console.log('🔍 Details:', error.stderr.trim());
    }
    
    return { success: false, test: test.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 KLANGIO INTEGRATION TEST RUNNER');
  console.log('═'.repeat(60));
  console.log(`📅 Started: ${new Date().toLocaleString()}`);
  console.log(`📁 Directory: ${process.cwd()}`);
  console.log('');
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('═'.repeat(30));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
  });
  
  console.log(`\n🎯 Results: ${passed}/${results.length} tests passed`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the output above for details.`);
  } else {
    console.log('\n🎉 All tests passed! Klangio integration is working perfectly.');
  }
  
  console.log(`\n📅 Completed: ${new Date().toLocaleString()}`);
}

// Run the tests
runAllTests().catch(console.error);
