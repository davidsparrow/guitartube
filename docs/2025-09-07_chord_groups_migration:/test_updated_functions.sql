-- Test Script for Updated Chord Group Functions
-- Run this in Supabase SQL Editor to test the updated functions

-- Test 1: Check if functions exist and have correct signatures
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('create_chord_sync_group', 'add_chord_to_sync_group', 'get_chord_captions_with_groups')
AND routine_schema = 'public';

-- Test 2: Check table structures
SELECT 'chord_groups table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chord_groups' 
ORDER BY ordinal_position;

SELECT 'chord_captions relevant fields:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chord_captions' 
AND column_name IN ('chord_group_id', 'chord_group_name', 'sync_group_id', 'is_master')
ORDER BY ordinal_position;

-- Test 3: Sample function calls (replace UUIDs with real ones from your database)
-- SELECT create_chord_sync_group(
--     'your-favorite-uuid-here'::UUID,
--     'your-user-uuid-here'::UUID,
--     '#FF0000',
--     'Test Group'
-- );

-- Test 4: Check for any remaining references to old schema
SELECT 'Checking for old schema references...' as info;
-- This will show if any views or functions still reference the old fields
