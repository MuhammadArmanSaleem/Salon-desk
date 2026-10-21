import { createClient } from "@supabase/supabase-js";
const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: key,
  SALON_OWNER_EMAIL: email,
  SALON_OWNER_PASSWORD: password,
  SALON_OWNER_NAME: name,
} = process.env;
if (!url || !key || !email || !password || !name)
  throw Error(
    "Set the Supabase URL, secret key and SALON_OWNER_EMAIL / SALON_OWNER_PASSWORD / SALON_OWNER_NAME in .env.local.",
  );
if (password.length < 12)
  throw Error("Use an owner password of at least 12 characters.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { count, error: checkError } = await db
  .from("staff_profiles")
  .select("id", { count: "exact", head: true })
  .eq("role", "owner");
if (checkError)
  throw Error("Apply the database migration before creating the owner.");
if (count)
  throw Error(
    "An owner already exists. Use the Team screen to create more staff.",
  );
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error)
  throw Error(
    "Could not create owner account. Check whether the email already exists.",
  );
const { error: profileError } = await db
  .from("staff_profiles")
  .insert({ id: data.user.id, name, role: "owner" });
if (profileError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw Error("Owner profile could not be created.");
}
console.log(
  "Owner account created. Sign in at /login. No email was sent. Remove the SALON_OWNER_* values from .env.local after setup.",
);
