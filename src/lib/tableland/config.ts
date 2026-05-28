/**
 * Tableland Configuration for Nexis on Mantle Sepolia
 * Table names are stored after initial setup.
 */

// Mantle Sepolia chain ID
export const CHAIN_ID = 5003;

// Tableland table name storage key (browser cache for performance)
const TABLE_NAMES_KEY = "nexis_tableland_tables";

export interface TableNames {
  profiles: string;
  ideas: string;
  matches: string;
  swipes: string;
  saved: string;
  sentiment: string;
}

// Default empty — populated after setup wizard runs
let _cached: TableNames | null = null;

export function getTableNames(): TableNames | null {
  if (_cached) return _cached;
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TABLE_NAMES_KEY);
  if (!raw) return null;
  try {
    _cached = JSON.parse(raw) as TableNames;
    return _cached;
  } catch {
    return null;
  }
}

export function setTableNames(names: TableNames): void {
  _cached = names;
  if (typeof window !== "undefined") {
    localStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(names));
  }
}

export function isTablesReady(): boolean {
  return getTableNames() !== null;
}

// Controller contract ABI (AllowAll)
export const ALLOW_ALL_CONTROLLER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "caller", type: "address" },
      { internalType: "uint256", name: "tableId", type: "uint256" },
    ],
    name: "getPolicy",
    outputs: [
      {
        components: [
          { internalType: "bool", name: "allowInsert", type: "bool" },
          { internalType: "bool", name: "allowUpdate", type: "bool" },
          { internalType: "bool", name: "allowDelete", type: "bool" },
          { internalType: "string", name: "whereClause", type: "string" },
          { internalType: "string", name: "withCheck", type: "string" },
          { internalType: "string[]", name: "updatableColumns", type: "string[]" },
        ],
        internalType: "struct ITablelandController.Policy",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;

// Pre-compiled bytecode for AllowAll controller
// Solidity: returns Policy(true, true, true, "", "", [])
export const ALLOW_ALL_CONTROLLER_BYTECODE =
  "0x608060405234801561001057600080fd5b50610260806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806311b4370214610030575b600080fd5b610043600480360381019061003e9190610106565b610059565b6040516100509190610218565b60405180910390f35b61006161009f565b60016001600160a01b03168152600160208201526001604082015260608082018190526080820181905260a08201525b919050565b6040518060c001604052806000151581526020016000151581526020016000151581526020016060815260200160608152602001606081525090565b600080604083850312156100f957600080fd5b50508035926020909101359150565b6000806040838503121561011957600080fd5b82356001600160a01b038116811461013057600080fd5b946020939093013593505050565b600060c08201905082511515825260208301511515602083015260408301511515604083015260608301516060830152608083015160808301526101848360a08401610191565b60a083015292915050565b600060208201905082518252602083015160208301526040830151604083015292915050565b600060c082019050825115158252602083015115156020830152604083015115156040830152606083015161020560608401826060808252600090820152602081019050604081019050565b60808401525060a083015160a08301529291505056fea164736f6c6343" as `0x${string}`;

// Tableland Registry address for Mantle Sepolia
// This is the standard Tableland Tables contract
export const TABLELAND_REGISTRY = "0x4b48841d4b32C4650E4ABc117A03FE8B51f38F68" as const;

// Stored controller address (set after deployment)
const CONTROLLER_KEY = "nexis_tableland_controller";

export function getControllerAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONTROLLER_KEY);
}

export function setControllerAddress(addr: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONTROLLER_KEY, addr);
  }
}
