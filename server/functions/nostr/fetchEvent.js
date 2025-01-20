import WebSocket from "ws";
import { Relay } from "nostr-tools/relay";
import { useWebSocketImplementation } from "nostr-tools/relay";
import { relayUrls } from "./relayUrls.js";

useWebSocketImplementation(WebSocket);

const TIMEOUT_MS = 5000; // Adjust timeout duration as needed

async function fetchEvent(eventId, publicKey, relays) {
  let _relays = [...new Set(relays.concat(relayUrls))];
  console.log(_relays);

  for (const url of _relays) {
    // Use the merged _relays array
    let relay;
    try {
      relay = await Relay.connect(url);

      const event = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout"));
        }, TIMEOUT_MS);

        const sub = relay.subscribe(
          [
            {
              ids: [eventId], // Filter by event ID
              authors: [publicKey], // Filter by public key
            },
          ],
          {
            onevent(event) {
              clearTimeout(timeout);
              sub.unsub(); // Ensure subscription cleanup
              resolve(event);
            },
          }
        );
      });

      console.log(`Event found on relay ${url}:`, event);
      relay.close();
      return event; // Return the event immediately if found
    } catch (error) {
      console.log(`Relay ${url} failed: ${error.message}`);
      // Continue to the next relay
    } finally {
      if (relay && relay.status === WebSocket.OPEN) {
        relay.close(); // Ensure relay is closed
      }
    }
  }

  throw new Error("No event found on any relay.");
}

export default fetchEvent;
