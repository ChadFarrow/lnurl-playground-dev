import dotenv from "dotenv";
import { sendZapReceipt } from "./server/routes/splitbox/functions/nostr/sendZapRequest.js";

dotenv.config();

// Set this to false when running as a script
process.env.RUNNING_AS_SERVER = false;

const nostr = {
  kind: 9734,
  created_at: 1746586606,
  content: "",
  tags: [
    ["p", "4484c8d3dfcefab6cd348d2ff05f50873d5a59811c141f9f3b1b227ddef143df"],
    [
      "relays",
      "wss://relay.damus.io/",
      "wss://nos.lol/",
      "wss://strfry.iris.to/",
    ],
    ["amount", "50000"],
    ["e", "9e84e50b1f218f74c6e80fd3f408e7a531886836aaffad6d420203c6ead7b039"],
  ],
  pubkey: "23103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403",
  id: "ab942b2dba78e0f76c443ff18b9e5e996ea195f66938a47848cbce6aef0de79c",
  sig: "27d0cb041cb1c9832ad9af984143123d8556f39acfd279d04c020700e56b4d06a413a638fcf3b41e3fc222383b1116a4e352e015e45c7d4864ebe1ce1ba4efb3",
};
(async () => {
  try {
    console.log("Starting zap receipt send...");
    const { event, sender } = await sendZapReceipt({
      zapRequest: nostr,
      bolt11:
        "lnbc210n1p5p5jcqdr0dp68gurn8ghj7argv4ehqmrfw33x77pwvdhk6tmdv46xzerpw3sj7ef5vvcnwdecxgknzcejxskngef58qkkzv3svsknvdfexajrxcmxxp3x2wqnp4qddd9j25ufjqqjvxmgkefx0pwvh9za0pmnhjg57fy8rvmnp4xm5aspp59wmgjwr3s2n8slhu75z5fkmm4ew5nfkc74qxpxnd5s2j28wfysvqsp5zdxtp5tx5q8t9863vsuc7phgyyhm7wxdcu9wqck6x2362p8mfafq9qyysgqcqpcxqyz5vqzpsrgne9pr3x80jvln7a0zdrsvframpq332ff6tp4n52qfpn4jejgasxsfdt6k6g532qm40cupjpd0dfgrxxm28dr53xm5uzpf8f32cq673lgu",
      paidAt: Math.floor(Date.now() / 1000),
      nsec: process.env.NSEC,
      preimage: null,
      timeoutMs: 5000, // Use a shorter timeout for testing
    });

    console.log("Zap receipt ID:", event.id);
    console.log("Event:", JSON.stringify(event));
    console.log(
      "Sent by:",
      sender?.display_name || sender?.name || sender?.pubkey
    );

    // Force exit after a short delay to ensure all output is printed
    setTimeout(() => {
      console.log("Forcing script termination...");
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error("Error sending zap receipt:", error);
    process.exit(1);
  }
})();
