import {
  getEventHash,
  signEvent,
  validateEvent,
  getPublicKey,
  SimplePool,
  nip19,
} from "nostr-tools";

/**
 * Converts an `nsec` to raw hex private key
 * @param {string} nsec - bech32 encoded private key
 * @returns {string} - hex private key
 */
function nsecToHex(nsec) {
  const { type, data } = nip19.decode(nsec);
  if (type !== "nsec") throw new Error("Invalid nsec");
  return data;
}

/**
 * Sends a NIP-57 zap receipt (kind 9735) event
 * @param {Object} opts
 * @param {Object} opts.zapRequest - the original 9734 zap request
 * @param {string} opts.bolt11 - the paid invoice string
 * @param {number} opts.paidAt - timestamp of payment (in seconds)
 * @param {string} opts.nsec - your LNURL server's nsec (bech32)
 * @param {string|null} [opts.preimage] - optional LN payment preimage
 * @returns {Object} - signed 9735 event
 */
export async function sendZapReceipt({
  zapRequest,
  bolt11,
  paidAt,
  nsec,
  preimage = null,
}) {
  const privkey = nsecToHex(nsec);
  const pubkey = getPublicKey(privkey);

  const tags = [];

  // Required: recipient pubkey
  const pTag = zapRequest.tags.find((t) => t[0] === "p");
  if (!pTag) throw new Error("Missing 'p' tag in zap request");
  tags.push(["p", pTag[1]]);

  // Optional: sender pubkey
  if (zapRequest.pubkey) {
    tags.push(["P", zapRequest.pubkey]);
  }

  // Optional: original zapped event
  const eTag = zapRequest.tags.find((t) => t[0] === "e");
  if (eTag) {
    tags.push(["e", eTag[1]]);
  }

  // Optional: addressable content
  const aTag = zapRequest.tags.find((t) => t[0] === "a");
  if (aTag) {
    tags.push(["a", aTag[1]]);
  }

  // Required: paid invoice and original request
  tags.push(["bolt11", bolt11]);
  tags.push(["description", JSON.stringify(zapRequest)]);

  // Optional: LN preimage
  if (preimage) {
    tags.push(["preimage", preimage]);
  }

  const receipt = {
    kind: 9735,
    pubkey,
    created_at: paidAt,
    content: "",
    tags,
  };

  const signed = {
    ...receipt,
    id: getEventHash(receipt),
    sig: signEvent(receipt, privkey),
  };

  if (!validateEvent(signed)) {
    throw new Error("Zap receipt is invalid after signing");
  }

  // Relay broadcast
  const relayTag = zapRequest.tags.find((t) => t[0] === "relays");
  if (!relayTag) throw new Error("Missing 'relays' tag in zap request");
  const relays = relayTag.slice(1);

  const pool = new SimplePool();
  await Promise.allSettled(
    relays.map(async (url) => {
      try {
        await pool.publish(url, signed);
      } catch (err) {
        console.error(`Failed to publish to ${url}:`, err);
      }
    })
  );

  return signed;
}
