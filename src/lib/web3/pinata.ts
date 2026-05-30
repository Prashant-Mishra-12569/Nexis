const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface UploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Upload a file to IPFS via Pinata
 */
export async function uploadFileToPinata(file: File): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        app: "nexis",
        type: file.type,
      },
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", options);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const data: PinataResponse = await response.json();

    return {
      success: true,
      ipfsHash: data.IpfsHash,
      ipfsUrl: `${PINATA_GATEWAY}/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Pinata upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadJSONToPinata(json: object, name: string): Promise<UploadResult> {
  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: {
          name: name,
          keyvalues: {
            app: "nexis",
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata JSON upload failed: ${error}`);
    }

    const data: PinataResponse = await response.json();

    return {
      success: true,
      ipfsHash: data.IpfsHash,
      ipfsUrl: `${PINATA_GATEWAY}/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Pinata JSON upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Create NFT metadata for Deal Badge with dynamic, custom-generated certificate SVG
 */
export async function createDealNFTMetadata(data: {
  startupName: string;
  builderAddress: string;
  investorAddress: string;
  date: string;
  industry: string;
}): Promise<UploadResult> {
  const builder = data.builderAddress.toLowerCase();
  const investor = data.investorAddress.toLowerCase();
  const dateStr = data.date;
  const startup = data.startupName;

  // Premium neon-themed Proof of Funding certificate SVG
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020806" />
      <stop offset="50%" stop-color="#071b12" />
      <stop offset="100%" stop-color="#020806" />
    </linearGradient>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00ff9d" />
      <stop offset="100%" stop-color="#00d2ff" />
    </linearGradient>
    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect width="800" height="800" fill="url(#bgGrad)" />

  <rect x="40" y="40" width="720" height="720" rx="30" fill="none" stroke="url(#neonGlow)" stroke-width="4" filter="url(#glowEffect)" opacity="0.8" />
  <rect x="40" y="40" width="720" height="720" rx="30" fill="none" stroke="#00ff9d" stroke-width="1.5" opacity="0.9" />

  <rect x="80" y="80" width="640" height="640" rx="20" fill="#ffffff" fill-opacity="0.03" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08" />

  <path d="M 60,110 L 60,60 L 110,60" fill="none" stroke="#00ff9d" stroke-width="3" />
  <path d="M 740,110 L 740,60 L 690,60" fill="none" stroke="#00ff9d" stroke-width="3" />
  <path d="M 60,690 L 60,740 L 110,740" fill="none" stroke="#00ff9d" stroke-width="3" />
  <path d="M 740,690 L 740,740 L 690,740" fill="none" stroke="#00ff9d" stroke-width="3" />

  <g transform="translate(400, 170)">
    <path d="M -30,-40 L 30,-40 L 45,-10 L 0,40 L -45,-10 Z" fill="none" stroke="url(#neonGlow)" stroke-width="3" filter="url(#glowEffect)" />
    <circle cx="0" cy="-10" r="12" fill="none" stroke="#00ff9d" stroke-width="2" />
    <path d="M -8,-10 L -2,-16 L 8,-6" fill="none" stroke="#00ff9d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <text x="400" y="270" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="4">
    NEXIS SOULBOUND BADGE
  </text>
  <text x="400" y="305" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#00ff9d" letter-spacing="6">
    PROOF OF FUNDING
  </text>

  <line x1="250" y1="340" x2="550" y2="340" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />

  <text x="400" y="390" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="400" fill="#8e9f97">
    This certifies a successful connection and closed deal for
  </text>

  <text x="400" y="445" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="800" fill="#ffffff" filter="url(#glowEffect)" letter-spacing="1">
    ${startup}
  </text>

  <g transform="translate(140, 500)" font-family="system-ui, sans-serif">
    <text x="0" y="20" font-size="14" font-weight="600" fill="#5c7a6e" letter-spacing="1">BUILDER ADDRESS</text>
    <text x="0" y="45" font-size="13" font-weight="700" fill="#ffffff" font-family="monospace">${builder}</text>

    <text x="0" y="90" font-size="14" font-weight="600" fill="#5c7a6e" letter-spacing="1">INVESTOR ADDRESS</text>
    <text x="0" y="115" font-size="13" font-weight="700" fill="#ffffff" font-family="monospace">${investor}</text>

    <text x="0" y="160" font-size="14" font-weight="600" fill="#5c7a6e" letter-spacing="1">DATE CERTIFIED</text>
    <text x="0" y="185" font-size="14" font-weight="700" fill="#00d2ff">${dateStr}</text>
  </g>

  <text x="400" y="715" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#5c7a6e" letter-spacing="2">
    MANTLE TESTNET NETWORK • SECURED ON-CHAIN
  </text>
</svg>`;

  let imageIpfsUrl = "ipfs://QmNexisLogoPlaceholder";

  try {
    // 1. Create File from the custom SVG certificate content
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const file = new File([blob], `nexis-deal-badge-${startup.replace(/[^a-zA-Z0-9]/g, "")}.svg`, { type: "image/svg+xml" });

    // 2. Upload SVG to IPFS
    const uploadResult = await uploadFileToPinata(file);
    if (uploadResult.success && uploadResult.ipfsHash) {
      imageIpfsUrl = `ipfs://${uploadResult.ipfsHash}`;
      console.log("[Pinata] Dynamic Certificate SVG pinned to IPFS:", imageIpfsUrl);
    }
  } catch (e) {
    console.error("[Pinata] Certificate SVG generation/upload failed, falling back to placeholder:", e);
  }

  // 3. Build metadata JSON
  const metadata = {
    name: `Nexis Funded Badge - ${startup}`,
    description: `Proof of Funding badge for ${startup}. This soulbound NFT represents a successful funding connection made on the Nexis platform.`,
    image: imageIpfsUrl,
    attributes: [
      { trait_type: "Startup", value: startup },
      { trait_type: "Date", value: dateStr },
      { trait_type: "Industry", value: data.industry },
      { trait_type: "Platform", value: "Nexis" },
      { trait_type: "Network", value: "Mantle" },
      { trait_type: "Type", value: "Soulbound" },
    ],
    properties: {
      builder: builder,
      investor: investor,
    },
  };

  return uploadJSONToPinata(metadata, `nexis-deal-${startup}-${Date.now()}`);
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hash: string): string {
  if (hash.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${hash.replace("ipfs://", "")}`;
  }
  if (hash.startsWith("Qm") || hash.startsWith("bafy")) {
    return `${PINATA_GATEWAY}/${hash}`;
  }
  return hash;
}
