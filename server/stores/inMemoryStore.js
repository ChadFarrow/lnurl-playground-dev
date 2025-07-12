const inMemoryMetaStore = [];
const inMemoryUserStore = [
  {
    address: "lushnessprecious644398@getalby.com", // TheSplitBox receiving address (NWC wallet)
    approvedGuids: ["58183156-a6ae-5e36-8875-a1be2ab691bd", "v4v-lightning-tester", "lnurl-test-feed", "9fe51a32-e08d-5ab7-9540-22a25c6bc2bf"],
    splits: [
      { address: "chadf@getalby.com", percentage: 15, name: "Chad - Alby", type: "lnaddress" },
      { address: "chadf@strike.me", percentage: 15, name: "Chad - Strike", type: "lnaddress" },
      { address: "chadf@btcpay.podtards.com", percentage: 15, name: "Chad - BTCPay", type: "lnaddress" },
      { address: "eagerheron90@zeusnuts.com", percentage: 15, name: "Zeus Cashu", type: "lnaddress" },
      { address: "cobaltfly1@primal.net", percentage: 15, name: "Primal", type: "lnaddress" },
      { address: "032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51", percentage: 15, name: "My Node", type: "node" },
      { address: "03ecb3ee55ba6324d40bea174de096dc9134cb35d990235723b37ae9b5c49f4f53", percentage: 5, name: "The Wolf", type: "node" },
      { address: "03ae9f91a0cb8ff43840e3c322c4c61f019d8c1c3cea15a25cfc425ac605e61a4a", percentage: 5, name: "Podcast Index", type: "node" }
    ]
  }
];

const storeMetadata = {
  add: (metadata) => {
    inMemoryMetaStore.push(metadata);
  },
  getAll: async () => {
    return inMemoryMetaStore;
  },
  getById: async (id) => {
    return inMemoryMetaStore.find((item) => item.id === id);
  },
  getByInvoice: async (invoice) => {
    return inMemoryMetaStore.find((item) => item.invoice === invoice);
  },
  updateById: async (id, updatedData) => {
    const index = inMemoryMetaStore.findIndex((item) => item.id === id);
    if (index === -1) return null;
    inMemoryMetaStore[index] = { ...inMemoryMetaStore[index], ...updatedData };
    return inMemoryMetaStore[index];
  },
  updateByInvoice: async (invoice, updatedData) => {
    const index = inMemoryMetaStore.findIndex(
      (item) => item.invoice === invoice
    );
    if (index === -1) return null;
    inMemoryMetaStore[index] = { ...inMemoryMetaStore[index], ...updatedData };
    return inMemoryMetaStore[index];
  },
  deleteById: async (id) => {
    const index = inMemoryMetaStore.findIndex((item) => item.id === id);
    if (index === -1) return false;
    inMemoryMetaStore.splice(index, 1);
    return true;
  },
  saveSettings: async (address, settings) => {
    let user = inMemoryUserStore.find((v) => v.address === address);

    if (!user) {
      // If the user doesn't exist, add a new user with address and destructured settings
      inMemoryUserStore.push({ address, ...settings });
    } else {
      // If the user exists, update the existing user's properties by destructuring settings
      Object.assign(user, { address, ...settings });
    }

    return true;
  },
  fetchSettings: async (address) => {
    const user = inMemoryUserStore.find((v) => v.address === address);
    if (user) {
      return user; // Return the user object with all properties, including settings
    }
    return null; // Return null if the user is not found
  },
};

export default storeMetadata;
