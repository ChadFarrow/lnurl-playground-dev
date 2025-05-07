import { getEventHash, validateEvent } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";

/**
 * Convert bech32 nsec to raw hex private key.
 */
function nsecToHex(nsec) {
  const { type, data } = nip19.decode(nsec);
  if (type !== "nsec") throw new Error("Invalid nsec");
  return data;
}

/**
 * Fetch Kind 0 metadata for sender.
 */
async function fetchSenderMetadata(pubkey, relays) {
  const pool = new SimplePool();

  return new Promise((resolve, reject) => {
    // Use callbacks directly instead of event emitter pattern
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [0], authors: [pubkey] }],
      {
        onevent(event) {
          sub.close();
          try {
            const metadata = JSON.parse(event.content);
            resolve({ ...metadata, pubkey });
          } catch {
            reject(new Error("Invalid metadata JSON"));
          }
        },
        oneose() {
          sub.close();
          reject(new Error("No metadata found"));
        },
      }
    );
  });
}

/**
 * Build, sign, publish, and return a zap receipt with sender metadata.
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

  const p = zapRequest.tags.find((t) => t[0] === "p")?.[1];
  if (!p) throw new Error("Missing 'p' tag");
  tags.push(["p", p]);

  const e = zapRequest.tags.find((t) => t[0] === "e")?.[1];
  if (e) tags.push(["e", e]);

  const a = zapRequest.tags.find((t) => t[0] === "a")?.[1];
  if (a) tags.push(["a", a]);

  const senderPubkey = zapRequest.pubkey;
  if (senderPubkey) tags.push(["P", senderPubkey]);

  tags.push(["bolt11", bolt11]);
  tags.push(["description", JSON.stringify(zapRequest)]);
  if (preimage) tags.push(["preimage", preimage]);

  const event = finalizeEvent(
    {
      kind: 9735,
      pubkey,
      created_at: paidAt,
      content: "",
      tags,
    },
    privkey
  );

  if (!validateEvent(event)) throw new Error("Invalid zap receipt");

  // Extract relay information and ensure it's always an array
  const relayTag = zapRequest.tags.find((t) => t[0] === "relays");
  const relays =
    Array.isArray(relayTag) && relayTag.length > 1
      ? relayTag.slice(1)
      : [
          "wss://relay.damus.io",
          "wss://relay.snort.social",
          "wss://relay.nostr.band",
        ];

  // Make sure relays is a proper array and not some other iterable
  const relayArray = Array.isArray(relays) ? relays : [relays];

  const pool = new SimplePool();
  try {
    // Use publishEvent instead of trying to publish to individual relays
    const pubs = pool.publish(relayArray, event);
    await Promise.allSettled(pubs);
  } catch (err) {
    console.error(`Failed to publish event:`, err.message);
  }

  let sender = null;
  if (senderPubkey) {
    try {
      sender = await fetchSenderMetadata(senderPubkey, relayArray);
    } catch (e) {
      console.warn("Could not fetch sender metadata:", e.message);
    }
  }

  return { event, sender };
}
