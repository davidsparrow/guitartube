# 🧪 Search Limits Testing Guide

## Overview
This guide will help you test the dynamic search limits system across all 3 subscription tiers to verify that the Feature Gates integration is working correctly.

## Prerequisites
1. ✅ Apply the database updates first
2. ✅ Make sure you're logged in as an admin user
3. ✅ Have access to the admin settings panel

## Step 1: Apply Database Updates

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of docs/database_updates/dynamic_search_limits.sql
```

## Step 2: Verify Feature Gates Configuration

1. Go to `/admin/settings` 
2. Click on "Feature Gates" tab
3. Scroll down to "Daily Limits" section
4. Verify the search limits are set to:
   - **Freebird**: 8 searches/day
   - **Roadie**: 24 searches/day  
   - **Hero**: 100 searches/day
5. Click "Save Changes" if you made any modifications

## Step 3: Use the Test Dashboard

Navigate to `/test-search-limits` to access the testing dashboard.

### Testing Process:

#### Test Freebird Tier (8 searches):
1. Click "🆓 Test Freebird (8 searches)" button
2. Wait for tier change confirmation
3. Click "Reset Count" to start fresh
4. Click "Simulate Search" 8 times
5. On the 9th click, you should see "🚫 Search blocked - daily limit reached!"

#### Test Roadie Tier (24 searches):
1. Click "🎸 Test Roadie (24 searches)" button
2. Wait for tier change confirmation  
3. Click "Reset Count" to start fresh
4. Click "Simulate Search" 24 times
5. On the 25th click, you should see "🚫 Search blocked - daily limit reached!"

#### Test Hero Tier (100 searches):
1. Click "🏆 Test Hero (100 searches)" button
2. Wait for tier change confirmation
3. Click "Reset Count" to start fresh
4. Click "Simulate Search" multiple times (you can do up to 100)
5. Verify the limit shows 100 and searches work

## Step 4: Test Real Search Page

1. Go to `/search` page
2. Try searching for "guitar"
3. Verify the search works according to your current tier limits
4. Check the browser console for debug logs showing:
   - `🔍 getDailySearchLimit (Dynamic):`
   - Feature gates loaded status
   - Current limits being applied

## Step 5: Verify Admin Changes Take Effect

1. Go back to `/admin/settings` → Feature Gates
2. Change the Freebird limit from 8 to 5
3. Click "Save Changes"
4. Go to `/test-search-limits`
5. Click "🆓 Test Freebird" 
6. Click "Reset Count"
7. Click "Run Full Test"
8. Verify the new limit of 5 is now being used

## Expected Results

### ✅ Success Indicators:
- Feature Gates loads successfully in UserContext
- Search limits match admin settings exactly
- Tier changes work immediately
- Search blocking works at the correct limits
- Console logs show "Feature gates loaded" messages
- Database function returns correct limits

### ❌ Failure Indicators:
- Search limits are still hardcoded (0, 36, 999999)
- Feature gates show as not loaded
- Tier changes don't affect limits
- Console shows "Error loading feature gates"
- Database function returns null or errors

## Debugging

If tests fail, check:

1. **Database Function**: Run `SELECT * FROM test_search_limits()` in Supabase SQL Editor
2. **Feature Gates Data**: Check `admin_settings` table for `setting_key = 'feature_gates'`
3. **Console Logs**: Look for UserContext debug messages
4. **Network Tab**: Check for failed API calls to admin_settings

## Manual Testing Alternative

If you prefer manual testing without the dashboard:

1. **Check Current Tier**: Look at your profile in the database
2. **Change Tier Manually**: Update `user_profiles.subscription_tier` 
3. **Reset Count**: Set `daily_searches_used = 0`
4. **Test Search**: Use the regular search page
5. **Monitor Console**: Watch for limit enforcement messages

## Rollback Plan

If something goes wrong, you can rollback by:

1. Reverting the UserContext.js changes
2. Dropping the new database functions
3. Restoring the original hardcoded limits

The old hardcoded values were:
- Freebird: 0 searches
- Roadie: 36 searches  
- Hero: 999999 searches (unlimited)
