// components/watch/WatchPageLayout.js - Shared layout for all watch page types
import { useState, useEffect } from 'react'
import TopBanner from '../TopBanner'
import Header from '../Header'

export default function WatchPageLayout({ 
  children,
  pageType = 'default',
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onAuthClick,
  onMenuClick,
  isAuthenticated,
  router
}) {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/gt_splashBG_dark.png')`,
          width: '100%',
          height: '100%',
          minWidth: '100vw',
          minHeight: '100vh'
        }}
      />
      
      {/* 75% Black Overlay */}
      <div className="absolute inset-0 bg-black/75 z-0" />
      
      {/* Top Banner - Admin controlled */}
      <TopBanner />
      
      {/* Header Component with Search Functionality */}
      <Header 
        showBrainIcon={false}
        showSearchIcon={false}
        logoImage="/images/gt_logoM_PlayButton.png"
        // Search functionality
        showSearchBar={true}
        showFavoritesToggle={false}
        showResumeButton={true}
        showSortDropdown={false}
        // Search state
        searchQuery={searchQuery}
        sortOrder="relevance"
        showFavoritesOnly={false}
        savedSession={null}
        // Event handlers
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onFavoritesToggle={() => router.push('/search?show_favorites=true')}
        onResumeClick={() => {}}
        onSortChange={() => {}}
        // Standard props
        onAuthClick={onAuthClick}
        onMenuClick={onMenuClick}
        isAuthenticated={isAuthenticated}
      />

      {/* Page Type Indicator (for debugging) */}
      {pageType !== 'default' && (
        <div className="fixed top-20 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded text-sm">
          {pageType.toUpperCase()}
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
