import { AnimatePresence, motion } from "framer-motion";
import { X, Linkedin, Twitter, Github, ExternalLink, Wallet, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { getProfile, getInitials, shortAddress, type UserProfile } from "@/lib/nexis/profileStore";
import { getIdeasByOwner, type Idea } from "@/lib/nexis/ideasStore";

interface PublicProfileModalProps {
  walletAddress: string | null;
  onClose: () => void;
}

/**
 * Drawer that shows the public face of any wallet — used when an investor
 * taps a founder's username on the swipe card or in chat. Pulls from the
 * per-wallet profile store + their on-chain listings.
 */
export function PublicProfileModal({ walletAddress, onClose }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      setIdeas([]);
      return;
    }
    setProfile(getProfile(walletAddress));
    setIdeas(getIdeasByOwner(walletAddress));
  }, [walletAddress]);

  const isOpen = !!walletAddress;
  const initials = getInitials(profile, walletAddress);
  const explorerUrl = walletAddress
    ? `https://sepolia.mantlescan.xyz/address/${walletAddress}`
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            data-testid="public-profile-backdrop"
          />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] z-[61] glass-strong border-l border-white/10 overflow-y-auto"
            data-testid="public-profile-modal"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 glass-strong border-b border-white/10">
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest">
                Public profile
              </div>
              <button
                onClick={onClose}
                data-testid="public-profile-close"
                className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
                aria-label="Close profile"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[var(--neon)] to-emerald-800 grid place-content-center text-2xl font-display font-bold text-black overflow-hidden shrink-0">
                  {profile?.profilePicUrl ? (
                    <img
                      src={profile.profilePicUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    className="font-display text-xl font-bold truncate"
                    data-testid="public-profile-name"
                  >
                    {profile?.name || (walletAddress ? shortAddress(walletAddress) : "Unknown")}
                  </h2>
                  <div className="text-[10px] text-[var(--neon)] uppercase tracking-widest mt-0.5">
                    {profile?.role === "investor"
                      ? "Investor"
                      : profile?.role === "builder"
                        ? "Builder"
                        : "Unverified"}
                  </div>
                  {profile?.role === "investor" && profile.firmName && (
                    <div className="text-sm text-muted-foreground mt-1">{profile.firmName}</div>
                  )}
                  {profile?.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" /> {profile.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet */}
              <div className="glass rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Wallet
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Wallet className="h-3.5 w-3.5 text-[var(--neon)]" />
                  <span className="font-mono text-sm" data-testid="public-profile-wallet">
                    {walletAddress ? shortAddress(walletAddress) : "—"}
                  </span>
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[var(--neon)]"
                  >
                    View on Mantlescan <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              {/* Bio / Thesis */}
              {profile?.role === "investor" && profile.thesis && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                    Thesis
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{profile.thesis}</p>
                </div>
              )}

              {/* Investor preferences */}
              {profile?.role === "investor" && (
                <>
                  {profile.ticketSize && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                        Ticket size
                      </div>
                      <div className="text-sm font-medium text-[var(--neon)]">
                        {profile.ticketSize}
                      </div>
                    </div>
                  )}
                  {profile.industries?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                        Industries
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.industries.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-full text-xs bg-[var(--neon)]/10 text-[var(--neon)] neon-border"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Social */}
              {(profile?.linkedin ||
                profile?.twitter ||
                (profile?.role === "builder" && profile?.github)) && (
                <div className="flex items-center gap-2">
                  {profile?.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="public-profile-linkedin"
                      className="h-9 w-9 rounded-full glass grid place-content-center hover:neon-border transition-all"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {profile?.twitter && (
                    <a
                      href={
                        profile.twitter.startsWith("http")
                          ? profile.twitter
                          : `https://x.com/${profile.twitter.replace("@", "")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="public-profile-twitter"
                      className="h-9 w-9 rounded-full glass grid place-content-center hover:neon-border transition-all"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {profile?.role === "builder" && profile?.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="public-profile-github"
                      className="h-9 w-9 rounded-full glass grid place-content-center hover:neon-border transition-all"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Builder's listed ideas */}
              {profile?.role === "builder" && ideas.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                    Listed ideas ({ideas.length})
                  </div>
                  <div className="space-y-2">
                    {ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="glass rounded-xl p-3"
                        data-testid={`public-profile-idea-${idea.id}`}
                      >
                        <div className="text-[10px] text-[var(--neon)] uppercase tracking-widest">
                          {idea.industry}
                        </div>
                        <div className="font-display font-bold text-sm mt-0.5">{idea.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {idea.tagline}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                          Asking {idea.ask} • {idea.equity} equity
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!profile && (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
                  This wallet hasn't completed onboarding yet. They might still be a real builder or
                  investor — just haven't filled out their public profile.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
