-- Auto-create user profiles when new users are created in auth.users
-- This prevents the issue where users exist in auth.users but not in the public.users table

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table with default values
  INSERT INTO public.users (
    id,
    email,
    role,
    nama_lengkap,
    no_telepon,
    alamat,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    'pegawai'::user_role, -- Default role, can be changed by admin
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'User'), -- Use metadata if available
    NEW.raw_user_meta_data->>'no_telepon',
    NEW.raw_user_meta_data->>'alamat',
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.users table when auth.users is updated
  UPDATE public.users
  SET 
    email = NEW.email,
    nama_lengkap = COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', OLD.raw_user_meta_data->>'nama_lengkap', nama_lengkap),
    no_telepon = COALESCE(NEW.raw_user_meta_data->>'no_telepon', OLD.raw_user_meta_data->>'no_telepon', no_telepon),
    alamat = COALESCE(NEW.raw_user_meta_data->>'alamat', OLD.raw_user_meta_data->>'alamat', alamat),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from public.users table when auth.users is deleted
  DELETE FROM public.users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Fix existing admin user if it doesn't have a profile
-- This will only insert if the user doesn't already exist in public.users
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
