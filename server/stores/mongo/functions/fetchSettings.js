function fetchSettings(_collection) {
  return async (address) => {
    const collection = await _collection;

    const account = await collection.findOne({ address });

    // Return an empty array if no results are found
    let settings = {
      albyAccessToken: account.albyAccessToken ? true : false,
      approvedGuids:
        account.approvedGuids?.length > 0 ? account.approvedGuids : [],
    };
    return settings;
  };
}

export default fetchSettings;
