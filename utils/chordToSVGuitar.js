/**
 * 🎸 CHORD TO SVGUITAR CONVERSION UTILITY
 * Converts GuitarTube chord data format to SVGuitar format
 * Handles complex barre detection including partial and double barres
 */

/**
 * 🎯 ADVANCED BARRE DETECTION
 * Detects single, partial, and double barre chords
 * @param {Array} frets - Fret positions ["X", "3", "3", "5", "3", "X"]
 * @param {Array} fingering - Finger numbers ["X", "1", "1", "2", "1", "X"]
 * @returns {Array} Array of barre objects for SVGuitar
 */
function detectBarres(frets, fingering) {
  console.log('🔍 BARRE DETECTION:', { frets, fingering });
  
  const barres = [];
  
  // Group by finger number (excluding X, 0)
  const fingerGroups = {};
  
  for (let i = 0; i < frets.length; i++) {
    const fret = frets[i];
    const finger = fingering[i];
    
    // Skip muted, open, or invalid
    if (fret === 'X' || fret === '0' || finger === 'X' || finger === '0') continue;
    
    // Group strings by finger
    if (!fingerGroups[finger]) {
      fingerGroups[finger] = [];
    }
    
    fingerGroups[finger].push({
      stringIndex: i,
      stringNumber: 6 - i, // Convert to SVGuitar numbering (6=low E, 1=high E)
      fret: parseInt(fret)
    });
  }
  
  console.log('👆 FINGER GROUPS:', fingerGroups);
  
  // Check each finger group for barre potential
  for (const [finger, positions] of Object.entries(fingerGroups)) {
    // Need at least 2 strings for a barre
    if (positions.length < 2) {
      console.log(`⏭️ Finger ${finger}: Only ${positions.length} string(s), not a barre`);
      continue;
    }
    
    // Check if all positions are on same fret
    const fret = positions[0].fret;
    const sameFret = positions.every(pos => pos.fret === fret);
    
    if (!sameFret) {
      console.log(`⏭️ Finger ${finger}: Different frets, not a barre`);
      continue;
    }
    
    // Get string range for barre
    const stringNumbers = positions.map(pos => pos.stringNumber).sort((a, b) => b - a);
    const minString = Math.min(...stringNumbers);
    const maxString = Math.max(...stringNumbers);
    
    console.log(`✅ BARRE DETECTED: Finger ${finger}, Fret ${fret}, Strings ${maxString}-${minString}`);
    
    // Create barre object for SVGuitar
    barres.push({
      fromString: maxString,  // Highest string number (lowest pitch)
      toString: minString,    // Lowest string number (highest pitch)
      fret: fret,
      text: finger,           // Finger number as text
      // Optional styling
      color: '#000',
      textColor: '#FFF',
      className: `barre-finger-${finger}`
    });
  }
  
  console.log('🎯 FINAL BARRES:', barres);
  return barres;
}

/**
 * 🎯 CONVERT INDIVIDUAL FINGER POSITIONS
 * Converts non-barre finger positions to SVGuitar format
 * @param {Array} frets - Fret positions
 * @param {Array} fingering - Finger numbers
 * @param {Array} barres - Detected barres (to exclude from individual fingers)
 * @returns {Array} Array of finger positions for SVGuitar
 */
function convertFingers(frets, fingering, barres) {
  const fingers = [];
  
  // Create set of barre positions to exclude
  const barrePositions = new Set();
  barres.forEach(barre => {
    for (let str = barre.toString; str <= barre.fromString; str++) {
      barrePositions.add(`${str}-${barre.fret}`);
    }
  });
  
  for (let i = 0; i < frets.length; i++) {
    const fret = frets[i];
    const finger = fingering[i];
    const stringNumber = 6 - i; // Convert to SVGuitar numbering
    
    // Handle muted strings
    if (fret === 'X') {
      fingers.push([stringNumber, 'x']);
      continue;
    }
    
    // Handle open strings
    if (fret === '0') {
      fingers.push([stringNumber, 0]); // Use number 0 for open strings
      continue;
    }
    
    // Skip if this position is part of a barre
    const positionKey = `${stringNumber}-${parseInt(fret)}`;
    if (barrePositions.has(positionKey)) {
      console.log(`⏭️ Skipping string ${stringNumber} fret ${fret} - part of barre`);
      continue;
    }
    
    // Add individual finger position
    fingers.push([stringNumber, parseInt(fret), finger]);
  }
  
  return fingers;
}

/**
 * 🎯 CALCULATE CHORD POSITION
 * Determines the starting fret position for the chord diagram
 * @param {Array} frets - Fret positions
 * @returns {number} Starting fret position (1 for open chords)
 */
