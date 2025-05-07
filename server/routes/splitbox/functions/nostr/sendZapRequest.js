import { getEventHash, validateEvent } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";

/**
 * Convert bech32 nsec to raw hex private key
 */
function nsecToHex(nsec) {
  const { type, data } = nip19.decode(nsec);
  if (type !== "nsec") throw new Error("Invalid nsec");
  return data;
}

/**
 * Fetch Kind 0 metadata for sender
 */
async function fetchSenderMetadata(pubkey, relays) {
  const pool = new SimplePool();

  return new Promise((resolve, reject) => {
    const sub = pool.subscribe(relays, [
      {
        kinds: [0],
        authors: [pubkey],
      },
    ]);

    sub.on("event", (event) => {
      try {
        const metadata = JSON.parse(event.content);
        resolve({ ...metadata, pubkey });
      } catch (err) {
        reject(new Error("Failed to parse metadata"));
      } finally {
        sub.unsub();
      }
    });

    sub.on("eose", () => {
      reject(new Error("No metadata found"));
      sub.unsub();
    });
  });
}

/**
 * Build, sign, publish, and return a zap receipt with sender metadata
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

  const pTag = zapRequest.tags.find((t) => t[0] === "p");
  if (!pTag) throw new Error("Missing 'p' tag in zap request");
  tags.push(["p", pTag[1]]);

  if (zapRequest.pubkey) {
    tags.push(["P", zapRequest.pubkey]);
  }

  const eTag = zapRequest.tags.find((t) => t[0] === "e");
  if (eTag) tags.push(["e", eTag[1]]);

  const aTag = zapRequest.tags.find((t) => t[0] === "a");
  if (aTag) tags.push(["a", aTag[1]]);

  tags.push(["bolt11", bolt11]);
  tags.push(["description", JSON.stringify(zapRequest)]);

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

  const signed = finalizeEvent(receipt, privkey);

  if (!validateEvent(signed)) {
    throw new Error("Zap receipt is invalid");
  }

  // Extract relays from 9734 or fallback
  const relayTag = zapRequest.tags.find((t) => t[0] === "relays");
  const relays =
    Array.isArray(relayTag) && relayTag.length > 1
      ? relayTag.slice(1)
      : [
          "wss://relay.damus.io",
          "wss://relay.snort.social",
          "wss://relay.nostr.band",
        ];

  // Publish to each relay
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

  // Optional: fetch sender metadata
  let senderInfo = null;
  if (zapRequest.pubkey) {
    try {
      senderInfo = await fetchSenderMetadata(zapRequest.pubkey, relays);
    } catch (e) {
      console.warn("Could not fetch sender metadata:", e.message);
    }
  }

  return {
    event: signed,
    sender: senderInfo,
  };
}
