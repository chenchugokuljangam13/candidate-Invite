import { createClient } from "@supabase/supabase-js";
const supabaseInit = (SUPABASE_URL: string, SUPABASE_KEY: string) =>
  createClient(SUPABASE_URL, SUPABASE_KEY);
export { supabaseInit };