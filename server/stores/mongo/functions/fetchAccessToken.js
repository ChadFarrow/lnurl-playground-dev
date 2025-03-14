import { decrypt } from "../../../functions/crypto/cipher.js";
import dotenv from "dotenv";

if (!process.env.ALBY_ACCESS_TOKEN_ENCRYPT) {
  dotenv.config();
}

const token = process.env.ALBY_ACCESS_TOKEN_ENCRYPT;

function fetchAccessToken(_collection) {
  return async (address) => {
    const collection = await _collection;
    const account = await collection.findOne({ address });

    // Return an empty array if no results are found
    let settings = {
      albyAccessToken: decrypt(token, account.albyAccessToken),
      approvedGuids:
        account.approvedGuids?.length > 0 ? account.approvedGuids : [],
    };
    return settings;
  };
}

export default fetchAccessToken;
