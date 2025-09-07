-- 🎸 COMBINED SONG LINKING SETUP - COMPLETE DATABASE SETUP
-- This script combines both database schema updates AND helper functions
-- Run this ONCE in Supabase SQL Editor to set up everything
-- 
-- INCLUDES:
-- - Part 1: Database Schema Updates (tables, indexes, policies)
-- - Part 2: Helper Functions (chord groups + song linking)
-- - Part 3: Updated functions for NEW SCHEMA (chord_groups table)

-- =====================================================
-- PART 1: DATABASE SCHEMA UPDATES
-- =====================================================

-- Add uuid_song field to favorites table to link videos to UG songs
ALTER TABLE favorites 
ADD COLUMN IF NOT EXISTS uuid_song UUID REFERENCES songs(id) ON DELETE SET NULL;

-- Add index for performance on song lookups
CREATE INDEX IF NOT EXISTS idx_favorites_uuid_song ON favorites(uuid_song);

-- Add constraint to ensure video duration validation (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_video_duration_positive' 
        AND table_name = 'favorites'
    ) THEN
        -- First, update any existing rows with invalid duration to NULL
        UPDATE favorites 
        SET video_duration_seconds = NULL 
        WHERE video_duration_seconds <= 0 OR video_duration_seconds IS NOT NULL;
        
        -- Then add the constraint (allowing NULL values)
        ALTER TABLE favorites 
        ADD CONSTRAINT check_video_duration_positive 
        CHECK (video_duration_seconds IS NULL OR video_duration_seconds > 0);
    END IF;
END $$;

-- Create Video-to-Song Mapping Table
CREATE TABLE IF NOT EXISTS video_song_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to the main song record
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Song variation information
    song_name_variation VARCHAR(255) NOT NULL,
    artist_name_variation VARCHAR(255) NOT NULL,
    
    -- Video metadata for validation
    expected_video_duration_seconds INTEGER,
    video_url_pattern TEXT,
    
    -- Mapping metadata
    mapping_type VARCHAR(50) DEFAULT 'user_created',
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    
    -- User who created this mapping
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    CONSTRAINT valid_video_duration CHECK (expected_video_duration_seconds > 0),
    CONSTRAINT unique_song_variation UNIQUE(song_id, song_name_variation, artist_name_variation)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_song_id ON video_song_mappings(song_id);
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_name_variation ON video_song_mappings(song_name_variation);
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_artist_variation ON video_song_mappings(artist_name_variation);
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_combined_search ON video_song_mappings(song_name_variation, artist_name_variation);
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_created_by ON video_song_mappings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_song_mappings_lookup ON video_song_mappings(song_name_variation, artist_name_variation, song_id);

-- Row Level Security (RLS) Policies
ALTER TABLE video_song_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
    -- Policy 1: Users can view all video-song mappings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'video_song_mappings'
        AND policyname = 'Users can view all video-song mappings'
    ) THEN
        CREATE POLICY "Users can view all video-song mappings" ON video_song_mappings
            FOR SELECT USING (true);
    END IF;

    -- Policy 2: Users can create video-song mappings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'video_song_mappings'
        AND policyname = 'Users can create video-song mappings'
    ) THEN
        CREATE POLICY "Users can create video-song mappings" ON video_song_mappings
            FOR INSERT WITH CHECK (auth.uid() = created_by);
    END IF;

    -- Policy 3: Users can update their own video-song mappings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'video_song_mappings'
        AND policyname = 'Users can update their own video-song mappings'
    ) THEN
        CREATE POLICY "Users can update their own video-song mappings" ON video_song_mappings
            FOR UPDATE USING (auth.uid() = created_by);
    END IF;

    -- Policy 4: Users can delete their own video-song mappings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'video_song_mappings'
        AND policyname = 'Users can delete their own video-song mappings'
    ) THEN
        CREATE POLICY "Users can delete their own video-song mappings" ON video_song_mappings
            FOR DELETE USING (auth.uid() = created_by);
    END IF;
END $$;

-- =====================================================
-- PART 2: HELPER FUNCTIONS - CHORD GROUPS (UPDATED)
-- =====================================================

-- Function to create a new chord sync group
-- UPDATED: Now uses chord_groups table instead of chord_sync_groups
CREATE OR REPLACE FUNCTION create_chord_sync_group(
    p_favorite_id UUID,
    p_user_id UUID,
    p_group_color TEXT DEFAULT '#3B82F6', -- Default blue color
    p_group_name TEXT DEFAULT 'New Group' -- Default group name
)
RETURNS UUID AS $$
DECLARE
    v_group_id UUID;
