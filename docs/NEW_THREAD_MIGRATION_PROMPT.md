# GuitarTube Migration & Enhancement Project - New Thread Prompt

## 🎯 **PROJECT CONTEXT**

You are working on **GuitarTube**, a Next.js application for guitar learning with YouTube video integration, caption management, and chord visualization. This project has two main components:

1. **Main Branch** (current working directory): `/Users/davidsparrow/Documents/guitartube/`
2. **Branch2 Directory** (migration source): `/Users/davidsparrow/Documents/guitartube/docs/guitartube_branch2/`

## 🚀 **RECENTLY COMPLETED WORK (Current Session)**

### **✅ Major Features Successfully Implemented:**

#### **1. Cross-Page Navigation System**
- **Files Modified**: `components/WatchFooter.js`, `pages/watch.js`, `pages/watch_s.js`
- **Functionality**: 
  - `watch.js` scroll icon → navigates to `watch_s.js` with auto-open scroll captions
  - `watch_s.js` control icon → navigates to `watch.js` with auto-open 3-row captions
- **Technical Implementation**: Query parameter `openCaptions=true` triggers auto-open logic
- **Success Metrics**: ✅ Seamless navigation preserving video state, ✅ Auto-caption opening working

#### **2. Enhanced Scrolling Video Player (watch_s.js)**
- **Files Modified**: `pages/watch_s.js`, `components/SongContentScroller.js`
- **Key Features**:
  - Split layout: Chord SVGs (left) + Scrolling lyrics (right)
  - Video-scroll synchronization with pause-caption segments
  - Paint brush icon for chord caption editing
  - Fixed scrolling restart stuttering (0-4 second range issue)
- **Success Metrics**: ✅ Smooth scrolling, ✅ Video sync working, ✅ Chord SVGs displaying

#### **3. Clean Table Design (watch.js)**
- **Files Modified**: `pages/watch.js`
- **Changes**: 
  - Removed all white table borders and outlines
  - Added subtle horizontal underlines (`border-b border-white/30`)
  - Removed all vertical divider lines
- **Success Metrics**: ✅ Clean minimal design, ✅ Only fine horizontal separators

#### **4. UI/UX Refinements**
- **Files Modified**: `components/SongContentScroller.js`, `pages/watch.js`, `pages/watch_s.js`
- **Improvements**:
  - Removed "Speed:" and "Font:" labels from controls
  - Increased caption area height by 100px, decreased video by 100px
  - Full width/height scroll content (removed inner padding)
  - Enhanced paint brush icon styling to match footer icons
- **Success Metrics**: ✅ Cleaner interface, ✅ Better space utilization

#### **5. Footer Icon Color System**
- **Files Modified**: `components/WatchFooter.js`
- **Logic**: Page-specific icon colors based on `pageType` prop
  - `watch.js`: Control strip toggle turns red when captions open
  - `watch_s.js`: Scroll icon turns red when captions open
- **Success Metrics**: ✅ Proper visual feedback, ✅ Page-specific behavior

#### **6. Background & Visual Updates**
- **Files Modified**: `pages/watch.js`, `pages/watch_s.js`
- **Changes**: Updated to `gt_splashBG_1200_dark1.png`, reduced overlay opacity to `bg-black/60`
- **Success Metrics**: ✅ Consistent styling across pages

## 📋 **REMAINING MIGRATION TASKS (From Branch2)**

### **🔥 HIGH PRIORITY - Core Features**

#### **1. Feature Gates & Dynamic Daily Limits System**
- **Source Files**: `docs/guitartube_branch2/components/admin/FeatureGates.js`, `contexts/UserContext.js`
- **Target Files**: Need to migrate to main branch equivalents
- **Description**: Dynamic daily limits pulled from admin_settings table instead of hardcoded values
- **Success Metrics**: Admin can modify daily limits without code changes

#### **2. Enhanced Pricing Page**
- **Source File**: `docs/guitartube_branch2/pages/pricing.js`
- **Target File**: `pages/pricing.js`
- **Features**: Updated limits text, scrollable layout, review carousel, improved spacing
- **Success Metrics**: Better user experience, accurate limit display

#### **3. SVG Chord Library Building System**
- **Source Directory**: `docs/guitartube_branch2/song_data_processing/chord_processing/`
- **Key Files**:
  - `allGuitarChordsScraper.js` (538 lines) - Main scraper
  - `generateChordLibrary.js` - SVG generation
  - `chordLibraryConfig.js` - URL encoding functions
  - `awsChordUploader.js` - S3 upload handling
- **Database Tables**: `chord_variations` (parent), `chord_positions` (child)
- **Success Metrics**: 493+ chord links processed, SVG generation working, S3 integration

#### **4. Enhanced Lyrics API Integration**
- **Source Files**: 
  - `docs/guitartube_branch2/pages/api/lyrics/get.js`
  - `docs/guitartube_branch2/utils/lyricsUtils.js`
- **Features**: Musixmatch API proxy with proper server-side HTML escaping
- **Success Metrics**: No "document is not defined" errors, proper lyrics fetching

### **🔧 MEDIUM PRIORITY - Infrastructure**

#### **5. Database Schema Updates**
- **Source File**: `docs/guitartube_branch2/supabase_schema.JSON`
- **Changes**: Updated schema with chord tables, admin_settings enhancements
- **Migration Scripts**: Multiple scripts in `docs/guitartube_branch2/scripts/`

