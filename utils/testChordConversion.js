/**
 * 🧪 COMPREHENSIVE CHORD CONVERSION TESTS
 * Tests the advanced barre detection and SVGuitar conversion
 * Including all edge cases: simple, partial, and double barres
 */

import { convertToSVGuitar, validateSVGuitarConfig } from './chordToSVGuitar.js';

/**
 * 🎯 TEST DATA - REAL CHORD EXAMPLES
 */
const TEST_CHORDS = {
  // Simple open chord - no barres
  'Am_open': {
    chord_name: 'Am',
    frets: ['X', '0', '2', '2', '1', '0'],
    fingering: ['X', 'X', '2', '3', '1', 'X'],
    expected_barres: 0,
    description: 'A minor - simple open chord'
  },

  // Simple barre chord - F major
  'F_barre': {
    chord_name: 'F',
    frets: ['1', '1', '2', '3', '3', '1'],
    fingering: ['1', '1', '2', '4', '3', '1'],
    expected_barres: 1,
    description: 'F major - full barre at 1st fret'
  },

  // Partial barre - your edge case example
  'partial_barre': {
    chord_name: 'Complex',
    frets: ['X', '3', '3', '5', '3', 'X'],
    fingering: ['X', '1', '1', '3', '1', 'X'],
    expected_barres: 1,
    description: 'Partial barre - finger 1 on fret 3, strings A,D,B only'
  },

  // Double barre - ultra edge case
  'double_barre': {
    chord_name: 'Ultra',
    frets: ['X', '3', '3', '5', '5', '3'],
    fingering: ['X', '1', '1', '2', '2', '1'],
    expected_barres: 2,
    description: 'Double barre - finger 1 on fret 3, finger 2 on fret 5'
  },

  // Complex case - barre with individual fingers
  'mixed_barre': {
    chord_name: 'Mixed',
    frets: ['1', '1', '2', '1', '1', '1'],
    fingering: ['1', '1', '2', '1', '1', '1'],
    expected_barres: 1,
    description: 'Mixed - barre at fret 1 with individual finger at fret 2'
  },

  // Edge case - same fret, different fingers (NOT a barre)
  'not_barre': {
    chord_name: 'NotBarre',
    frets: ['X', '3', '3', '3', 'X', 'X'],
    fingering: ['X', '1', '2', '3', 'X', 'X'],
    expected_barres: 0,
    description: 'NOT a barre - same fret but different fingers'
  },

  // Real world example - C major
  'C_major': {
    chord_name: 'C',
    frets: ['X', '3', '2', '0', '1', '0'],
    fingering: ['X', '3', '2', 'X', '1', 'X'],
    expected_barres: 0,
    description: 'C major - no barres, mixed open and fretted'
  }
};

/**
 * 🧪 RUN SINGLE TEST
 */
function runSingleTest(testName, testData) {
  console.log(`\n🧪 TESTING: ${testName}`);
  console.log(`📝 Description: ${testData.description}`);
  console.log(`📊 Input: frets=${JSON.stringify(testData.frets)}, fingering=${JSON.stringify(testData.fingering)}`);
  
  try {
    // Convert to SVGuitar format
    const result = convertToSVGuitar(testData);
    
    // Validate the result
    const validation = validateSVGuitarConfig(result);
    
    // Check barre count
    const actualBarres = result.barres ? result.barres.length : 0;
    const barreMatch = actualBarres === testData.expected_barres;
    
    console.log(`✅ CONVERSION SUCCESS:`);
    console.log(`   - Title: ${result.title}`);
    console.log(`   - Position: ${result.position}`);
    console.log(`   - Fingers: ${result.fingers.length} positions`);
    console.log(`   - Barres: ${actualBarres} detected (expected: ${testData.expected_barres}) ${barreMatch ? '✅' : '❌'}`);
    
    if (result.barres && result.barres.length > 0) {
      result.barres.forEach((barre, i) => {
        console.log(`     Barre ${i + 1}: Finger ${barre.text}, Fret ${barre.fret}, Strings ${barre.fromString}-${barre.toString}`);
      });
    }
    
    console.log(`   - Validation: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (validation.errors.length > 0) {
      console.log(`     Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`     Warnings: ${validation.warnings.join(', ')}`);
    }
    
    return {
      success: true,
      barreMatch,
      validation: validation.isValid,
      result
    };
    
  } catch (error) {
    console.log(`❌ CONVERSION FAILED: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🧪 RUN ALL TESTS
 */
function runAllTests() {
  console.log('🎸 STARTING COMPREHENSIVE CHORD CONVERSION TESTS');
  console.log('=' .repeat(60));
  
  const results = {};
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [testName, testData] of Object.entries(TEST_CHORDS)) {
    totalTests++;
    const result = runSingleTest(testName, testData);
    results[testName] = result;
    
    if (result.success && result.barreMatch && result.validation) {
      passedTests++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 TEST SUMMARY');
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  for (const [testName, result] of Object.entries(results)) {
    const status = result.success && result.barreMatch && result.validation ? '✅' : '❌';
    console.log(`   ${status} ${testName}: ${result.success ? 'Converted' : 'Failed'} ${result.barreMatch ? 'BarreOK' : 'BarreErr'} ${result.validation ? 'ValidOK' : 'ValidErr'}`);
  }
  
  return results;
}

/**
 * 🎯 DEMO SPECIFIC EDGE CASE
 */
function demoEdgeCase() {
  console.log('\n🎯 DEMONSTRATING YOUR SPECIFIC EDGE CASE');
  console.log('=' .repeat(50));
  
  const edgeCase = {
    chord_name: 'Your_Example',
    frets: ['X', '3', '3', '5', '3', 'X'],  // A=3, D=3, G=5, B=3, muted E strings
    fingering: ['X', '1', '1', '3', '1', 'X'], // Finger 1 barres A,D,B at fret 3, finger 3 on G at fret 5
    description: 'Your edge case: barre on 3rd fret (A,D,B strings) + individual finger on G string 5th fret'
  };
  
  console.log('📝 This should detect:');
  console.log('   - 1 barre: Finger 1, Fret 3, Strings 5-2 (A,D,G,B)');
  console.log('   - 1 individual finger: String 4 (G), Fret 5, Finger 3');
  console.log('   - 2 muted strings: 6 (low E) and 1 (high E)');
  
  runSingleTest('edge_case_demo', edgeCase);
}

// Export for use in other files
export { runAllTests, runSingleTest, demoEdgeCase, TEST_CHORDS };

// If running directly (for testing)
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
  demoEdgeCase();
}
