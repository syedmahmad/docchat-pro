import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("fe81") ||
    normalized.startsWith("fe82") ||
    normalized.startsWith("fe83") ||
    normalized.startsWith("fe84") ||
    normalized.startsWith("fe85") ||
    normalized.startsWith("fe86") ||
    normalized.startsWith("fe87") ||
    normalized.startsWith("fe88") ||
    normalized.startsWith("fe89") ||
    normalized.startsWith("fe8a") ||
    normalized.startsWith("fe8b") ||
    normalized.startsWith("fe8c") ||
    normalized.startsWith("fe8d") ||
    normalized.startsWith("fe8e") ||
    normalized.startsWith("fe8f") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "localhost.localdomain" ||
    normalized.endsWith(".local") ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return false;
}

export async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  if (isLocalHostname(url.hostname)) {
    throw new Error("Localhost and private network addresses are not allowed.");
  }

  if (net.isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("Localhost and private network addresses are not allowed.");
  }

  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error("Could not resolve that host.");
  }

  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Localhost and private network addresses are not allowed.");
  }
}
