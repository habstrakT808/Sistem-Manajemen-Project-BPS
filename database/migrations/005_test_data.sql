-- Insert test admin user (you'll need to sign up first in Supabase Auth)
-- This is just an example - replace with actual user IDs after signup

-- Test mitra data
INSERT INTO mitra (nama_mitra, jenis, kontak, alamat, deskripsi) VALUES
('PT Teknologi Maju', 'perusahaan', '021-12345678', 'Jakarta Pusat', 'Perusahaan teknologi terpercaya'),
('CV Digital Solutions', 'perusahaan', '021-87654321', 'Jakarta Selatan', 'Solusi digital untuk bisnis'),
('Ahmad Consultant', 'individu', '0812-3456-7890', 'Jakarta Timur', 'Konsultan IT berpengalaman'),
('Sari Marketing', 'individu', '0813-9876-5432', 'Jakarta Barat', 'Spesialis digital marketing');

-- You can add more test data after creating actual users through authentication