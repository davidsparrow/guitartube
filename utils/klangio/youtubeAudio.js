// utils/klangio/youtubeAudio.js
// Obtain an audio URL (mp3) for a given YouTube URL using yt-dlp (self-hosted solution).

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get a temporary/direct audio URL for a YouTube video using yt-dlp.
 * @param {string} youtubeUrl
 * @returns {Promise<string>} audioUrl
 */
export async function getAudioUrlFromYouTube(youtubeUrl) {
  if (!youtubeUrl || typeof youtubeUrl !== 'string') throw new Error('youtubeUrl required')

  // Create temp directory for audio files
  const tempDir = path.join(__dirname, '../../temp/audio');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now();
  const outputPath = path.join(tempDir, `audio_${timestamp}.%(ext)s`);

  try {
    // Use yt-dlp to extract audio
    const command = `yt-dlp --extract-audio --audio-format mp3 --output "${outputPath}" "${youtubeUrl}"`;
    
    console.log('Extracting audio with yt-dlp...');
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(`yt-dlp failed: ${stderr}`);
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


