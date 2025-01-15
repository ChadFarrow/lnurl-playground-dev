import { bech32 } from "bech32";

function decodeNpub(npub) {
  const decoded = bech32.decode(npub);
  return Buffer.from(bech32.fromWords(decoded.words)).toString("hex");
}

export default decodeNpub;
