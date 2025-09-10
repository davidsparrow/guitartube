-- =====================================================
-- DYNAMIC SEARCH LIMITS UPDATE
-- =====================================================
-- This replaces the hardcoded search limits with dynamic limits from admin_settings

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.increment_search_usage(UUID);

-- Create new function that uses dynamic limits from admin_settings
CREATE OR REPLACE FUNCTION public.increment_search_usage_dynamic(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_searches INTEGER;
    user_tier TEXT;
    max_searches INTEGER;
    feature_gates_data JSONB;
    search_limits JSONB;
BEGIN
    -- Get current usage and tier
    SELECT daily_searches_used, subscription_tier 
    INTO current_searches, user_tier
    FROM public.user_profiles
    WHERE id = user_id_param;
    
    -- Get feature gates from admin_settings
    SELECT setting_value INTO feature_gates_data
    FROM public.admin_settings
    WHERE setting_key = 'feature_gates' AND is_active = TRUE;
    
    -- Extract search limits from feature gates
    search_limits := feature_gates_data->'daily_search_limits';
    
    -- Set limits based on tier from feature gates, with fallbacks
    max_searches := CASE 
        WHEN user_tier = 'hero' THEN 
            COALESCE((search_limits->>'hero')::INTEGER, 100)
        WHEN user_tier = 'roadie' THEN 
            COALESCE((search_limits->>'roadie')::INTEGER, 24)
        WHEN user_tier = 'freebird' THEN 
            COALESCE((search_limits->>'freebird')::INTEGER, 8)
        ELSE 
            COALESCE((search_limits->>'freebird')::INTEGER, 8) -- Default to freebird limits
    END;
    
    -- Log the limits being used (for debugging)
    RAISE NOTICE 'Search limits check: user_tier=%, current_searches=%, max_searches=%, feature_gates=%', 
        user_tier, current_searches, max_searches, search_limits;
    
    -- Check if user has reached limit
    IF current_searches >= max_searches THEN
        RETURN FALSE;
    END IF;
    
    -- Increment usage
    UPDATE public.user_profiles
    SET daily_searches_used = daily_searches_used + 1
    WHERE id = user_id_param;

    -- Track in usage table - insert or update today's record
    INSERT INTO public.user_usage (user_id, date, searches_count)
    VALUES (user_id_param, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET searches_count = user_usage.searches_count + 1;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false
        RAISE NOTICE 'Error in increment_search_usage_dynamic: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a wrapper function with the original name for backward compatibility
CREATE OR REPLACE FUNCTION public.increment_search_usage(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.increment_search_usage_dynamic(user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_search_usage_dynamic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_search_usage(UUID) TO authenticated;

-- Test function to verify search limits are working
CREATE OR REPLACE FUNCTION public.test_search_limits()
RETURNS TABLE(
    tier TEXT,
    limit_from_db INTEGER,
    feature_gates_data JSONB
) AS $$
DECLARE
    feature_gates_data JSONB;
    search_limits JSONB;
BEGIN
    -- Get feature gates from admin_settings
    SELECT setting_value INTO feature_gates_data
    FROM public.admin_settings
    WHERE setting_key = 'feature_gates' AND is_active = TRUE;
    
    search_limits := feature_gates_data->'daily_search_limits';
    
    -- Return limits for each tier
    RETURN QUERY SELECT 
        'freebird'::TEXT, 
        COALESCE((search_limits->>'freebird')::INTEGER, 8),
        feature_gates_data;
        
    RETURN QUERY SELECT 
        'roadie'::TEXT, 
        COALESCE((search_limits->>'roadie')::INTEGER, 24),
        feature_gates_data;
        
    RETURN QUERY SELECT 
        'hero'::TEXT, 
        COALESCE((search_limits->>'hero')::INTEGER, 100),
        feature_gates_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.test_search_limits() TO authenticated;
