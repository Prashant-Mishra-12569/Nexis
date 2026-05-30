import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Orbs } from "@/components/nexis/Orbs";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Upload,
  User,
  Briefcase,
  Check,
  ChevronLeft,
  Zap,
  Loader2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePayOnboarding, useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { uploadFileToPinata } from "@/lib/web3/pinata";
import { useNexisData, type UserProfile } from "@/hooks/useNexisData";
import { NetworkGuard, WrongNetworkBanner } from "@/components/nexis/NetworkGuard";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { edit?: boolean } => {
    const edit = search.edit === "true" || search.edit === true;
    return edit ? { edit: true } : {};
  },
  component: OnboardingPage,
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
];
const tickets = ["$5k – $10k", "$10k – $50k", "$50k – $100k", "$100k+"];

interface FormData {
  name: string;
  location: string;
  linkedin: string;
  twitter: string;
  github: string;
  firmName: string;
  thesis: string;
  profilePicUrl: string | null;
  pitchVideoUrl: string | null;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { edit: isEditing = false } = Route.useSearch();
  const { isAuthenticated, walletAddress, login, isOnMantle } = useAuth();
  const { payOnboarding, isPending, isConfirming, isSuccess, error } = usePayOnboarding();
  const { data: isVerified } = useIsVerifiedBuilder(walletAddress || undefined);
  const { myProfile: existingProfile, saveProfile: saveProfileTL, tablesReady } = useNexisData();

  // Role is PERMANENTLY locked once set
  const roleLocked = !!existingProfile?.role;

