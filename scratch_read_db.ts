import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vrqbpdtxudzcgydxzfkx.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) {
    console.error("Error reading profiles:", error);
    return;
  }
  console.log("Profiles in database:", data);
}

main().catch(console.error);
