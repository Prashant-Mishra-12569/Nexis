import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vrqbpdtxudzcgydxzfkx.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const BUILDER_WALLET = "0x4780d36b6b0367faf6f38d6006f7d6d904cc972c";

async function main() {
  console.log("Cleaning up ideas for wallet:", BUILDER_WALLET);

  // Read all ideas for this wallet
  const { data: ideas, error: readError } = await supabase
    .from("ideas")
    .select("*")
    .eq("wallet_address", BUILDER_WALLET);

  if (readError) {
    console.error("Error reading ideas:", readError);
    return;
  }

  console.log("Found ideas:", ideas?.length);

  if (ideas && ideas.length > 0) {
    // Delete all existing ideas for this wallet so they can list cleanly
    const { error: deleteError } = await supabase
      .from("ideas")
      .delete()
      .eq("wallet_address", BUILDER_WALLET);

    if (deleteError) {
      console.error("Error deleting ideas:", deleteError);
      return;
    }
    console.log("Cleared duplicate ideas successfully.");
  }
}

main().catch(console.error);
