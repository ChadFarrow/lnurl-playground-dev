import WebSocket from "ws";
import { SimplePool } from "nostr-tools";
import { useWebSocketImplementation } from "nostr-tools/pool";
import { relayUrls } from "./relayUrls.js";

useWebSocketImplementation(WebSocket);

async function fetchEvent(eventId, publicKey) {
  const pool = new SimplePool(); // Create a SimplePool instance

  return new Promise((resolve, reject) => {
    try {
      // Define the subscription
      const subscription = pool.subscribeMany(
        relayUrls, // Array of relay URLs
        [
          {
            ids: [eventId], // Filter by event ID
            authors: [publicKey], // Filter by public key
          },
        ],
        {
          // Event handler for received events
          onevent(event) {
            console.log("evt: ", event);
            resolve(event.tags); // Resolve the promise with event tags
          },

          // End of stored events (EOSE) handler
          oneose() {
            subscription.close(); // Close the subscription after EOSE
            pool.close(relayUrls);
          },
        }
      );
    } catch (error) {
      console.log("err: ", error);
      reject(error); // Reject the promise if an error occurs
    }
  });
}

export default fetchEvent;
