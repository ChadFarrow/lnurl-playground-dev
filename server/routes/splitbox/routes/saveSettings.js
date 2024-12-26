function saveSettings(storeMetadata) {
  return async (req, res) => {
    const settings = req.body;
    const address = "steven@getalby.com";

    console.log("settings: ", settings);

    try {
      await storeMetadata.saveSettings(address, settings);

      res.json({});
    } catch (error) {
      console.error("saveSettings error: ", error.message);
      res.status(500).send("Internal server error");
    }
  };
}

export default saveSettings;
