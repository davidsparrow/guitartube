-- Create RPC function to check if email already exists in auth.users
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_id_by_email(email text)
RETURNS TABLE(id uuid) 
SECURITY definer
AS $$
BEGIN
  RETURN QUERY SELECT au.id FROM auth.users au WHERE au.email = $1;
END;
$$ LANGUAGE plpgsql;
