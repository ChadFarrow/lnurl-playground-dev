import { bech32 } from "bech32";

function decodeNsec(nsec) {
  const decoded = bech32.decode(nsec);
  return Buffer.from(bech32.fromWords(decoded.words)).toString("hex");
}

export default decodeNsec;
