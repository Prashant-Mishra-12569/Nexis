/**
 * Swipes & Saved & Sentiment — migrated from Tableland to Supabase
 */
import { supabase } from "../supabase/client";
import type { JsonRpcSigner } from "ethers";

// ===== Swipes =====

export async function saveSwipe(
  signer: JsonRpcSigner | undefined,
  wallet: string,
  ideaId: string,
  liked: boolean,
): Promise<void> {
  const w = wallet.toLowerCase();
  const id = crypto.randomUUID();

  const { error } = await supabase
    .from("swipes")
    .upsert({
      id,
      wallet: w,
      idea_id: ideaId,
      liked,
      ts: Date.now(),
    });

  if (error) {
    console.error("saveSwipe error:", error);
    throw error;
  }

  // Update sentiment
  await upsertSentiment(ideaId, liked);
}

export async function getSwipedIdeaIds(wallet: string): Promise<{ liked: string[]; disliked: string[] }> {
  if (!wallet) return { liked: [], disliked: [] };
  try {
    const { data, error } = await supabase
      .from("swipes")
      .select("idea_id, liked")
      .eq("wallet", wallet.toLowerCase());

    if (error) {
      console.error("getSwipedIdeaIds error:", error);
      return { liked: [], disliked: [] };
    }

    const liked: string[] = [];
    const disliked: string[] = [];
    for (const r of (data || [])) {
      if (r.liked) liked.push(r.idea_id);
      else disliked.push(r.idea_id);
    }
    return { liked, disliked };
  } catch {
    return { liked: [], disliked: [] };
  }
}

// ===== Saved Ideas =====

export async function toggleSavedIdea(
  signer: JsonRpcSigner | undefined,
  wallet: string,
  ideaId: string,
): Promise<boolean> {
  const w = wallet.toLowerCase();

  // Check if already saved
  const { data, error: selectError } = await supabase
    .from("saved")
    .select("id")
    .eq("wallet", w)
    .eq("idea_id", ideaId)
    .maybeSingle();

  if (selectError) {
    console.error("toggleSavedIdea select error:", selectError);
    return false;
  }

  if (data) {
    // Unsave
    const { error: deleteError } = await supabase
      .from("saved")
      .delete()
      .eq("id", data.id);
    if (deleteError) {
      console.error("toggleSavedIdea delete error:", deleteError);
      throw deleteError;
    }
    return false;
  } else {
    // Save
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from("saved")
      .insert({
        id,
        wallet: w,
        idea_id: ideaId,
        saved_at: Date.now(),
      });
    if (insertError) {
      console.error("toggleSavedIdea insert error:", insertError);
      throw insertError;
    }
    return true;
  }
}

export async function isIdeaSaved(wallet: string, ideaId: string): Promise<boolean> {
  if (!wallet || !ideaId) return false;
  try {
    const { data, error } = await supabase
      .from("saved")
      .select("id")
      .eq("wallet", wallet.toLowerCase())
      .eq("idea_id", ideaId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function getSavedIdeaIds(wallet: string): Promise<string[]> {
  if (!wallet) return [];
  try {
    const { data, error } = await supabase
      .from("saved")
      .select("idea_id")
      .eq("wallet", wallet.toLowerCase())
      .order("saved_at", { ascending: false });

    if (error) {
      console.error("getSavedIdeaIds error:", error);
      return [];
    }
    return (data || []).map((r) => r.idea_id as string);
  } catch {
    return [];
  }
}

// ===== Sentiment (views, likes, dislikes) =====

export interface IdeaSentiment {
  likes: number;
  dislikes: number;
  views: number;
}

async function upsertSentiment(
  ideaId: string,
  liked: boolean,
): Promise<void> {
  try {
    const { data, error: selectError } = await supabase
      .from("sentiment")
      .select("*")
      .eq("idea_id", ideaId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (data) {
      const payload: any = {};
      if (liked) {
        payload.likes = (data.likes || 0) + 1;
      } else {
        payload.dislikes = (data.dislikes || 0) + 1;
      }
      const { error: updateError } = await supabase
        .from("sentiment")
        .update(payload)
        .eq("idea_id", ideaId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("sentiment")
        .insert({
          idea_id: ideaId,
          likes: liked ? 1 : 0,
          dislikes: liked ? 0 : 1,
          views: 0,
        });
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error("upsertSentiment error:", e);
  }
}

export async function incrementIdeaView(
  signer: JsonRpcSigner | undefined,
  ideaId: string,
): Promise<void> {
  if (!ideaId) return;
  try {
    const { data, error: selectError } = await supabase
      .from("sentiment")
      .select("*")
      .eq("idea_id", ideaId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (data) {
      const { error: updateError } = await supabase
        .from("sentiment")
        .update({ views: (data.views || 0) + 1 })
        .eq("idea_id", ideaId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("sentiment")
        .insert({
          idea_id: ideaId,
          likes: 0,
          dislikes: 0,
          views: 1,
        });
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error("incrementIdeaView error:", e);
  }
}

export async function getIdeaSentiment(ideaId: string): Promise<IdeaSentiment> {
  if (!ideaId) return { likes: 0, dislikes: 0, views: 0 };
  try {
    const { data, error } = await supabase
      .from("sentiment")
      .select("*")
      .eq("idea_id", ideaId)
      .maybeSingle();

    if (error || !data) {
      return { likes: 0, dislikes: 0, views: 0 };
    }
    return {
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      views: data.views || 0,
    };
  } catch {
    return { likes: 0, dislikes: 0, views: 0 };
  }
}

export async function getReceivedRightSwipes(walletAddress: string, ideaIds: string[]): Promise<number> {
  if (ideaIds.length === 0) return 0;
  let total = 0;
  for (const id of ideaIds) {
    const s = await getIdeaSentiment(id);
    total += s.likes;
  }
  return total;
}

export async function getOwnerTotalViews(ideaIds: string[]): Promise<number> {
  let total = 0;
  for (const id of ideaIds) {
    const s = await getIdeaSentiment(id);
    total += s.views;
  }
  return total;
}
