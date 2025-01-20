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
let dNsec = decrypt(token, eNsec);
console.log(dNsec);
let _sk = decodeNsec(dNsec);

console.log(_sk);
