# GuitarTube Watch.js Refactoring Project

## 🎯 PROJECT OVERVIEW

**Objective**: Refactor the monolithic 3000-line `pages/watch.js` file into modular, maintainable components while preserving all existing functionality and preparing for specialized watch page types (lyrics, chords, tabs).

**Repository**: https://github.com/davidsparrow/guitartube  
**Live Site**: https://guitartube.vercel.app  
**Test Video**: https://guitartube.vercel.app/watch?v=ytwpFJ1uZYY

## 🛡️ SAFETY NET IN PLACE

### ✅ Automated Testing Infrastructure
- **Performance monitoring**: 1.58s average load time baseline
- **Visual regression testing**: Complete baseline screenshots captured
- **Cross-browser testing**: Chrome, Firefox, Safari, mobile
- **Responsive design testing**: Desktop, tablet, mobile viewports
- **Test command**: `npm run test`

### ✅ Key Test Files
- `tests/baseline-screenshots.spec.js` - Visual regression protection
- `tests/comprehensive-test.spec.js` - Full user flow testing
- `tests/watch-page.spec.js` - Core watch page functionality
- `playwright.config.js` - Test configuration

## 🎯 SUCCESS CRITERIA

### Phase 1: Component Extraction ✅
1. **Video Player Component** - Isolated video controls and YouTube integration
2. **Caption System Component** - Text and chord caption management
3. **UI Controls Component** - Video flip, caption toggles, modal triggers
4. **Modal System Component** - All modal interactions (auth, captions, support)

### Phase 2: Specialized Watch Pages 🎯
1. **`/watch?type=lyrics`** - Text-focused caption experience
2. **`/watch?type=chords`** - Chord diagram and progression focus
3. **`/watch?type=tabs`** - Guitar tablature display (future)
4. **Default `/watch`** - Current mixed experience

### Phase 3: Performance & UX 🚀
1. **Lazy loading** for non-critical components
2. **Code splitting** for specialized page types
3. **State management** optimization
4. **Mobile experience** improvements

## 📁 CURRENT FILE STRUCTURE

### Core Watch Page
```
pages/watch.js                    # 3000+ lines - MAIN REFACTOR TARGET
```

### Supporting Components (Already Modular)
```
components/
├── VideoPlayer.js                # YouTube player wrapper
├── YouTubePlayer.js              # Core YouTube integration
├── VideoLayout.js                # Layout container
├── CaptionModals.js              # Caption editing modals
├── ChordCaptionModal.js          # Chord-specific modal
├── AuthModal.js                  # Authentication modal
├── MenuModal.js                  # Navigation menu
└── SupportModal.js               # Support/contact modal
```

### Utilities & Data
```
utils/
├── captionUtils.js               # Caption data processing
├── videoPlayerUtils.js           # Video control utilities
└── CaptionDatabase.js            # Caption data management

contexts/
├── AuthContext.js                # User authentication state
└── UserContext.js                # User profile management
```

## 🔧 PROPOSED REFACTORING PLAN

### Step 1: Extract Core Components from watch.js

#### A. Video Management Component
**New file**: `components/watch/VideoManager.js`
**Responsibilities**:
- YouTube player initialization and control
- Video state management (playing, paused, time)
- Video flip functionality
- Performance monitoring

#### B. Caption System Component  
**New file**: `components/watch/CaptionSystem.js`
**Responsibilities**:
- Caption data loading and caching
- Text/chord caption rendering
- Caption synchronization with video
- Caption editing interface

#### C. UI Controls Component
**New file**: `components/watch/WatchControls.js`
**Responsibilities**:
- Video flip toggle (lower left)
- Caption controls toggle (lower right)
- Modal trigger buttons
- Responsive control positioning

#### D. Watch Page Layout Component
**New file**: `components/watch/WatchPageLayout.js`
**Responsibilities**:
- Overall page structure
- Responsive layout management
- Component orchestration
- State coordination

### Step 2: Create Specialized Watch Page Types

#### A. Lyrics-Focused Watch Page
**New file**: `pages/watch/lyrics.js`
**URL**: `/watch?type=lyrics`
**Features**:
- Larger text caption display
- Simplified UI (text-only focus)
- Enhanced readability options

#### B. Chord-Focused Watch Page  
**New file**: `pages/watch/chords.js`
**URL**: `/watch?type=chords`
**Features**:
- Prominent chord diagram display
- Chord progression visualization
- Interactive chord library

