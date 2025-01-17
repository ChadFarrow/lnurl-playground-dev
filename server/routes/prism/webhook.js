import fs from "fs/promises";
import { Webhook } from "svix";
import dotenv from "dotenv";
import sendLNUrl from "./payments/sendLNUrl.js";
import fetchEvent from "../../functions/nostr/fetchEvent.js";
import fetchChannel from "../splitbox/functions/getSplits/fetchChannelFromIndex.js";
import fetchRSSFeed from "../splitbox/functions/getSplits/fetchRSSFeed.js";
import getItemFromRSS from "../splitbox/functions/getSplits/getItemFromRSS.js";
import normalizeSplits from "../splitbox/functions/getSplits/normalizeSplits.js";
import combineSplits from "../splitbox/functions/getSplits/combineSplits.js";
import processPayments from "./payments/processPayments.js";

dotenv.config();

async function webhook() {
  return async (req, res) => {
    const payload = req.body;
    const headers = req.headers;

    const wh = new Webhook(process.env.PRISM_WEBHOOK);

    try {
      // Verify the signature
      const verifiedPayload = await wh.verify(JSON.stringify(payload), headers);
      console.log("Webhook verified");

      // Process the webhook payload here
      res.status(200).send("Webhook received");
      let newData = req.body;
      let feedUrl = null;
      let feedGuid = null;
      let itemGuid = null;
      let eventId = null;
      let publicKey = null;
      let channel = null;
      let relays = null;

      const tags = newData.metadata?.zap_request?.tags;
      console.log(newData);

      if (tags) {
        eventId = tags.find((tag) => tag[0] === "e")?.[1];
        publicKey = tags.find((tag) => tag[0] === "p")?.[1];
        if (eventId && publicKey) {
          relays = tags?.find((tag) => tag[0] === "relays")?.slice(1) || [];
          let evt = await fetchEvent(eventId, publicKey, relays);
          feedGuid = evt?.tags?.find((tag) => tag[0] === "feed_guid")?.[1];
          feedUrl = evt?.tags?.find((tag) => tag[0] === "feed_url")?.[1];
          itemGuid = evt?.tags?.find((tag) => tag[0] === "item_guid")?.[1];
        }
      }

      let amount = newData?.amount;
      if ((feedGuid || feedUrl) && itemGuid && amount) {
        if (!feedUrl) {
          channel = await fetchChannel({ guid: feedGuid });
          feedUrl = channel?.feed?.url;
        }

        if (feedUrl) {
          const RSS = await fetchRSSFeed(feedUrl);

          const itemFromRSS = getItemFromRSS(RSS, { episode_guid: itemGuid });

          const destinations = {
            remoteSplits: { feesDestinations: [], splitsDestinations: [] },
          };
          destinations.mainSplits = normalizeSplits(
            itemFromRSS?.["podcast:value"]?.["podcast:valueRecipient"] ||
              RSS?.["podcast:value"]?.["podcast:valueRecipient"],
            100
          );

          let splits = combineSplits(destinations, amount);

          const tlv = {
            podcast: RSS.title,
            episode: itemFromRSS.title,
            guid: feedGuid,
            episode_guid: itemGuid,
            action: "boost",
            app_name: "The Split Box nostRSS Integration",
            value_msat_total: amount * 1000,
            url: feedUrl,
            sender_name: newData?.payer_name,
            message: newData?.comment,
          };

          let paid = await processPayments({
            splits,
            metadata: tlv,
            message: tlv.message,
            nostr: newData?.metadata?.zap_request_raw,
          });
          console.log(paid);
          // res.status(200).send(feedUrl);
        } else {
          // res.status(200).json(channel);
        }
      }
    } catch (err) {
      console.error(err);
      res.status(200).send("Invalid signature");
    }
  };
}
export default webhook;

// https://thesplitbox.com/lnurlp/73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436/callback?amount=21000&nostr=%7B%22created_at%22%3A1736997691%2C%22content%22%3A%22%22%2C%22tags%22%3A%5B%5B%22p%22%2C%22b8f17389a7c3e62c3cffaf16bfce6ca4eac88593c2b2194e1c6abb18a7631ec3%22%5D%2C%5B%22amount%22%2C%2221000%22%5D%2C%5B%22relays%22%2C%22wss%3A%2F%2Fstrfry.iris.to%2F%22%2C%22wss%3A%2F%2Frelay.damus.io%2F%22%2C%22wss%3A%2F%2Frelay.nostr.band%2F%22%2C%22wss%3A%2F%2Frelay.snort.social%2F%22%2C%22wss%3A%2F%2Fnostr.bitcoiner.social%2F%22%2C%22wss%3A%2F%2Fnostr-pub.wellorder.net%2F%22%2C%22wss%3A%2F%2Fnos.lol%2F%22%2C%22wss%3A%2F%2Fwelcome.nostr.wine%2F%22%2C%22wss%3A%2F%2Fpurplerelay.com%2F%22%5D%2C%5B%22e%22%2C%2273f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436%22%2C%22wss%3A%2F%2Fstrfry.iris.to%2F%22%5D%2C%5B%22lnurl%22%2C%22https%3A%2F%2Fthesplitbox.com%2Flnurlp%2F73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436%2Fcallback%22%5D%5D%2C%22kind%22%3A9734%2C%22pubkey%22%3A%224660cd71c8a4715b9d23bdb7ff5b33e12508259247b2426423453f8af3b73849%22%2C%22id%22%3A%2263a61e92fed53873ef19d190ec249e4c3a562942fb775fa3b6eefbec4ee26239%22%2C%22sig%22%3A%22e8ba133df86bd48246404150782567eb21014febb18519eda95493a51ca496bd34414edda0f1999c22aa1535a2ad921076ca03736b520d5d97d1c7136a150839%22%7D
