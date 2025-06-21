-- Update ingredient_adjustments to support scale-specific adjustments
-- The format will be: { "1": {}, "2": {}, "3": {} }
-- This migration doesn't need to change the column type, just document the new format
EOF < /dev/null