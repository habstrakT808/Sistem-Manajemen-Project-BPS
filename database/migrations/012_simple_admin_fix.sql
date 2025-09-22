-- Simple fix for admin user profile (without triggers)
-- This script only fixes the existing admin user without adding triggers

-- Fix existing admin user if it doesn't have a profile
INSERT INTO public.users (
  id,
  email,
  role,
  nama_lengkap,
  no_telepon,
  alamat,
  is_active
)
SELECT 
  au.id,
  au.email,
  'admin'::user_role,
  'Administrator',
  NULL,
  NULL,
  true
FROM auth.users au
WHERE au.email = 'admin@test.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
);