function calculatePosition(frets) {
  // Filter out muted (X) and open (0) strings, get actual fret numbers
  const activeFrets = frets
    .filter(fret => fret !== 'X' && fret !== '0')
    .map(Number)
    .filter(fret => !isNaN(fret));

  if (activeFrets.length === 0) {
    return 1; // All open/muted - position 1
  }

  const minFret = Math.min(...activeFrets);
  
  // If lowest fret is 1-5, show from position 1 (with nut)
  if (minFret <= 5) {
    return 1;
  }
  
  // For higher positions, start from the lowest fret
  return minFret;
}

/**
 * 🎯 MAIN CONVERSION FUNCTION
 * Converts GuitarTube chord data to SVGuitar format
 * @param {Object} chordData - GuitarTube chord data
 * @returns {Object} SVGuitar chord configuration
 */
export function convertToSVGuitar(chordData) {
  console.log('🔄 CONVERTING TO SVGUITAR:', chordData);
  
  // Validate input data
  if (!chordData || !chordData.frets || !chordData.fingering) {
    throw new Error('Invalid chord data: missing frets or fingering arrays');
  }
  
  if (chordData.frets.length !== 6 || chordData.fingering.length !== 6) {
    throw new Error('Invalid chord data: frets and fingering must have exactly 6 elements');
  }
  
  // Detect barres using advanced algorithm
  const barres = detectBarres(chordData.frets, chordData.fingering);
  
  // Convert individual finger positions (excluding barre positions)
  const fingers = convertFingers(chordData.frets, chordData.fingering, barres);
  
  // Calculate chord position
  const position = calculatePosition(chordData.frets);
  
  // Build SVGuitar configuration
  const svguitarConfig = {
    fingers: fingers,
    barres: barres,
    title: chordData.chord_name || 'Unknown',
    position: position
  };
  
  console.log('✅ SVGUITAR CONVERSION COMPLETE:', svguitarConfig);
  return svguitarConfig;
}

/**
 * 🎯 BATCH CONVERSION UTILITY
 * Converts multiple chord positions to SVGuitar format
 * @param {Array} chordPositions - Array of chord position objects from database
 * @returns {Array} Array of SVGuitar configurations
 */
export function convertBatchToSVGuitar(chordPositions) {
  return chordPositions.map((chordData, index) => {
    try {
      return {
        id: chordData.id,
        chord_name: chordData.chord_name,
        fret_position: chordData.fret_position,
        svguitar_config: convertToSVGuitar(chordData),
        conversion_success: true
      };
    } catch (error) {
      console.error(`❌ Failed to convert chord ${index}:`, error);
      return {
        id: chordData.id,
        chord_name: chordData.chord_name,
        fret_position: chordData.fret_position,
        svguitar_config: null,
        conversion_success: false,
        error: error.message
      };
    }
  });
}

/**
 * 🎯 VALIDATION UTILITY
 * Validates SVGuitar configuration before rendering
 * @param {Object} svguitarConfig - SVGuitar configuration
 * @returns {Object} Validation result
 */
export function validateSVGuitarConfig(svguitarConfig) {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!svguitarConfig.fingers || !Array.isArray(svguitarConfig.fingers)) {
    errors.push('Missing or invalid fingers array');
  }
  
  if (!svguitarConfig.title || typeof svguitarConfig.title !== 'string') {
    warnings.push('Missing or invalid title');
  }
  
  // Validate finger positions
  if (svguitarConfig.fingers) {
    svguitarConfig.fingers.forEach((finger, index) => {
      if (!Array.isArray(finger) || finger.length < 2) {
        errors.push(`Invalid finger position at index ${index}`);
        return;
      }
      
      const [stringNum, fret] = finger;
      
      // Validate string number
      if (typeof stringNum !== 'number' || stringNum < 1 || stringNum > 6) {
        errors.push(`Invalid string number ${stringNum} at finger ${index}`);
      }
      
      // Validate fret
      if (fret !== 'x' && fret !== 'o' && (typeof fret !== 'number' || fret < 0 || fret > 24)) {
        errors.push(`Invalid fret ${fret} at finger ${index}`);
      }
    });
  }
  
  // Validate barres
  if (svguitarConfig.barres) {
    svguitarConfig.barres.forEach((barre, index) => {
      if (!barre.fromString || !barre.toString || !barre.fret) {
        errors.push(`Invalid barre configuration at index ${index}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Export detectBarres function for use in Next.js pages
export { detectBarres };
