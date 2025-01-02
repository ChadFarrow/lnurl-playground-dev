import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

let config = {
  method: "get",
  url: "https://api.strike.me/v1/subscriptions",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.STRIKE_WEBHOOK_TOKEN}`,
  },
};

axios(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });
