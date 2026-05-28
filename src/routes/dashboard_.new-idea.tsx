import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Users,
  DollarSign,
  Sparkles,
  Loader2,
  Check,
  Wallet,
} from "lucide-react";
import { uploadFileToPinata } from "@/lib/web3/pinata";
import { useAuth } from "@/hooks/useAuth";
import {
  useListFreeIdea,
  usePayExtraIdea,
  generateIdeaId,
  useIsVerifiedBuilder,
} from "@/lib/web3/hooks";
import {
  addIdea,
  getIdeasByOwner,
  type TeamMember as StoredTeamMember,
} from "@/lib/nexis/ideasStore";
import { getProfile } from "@/lib/nexis/profileStore";
import { NetworkGuard } from "@/components/nexis/NetworkGuard";

export const Route = createFileRoute("/dashboard_/new-idea")({
  component: NewIdeaPage,
});

const industries = [
  "DeFi",
  "AI",
  "Consumer",
  "RWA",
  "Gaming",
  "Infra",
  "DevTools",
  "Social",
  "Climate",
  "SaaS",
  "Local Business",
];
const stages = ["Pre-seed", "Seed", "Series A", "Bootstrapped"];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  linkedin: string;
}

interface IdeaFormData {
  title: string;
  pitch: string;
  description: string;
  problem: string;
  solution: string;
  stage: string;
  mvpLink: string;
  website: string;
  fundingAsk: string;
  equity: string;
  industries: string[];
  pitchDeckUrl: string | null;
  thumbnailUrl: string | null;
  teamMembers: TeamMember[];
}