#### C. Enhanced Default Watch Page
**Updated file**: `pages/watch.js` (dramatically simplified)
**Responsibilities**:
- Route to specialized pages based on `type` parameter
- Maintain backward compatibility
- Default mixed experience

### Step 3: Shared State Management

#### A. Watch Page Context
**New file**: `contexts/WatchContext.js`
**Responsibilities**:
- Video state (current time, playing status)
- Caption data and synchronization
- UI state (flipped, controls visible)
- User preferences

#### B. Caption Context Enhancement
**Updated file**: `utils/captionUtils.js`
**Enhancements**:
- Improved caching strategies
- Better error handling
- Performance optimizations

## 🎨 UI/UX REQUIREMENTS

### Critical UI Elements to Preserve
1. **Video flip controls** (lower left) - Must maintain exact positioning
2. **Caption controls** (lower right) - Must maintain exact positioning  
3. **Modal positioning** - Text/chord caption edit modals must open correctly
4. **Responsive behavior** - All viewport sizes must work identically
5. **Video floating behavior** - Video must float above caption area when flipped

### URL Structure to Maintain
- `/watch?v=VIDEO_ID` - Default experience
- `/watch?v=VIDEO_ID&type=lyrics` - Lyrics-focused
- `/watch?v=VIDEO_ID&type=chords` - Chord-focused
- All existing query parameters must be preserved

## 🧪 TESTING STRATEGY

### Before Each Change
```bash
npm run test -- baseline-screenshots.spec.js
```

### After Each Component Extraction
```bash
npm run test -- comprehensive-test.spec.js
```

### Performance Monitoring
- Load time must remain under 2 seconds
- Video flip functionality must work identically
- Caption controls must respond within 500ms

### Visual Regression Protection
- All baseline screenshots must match exactly
- Modal positioning must be pixel-perfect
- Responsive breakpoints must be identical

## 🚨 CRITICAL PRESERVATION REQUIREMENTS

### Must Not Break
1. **Authentication flow** - Login/logout functionality
2. **Video favoriting** - Heart button functionality  
3. **Caption editing** - Text and chord caption modals
4. **Video synchronization** - Caption timing with video
5. **Mobile experience** - Touch controls and responsive design

### Data-TestId Attributes (Already Added)
- `data-testid="video-container"`
- `data-testid="video-flip-control"`
- `data-testid="caption-controls"`
- `data-testid="favorite-button"`
- All existing test selectors must be preserved

## 📊 CURRENT PERFORMANCE BASELINE

- **Average load time**: 1.58 seconds
- **Video flip response**: <200ms
- **Caption toggle response**: <500ms
- **Mobile performance**: Excellent across all devices

## �� DEVELOPMENT WORKFLOW

1. **Create feature branch** for each component extraction
2. **Run tests before changes** to establish baseline
3. **Extract component incrementally** (small changes)
4. **Run tests after each change** to catch regressions
5. **Commit frequently** with descriptive messages
6. **Test on live deployment** before merging

## �� IMPLEMENTATION NOTES

### Key Considerations
- **Backward compatibility** is critical - existing URLs must work
- **State management** needs careful coordination between components
- **Performance** must not degrade during refactoring
- **Mobile experience** requires special attention to touch controls
- **Authentication** integration must be preserved exactly

### Technical Debt to Address
- Reduce bundle size through code splitting
- Improve error handling and loading states
- Enhance accessibility (ARIA labels, keyboard navigation)
- Optimize caption data caching and synchronization

## �� IMMEDIATE NEXT STEPS

1. **Analyze current watch.js structure** - Map out all functionality
2. **Create VideoManager component** - Extract video-related logic first
3. **Test video functionality** - Ensure no regressions
4. **Create CaptionSystem component** - Extract caption logic
5. **Test caption functionality** - Verify modal positioning
6. **Continue iteratively** until watch.js is fully modularized

## 🏆 END GOAL

A maintainable, performant, and extensible watch page system that:
- Supports multiple specialized viewing experiences
- Maintains all existing functionality perfectly
- Provides a foundation for future enhancements
- Reduces technical debt and improves developer experience
- Preserves the excellent user experience that already exists

**Remember**: The automated testing suite will catch any regressions. Trust the tests and refactor with confidence! 🎸
