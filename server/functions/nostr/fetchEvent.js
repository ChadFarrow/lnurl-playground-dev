import WebSocket from "ws";
import { Relay } from "nostr-tools/relay";
import { useWebSocketImplementation } from "nostr-tools/relay";
import { relayUrls } from "./relayUrls.js";

useWebSocketImplementation(WebSocket);

const TIMEOUT_MS = 1000; // Adjust timeout duration as needed

async function fetchEvent(eventId, publicKey) {
  for (const url of relayUrls) {
    const relay = await Relay.connect(url);

    try {
      const event = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          relay.close();
          reject(new Error("Timeout"));
        }, TIMEOUT_MS);

        relay.subscribe(
          [
            {
              ids: [eventId], // Filter by event ID
              authors: [publicKey], // Filter by public key
            },
          ],
          {
            onevent(event) {
              clearTimeout(timeout);
              resolve(event); // Resolve with the event
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
        relay.close();
      }
    }
  }

  throw new Error("No event found on any relay.");
}

export default fetchEvent;
