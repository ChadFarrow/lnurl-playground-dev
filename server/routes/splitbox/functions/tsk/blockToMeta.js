export default function blockToMeta(block, satAmount, comment) {
  const meta = {
    podcast: block.title,
    action: "boost",
    app_name: "The Split Kit",
    value_msat_total: satAmount * 1000,
    message: comment,
    remoteFeedGuid: block.feedGuid,
    remoteItemGuid: block.itemGuid,
    eventGuid: block.eventGuid,
    blockGuid: block?.blockGuid,
    eventAPI: block.eventAPI,
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(meta).filter(([_, v]) => v !== undefined)
  );
}
