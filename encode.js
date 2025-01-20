import { encrypt, decrypt } from "./server/functions/crypto/cipher.js";
import encodeNsec from "./server/functions/nostr/encodeNsec.js";
import decodeNsec from "./server/functions/nostr/decodeNsec.js";
import skToHex from "./server/functions/nostr/skToHex.js";

import dotenv from "dotenv";
import { generateSecretKey } from "nostr-tools/pure";

dotenv.config();

let token = process.env.NOSTRSS_TOKEN;
let sk = generateSecretKey();
console.log(skToHex(sk));
let nsec = encodeNsec(sk);
console.log(nsec);
let eNsec = encrypt(token, nsec);
console.log("store this: ", eNsec);
let dNsec = decrypt(
  token,
  "5b8499681ce6e84d029d707ddc4f7ed7c498993f026c18d42b7f5a4ab9d2e87acb135f374f06d3f7f8b578c4df4637e45bd7fe990c1328c7be3d5649e3c9792b"
);
console.log(dNsec);
let _sk = decodeNsec(dNsec);

console.log(_sk);
