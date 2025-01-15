import { SimplePool } from "nostr-tools";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import WebSocket from "ws";
import { useWebSocketImplementation } from "nostr-tools/pool";
import { SimplePool } from "nostr-tools";
import { createEpisode } from "./createEpisode.js";
import { relayUrls } from "./relayUrls.js";
import { publishEvent } from "./publishEvent.js";
import { createProfile } from "./createProfile.js";

useWebSocketImplementation(WebSocket);

async function createEpisode({
  feedGuid,
  itemGuid,
  feedTitle,
  itemTitle,
  imgSrc,
  mediaSrc,
}) {
  // Initialize a relay pool
  const pool = new SimplePool();

  let sk = generateSecretKey();
  let pk = getPublicKey(sk);

  // Event template
  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["feed_guid", feedGuid],
      ["item_guid", itemGuid],
      ["feed_title", feedTitle],
      ["item_title", itemTitle],
      ["img_src", imgSrc],
      ["media_src", mediaSrc],
    ],
    content: `${feedTitle} ${itemTitle}\n${imgSrc}\n${mediaSrc}`,
  };

  // Subscribe to events from all relays using subscribeMany
  const subscription = pool.subscribeMany(
    relayUrls,
    [
      {
        kinds: [1],
        authors: [pk],
      },
    ],
    {
      async onevent(event) {
        // console.log("Received event:", event);
        let profileEventTemplate = {
          content: createProfile({
            name: `${feedTitle} ${itemTitle}`,
            picture: imgSrc,
            lud16: `${event.id}@thesplitbox.com`,
          }),
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
        };
        await publishEvent(pool, relayUrls, profileEventTemplate, sk);
      },
      oneose() {
        subscription.close();
        // pool.close(relayUrls);
      },
    }
  );

  // Publish an event
  try {
    await publishEvent(pool, relayUrls, eventTemplate, sk);
  } catch (error) {
    console.log(error);
  }

  // Close relay connections after 60 seconds
  setTimeout(() => {
    pool.close(relayUrls);
    console.log("Closed all relay connections.");
  }, 10000);
}

export default createEpisode;
