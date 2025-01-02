import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

let data = JSON.stringify({
  webhookUrl:
    "https://typedwebhook.tools/webhook/7a64541f-bc67-483f-910c-4762b364ab8e",
  webhookVersion: "v1",
  secret: "testtesttest",
  enabled: true,
  eventTypes: [
    "invoice.created",
    "invoice.updated",
    "payment-method.bank.created",
    "payment-method.bank.updated",
    "payout.created",
    "payout.updated",
    "payout-originator.created",
    "payout-originator.updated",
    "currency-exchange-quote.updated",
    "payment.created",
    "payment.updated",
    "deposit.updated",
    "receive-request.receive-pending",
    "receive-request.receive-completed",
  ],
});

console.log(process.env.STRIKE_WEBHOOK_TOKEN);
let config = {
  method: "post",
  url: "https://api.strike.me/v1/subscriptions",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${process.env.STRIKE_WEBHOOK_TOKEN}`,
  },
  data: data,
};

axios(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    if (error.response) {
      // Server responded with a status outside 2xx
      console.error("Error response:", error.response.data);
    } else if (error.request) {
      // No response received
      console.error("Error request:", error.request);
    } else {
      // Error setting up request
      console.error("Error message:", error.message);
    }
  });
