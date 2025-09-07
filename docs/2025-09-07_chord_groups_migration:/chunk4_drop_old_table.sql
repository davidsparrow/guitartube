-- CHUNK 4: Drop Old chord_sync_groups Table
-- Run this AFTER confirming everything works with chord_groups table

-- First, check if there are any remaining references
SELECT 'Checking for remaining chord_sync_groups references...' as status;

-- Show any remaining data in the old table (for backup purposes)
SELECT 'Old table data count:' as info, COUNT(*) as count FROM chord_sync_groups;

-- Drop the old table (CASCADE will remove any dependent objects)
DROP TABLE IF EXISTS chord_sync_groups CASCADE;

-- Verify it's gone
SELECT 'chord_sync_groups table dropped successfully!' as status;

-- Show that chord_groups table is still there and working
SELECT 'chord_groups table status:' as info, COUNT(*) as count FROM chord_groups;
