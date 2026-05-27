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
 * Create NFT metadata for Deal Badge
 */
export async function createDealNFTMetadata(data: {
  startupName: string;
  builderAddress: string;
  investorAddress: string;
  date: string;
  industry: string;
}): Promise<UploadResult> {
  const metadata = {
    name: `Nexis Funded Badge - ${data.startupName}`,
    description: `Proof of Funding badge for ${data.startupName}. This soulbound NFT represents a successful funding connection made on the Nexis platform.`,
    image: "ipfs://QmNexisLogoPlaceholder", // Replace with actual logo IPFS hash
    attributes: [
      { trait_type: "Startup", value: data.startupName },
      { trait_type: "Date", value: data.date },
      { trait_type: "Industry", value: data.industry },
      { trait_type: "Platform", value: "Nexis" },
      { trait_type: "Network", value: "Mantle" },
      { trait_type: "Type", value: "Soulbound" },
    ],
    properties: {
      builder: data.builderAddress,
      investor: data.investorAddress.slice(0, 10) + "..." + data.investorAddress.slice(-8), // Privacy
    },
  };

  return uploadJSONToPinata(metadata, `nexis-deal-${data.startupName}-${Date.now()}`);
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
