import { getCollection } from "../../_db/connect.js";

//all these functions return a function that is called with the appropriate arguments
import saveSettings from "./functions/saveSettings.js";
import fetchSettings from "./functions/fetchSettings.js";
import fetchAccessToken from "./functions/fetchAccessToken.js";

const metadataStore = "tsb-metadata";
const usersStore = "tsb-users";
const tskStore = "tsb-tsk";

const storeMetadata = {
  add: async (metadata) => {
    const collection = await getCollection(metadataStore);
    const result = await collection.insertOne(metadata);
    return result.insertedId;
  },
  addTSK: async (metadata) => {
    const collection = await getCollection(tskStore);
    const result = await collection.insertOne(metadata);
    return result.insertedId;
  },
  getAll: async () => {
    const collection = await getCollection(metadataStore);
    return await collection.find().toArray();
  },
  getById: async (id) => {
    const collection = await getCollection(metadataStore);
    return await collection.findOne({ id });
  },
  getByInvoice: async (invoice) => {
    const collection = await getCollection(metadataStore);
    return await collection.findOne({ invoice });
  },
  updateById: async (id, updatedData) => {
    const collection = await getCollection(metadataStore);
    const result = await collection.updateOne({ id }, { $set: updatedData });
    return result.matchedCount > 0 ? await storeMetadata.getById(id) : null;
  },
  updateByInvoice: async (invoice, updatedData) => {
    const collection = await getCollection(metadataStore);
    const result = await collection.updateOne(
      { invoice },
      { $set: updatedData }
    );
    return result.matchedCount > 0
      ? await storeMetadata.getByInvoice(invoice)
      : null;
  },
  deleteById: async (id) => {
    const collection = await getCollection(metadataStore);
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  },
  saveSettings: async (address, settings) => {
    return saveSettings(getCollection(usersStore))(address, settings);
  },
  fetchSettings: async (address) => {
    return fetchSettings(getCollection(usersStore))(address);
  },
  fetchAccessToken: async (address) => {
    return fetchAccessToken(getCollection(usersStore))(address);
  },
};

export default storeMetadata;
