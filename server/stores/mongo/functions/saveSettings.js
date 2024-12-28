import { encrypt } from "../../../functions/crypto/cipher.js";
import dotenv from "dotenv";
if (!process.env.ALBY_ACCESS_TOKEN_ENCRYPT) {
  dotenv.config();
}

const token = process.env.ALBY_ACCESS_TOKEN_ENCRYPT;
function saveSettings(_collection) {
  return async (address, settings) => {
    const collection = await _collection;
    settings.approvedGuids = settings.approvedGuids.filter(
      (guid) => guid && guid.trim() !== ""
    );

    // If albyAccessToken is not blank, encrypt and update it
    if (settings.albyAccessToken && settings.albyAccessToken.trim() !== "") {
      settings.albyAccessToken = encrypt(token, settings.albyAccessToken);
    } else {
      // If albyAccessToken is blank, remove it from the settings to avoid overwriting the database value
      delete settings.albyAccessToken;
    }

    await collection.updateOne(
      { address },
      { $set: settings },
      { upsert: true }
    );
  };
}

export default saveSettings;
