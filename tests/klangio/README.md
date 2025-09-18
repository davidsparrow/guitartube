# Klangio Integration Tests

This directory contains all test files for the Klangio chord recognition integration.

## Test Files

### **Core Tests**
- **`test_youtube_audio.js`** - Simple YouTube audio extraction test
- **`test_klangio_direct.js`** - Direct Klangio API test (no audio extraction)
- **`test_klangio_with_audio.js`** - Klangio test with direct audio URL
- **`test_klangio_integration.js`** - Complete integration test suite

### **API Tests**
- **`../api/klangio/jobs.test.js`** - E2E tests for job creation endpoint
- **`../api/klangio/webhook.test.js`** - Tests for webhook endpoint

## Running Tests

### **From Project Root**
```bash
# Simple audio extraction test
node tests/klangio/test_youtube_audio.js

# Direct Klangio API test
node tests/klangio/test_klangio_direct.js

# Complete integration test
node tests/klangio/test_klangio_integration.js

# Test with direct audio URL
node tests/klangio/test_klangio_with_audio.js
```

### **From Test Directory**
```bash
cd tests/klangio

# Run any test
node test_youtube_audio.js
node test_klangio_direct.js
node test_klangio_integration.js
node test_klangio_with_audio.js
```

## Test Prerequisites

1. **Environment Variables**: Ensure `.env.local` is configured
2. **yt-dlp**: Must be installed (`brew install yt-dlp`)
3. **Klangio API Key**: Must be valid and active
4. **Database**: `klangio_jobs` table must exist

## Test Results

- **✅ Working**: YouTube audio extraction, Klangio API integration
- **✅ Tested**: Complete flow from YouTube to Klangio job creation
- **📊 Performance**: ~14 seconds for audio extraction + Klangio processing

## Troubleshooting

- **Import errors**: Ensure you're running from project root or test directory
- **Environment errors**: Check `.env.local` file exists and has required variables
- **yt-dlp errors**: Verify yt-dlp is installed and accessible
- **Klangio errors**: Verify API key is valid and has credits
