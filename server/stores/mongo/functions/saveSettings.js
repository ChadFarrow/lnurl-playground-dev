function saveSettings(_collection) {
  return async (address, settings) => {
    const collection = await _collection;
    await collection.updateOne({ address }, { $set: settings });
  };
}

export default saveSettings;
