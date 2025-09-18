// utils/klangio/youtubeAudioDirect.js
// Direct YouTube audio extraction using youtube-dl (more reliable)

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract audio directly from YouTube using youtube-dl
 * @param {string} youtubeUrl
 * @returns {Promise<string>} local audio file path
 */
export async function getAudioUrlFromYouTubeDirect(youtubeUrl) {
  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    throw new Error('youtubeUrl required');
  }

  // Create temp directory for audio files
  const tempDir = path.join(__dirname, '../../temp/audio');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now();
  const outputPath = path.join(tempDir, `audio_${timestamp}.%(ext)s`);

  try {
    // Use youtube-dl to extract audio
    const command = `youtube-dl --extract-audio --audio-format mp3 --output "${outputPath}" "${youtubeUrl}"`;
    
    console.log('Extracting audio with youtube-dl...');
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(`youtube-dl failed: ${stderr}`);
    }

    // Find the generated file
    const files = fs.readdirSync(tempDir);
    const audioFile = files.find(file => file.startsWith(`audio_${timestamp}`));
    
    if (!audioFile) {
      throw new Error('Audio file not found after extraction');
    }

    const fullPath = path.join(tempDir, audioFile);
    console.log(`Audio extracted to: ${fullPath}`);
    
    return fullPath;
    
  } catch (error) {
    throw new Error(`YouTube audio extraction failed: ${error.message}`);
  }
}

/**
 * Clean up old audio files (call this periodically)
 */
export function cleanupOldAudioFiles(maxAgeHours = 24) {
  const tempDir = path.join(__dirname, '../../temp/audio');
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old audio file: ${file}`);
    }
  });
}