function NewIdeaPage() {
  const navigate = useNavigate();
  const { walletAddress, isAuthenticated, login, isOnMantle } = useAuth();
  const { data: isVerified } = useIsVerifiedBuilder(walletAddress || undefined);
  const {
    listFreeIdea,
    isPending: freePending,
    isConfirming: freeConfirming,
    isSuccess: freeSuccess,
    error: freeError,
  } = useListFreeIdea();
  const {
    payExtraIdea,
    isPending: extraPending,
    isConfirming: extraConfirming,
    isSuccess: extraSuccess,
    error: extraError,
  } = usePayExtraIdea();

  const [step, setStep] = useState(0);
  const [savedToStore, setSavedToStore] = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [ownerIdeasCount, setOwnerIdeasCount] = useState(0);

  const [formData, setFormData] = useState<IdeaFormData>({
    title: "",
    pitch: "",
    description: "",
    problem: "",
    solution: "",
    stage: "Pre-seed",
    mvpLink: "",
    website: "",
    fundingAsk: "",
    equity: "",
    industries: [],
    pitchDeckUrl: null,
    thumbnailUrl: null,
    teamMembers: [],
  });

  useEffect(() => {
    setOwnerIdeasCount(getIdeasByOwner(walletAddress).length);
  }, [walletAddress]);

  const isFirstIdea = ownerIdeasCount === 0;
  const txPending = freePending || freeConfirming || extraPending || extraConfirming;
  const txError = freeError || extraError;

  const steps = ["Basics", "Details", "Financials", "Team", "Review"];

  const toggleIndustry = (industry: string) => {
    setFormData((prev) => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter((i) => i !== industry)
        : prev.industries.length < 3
          ? [...prev.industries, industry]
          : prev.industries,
    }));
  };

  const addTeamMember = () =>
    setFormData((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        { id: crypto.randomUUID(), name: "", role: "", linkedin: "" },
      ],
    }));

  const updateTeamMember = (id: string, field: keyof TeamMember, value: string) =>
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));

  const removeTeamMember = (id: string) =>
    setFormData((prev) => ({ ...prev, teamMembers: prev.teamMembers.filter((m) => m.id !== id) }));

  const handleFileUpload = async (type: "pitchDeck" | "thumbnail", file: File) => {
    setSubmitError(null);
    setUploadProgress((prev) => ({ ...prev, [type]: true }));
    const result = await uploadFileToPinata(file);
    setUploadProgress((prev) => ({ ...prev, [type]: false }));
    if (result.success && result.ipfsUrl) {
      setFormData((prev) => ({
        ...prev,
        ...(type === "pitchDeck"
          ? { pitchDeckUrl: result.ipfsUrl ?? null }
          : { thumbnailUrl: result.ipfsUrl ?? null }),
      }));
    } else {
      setSubmitError(result.error || "Upload failed");
    }
  };

  const saveLocally = () => {
    if (!walletAddress) return null;
    const profile = getProfile(walletAddress);
    const founder = profile?.name || `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
    const team: StoredTeamMember[] = formData.teamMembers
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name, role: m.role, linkedIn: m.linkedin || undefined }));
    const askDisplay = `$${parseInt(formData.fundingAsk || "0").toLocaleString()}`;
    const equityDisplay = `${formData.equity}%`;
    const fallbackImage =
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=60";
    const idea = addIdea({
      name: formData.title,
      tagline: formData.pitch,
      description: formData.description || `${formData.problem}\n\n${formData.solution}`.trim(),
      industry: formData.industries[0] || "Other",
      stage: formData.stage,
      ask: askDisplay,
      equity: equityDisplay,
      image: formData.thumbnailUrl || fallbackImage,
      founder,
      walletAddress,
      pitchDeckUrl: formData.pitchDeckUrl || undefined,
      pitchVideoUrl:
        profile?.role === "builder" && profile.pitchVideoUrl ? profile.pitchVideoUrl : undefined,
      website: formData.website || undefined,
      linkedIn: profile?.linkedin || undefined,
      twitter: profile?.twitter || undefined,
      teamMembers: team.length ? team : undefined,
    });
    return idea;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!isAuthenticated || !walletAddress) {
      login();
      return;
    }
    if (!isOnMantle) {
      setSubmitError("Please switch to Mantle Sepolia first.");
      return;
    }
    if (!isVerified) {
      setShowOnboardingHint(true);
      return;
    }

    const idea = saveLocally();
    if (!idea) return;
    setSavedToStore(true);

    const ideaIdHex = generateIdeaId(idea.name, walletAddress);
    if (isFirstIdea) {
      listFreeIdea(ideaIdHex);
    } else {
      payExtraIdea(ideaIdHex);
    }
  };

  // After tx success, navigate to dashboard
  useEffect(() => {
    if (freeSuccess || extraSuccess) {
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 1200);
      return () => clearTimeout(t);
    }
  }, [freeSuccess, extraSuccess, navigate]);

  const canProceed = () => {
    switch (step) {
      case 0:
        return (
          formData.title.trim().length > 0 &&
          formData.pitch.trim().length > 0 &&
          formData.industries.length > 0
        );
      case 1:
        return formData.problem.trim().length > 0 && formData.solution.trim().length > 0;
      case 2:
        return formData.fundingAsk.trim().length > 0 && formData.equity.trim().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <AppShell>
      <div className="px-4 md:px-8 pt-6 pb-8 max-w-3xl mx-auto" data-testid="new-idea-page">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/dashboard"
            data-testid="new-idea-back-link"
            className="h-10 w-10 rounded-full glass grid place-content-center hover:neon-border transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-xs text-[var(--neon)] uppercase tracking-widest">New Listing</div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Add your idea</h1>
          </div>
        </div>

        {showOnboardingHint && (
          <div
            className="mb-6 glass-strong rounded-2xl p-5 neon-border flex items-start gap-4"
            data-testid="new-idea-onboarding-hint"
          >
            <Wallet className="h-5 w-5 text-[var(--neon)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-bold">Become a verified builder first</div>
              <div className="text-sm text-muted-foreground mt-1">
                You need to pay the one-time 1 MNT onboarding fee before listing ideas on-chain.
              </div>
            </div>
            <Link
              to="/onboarding"
              search={{}}
              className="px-4 py-2 rounded-full bg-[var(--neon)] text-black text-sm font-semibold whitespace-nowrap"
              data-testid="new-idea-go-onboarding"
            >
              Onboard now
            </Link>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1 rounded-full transition-all ${i <= step ? "bg-[var(--neon)] neon-glow" : "bg-white/10"}`}
              />
              <div
                className={`text-[10px] mt-2 uppercase tracking-widest ${i === step ? "text-[var(--neon)]" : "text-muted-foreground"}`}
              >
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-3xl p-6 md:p-8 neon-border">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="basics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center neon-border">
                    <Sparkles className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">The basics</h2>
                    <p className="text-sm text-muted-foreground">What's your startup about?</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Startup Title *
                  </label>
                  <input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value.slice(0, 30) }))
                    }
                    placeholder="e.g., Lattice Protocol"
                    maxLength={30}
                    data-testid="idea-title-input"
                    className="mt-2 w-full bg-white/5 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">
                    {formData.title.length}/30
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Elevator Pitch *
                  </label>
                  <input
                    value={formData.pitch}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pitch: e.target.value.slice(0, 100) }))
                    }
                    placeholder="One line that hooks investors..."
                    maxLength={100}
                    data-testid="idea-pitch-input"
                    className="mt-2 w-full bg-white/5 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">
                    {formData.pitch.length}/100
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Industry Tags * (Max 3)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {industries.map((industry) => {
                      const selected = formData.industries.includes(industry);
                      return (
                        <button
                          key={industry}
                          onClick={() => toggleIndustry(industry)}
                          data-testid={`idea-industry-${industry}`}
                          className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-300 ${
                            selected
                              ? "bg-[var(--neon)] text-black font-semibold"
                              : "glass text-muted-foreground hover:text-white"
                          }`}
                        >
                          {industry}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Thumbnail Image
                  </label>
                  <label
                    htmlFor="thumbnail-upload"
                    data-testid="idea-thumbnail-upload"
                    className="mt-2 border border-dashed border-white/15 hover:border-[var(--neon)] hover:bg-[var(--neon)]/5 rounded-2xl py-8 flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer group"
                  >
                    {uploadProgress.thumbnail ? (
                      <Loader2 className="h-5 w-5 text-[var(--neon)] animate-spin" />
                    ) : formData.thumbnailUrl ? (
                      <>
                        <img
                          src={formData.thumbnailUrl}
                          alt="thumbnail preview"
                          className="h-20 rounded-lg object-cover"
                        />
                        <div className="text-sm text-[var(--neon)]">
                          Uploaded to IPFS — click to replace
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-[var(--neon)]" />
                        <div className="text-sm text-muted-foreground group-hover:text-white">
                          Drag & drop or click to upload
                        </div>
                      </>
                    )}
                  </label>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload("thumbnail", file);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center neon-border">
                    <FileText className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">The details</h2>
                    <p className="text-sm text-muted-foreground">What problem are you solving?</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Stage
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stages.map((s) => (
                      <button
                        key={s}
                        onClick={() => setFormData((prev) => ({ ...prev, stage: s }))}
                        data-testid={`idea-stage-${s.replace(/\s+/g, "-")}`}
                        className={`px-3.5 py-1.5 rounded-full text-xs transition-all ${
                          formData.stage === s
                            ? "bg-[var(--neon)] text-black font-semibold"
                            : "glass text-muted-foreground hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    The Problem *
                  </label>
                  <textarea
                    value={formData.problem}
                    onChange={(e) => setFormData((prev) => ({ ...prev, problem: e.target.value }))}
                    placeholder="What pain point are you addressing?"
                    rows={4}
                    data-testid="idea-problem-input"
                    className="mt-2 w-full bg-white/5 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    The Solution *
                  </label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => setFormData((prev) => ({ ...prev, solution: e.target.value }))}
                    placeholder="How are you solving it?"
                    rows={4}
                    data-testid="idea-solution-input"
                    className="mt-2 w-full bg-white/5 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    MVP / Demo Link
                  </label>
                  <div className="relative mt-2">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={formData.mvpLink}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, mvpLink: e.target.value }))
                      }
                      placeholder="https://your-mvp.com"
                      data-testid="idea-mvp-input"
                      className="w-full bg-white/5 rounded-xl pl-11 pr-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Website
                  </label>
                  <div className="relative mt-2">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, website: e.target.value }))
                      }
                      placeholder="https://yourcompany.com"
                      data-testid="idea-website-input"
                      className="w-full bg-white/5 rounded-xl pl-11 pr-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Pitch Deck (PDF)
                  </label>
                  <label
                    htmlFor="deck-upload"
                    data-testid="idea-deck-upload"
                    className="mt-2 border border-dashed border-white/15 hover:border-[var(--neon)] hover:bg-[var(--neon)]/5 rounded-2xl py-8 flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer group"
                  >
                    {uploadProgress.pitchDeck ? (
                      <Loader2 className="h-5 w-5 text-[var(--neon)] animate-spin" />
                    ) : formData.pitchDeckUrl ? (
                      <>
                        <Check className="h-5 w-5 text-[var(--neon)]" />
                        <div className="text-sm text-[var(--neon)]">Uploaded to IPFS</div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-[var(--neon)]" />
                        <div className="text-sm text-muted-foreground group-hover:text-white">
                          Upload pitch deck
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Stored on IPFS via Pinata
                        </div>
                      </>
                    )}
                  </label>
                  <input
                    id="deck-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload("pitchDeck", file);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="financials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center neon-border">
                    <DollarSign className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">The ask</h2>
                    <p className="text-sm text-muted-foreground">What are you raising?</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Funding Ask (USD) *
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <input
                      value={formData.fundingAsk}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fundingAsk: e.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="250000"
                      data-testid="idea-ask-input"
                      className="w-full bg-white/5 rounded-xl pl-8 pr-4 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Equity / Token Offered (%) *
                  </label>
                  <div className="relative mt-2">
                    <input
                      value={formData.equity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          equity: e.target.value.replace(/[^0-9.]/g, ""),
                        }))
                      }
                      placeholder="10"
                      data-testid="idea-equity-input"
                      className="w-full bg-white/5 rounded-xl px-4 pr-8 py-3 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="glass rounded-xl p-4 mt-6">
                  <div className="text-xs text-muted-foreground mb-2">Implied Valuation</div>
                  <div
                    className="font-display text-2xl font-bold text-[var(--neon)]"
                    data-testid="idea-implied-valuation"
                  >
                    {formData.fundingAsk && formData.equity && parseFloat(formData.equity) > 0
                      ? `$${((parseInt(formData.fundingAsk) / parseFloat(formData.equity)) * 100).toLocaleString()}`
                      : "—"}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center neon-border">
                    <Users className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">The team</h2>
                    <p className="text-sm text-muted-foreground">Who's building this?</p>
                  </div>
                </div>

                {formData.teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="glass rounded-xl p-4 space-y-3"
                    data-testid={`team-member-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Team Member {index + 1}</div>
                      <button
                        onClick={() => removeTeamMember(member.id)}
                        data-testid={`remove-team-${index}`}
                        className="h-7 w-7 rounded-full hover:bg-rose-500/20 grid place-content-center transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={member.name}
                        onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                        placeholder="Name"
                        data-testid={`team-name-${index}`}
                        className="bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50"
                      />
                      <input
                        value={member.role}
                        onChange={(e) => updateTeamMember(member.id, "role", e.target.value)}
                        placeholder="Role"
                        data-testid={`team-role-${index}`}
                        className="bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50"
                      />
                    </div>
                    <input
                      value={member.linkedin}
                      onChange={(e) => updateTeamMember(member.id, "linkedin", e.target.value)}
                      placeholder="LinkedIn URL"
                      data-testid={`team-linkedin-${index}`}
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-white/10 focus:border-[var(--neon)]/50"
                    />
                  </div>
                ))}

                <button
                  onClick={addTeamMember}
                  data-testid="add-team-member-btn"
                  className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-[var(--neon)] hover:bg-[var(--neon)]/5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white transition-all"
                >
                  <Plus className="h-4 w-4" /> Add team member
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center neon-border">
                    <Check className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">Review & Submit</h2>
                    <p className="text-sm text-muted-foreground">Make sure everything looks good</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Title</div>
                    <div className="font-display font-bold">{formData.title || "—"}</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Pitch</div>
                    <div className="text-sm">{formData.pitch || "—"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Asking</div>
                      <div className="font-display font-bold text-[var(--neon)]">
                        ${parseInt(formData.fundingAsk || "0").toLocaleString()}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Equity</div>
                      <div className="font-display font-bold">{formData.equity || "0"}%</div>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-2">Industries</div>
                    <div className="flex flex-wrap gap-2">
                      {formData.industries.map((i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs bg-[var(--neon)]/10 text-[var(--neon)]"
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      Team ({formData.teamMembers.length})
                    </div>
                    <div className="flex -space-x-2">
                      {formData.teamMembers.map((m) => (
                        <div
                          key={m.id}
                          className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--neon)] to-emerald-800 grid place-content-center text-xs font-bold text-black border-2 border-[#0a0a0a]"
                        >
                          {(m.name.slice(0, 2) || "?").toUpperCase()}
                        </div>
                      ))}
                      {formData.teamMembers.length === 0 && (
                        <div className="text-xs text-muted-foreground">Solo founder</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-strong rounded-xl p-4 neon-border mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Listing Fee</div>
                      <div
                        className="font-display text-xl font-bold text-[var(--neon)]"
                        data-testid="listing-fee"
                      >
                        {isFirstIdea ? "FREE" : "0.5 MNT"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isFirstIdea
                          ? "First idea is free for verified builders"
                          : "Extra idea fee"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Gas est.</div>
                      <div className="font-mono">~0.001 MNT</div>
                    </div>
                  </div>
                </div>

                {(submitError || txError) && (
                  <div
                    className="glass rounded-xl p-4 text-sm text-rose-400 border border-rose-500/30"
                    data-testid="new-idea-error"
                  >
                    {submitError || txError?.message || "Transaction failed."}
                  </div>
                )}

                {savedToStore && (freeSuccess || extraSuccess) && (
                  <div
                    className="glass rounded-xl p-4 text-sm text-[var(--neon)] neon-border"
                    data-testid="new-idea-success"
                  >
                    Idea published on-chain! Redirecting…
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              data-testid="new-idea-back-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:neon-border transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </div>

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                data-testid="new-idea-continue-btn"
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : isAuthenticated && !isOnMantle ? (
              <NetworkGuard>
                <></>
              </NetworkGuard>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={txPending}
                data-testid="new-idea-submit-btn"
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {txPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <Wallet className="h-4 w-4" /> Connect & Submit
                  </>
                ) : (
                  <>
                    Submit Idea <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
