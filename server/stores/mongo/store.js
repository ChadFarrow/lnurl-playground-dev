import { getCollection } from "../../_db/connect.js";
import bcrypt from "bcrypt";

//all these functions return a function that is called with the appropriate arguments
import saveSettings from "./functions/saveSettings.js";

const metadataStore = "tsb-metadata";
const usersStore = "tsb-users";

const storeMetadata = {
  add: async (metadata) => {
    const collection = await getCollection(metadataStore);
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
  resetPassword: async ({ address, password, invoice, resetID, verifyCB }) => {
    const collection = await getCollection(usersStore);
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedData = {
      pendingPassword: hashedPassword,
      resetID,
      invoice,
      verifyCB,
    };
    const result = await collection.updateOne(
      { address },
      { $set: updatedData },
      { upsert: true }
    );
    return result.matchedCount > 0 || result.upsertedCount > 0
      ? await storeMetadata.getById(address)
      : null;
  },
  verifyPassword: async (address) => {
    const collection = await getCollection(usersStore);
    const user = await collection.findOne({ address });
    if (!user || !user.pendingPassword) return false;
    await collection.updateOne(
      { address },
      { $set: { verifiedPassword: user.pendingPassword } }
    );
  },
  verifyUser: async (address, password) => {
    const collection = await getCollection(usersStore);
    const user = await collection.findOne({ address });
    if (!user || !user.verifiedPassword) return false;
    const match = await bcrypt.compare(password, user.verifiedPassword);
    return match;
  },
  saveSettings: async (address, settings) => {
    return saveSettings(getCollection(usersStore))(address, settings);
  },
};

export default storeMetadata;
