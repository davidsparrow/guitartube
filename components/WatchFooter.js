// components/WatchFooter.js - Reusable Footer Component for Watch Pages
import { MdFlipCameraAndroid } from "react-icons/md"
import { ImLoop } from "react-icons/im"
import { IoText } from "react-icons/io5"
import { TbGuitarPickFilled } from "react-icons/tb"
import { BsReverseLayoutSidebarInsetReverse, BsArrowsFullscreen } from "react-icons/bs"
import { CiGrid31 } from "react-icons/ci"

export default function WatchFooter({
  // Video controls
  flipState,
  handleFlipVideo,
  
  // Loop/Caption controls
  isInCaptionMode,
  handleLoopClick,
  isLoopActive,
  
  // Caption timing
  tempLoopStart,
  tempLoopEnd,
  handleSaveNewCaption,
  handleCancelNewCaption,
  
  // Loop timing
  loopStartTime,
  loopEndTime,
  handleLoopTimesClick,
  
  // Favorites
  isVideoFavorited,
  handleFavoriteToggle,
  
  // Control strips
  showControlStrips,
  handleControlStripsToggle,
  
  // Layout selection
  setShowLayoutModal,
  
  // Fullscreen
  isFullscreen,
  handleFullscreenToggle
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-t border-white/20 p-1">
      <div className="flex justify-between max-w-7xl mx-auto h-full">
        
        {/* Left Column - Left-justified content with Video Controls */}
        <div className="flex items-center justify-start space-x-3" style={{ paddingLeft: '11px' }}>
          {/* Flip Video Button - 3 States */}
          <button
            data-testid="video-flip-button"
            onClick={handleFlipVideo}
            className={`p-2 rounded-lg transition-colors duration-300 ${
              flipState === 'normal'
                ? 'text-white hover:bg-white/10'
                : flipState === 'horizontal'
                ? 'text-yellow-400 hover:bg-white/10'
                : 'text-green-400 hover:bg-white/10'
            }`}
            title={`Flip Video - Current: ${flipState === 'normal' ? 'Normal' : flipState === 'horizontal' ? 'Horizontal' : 'Both Directions'}`}
          >
            <MdFlipCameraAndroid className="w-5 h-5" />
          </button>

          {/* Loop Segment / Caption Mode Button */}
          <button
            onClick={isInCaptionMode ? undefined : handleLoopClick}
            className={`p-2 rounded-lg transition-colors duration-300 ${
              isInCaptionMode
                ? 'text-blue-400 cursor-default' 
                : isLoopActive 
                ? 'text-blue-400 hover:bg-white/10' 
                : 'text-white hover:bg-white/10'
            }`}
            title={isInCaptionMode ? "Caption Mode Active" : (isLoopActive ? "Stop loop" : "Configure loop segment")}
          >
            {isInCaptionMode ? (
              <IoText className="w-5 h-5" />
            ) : (
              <ImLoop className="w-5 h-5" />
            )}
          </button>

          {/* Loop Time Display / Caption Timing Fields */}
          <div className="flex flex-col items-start space-y-1">
            {/* Mode indicator */}
            {isInCaptionMode && (
              <span className="text-xs text-blue-400 font-medium">
                Caption Timing
              </span>
            )}
            
            {isInCaptionMode ? (
              /* Caption timing display with SAVE/CANCEL buttons */
              <div className="flex items-center space-x-2">
                <span className="w-16 px-2 py-1 text-xs bg-white/20 text-white border border-white/30 rounded">
                  {tempLoopStart}
                </span>
                <span className="text-white text-xs">-</span>
                <span className="w-16 px-2 py-1 text-xs bg-white/20 text-white border border-white/30 rounded">
                  {tempLoopEnd}
                </span>
                
                {/* SAVE button for new caption */}
                <button
                  onClick={handleSaveNewCaption}
                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors cursor-pointer min-w-[50px] text-center"
                  title="Save new caption and exit edit mode"
                >
                  SAVE
                </button>
                
                {/* CANCEL button for new caption */}
                <button
                  onClick={handleCancelNewCaption}
                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer min-w-[50px] text-center"
                  title="Cancel new caption and exit edit mode"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              /* Read-only loop timing display */
              <button
                onClick={handleLoopTimesClick}
                className={`text-sm font-mono transition-colors cursor-pointer hover:opacity-80 ${
                  isLoopActive ? 'text-blue-400' : 'text-gray-300'
                }`}
                title="Click to edit loop times"
              >
                {loopStartTime} - {loopEndTime}
              </button>
            )}
          </div>
        </div>

        {/* Right Column - Right-justified content */}
        <div className="flex items-center justify-end space-x-3" style={{ paddingRight: '12px' }}>
          {/* Guitar Pick Favorites */}
          <button 
            onClick={handleFavoriteToggle}
            className={`p-2 rounded-lg transition-colors duration-300 ${
              isVideoFavorited 
                ? 'text-[#8dc641] hover:bg-white/10' 
                : 'text-gray-400 hover:text-[#8dc641] hover:bg-white/10'
            }`}
            title={isVideoFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <TbGuitarPickFilled className="w-5 h-5" />
          </button>
          
          {/* Control Strip Toggle (Rotated Table Icon) */}
          <button
            data-testid="caption-controls-toggle"
            onClick={handleControlStripsToggle}
            className={`rounded-lg transition-colors duration-300 ${
              showControlStrips
                ? 'text-red-400 hover:bg-white/10'
                : 'text-white hover:bg-white/10'
            }`}
            style={{ padding: '5.5px' }}
            title={showControlStrips ? "Hide Control Strips" : "Show Control Strips"}
          >
            <BsReverseLayoutSidebarInsetReverse className="w-5 h-5 transform rotate-90" />
          </button>

          {/* Layout Selection Icon */}
          <button 
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-300" 
            title="Select Caption Layout"
            onClick={() => setShowLayoutModal(true)}
          >
            <CiGrid31 className="w-6 h-6" />
          </button>
          
          {/* Layout Icon */}
          <button className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-300" title="Inline Search - under development">
            <BsReverseLayoutSidebarInsetReverse className="w-5 h-5" />
          </button>
          
          {/* Custom Fullscreen Button */}
          <button
            onClick={handleFullscreenToggle}
            className="p-2 rounded-lg transition-colors duration-300 text-white hover:bg-white/10"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <BsArrowsFullscreen className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
