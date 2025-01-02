import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

let config = {
  method: "delete",
  url: `https://api.strike.me/v1/subscriptions/${subscriptionId}`,
  headers: {
    Authorization: `Bearer ${process.env.STRIKE_WEBHOOK_TOKEN}`,
  },
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
