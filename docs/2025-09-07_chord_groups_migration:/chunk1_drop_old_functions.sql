-- CHUNK 1: Drop Old Functions with Conflicting Signatures
-- Run this FIRST to remove old function versions

-- Drop the old function that has a different return structure
DROP FUNCTION IF EXISTS get_chord_captions_with_groups(uuid,uuid);

-- Drop other functions to ensure clean slate
DROP FUNCTION IF EXISTS create_chord_sync_group(uuid,uuid,text);
DROP FUNCTION IF EXISTS add_chord_to_sync_group(uuid,uuid,uuid);

-- Success message
SELECT 'CHUNK 1 COMPLETE: Old functions dropped successfully!' as status;
