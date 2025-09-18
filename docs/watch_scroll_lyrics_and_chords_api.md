We are building a **dual-mode chord captioning system** for a Next.js guitar learning application that displays synchronized chord diagrams and lyrics over YouTube videos. The system supports both static HTML files (with full chord formatting) and live API integration (Musixmatch lyrics) with intelligent fallback mechanisms.

## 🏗️ **Current Architecture**

### **Core Components:**
- **`pages/watch_scroll.js`** - Main video player page with integrated chord display
- **`components/SongContentScroller.js`** - Scrollable content component with playback controls
- **`pages/api/lyrics/get.js`** - Musixmatch API proxy endpoint
- **`utils/lyricsUtils.js`** - Utility functions for lyrics processing

### **Key Features Implemented:**
1. **Dual Source System:** Toggle between static HTML files and Musixmatch API
2. **Smart Fallback:** Automatic fallback if primary source fails
3. **Chord Formatting:** Proper display of chords above lyrics with lime green styling
4. **Scroll Controls:** Play/pause, speed control, font size, skip navigation
5. **Error Handling:** User-friendly error messages and fallback content

## �� **File Structure & Current State**

### **`pages/watch_scroll.js`** (Main Page)
- **Location:** `/Users/davidsparrow/Documents/guitarmagic-a/pages/watch_scroll.js`
- **Key State Variables:**
  - `lyricsSource` - 'api' or 'static' preference
  - `songContent` - HTML content to display
  - `isLoadingSongContent` - Loading state
  - `lyricsError` - Error message display
- **Key Functions:**
  - `loadSongContent()` - Main loading logic with dual source support
  - `loadStaticSongContent()` - Static HTML file processing
- **UI Elements:**
  - Source toggle button (top-right corner)
  - Error message display (top-left corner)
  - Loading spinner with source indicator

### **`components/SongContentScroller.js`** (Scrollable Component)
- **Location:** `/Users/davidsparrow/Documents/guitarmagic-a/components/SongContentScroller.js`
- **Features:**
  - Auto-scrolling with play/pause controls
  - Speed control (0.5x to 3x)
  - Font size adjustment (text-xs to text-lg)
  - Skip forward/backward (10s, 30s, 60s)
  - Controls positioned at bottom
