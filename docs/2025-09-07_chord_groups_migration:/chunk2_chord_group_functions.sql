-- CHUNK 2: Create Updated Chord Group Functions
-- Run this AFTER chunk1_drop_old_functions.sql

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

-- Success message
SELECT 'CHUNK 2 COMPLETE: Updated chord group functions created successfully!' as status;
