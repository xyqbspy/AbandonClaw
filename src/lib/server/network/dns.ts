import dns from "node:dns";

let applied = false;

export const ensureIpv4FirstDns = () => {
  if (applied) return;
  try {
    dns.setDefaultResultOrder("ipv4first");
    applied = true;
  } catch {
    // Ignore unsupported runtimes and keep the process bootable.
  }
};
