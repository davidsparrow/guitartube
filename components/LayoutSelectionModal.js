// components/LayoutSelectionModal.js - Layout Selection Modal for Watch Page
import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'

const LAYOUT_OPTIONS = [
  {
    id: 'single-chords',
    name: 'Chords Only',
    image: '/images/watch_layout_selections/caption_var_1_C.png',
    description: 'Focus on chord progressions and diagrams'
  },
  {
    id: 'single-tabs',
    name: 'Tabs Only', 
    image: '/images/watch_layout_selections/caption_var_1_T.png',
    description: 'Guitar tablature notation focus'
  },
  {
    id: 'chords-tabs',
    name: 'Chords + Tabs',
    image: '/images/watch_layout_selections/caption_var_2_C-T.png',
    description: 'Chord diagrams with tablature'
  },
  {
    id: 'lyrics-chords',
    name: 'Lyrics + Chords',
    image: '/images/watch_layout_selections/caption_var_2_L-C.png',
    description: 'Song lyrics with chord progressions'
  },
  {
    id: 'lyrics-tabs',
    name: 'Lyrics + Tabs',
    image: '/images/watch_layout_selections/caption_var_2_L-T.png',
    description: 'Song lyrics with guitar tablature'
  },
  {
    id: 'tabs-chords',
    name: 'Tabs + Chords',
    image: '/images/watch_layout_selections/caption_var_2_T-C.png',
    description: 'Tablature with chord diagrams'
  },
  {
    id: 'lyrics-chords-tabs',
    name: 'Lyrics + Chords + Tabs',
    image: '/images/watch_layout_selections/caption_var_3_L-C-T.png',
    description: 'Complete learning experience'
  },
  {
    id: 'lyrics-tabs-chords',
    name: 'Lyrics + Tabs + Chords',
    image: '/images/watch_layout_selections/caption_var_3_L-T-C.png',
    description: 'Lyrics with tabs priority'
  },
  {
    id: 'scroll-lyrics-chords',
    name: 'Scrolling Lyrics + Chords',
    image: '/images/watch_layout_selections/caption_var_scroll_L-C.png',
    description: 'Animated scrolling display'
  },
  {
    id: 'scroll-lyrics-tabs',
    name: 'Scrolling Lyrics + Tabs',
    image: '/images/watch_layout_selections/caption_var_scroll_L-T.png',
    description: 'Animated scrolling with tabs'
  }
]

export default function LayoutSelectionModal({ 
  isOpen, 
  onClose, 
  currentLayout = 'default',
  onLayoutSelect 
}) {
  const [selectedLayout, setSelectedLayout] = useState(currentLayout)

  if (!isOpen) return null

  const handleLayoutClick = (layoutId) => {
    setSelectedLayout(layoutId)
    onLayoutSelect(layoutId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl mx-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Select Caption Layout</h2>
            <p className="text-gray-400 mt-1">Choose how you want to view captions and learning content</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {LAYOUT_OPTIONS.map((layout) => (
              <div
                key={layout.id}
                onClick={() => handleLayoutClick(layout.id)}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  selectedLayout === layout.id
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                {/* Layout Image */}
                <div className="aspect-square bg-gray-800 flex items-center justify-center">
                  <img
                    src={layout.image}
                    alt={layout.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  {/* Fallback if image fails to load */}
                  <div className="hidden w-full h-full items-center justify-center text-gray-500 text-sm">
                    {layout.name}
                  </div>
                </div>

                {/* Layout Info */}
                <div className="p-3 bg-gray-800">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {layout.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {layout.description}
                  </p>
                </div>

                {/* Selected Indicator */}
                {selectedLayout === layout.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            Current: <span className="text-white font-medium">
              {LAYOUT_OPTIONS.find(l => l.id === selectedLayout)?.name || 'Default (3-Row)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
