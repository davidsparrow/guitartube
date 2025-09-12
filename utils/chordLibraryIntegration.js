/**
 * 🎸 CHORD LIBRARY INTEGRATION UTILITY
 * Integrates SVGuitar conversion with existing GuitarTube chord system
 * Handles database queries, caching, and chord rendering pipeline
 */

import { convertToSVGuitar, convertBatchToSVGuitar, validateSVGuitarConfig } from './chordToSVGuitar.js';
import { supabase } from '../lib/supabase/client.js';

/**
 * 🎯 FETCH CHORD DATA FROM DATABASE
 * Retrieves chord positions from your existing chord_positions table
 * @param {string} chordName - Chord name (e.g., 'Am', 'F', 'C')
 * @param {string} fretPosition - Optional fret position filter
 * @returns {Array} Array of chord position objects
 */
export async function fetchChordData(chordName, fretPosition = null) {
  try {
    console.log(`🔍 Fetching chord data for: ${chordName}${fretPosition ? ` (${fretPosition})` : ''}`);
    
    let query = supabase
      .from('chord_positions')
      .select(`
        id,
        chord_name,
        fret_position,
        chord_position_full_name,
        position_type,
        strings,
        frets,
        fingering,
        fret_finger_data,
        barre,
        barre_fret,
        aws_svg_url_light,
        aws_svg_url_dark,
        metadata
      `)
      .eq('chord_name', chordName);
    
    if (fretPosition) {
      query = query.eq('fret_position', fretPosition);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Database query failed:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} chord positions`);
    return data || [];
    
  } catch (error) {
    console.error(`❌ Failed to fetch chord data for ${chordName}:`, error);
    throw error;
  }
}

/**
 * 🎯 CONVERT CHORD TO SVGUITAR WITH CACHING
 * Converts a single chord position to SVGuitar format with optional caching
 * @param {Object} chordData - Chord position object from database
 * @param {boolean} useCache - Whether to use localStorage caching
 * @returns {Object} SVGuitar configuration with metadata
 */
export async function convertChordWithCaching(chordData, useCache = true) {
  const cacheKey = `svguitar_${chordData.id}`;
  
  // Check cache first
  if (useCache && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        console.log(`💾 Using cached SVGuitar config for ${chordData.chord_name}`);
        return cachedData;
      }
    } catch (error) {
      console.warn('⚠️ Cache read failed:', error);
    }
  }
  
  try {
    // Convert to SVGuitar format
    const svguitarConfig = convertToSVGuitar(chordData);
    
    // Validate the configuration
    const validation = validateSVGuitarConfig(svguitarConfig);
    
    const result = {
      id: chordData.id,
      chord_name: chordData.chord_name,
      fret_position: chordData.fret_position,
      original_data: {
        frets: chordData.frets,
        fingering: chordData.fingering,
        barre: chordData.barre
      },
      svguitar_config: svguitarConfig,
      validation: validation,
      conversion_timestamp: new Date().toISOString(),
      aws_urls: {
        light: chordData.aws_svg_url_light,
        dark: chordData.aws_svg_url_dark
      }
    };
    
    // Cache the result
    if (useCache && typeof localStorage !== 'undefined' && validation.isValid) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        console.log(`💾 Cached SVGuitar config for ${chordData.chord_name}`);
      } catch (error) {
        console.warn('⚠️ Cache write failed:', error);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to convert chord ${chordData.chord_name}:`, error);
    throw error;
  }
}

/**
 * 🎯 GET CHORD FOR CAPTIONING SYSTEM
 * Main function for chord captioning - gets chord data and converts to SVGuitar
 * @param {string} chordName - Chord name
 * @param {string} preferredPosition - Preferred fret position (optional)
 * @returns {Object} Best chord match with SVGuitar config
 */