- **Styling:**
  - Black background with white text
  - Monospace font for chord alignment
  - Lime green chords (#00ff00)

### **`pages/api/lyrics/get.js`** (API Endpoint)
- **Location:** `/Users/davidsparrow/Documents/guitarmagic-a/pages/api/lyrics/get.js`
- **Function:** Proxies requests to Musixmatch API
- **Environment Variable:** Requires `RAPIDAPI_KEY` in `.env`
- **Response Format:** Returns processed HTML with styling

### **`utils/lyricsUtils.js`** (Utility Functions)
- **Location:** `/Users/davidsparrow/Documents/guitarmagic-a/utils/lyricsUtils.js`
- **Functions:**
  - `fetchLyrics(title, artist)` - API integration
  - `extractSongInfo(videoTitle, videoChannel)` - Song info extraction
  - `generateFallbackLyrics(title, artist)` - Fallback content generation

## 🔧 **Current Implementation Details**

### **Static HTML Processing:**
- **Source Files:** `/public/song_data/song_clean_output_1647373.html`
- **Processing:** Extracts content from `<pre>` tags
- **Styling:** Injects CSS for chord formatting:
  ```css
  .chord { color: #00ff00; font-weight: bold; font-size: 0.9em; }
  .gtab { font-family: monospace; white-space: pre; color: white; }
  pre { white-space: pre-wrap; font-family: monospace; background: black; }
  ```

### **API Integration:**
- **Endpoint:** Musixmatch Lyrics API via RapidAPI
- **Processing:** Converts JSON lyrics to HTML with timing data
- **Styling:** Similar CSS injection for consistency

### **Fallback System:**
- **Primary Source:** User preference (API or Static)
- **Secondary Source:** Automatic fallback if primary fails
- **Final Fallback:** Generated placeholder content

## 🚀 **Next Steps for Testing & Validation**

### **1. Environment Setup**
- [ ] Verify `RAPIDAPI_KEY` is set in `.env` file
- [ ] Test API endpoint: `curl http://localhost:3000/api/lyrics/get?title=test&artist=test`
- [ ] Ensure static files are accessible: `curl http://localhost:3000/song_data/song_clean_output_1647373.html`

### **2. Functionality Testing**
- [ ] **Toggle Testing:** Verify source toggle button works
- [ ] **API Mode:** Test with real song titles from YouTube videos
- [ ] **Static Mode:** Verify chord formatting displays correctly
- [ ] **Fallback Testing:** Disable API to test static fallback
- [ ] **Error Handling:** Test with invalid song titles

### **3. UI/UX Validation**
- [ ] **Loading States:** Verify spinner and source indicator
- [ ] **Error Messages:** Test error display positioning
- [ ] **Scroll Controls:** Test all control functions
- [ ] **Responsive Design:** Test on different screen sizes

### **4. Content Quality**
- [ ] **Chord Alignment:** Verify chords appear above correct lyrics
- [ ] **Font Consistency:** Ensure monospace font works across sources
- [ ] **Color Scheme:** Verify lime green chords, white text, black background
- [ ] **Scroll Smoothness:** Test auto-scroll performance

## 🔧 **Potential Modifications & Enhancements**

### **1. Static File Management**
- **Current:** Single hardcoded file
- **Enhancement:** Dynamic file selection based on video ID
- **Implementation:** Create mapping system or file naming convention
- **Files to Modify:** `loadStaticSongContent()` in `watch_scroll.js`

### **2. API Response Enhancement**
- **Current:** Basic lyrics only
- **Enhancement:** Add chord detection from lyrics
- **Implementation:** Parse lyrics for common chord patterns
- **Files to Modify:** `pages/api/lyrics/get.js`

### **3. User Preferences**
- **Current:** Session-based toggle
- **Enhancement:** Persistent user preferences
- **Implementation:** Store in localStorage or user profile
- **Files to Modify:** `watch_scroll.js` state management

### **4. Performance Optimization**
- **Current:** Loads content on every toggle
- **Enhancement:** Cache content from both sources
- **Implementation:** Add caching layer
- **Files to Modify:** `loadSongContent()` function

### **5. Advanced Chord Detection**
- **Current:** Static files have chords, API doesn't
- **Enhancement:** Add chord detection algorithm
- **Implementation:** Pattern matching for common chord progressions
- **Files to Modify:** `utils/lyricsUtils.js`

### **6. Synchronization Features**
- **Current:** Manual scroll control
- **Enhancement:** Video-synchronized scrolling
- **Implementation:** Use video time events
- **Files to Modify:** `SongContentScroller.js`

## 🐛 **Known Issues & Debugging**

### **1. API Key Management**
- **Issue:** Hardcoded API key in curl examples
- **Solution:** Use environment variables consistently
- **Files:** `.env`, `pages/api/lyrics/get.js`

### **2. Static File Paths**
- **Issue:** Hardcoded file path
- **Solution:** Dynamic file selection
- **Files:** `loadStaticSongContent()` function

### **3. Error Message Positioning**
- **Issue:** Error messages might overlap with content
- **Solution:** Better z-index management
- **Files:** `watch_scroll.js` error display

## 📋 **Testing Checklist**

### **Basic Functionality:**
- [ ] Page loads without errors
- [ ] Game controller icon shows/hides control strip
- [ ] Source toggle button works
- [ ] Loading states display correctly
- [ ] Error messages appear when appropriate

### **Content Display:**
- [ ] Static files show chords above lyrics
- [ ] API content displays properly formatted
- [ ] Font and colors are consistent
- [ ] Scroll controls function properly

### **Fallback System:**
- [ ] API fails gracefully to static
- [ ] Static fails gracefully to API
- [ ] Both fail gracefully to fallback content
- [ ] Error messages are informative

### **Performance:**
- [ ] No memory leaks in scroll animation
- [ ] Smooth scrolling performance
- [ ] Fast source switching
- [ ] Efficient content loading

## �� **Success Criteria**

1. **Dual Source Working:** Both API and static files load successfully
2. **Intelligent Fallback:** System gracefully handles source failures
3. **User Control:** Toggle between sources works smoothly
4. **Content Quality:** Chords display correctly above lyrics
5. **Performance:** Smooth scrolling and responsive controls
6. **Error Handling:** Clear error messages and fallback content

## �� **Development Workflow**

1. **Test Current Implementation:** Verify all features work as expected
2. **Identify Issues:** Document any bugs or performance problems
3. **Implement Fixes:** Address issues systematically
4. **Add Enhancements:** Implement suggested modifications
5. **Performance Testing:** Ensure smooth operation
6. **User Testing:** Get feedback on usability

This system provides a robust foundation for chord captioning with flexibility for both static content and live API integration, with intelligent fallback mechanisms and user control.

```css
  .chord { color: #00ff00; font-weight: bold; font-size: 0.9em; }
  .gtab { font-family: monospace; white-space: pre; color: white; }
  pre { white-space: pre-wrap; font-family: monospace; background: black; }