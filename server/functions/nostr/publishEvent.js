import { finalizeEvent } from "nostr-tools/pure";

async function publishEvent(pool, relays, eventTemplate, secretKey) {
  const signedEvent = finalizeEvent(eventTemplate, secretKey);

  try {
    await Promise.any(pool.publish(relays, signedEvent));
    console.log("published to at least one relay!");
  } catch (err) {
    console.error("Failed to publish event:", err);
  }
}

export default publishEvent;
