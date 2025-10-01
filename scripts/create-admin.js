// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateAdminPassword() {
  try {
    console.log("Updating admin user password...");

    // Get user by email first
    const { data: users, error: getUserError } =
      await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error("Error getting users:", getUserError);
      return;
    }

    const adminUser = users.users.find(
      (user) => user.email === "admin@test.com",
    );

    if (!adminUser) {
      console.error("Admin user not found");
      return;
    }

    console.log("Found admin user:", adminUser.id);

    // Update password
    const { data: updateData, error: updateError } =
      await supabase.auth.admin.updateUserById(adminUser.id, {
        password: "admin123",
        email_confirm: true,
      });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return;
    }

    console.log("✅ Admin password updated successfully!");
    console.log("Email: admin@test.com");
    console.log("Password: admin123");

    // Also ensure user profile exists
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .upsert({
        id: adminUser.id,
        email: "admin@test.com",
        role: "admin",
        nama_lengkap: "Administrator",
        is_active: true,
      });

    if (profileError) {
      console.error("Error updating user profile:", profileError);
    } else {
      console.log("✅ User profile updated successfully!");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

updateAdminPassword();
