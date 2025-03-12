import { getCollection } from "../../_db/connect.js";

//all these functions return a function that is called with the appropriate arguments
import saveSettings from "./functions/saveSettings.js";
import fetchSettings from "./functions/fetchSettings.js";
import fetchAccessToken from "./functions/fetchAccessToken.js";

const metadataStore = "tsb-metadata";
const usersStore = "tsb-users";

const storeMetadata = {
  add: async (metadata, store) => {
    const collection = await getCollection(store || metadataStore);
    const result = await collection.insertOne(metadata);
    return result.insertedId;
  },
  getAll: async (store) => {
    const collection = await getCollection(store || metadataStore);
    return await collection.find().toArray();
  },
  getById: async (id, store) => {
    const collection = await getCollection(store || metadataStore);
    return await collection.findOne({ id });
  },
  getByInvoice: async (invoice, store) => {
    const collection = await getCollection(store || metadataStore);
    await collection.findOne({ invoice });
  },
  updateById: async (id, updatedData, store) => {
    const collection = await getCollection(store || metadataStore);
    const result = await collection.updateOne({ id }, { $set: updatedData });
    return result.matchedCount > 0 ? await storeMetadata.getById(id) : null;
  },
  updateByInvoice: async (invoice, updatedData, store) => {
    const collection = await getCollection(store || metadataStore);
    const result = await collection.updateOne(
      { invoice },
      { $set: updatedData }
    );
    return result.matchedCount > 0
      ? await storeMetadata.getByInvoice(invoice)
      : null;
  },
  deleteById: async (id, store) => {
    const collection = await getCollection(store || metadataStore);
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  },
  saveSettings: async (address, settings, store) => {
    return saveSettings(getCollection(store || usersStore))(address, settings);
  },
  fetchSettings: async (address, store) => {
    return fetchSettings(getCollection(store || usersStore))(address);
  },
  fetchAccessToken: async (address, store) => {
    return fetchAccessToken(getCollection(store || usersStore))(address);
  },
};

export default storeMetadata;