  const [role, setRole] = useState<"builder" | "investor" | null>(null);
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [ticket, setTicket] = useState(tickets[1]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    location: "",
    linkedin: "",
    twitter: "",
    github: "",
    firmName: "",
    thesis: "",
    profilePicUrl: null,
    pitchVideoUrl: null,
  });

  // Load existing profile if any (from Tableland)
  useEffect(() => {
    if (!existingProfile) return;
    setRole(existingProfile.role);
    setFormData({
      name: existingProfile.name || "",
      location: existingProfile.location || "",
      linkedin: existingProfile.linkedin || "",
      twitter: existingProfile.twitter || "",
      github: existingProfile.role === "builder" ? existingProfile.github || "" : "",
      firmName: existingProfile.role === "investor" ? existingProfile.firmName || "" : "",
      thesis: existingProfile.role === "investor" ? existingProfile.thesis || "" : "",
      profilePicUrl: existingProfile.profilePicUrl,
      pitchVideoUrl: existingProfile.role === "builder" ? existingProfile.pitchVideoUrl : null,
    });
    if (existingProfile.role === "investor") {
      setTags(existingProfile.industries || []);
      setTicket(existingProfile.ticketSize || tickets[1]);
    }
  }, [existingProfile]);

  // After on-chain onboarding tx succeeds, persist verified flag + navigate
  useEffect(() => {
    if (!walletAddress || isEditing) return;
    if (isSuccess || isVerified) {
      persistBuilderProfile(true);
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isVerified, walletAddress, isEditing]);

  // Edit-mode safety net
  useEffect(() => {
    if (!isEditing || !walletAddress) return;
    if (!existingProfile) {
      navigate({ to: "/onboarding", search: {} as { edit?: boolean } });
    }
  }, [isEditing, walletAddress, navigate, existingProfile]);

  const steps =
    role === "builder"
      ? isEditing
        ? ["Identity", "Pitch video"]
        : ["Identity", "Pitch video", "Pay fee"]
      : ["Identity", "Thesis", "Preferences"];

  function toggle(t: string) {
    setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  const handleFileUpload = async (type: "profilePic" | "pitchVideo", file: File) => {
    setSubmitError(null);
    setUploading((p) => ({ ...p, [type]: true }));
    const result = await uploadFileToPinata(file);
    setUploading((p) => ({ ...p, [type]: false }));
    if (result.success && result.ipfsUrl) {
      setFormData((prev) => ({
        ...prev,
        ...(type === "profilePic"
          ? { profilePicUrl: result.ipfsUrl ?? null }
          : { pitchVideoUrl: result.ipfsUrl ?? null }),
      }));
    } else {
      setSubmitError(result.error || "Upload failed");
    }
  };

  function persistBuilderProfile(verified: boolean) {
    if (!walletAddress) return;
    const profile: UserProfile = {
      role: "builder",
      walletAddress,
      name: formData.name,
      location: formData.location,
      linkedin: formData.linkedin,
      twitter: formData.twitter,
      github: formData.github || undefined,
      profilePicUrl: formData.profilePicUrl,
      pitchVideoUrl: formData.pitchVideoUrl,
      joinedAt: existingProfile?.joinedAt || Date.now(),
      isVerified: verified,
    };
    setSaving(true);
    saveProfileTL(profile).catch(console.error).finally(() => setSaving(false));
  }

  function persistInvestorProfile() {
    if (!walletAddress) return;
    const profile: UserProfile = {
      role: "investor",
      walletAddress,
      name: formData.name,
      firmName: formData.firmName,
      thesis: formData.thesis,
      ticketSize: ticket,
      industries: tags,
      linkedin: formData.linkedin,
      twitter: formData.twitter,
      location: formData.location,
      profilePicUrl: formData.profilePicUrl,
      joinedAt: existingProfile?.joinedAt || Date.now(),
    };
    setSaving(true);
    saveProfileTL(profile).catch(console.error).finally(() => setSaving(false));
  }

  const handlePayAndEnter = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!formData.name.trim()) {
      setSubmitError("Please enter your name first.");
      setStep(0);
      return;
    }
    // In edit mode, no on-chain payment needed — just persist & exit.
    if (isEditing) {
      persistBuilderProfile(true);
      navigate({ to: "/profile" });
      return;
    }
    if (!isOnMantle) {
      setSubmitError("Please switch to Mantle Sepolia before paying.");
      return;
    }
    setSubmitError(null);
    // Persist a pre-tx draft so chat/profile pick it up while waiting
    persistBuilderProfile(false);
    payOnboarding();
  };

  const handleInvestorFinish = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!formData.name.trim()) {
      setSubmitError("Please enter your name first.");
      setStep(0);
      return;
    }
    persistInvestorProfile();
    navigate({ to: isEditing ? "/profile" : "/feed" });
  };

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen relative">
      <Orbs />
      <WrongNetworkBanner />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2" data-testid="onboarding-logo">
          <div className="h-8 w-8 rounded-lg bg-[var(--neon)] grid place-content-center neon-glow">
            <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">Nexis</span>
        </Link>
        {role && (
          <button
            onClick={() => {
              if (step > 0) {
                setStep(step - 1);
                return;
              }
              // Role is PERMANENTLY locked once set — bail to profile
              if (isEditing || roleLocked) {
                navigate({ to: "/profile" });
                return;
              }
              setRole(null);
            }}
            data-testid="onboarding-back-btn"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 0 && (isEditing || roleLocked) ? "Cancel" : "Back"}
          </button>
        )}
      </header>

      <main className="relative z-10 px-4 py-8 md:py-12 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {!role && !isEditing ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest text-center">
                Welcome
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mt-2 text-center">
                Who are you, anon?
              </h1>
              <p className="text-muted-foreground mt-3 text-center">
                Pick your side. You can switch later.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-10">
                {[
                  {
                    id: "builder" as const,
                    icon: Briefcase,
                    t: "I'm a Builder",
                    d: "I'm raising for my startup.",
                    fee: "1 MNT fee",
                    testId: "role-builder-btn",
                  },
                  {
                    id: "investor" as const,
                    icon: User,
                    t: "I'm an Investor",
                    d: "I deploy capital. No fees.",
                    fee: "Free",
                    testId: "role-investor-btn",
                  },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setRole(o.id);
                      setStep(0);
                    }}
                    data-testid={o.testId}
                    className="text-left glass rounded-2xl p-6 hover:neon-border hover:neon-glow transition-all duration-300 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[var(--neon)]/10 grid place-content-center mb-4 neon-border">
                      <o.icon className="h-4 w-4 text-[var(--neon)]" />
                    </div>
                    <div className="font-display font-bold text-lg">{o.t}</div>
                    <div className="text-sm text-muted-foreground mt-1">{o.d}</div>
                    <div className="mt-4 text-xs text-[var(--neon)]">{o.fee}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
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
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-2xl font-bold">Identity</h2>
                    <Field
                      label="Full name / alias"
                      placeholder="rhea.eth"
                      value={formData.name}
                      onChange={(v) => update("name", v)}
                      testId="onboard-name-input"
                    />
                    <Field
                      label="Location"
                      placeholder="Lisbon, PT • Remote"
                      value={formData.location}
                      onChange={(v) => update("location", v)}
                      testId="onboard-location-input"
                    />
                    <Field
                      label="LinkedIn URL"
                      placeholder="https://linkedin.com/in/…"
                      value={formData.linkedin}
                      onChange={(v) => update("linkedin", v)}
                      testId="onboard-linkedin-input"
                    />
                    <Field
                      label="X (Twitter)"
                      placeholder="@yourhandle"
                      value={formData.twitter}
                      onChange={(v) => update("twitter", v)}
                      testId="onboard-twitter-input"
                    />
                    {role === "builder" && (
                      <Field
                        label="GitHub URL (optional)"
                        placeholder="https://github.com/…"
                        value={formData.github}
                        onChange={(v) => update("github", v)}
                        testId="onboard-github-input"
                      />
                    )}
                    <UploadZone
                      label={
                        formData.profilePicUrl
                          ? "Profile picture uploaded to IPFS"
                          : "Upload profile picture"
                      }
                      done={!!formData.profilePicUrl}
                      loading={!!uploading.profilePic}
                      accept="image/*"
                      onFile={(f) => handleFileUpload("profilePic", f)}
                      testId="onboard-profile-upload"
                    />
                  </div>
                )}
                {step === 1 && role === "builder" && (
                  <div className="space-y-5">
                    <h2 className="font-display text-2xl font-bold">Intro pitch video</h2>
                    <p className="text-sm text-muted-foreground -mt-3">
                      Max 60 seconds. Stored on IPFS via Pinata.
                    </p>
                    <UploadZone
                      label={
                        formData.pitchVideoUrl
                          ? "Pitch video uploaded to IPFS"
                          : "Drag & drop your .mp4"
                      }
                      done={!!formData.pitchVideoUrl}
                      loading={!!uploading.pitchVideo}
                      accept="video/mp4,video/quicktime,video/webm"
                      onFile={(f) => handleFileUpload("pitchVideo", f)}
                      testId="onboard-video-upload"
                    />
                    <div className="glass rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-[var(--neon)] font-medium">Teleprompter:</span> Hi, I'm
                      [name]. I'm building [startup] to fix [problem]. Our wedge is [unique
                      insight]. We're raising [ask] at [stage].
                    </div>
                  </div>
                )}
                {step === 1 && role === "investor" && (
                  <div className="space-y-5">
                    <h2 className="font-display text-2xl font-bold">Investment thesis</h2>
                    <Field
                      label="Firm or fund name"
                      placeholder="Polychain Capital"
                      value={formData.firmName}
                      onChange={(v) => update("firmName", v)}
                      testId="onboard-firm-input"
                    />
                    <div>
                      <label className="text-xs uppercase tracking-widest text-muted-foreground">
                        Thesis
                      </label>
                      <textarea
                        rows={4}
                        value={formData.thesis}
                        onChange={(e) => update("thesis", e.target.value)}
                        placeholder="I back Web3 consumer apps with sub-30s onboarding…"
                        data-testid="onboard-thesis-input"
                        className="mt-2 w-full bg-transparent border-0 border-b border-white/10 focus:border-[var(--neon)] outline-none py-2 text-sm transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}
                {step === 2 && role === "builder" && (
                  <div className="space-y-5 text-center">
                    {isSuccess ? (
                      <>
                        <div className="h-16 w-16 rounded-2xl bg-[var(--neon)]/10 grid place-content-center mx-auto neon-border">
                          <Check className="h-8 w-8 text-[var(--neon)]" />
                        </div>
                        <h2 className="font-display text-2xl font-bold text-[var(--neon)]">
                          Welcome to Nexis!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Your builder badge has been minted. Redirecting...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="h-16 w-16 rounded-2xl bg-[var(--neon)]/10 grid place-content-center mx-auto neon-border">
                          <Wallet className="h-8 w-8 text-[var(--neon)]" />
                        </div>
                        <h2 className="font-display text-2xl font-bold">One-time onboarding</h2>
                        <p className="text-sm text-muted-foreground">
                          A 1 MNT fee gates the spam. Settled on Mantle Sepolia Testnet, mints a
                          soulbound "Verified Builder" badge.
                        </p>
                        <div className="glass rounded-2xl p-5 flex items-center justify-between">
                          <div className="text-left">
                            <div className="text-xs text-muted-foreground">Total due</div>
                            <div className="font-display text-3xl font-bold text-[var(--neon)]">
                              1 MNT
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>Gas est.</div>
                            <div className="font-mono">~0.0004 MNT</div>
                          </div>
                        </div>
                        {!isAuthenticated && (
                          <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
                            Connect your wallet to proceed with payment
                          </div>
                        )}
                        {isVerified && (
                          <div className="glass rounded-xl p-4 text-sm text-[var(--neon)] neon-border">
                            You're already a verified builder. You can skip this step.
                          </div>
                        )}
                        {(error || submitError) && (
                          <div
                            className="glass rounded-xl p-4 text-sm text-rose-400 border border-rose-500/30"
                            data-testid="onboard-error"
                          >
                            {submitError ||
                              error?.message ||
                              "Transaction failed. Please try again."}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {step === 2 && role === "investor" && (
                  <div className="space-y-6">
                    <h2 className="font-display text-2xl font-bold">Your matchmaking filter</h2>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-muted-foreground">
                        Ticket size
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {tickets.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTicket(t)}
                            data-testid={`ticket-${t.replace(/[^a-z0-9]/gi, "")}`}
                            className={`p-3 rounded-xl text-sm transition-all ${
                              ticket === t
                                ? "neon-border bg-[var(--neon)]/10 text-[var(--neon)]"
                                : "glass text-muted-foreground hover:text-white"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-muted-foreground">
                        Industries
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {industries.map((t) => {
                          const on = tags.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() => toggle(t)}
                              data-testid={`industry-${t}`}
                              className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-300 ${
                                on
                                  ? "bg-[var(--neon)] text-black font-semibold"
                                  : "glass text-muted-foreground hover:text-white"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {submitError && (
                      <div
                        className="glass rounded-xl p-4 text-sm text-rose-400 border border-rose-500/30"
                        data-testid="onboard-error"
                      >
                        {submitError}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-8">
                  <div className="text-xs text-muted-foreground">
                    Step {step + 1} of {steps.length}
                  </div>
                  {step < steps.length - 1 ? (
                    <button
                      onClick={() => {
                        setSubmitError(null);
                        if (step === 0 && !formData.name.trim()) {
                          setSubmitError("Name is required.");
                          return;
                        }
                        setStep(step + 1);
                      }}
                      data-testid="onboard-continue-btn"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : role === "builder" ? (
                    isEditing ? (
                      <button
                        onClick={handlePayAndEnter}
                        data-testid="onboard-save-btn"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all"
                      >
                        Save changes <Check className="h-4 w-4" />
                      </button>
                    ) : isAuthenticated && !isOnMantle && !isSuccess && !isVerified ? (
                      <NetworkGuard>
                        <></>
                      </NetworkGuard>
                    ) : (
                      <button
                        onClick={handlePayAndEnter}
                        disabled={isPending || isConfirming || isSuccess}
                        data-testid="onboard-pay-btn"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isPending || isConfirming ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isPending ? "Confirm in wallet..." : "Processing..."}
                          </>
                        ) : isSuccess ? (
                          <>
                            <Check className="h-4 w-4" /> Success!
                          </>
                        ) : !isAuthenticated ? (
                          <>
                            <Wallet className="h-4 w-4" /> Connect & Pay
                          </>
                        ) : isVerified ? (
                          <>
                            Continue <ArrowRight className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Pay 1 MNT <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handleInvestorFinish}
                      data-testid="onboard-investor-finish-btn"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all"
                    >
                      {isEditing ? (
                        <>
                          Save changes <Check className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Enter Nexis <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  testId,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="mt-1 w-full bg-transparent border-0 border-b border-white/10 focus:border-[var(--neon)] outline-none py-2 text-sm transition-colors"
      />
    </div>
  );
}

function UploadZone({
  label,
  done,
  loading,
  accept,
  onFile,
  testId,
}: {
  label: string;
  done: boolean;
  loading: boolean;
  accept: string;
  onFile: (f: File) => void;
  testId?: string;
}) {
  const inputId = `${testId ?? "upload"}-file`;
  return (
    <div>
      <label
        htmlFor={inputId}
        data-testid={testId}
        className="w-full border border-dashed border-white/15 hover:border-[var(--neon)] hover:bg-[var(--neon)]/5 rounded-2xl py-8 flex flex-col items-center gap-2 transition-all duration-300 group cursor-pointer"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 text-[var(--neon)] animate-spin" />
        ) : done ? (
          <Check className="h-5 w-5 text-[var(--neon)]" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-[var(--neon)]" />
        )}
        <div
          className={`text-sm ${done ? "text-[var(--neon)]" : "text-muted-foreground group-hover:text-white"}`}
        >
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground">Stored on IPFS via Pinata</div>
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
