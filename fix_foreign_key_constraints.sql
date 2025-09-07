-- Fix Foreign Key Constraints for chord_captions table
-- The table still has old constraints pointing to chord_sync_groups
-- We need to update them to point to chord_groups

-- Step 1: Drop old foreign key constraint
ALTER TABLE chord_captions 
DROP CONSTRAINT IF EXISTS fk_chord_captions_sync_group_id;

-- Step 2: Drop old foreign key constraint (alternative name)
ALTER TABLE chord_captions 
DROP CONSTRAINT IF EXISTS chord_captions_sync_group_id_fkey;

-- Step 3: Add new foreign key constraint pointing to chord_groups
ALTER TABLE chord_captions 
ADD CONSTRAINT fk_chord_captions_chord_group_id 
FOREIGN KEY (chord_group_id) REFERENCES chord_groups(id) ON DELETE SET NULL;

-- Step 4: Verify the constraint was created
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='chord_captions'
AND kcu.column_name='chord_group_id';

-- Success message
SELECT 'Foreign key constraints fixed successfully!' as status;
