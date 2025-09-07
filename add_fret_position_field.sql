-- Add fret_position field to chord_captions table
-- This field stores the position/variation information for chords (e.g., "Open", "5th fret", etc.)

-- Add the new column
ALTER TABLE chord_captions 
ADD COLUMN IF NOT EXISTS fret_position TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN chord_captions.fret_position IS 'Stores chord position/variation information (e.g., "Open", "5th fret", "Barre")';

-- Success message
SELECT 'fret_position field added to chord_captions table successfully!' as status;
