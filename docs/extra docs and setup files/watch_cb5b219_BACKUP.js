// This file is a backup of watch.js from commit cb5b219
// "Fix resume video functionality - re-enable auto-resume prompt"
// 
// This commit shows the SAME YouTube API implementation as current:
// - Uses direct window.YT.Player initialization
// - Uses controls: 1 (basic YouTube controls)
// - Same minimal playerVars configuration
//
// CONCLUSION: This commit cb5b219 has the SAME basic YouTube player
// implementation as the current version - NOT the better YouTubePlayer
// component system.
//
// The YouTube API implementation in cb5b219 is:

/*
const newPlayer = new window.YT.Player('youtube-player', {
  height: '100%',
  width: '100%',
  videoId: videoId,
  playerVars: {
    controls: 1,              // Basic YouTube controls (NOT custom)
    modestbranding: 1,
    rel: 0,
    showinfo: 0,
    fs: 0,
    origin: window.location.origin,
    playsinline: 1
  },
  events: {
    onReady: (event) => {
      console.log('✅ YouTube player ready')
      setPlayer(newPlayer)
      playerRef.current = newPlayer
      setIsVideoReady(true)
    },
    onStateChange: handlePlayerStateChange,
    onError: handleVideoError
  }
})
*/

// HTML structure in cb5b219:
/*
<div id="youtube-player" className="w-full h-full" />
*/

// ANALYSIS:
// - This commit cb5b219 has the SAME basic YouTube API setup as current
// - It uses controls: 1 (shows YouTube's default timeline/controls)
// - It does NOT use the better YouTubePlayer component with controls: 0
// - This explains why you don't see the "extra controls below" the timeline
//
// The better system with custom controls is in your:
// - components/YouTubePlayer.js (controls: 0, custom interface)
// - hooks/useYouTubePlayer.js (comprehensive utilities)
//
// RECOMMENDATION:
// Don't restore from cb5b219 - it has the same basic player as current.
// Instead, we need to find when you were using the YouTubePlayer component
// or implement it properly to get the custom controls you expect.

// Full file content was too large to include here.
// Use: git show cb5b219:pages/watch.js to see complete file.
