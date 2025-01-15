import { bech32 } from "bech32";

function encodeNpub(publicKeyHex) {
  const publicKeyBytes = Buffer.from(publicKeyHex, "hex");
  const words = bech32.toWords(publicKeyBytes);
  return bech32.encode("npub", words);
}

export default encodeNpub;