#### **6. File Consolidation & Organization**
- **Changes**: Moved chord processing files to `song_data_processing/chord_processing/`
- **Renamed Files**: `migrate-chord-data-service.js` → `build_chord_data_from_console_log_chord_captions.js`
- **Success Metrics**: Clean file structure, updated import paths

### **📚 LOW PRIORITY - Documentation**

#### **7. Documentation Updates**
- **Source Files**: 
  - `docs/guitartube_branch2/docs/ARCHITECTURE.md`
  - `docs/guitartube_branch2/docs/ALL_GUITAR_CHORDS_SCRAPER_SYSTEM.md`
- **New Files**: Chord reference HTML files
- **Success Metrics**: Updated documentation reflecting new architecture

## 🎯 **CURRENT PROJECT STATE**

### **✅ Working Features:**
- Cross-page navigation with auto-caption opening
- Scrolling video player with chord SVG display
- Video-scroll synchronization with pause segments
- Clean table design with minimal borders
- Page-specific footer icon colors
- Paint brush icon for chord editing
- Background image and overlay styling

### **🔄 Integration Points:**
- `components/SongContentScroller.js` - Core scrolling component (working)
- `pages/watch_s.js` - Scrolling page (working)
- `pages/watch.js` - Traditional 3-row page (working)
- `components/WatchFooter.js` - Footer with navigation (working)

### **📊 Success Metrics for Migration:**
1. **Feature Gates**: Admin can modify daily limits without code deployment
2. **Pricing Page**: Accurate limit display with improved UX
3. **Chord Library**: SVG generation and S3 integration working
4. **Lyrics API**: Server-side compatibility without client-side errors
5. **Database**: Schema updated with all new tables and relationships
6. **File Organization**: Clean structure with updated import paths

## 🚨 **CRITICAL NOTES:**
- User prefers incremental changes with testing at each step
- Always get user permission before making code changes
- Focus on one feature area at a time
- Maintain existing working functionality while adding new features
- Use existing utility files (like `lib/supabase.js`) instead of direct imports

## 📁 **KEY FILE LOCATIONS:**
- **Main Branch**: `/Users/davidsparrow/Documents/guitartube/`
- **Migration Source**: `/Users/davidsparrow/Documents/guitartube/docs/guitartube_branch2/`
- **Current Working Files**: `pages/watch.js`, `pages/watch_s.js`, `components/SongContentScroller.js`, `components/WatchFooter.js`

## 🔧 **DETAILED TECHNICAL SPECIFICATIONS**

### **Database Schema Changes Required:**

#### **1. chord_variations Table (Parent)**
```sql
CREATE TABLE chord_variations (
  id SERIAL PRIMARY KEY,
  chord_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  root_note VARCHAR(10),
  chord_type VARCHAR(50),
  difficulty INTEGER,
  category VARCHAR(50),
  total_variations INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **2. chord_positions Table (Child)**
```sql
CREATE TABLE chord_positions (
  id SERIAL PRIMARY KEY,
  chord_variation_id INTEGER REFERENCES chord_variations(id),
  chord_name VARCHAR(50) NOT NULL,
  fret_position VARCHAR(20),
  chord_position_full_name VARCHAR(200),
  position_type VARCHAR(50),
  strings TEXT[],
  frets TEXT[],
  fingering TEXT[],
  barre BOOLEAN DEFAULT FALSE,
  barre_fret INTEGER,
  aws_svg_url_light TEXT,
  aws_svg_url_dark TEXT,
  svg_file_size INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Key Integration Points:**

#### **1. SongContentScroller Component**
- **Current State**: Working with video sync, pause segments, scroll controls
- **Branch2 Enhancements**: Better HTML escaping, improved scroll position tracking
- **Migration Path**: Compare `docs/guitartube_branch2/components/SongContentScroller.js` with current

#### **2. Watch Page Chord Display**
- **Current State**: Basic chord caption modal working
- **Branch2 Enhancement**: SVG chord library integration with real chord positions
- **Files to Compare**:
  - `docs/guitartube_branch2/pages/watch_scroll.js` (reference implementation)
  - Current `pages/watch_s.js` (target for enhancement)

#### **3. API Endpoints**
- **Current State**: Basic functionality
- **Branch2 Enhancement**: Server-side HTML escaping in lyrics API
- **Migration Required**: `docs/guitartube_branch2/pages/api/lyrics/get.js` → `pages/api/lyrics/get.js`

### **Migration Priority Matrix:**

| Feature | Impact | Complexity | Dependencies | Priority |
|---------|--------|------------|--------------|----------|
| Feature Gates System | High | Medium | admin_settings table | 🔥 HIGH |
| SVG Chord Library | High | High | Database schema, S3 setup | 🔥 HIGH |
| Enhanced Pricing Page | Medium | Low | Feature gates | 🔧 MEDIUM |
| Lyrics API Fix | Medium | Low | None | 🔧 MEDIUM |
| Database Schema | High | Medium | Migration scripts | 🔥 HIGH |
| File Organization | Low | Low | Import path updates | 📚 LOW |

### **Testing Checklist for Each Migration:**
- [ ] Existing functionality preserved
- [ ] New feature works as expected
- [ ] No console errors or warnings
- [ ] Database operations successful
- [ ] Cross-page navigation still working
- [ ] Video player functionality intact
- [ ] Caption systems operational

---

**Your task is to help migrate the remaining Branch2 features into the main branch while preserving all currently working functionality. Start with the highest priority items and work incrementally with user approval at each step.**
