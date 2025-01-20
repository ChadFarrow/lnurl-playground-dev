import bech32 from "bech32";

function encodeNsec(secretKeyHex) {
  const secretKeyBytes = Buffer.from(secretKeyHex, "hex");
  const words = bech32.toWords(secretKeyBytes);
  return bech32.encode("nsec", words);
}

export default encodeNsec;
