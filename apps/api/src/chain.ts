import { createPublicClient, createWalletClient, http, defineChain, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon, polygonAmoy } from "viem/chains";
import { halaalCertificationAbi } from "./abi";

const chainId = Number(process.env.CHAIN_ID ?? "80002");
const rpcUrl = chainId === 137 ? process.env.POLYGON_RPC_URL : process.env.AMOY_RPC_URL;

// Local Hardhat node (31337) is not a built-in viem chain; register it so the
// relayer signs with the correct chainId.
const hardhat = defineChain({
  id: 31337,
  name: "Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl ?? "http://127.0.0.1:8545"] } },
});

const chain = chainId === 137 ? polygon : chainId === 80002 ? polygonAmoy : hardhat;

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(rpcUrl ?? "https://polygon-amoy.g.alchemy.com/v2/demo"),
});

// Gas-abstracted relayer wallet (PRD §5.2). Private key must come from KMS in prod.
function buildRelayer(): WalletClient | null {
  const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) return null;
  const account = privateKeyToAccount(pk);
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl ?? "https://polygon-amoy.g.alchemy.com/v2/demo"),
  });
}

export const relayer = buildRelayer();

export interface IssueArgs {
  to: `0x${string}`;
  businessName: string;
  registrationNumber: string;
  countryCode: `0x${string}`; // bytes2, e.g. 0x5a41
  businessDataHash: `0x${string}`;
  category: string;
  productLine: string;
  standard: string;
  exclusions: string[];
  auditorAddress: `0x${string}`;
  auditorName: string;
  auditDocHash: `0x${string}`;
  ipfsCid: string;
  auditDate: number;
  validityDays: number;
  tokenUri: string;
}

export async function issueOnChain(args: IssueArgs): Promise<{ txHash: string; tokenId: bigint }> {
  if (!relayer) throw new Error("RELAYER_PRIVATE_KEY is not configured");
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS is not configured");

  const { request } = await (publicClient as any).simulateContract({
    account: relayer.account,
    address: contractAddress,
    abi: halaalCertificationAbi,
    functionName: "issueCertificate",
    args: [
      args.to,
      {
        businessName: args.businessName,
        registrationNumber: args.registrationNumber,
        countryCode: args.countryCode,
        businessDataHash: args.businessDataHash,
      },
      {
        category: args.category,
        productLine: args.productLine,
        standard: args.standard,
        exclusions: args.exclusions,
      },
      {
        auditorAddress: args.auditorAddress,
        auditorName: args.auditorName,
        auditDocHash: args.auditDocHash,
        ipfsCid: args.ipfsCid,
        auditDate: BigInt(args.auditDate),
      },
      BigInt(args.validityDays),
      args.tokenUri,
    ],
  });

  const txHash = await relayer.writeContract(request);
  const receipt = await (publicClient as any).waitForTransactionReceipt({ hash: txHash });

  // Decode the CertificateIssued event to recover the minted tokenId.
  const logs = await (publicClient as any).getContractEvents({
    address: contractAddress,
    abi: halaalCertificationAbi,
    eventName: "CertificateIssued",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });
  const tokenId = logs?.[0]?.args?.tokenId ?? 0n;

  return { txHash, tokenId };
}

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;

export interface OnChainCertificate {
  tokenId: bigint;
  businessName: string;
  registrationNumber: string;
  countryCode: string; // hex bytes2 e.g. 0x5a41
  businessDataHash: string;
  category: string;
  productLine: string;
  standard: string;
  exclusions: string[];
  auditorAddress: string;
  auditorName: string;
  auditDocHash: string;
  ipfsCid: string;
  auditDate: bigint;
  issuedAt: bigint;
  expiresAt: bigint;
  revoked: boolean;
  revocationReason: string;
  revokedAt: bigint;
  renewalCount: bigint;
  previousTokenId: bigint;
  supersededBy: bigint;
  issuedBy: string;
}

export async function readCertificate(
  tokenId: number,
  request?: { log?: { warn?: (err: unknown, msg: string) => void } }
): Promise<{
  verify: { valid: boolean; status: string; businessName: string; expiresAt: bigint; ipfsCid: string };
  cert: any;
  daysRemaining: bigint;
} | null> {
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS is not configured");
  }

  const client = publicClient as any;

  // verifyCertificate returns a tuple and never reverts (NOT_FOUND for unknown tokens).
  const verify = await client.readContract({
    address: contractAddress,
    abi: halaalCertificationAbi,
    functionName: "verifyCertificate",
    args: [BigInt(tokenId)],
  });

  const [valid, status, businessName, expiresAt, ipfsCid] = verify as [
    boolean,
    string,
    string,
    bigint,
    string,
  ];

  if (status === "NOT_FOUND") {
    return null;
  }

  // Enrichment reads. If the node hiccups here (after verifyCertificate
  // already succeeded) we must not 502 — fall back to on-chain-only.
  let cert: any = null;
  let daysRemaining: bigint = 0n;
  try {
    [cert, daysRemaining] = await Promise.all([
      client.readContract({
        address: contractAddress,
        abi: halaalCertificationAbi,
        functionName: "getCertificate",
        args: [BigInt(tokenId)],
      }),
      client.readContract({
        address: contractAddress,
        abi: halaalCertificationAbi,
        functionName: "daysRemaining",
        args: [BigInt(tokenId)],
      }),
    ]);
  } catch (err) {
    request?.log?.warn?.(err, "enrichment reads failed; returning on-chain verify only");
  }

  return { verify: { valid, status, businessName, expiresAt, ipfsCid }, cert, daysRemaining };
}