export async function getChordForCaptioning(chordName, preferredPosition = null) {
  try {
    console.log(`🎸 Getting chord for captioning: ${chordName}`);
    
    // Fetch all positions for this chord
    const chordPositions = await fetchChordData(chordName, preferredPosition);
    
    if (chordPositions.length === 0) {
      throw new Error(`No chord positions found for ${chordName}`);
    }
    
    // If specific position requested and found, use it
    if (preferredPosition && chordPositions.length > 0) {
      const converted = await convertChordWithCaching(chordPositions[0]);
      return converted;
    }
    
    // Otherwise, find the best position (prefer open chords, then lowest fret)
    const sortedPositions = chordPositions.sort((a, b) => {
      // Prefer open chords
      if (a.position_type === 'open_chords' && b.position_type !== 'open_chords') return -1;
      if (b.position_type === 'open_chords' && a.position_type !== 'open_chords') return 1;
      
      // Then prefer lower fret positions
      const aFret = parseInt(a.fret_position?.replace('pos', '') || '1');
      const bFret = parseInt(b.fret_position?.replace('pos', '') || '1');
      return aFret - bFret;
    });
    
    const bestPosition = sortedPositions[0];
    console.log(`🎯 Selected best position: ${bestPosition.chord_position_full_name}`);
    
    const converted = await convertChordWithCaching(bestPosition);
    return converted;
    
  } catch (error) {
    console.error(`❌ Failed to get chord for captioning: ${chordName}:`, error);
    throw error;
  }
}

/**
 * 🎯 BATCH CONVERT CHORDS FOR LIBRARY GENERATION
 * Converts multiple chords for bulk SVG generation
 * @param {Array} chordNames - Array of chord names to convert
 * @param {number} maxConcurrent - Maximum concurrent conversions
 * @returns {Array} Array of conversion results
 */
export async function batchConvertChords(chordNames, maxConcurrent = 5) {
  console.log(`🔄 Batch converting ${chordNames.length} chords (max ${maxConcurrent} concurrent)`);
  
  const results = [];
  const errors = [];
  
  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < chordNames.length; i += maxConcurrent) {
    const batch = chordNames.slice(i, i + maxConcurrent);
    console.log(`📦 Processing batch ${Math.floor(i / maxConcurrent) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(async (chordName) => {
      try {
        const result = await getChordForCaptioning(chordName);
        return { chordName, success: true, result };
      } catch (error) {
        console.error(`❌ Failed to convert ${chordName}:`, error);
        errors.push({ chordName, error: error.message });
        return { chordName, success: false, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + maxConcurrent < chordNames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ Batch conversion complete: ${results.filter(r => r.success).length} success, ${errors.length} errors`);
  
  return {
    results,
    errors,
    summary: {
      total: chordNames.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length,
      successRate: Math.round((results.filter(r => r.success).length / chordNames.length) * 100)
    }
  };
}

/**
 * 🎯 CLEAR CONVERSION CACHE
 * Clears all cached SVGuitar conversions
 */
export function clearConversionCache() {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    const svguitarKeys = keys.filter(key => key.startsWith('svguitar_'));
    
    svguitarKeys.forEach(key => localStorage.removeItem(key));
    
    console.log(`🧹 Cleared ${svguitarKeys.length} cached SVGuitar conversions`);
    return svguitarKeys.length;
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return 0;
  }
}

/**
 * 🎯 GET CACHE STATISTICS
 * Returns information about cached conversions
 */
export function getCacheStats() {
  if (typeof localStorage === 'undefined') {
    return { supported: false };
  }
  
  try {
    const keys = Object.keys(localStorage);
    const svguitarKeys = keys.filter(key => key.startsWith('svguitar_'));
    
    let totalSize = 0;
    const chords = [];
    
    svguitarKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
        try {
          const parsed = JSON.parse(data);
          chords.push({
            id: parsed.id,
            chord_name: parsed.chord_name,
            fret_position: parsed.fret_position,
            cached_at: parsed.conversion_timestamp
          });
        } catch (e) {
          // Skip invalid cache entries
        }
      }
    });
    
    return {
      supported: true,
      cached_chords: chords.length,
      total_size_bytes: totalSize,
      total_size_kb: Math.round(totalSize / 1024),
      chords: chords.sort((a, b) => a.chord_name.localeCompare(b.chord_name))
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return { supported: true, error: error.message };
  }
}

// Export all functions
export {
  fetchChordData,
  convertChordWithCaching,
  getChordForCaptioning,
  batchConvertChords,
  clearConversionCache,
  getCacheStats
};