BEGIN
    -- Validate inputs
    IF p_favorite_id IS NULL THEN
        RAISE EXCEPTION 'favorite_id cannot be null';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id cannot be null';
    END IF;

    -- Validate that the favorite exists and belongs to the user
    IF NOT EXISTS (
        SELECT 1 FROM favorites
        WHERE id = p_favorite_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Favorite not found or access denied';
    END IF;

    -- Create the sync group in chord_groups table (NEW SCHEMA)
    INSERT INTO chord_groups (
        favorite_id,
        user_id,
        group_color,
        group_name
    ) VALUES (
        p_favorite_id,
        p_user_id,
        p_group_color,
        p_group_name
    ) RETURNING id INTO v_group_id;

    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a chord caption to a sync group
-- UPDATED: Now uses chord_groups table and new schema field names
CREATE OR REPLACE FUNCTION add_chord_to_sync_group(
    p_chord_caption_id UUID,
    p_sync_group_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_favorite_id UUID;
    v_group_favorite_id UUID;
    v_group_name TEXT;
BEGIN
    -- Validate inputs
    IF p_chord_caption_id IS NULL OR p_sync_group_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'All parameters must be provided';
    END IF;

    -- Get the favorite_id for the chord caption
    SELECT favorite_id INTO v_favorite_id
    FROM chord_captions
    WHERE id = p_chord_caption_id AND user_id = p_user_id;

    IF v_favorite_id IS NULL THEN
        RAISE EXCEPTION 'Chord caption not found or access denied';
    END IF;

    -- Get the favorite_id and group_name for the sync group (NEW SCHEMA: chord_groups table)
    SELECT favorite_id, group_name INTO v_group_favorite_id, v_group_name
    FROM chord_groups
    WHERE id = p_sync_group_id AND user_id = p_user_id;

    IF v_group_favorite_id IS NULL THEN
        RAISE EXCEPTION 'Sync group not found or access denied';
    END IF;

    -- Ensure both belong to the same favorite
    IF v_favorite_id != v_group_favorite_id THEN
        RAISE EXCEPTION 'Chord caption and sync group must belong to the same favorite';
    END IF;

    -- Update the chord caption to link it to the sync group (NEW SCHEMA: updated field names)
    UPDATE chord_captions
    SET chord_group_id = p_sync_group_id,
        chord_group_name = v_group_name,
        updated_at = NOW()
    WHERE id = p_chord_caption_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chord captions with their sync group information
-- UPDATED: Now uses chord_groups table and new schema field names
CREATE OR REPLACE FUNCTION get_chord_captions_with_groups(
    p_favorite_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    chord_id UUID,
    chord_name TEXT,
    start_time TEXT,
    end_time TEXT,
    chord_data JSONB,
    display_order INTEGER,
    serial_number INTEGER,
    chord_group_id UUID,
    chord_group_name TEXT,
    group_color TEXT
) AS $$
BEGIN
    -- Validate inputs
    IF p_favorite_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Both favorite_id and user_id must be provided';
    END IF;

    -- Validate access to the favorite
    IF NOT EXISTS (
        SELECT 1 FROM favorites
        WHERE id = p_favorite_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Favorite not found or access denied';
    END IF;

    -- Return chord captions with sync group information (NEW SCHEMA: updated field names and table)
    RETURN QUERY
    SELECT
        cc.id as chord_id,
        cc.chord_name,
        cc.start_time,
        cc.end_time,
        cc.chord_data,
        cc.display_order,
        cc.serial_number,
        cc.chord_group_id,
        cc.chord_group_name,
        cg.group_color
    FROM chord_captions cc
    LEFT JOIN chord_groups cg ON cc.chord_group_id = cg.id
    WHERE cc.favorite_id = p_favorite_id
    ORDER BY cc.display_order, cc.serial_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: ADDITIONAL SONG LINKING FUNCTIONS (OPTIONAL)
-- =====================================================
--
-- NOTE: The remaining song linking functions from the original file
-- (link_video_to_song, find_song_variations, etc.) can be added here
-- if you need full Ultimate Guitar integration functionality.
--
-- For chord group functionality, the above 3 functions are sufficient.
--
-- To add the remaining functions, copy them from:
-- docs/song_linking_helper_functions.sql (lines 169-693)

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
--
-- This script has set up:
-- ✅ Database schema updates (tables, indexes, policies)
-- ✅ Updated chord group functions (using chord_groups table)
-- ✅ Ready for chord group functionality
--
-- Next steps:
-- 1. Test the chord group functions
-- 2. Update API endpoints and utilities
-- 3. Drop the old chord_sync_groups table
