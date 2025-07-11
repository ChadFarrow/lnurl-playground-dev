# V4V Lightning Payment Tester

A tool for testing Lightning Network payments and podcast value splits.

## Feed URL
https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/main/feed.xml

## Episodes
- LNURL Testing Episode

## Testing
This feed is designed for testing LNURL payments in podcast apps. Each episode has value blocks that support Lightning payments.

## Value Blocks
The feed includes value blocks with the following recipients:

### Lightning Addresses
- chadf@getalby.com
- chadf@btcpay.podtards.com
- eagerheron90@zeusnuts.com
- cobaltfly1@primal.net

### Node Pubkeys (Keysend)
- 032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51

## Setup
1. Clone this repository
2. Customize the `config` object in `customize-feed.js`
3. Run `node customize-feed.js` to generate updated feed
4. Commit and push changes

## Testing Apps
- **Fountain**: Add feed URL to test Lightning payments
- **Breez**: Test LNURL integration
- **Podverse**: Check value block parsing
- **Castamatic**: Test Lightning address support

## Customization
Edit the `config` object in `customize-feed.js` to:
- Change Lightning addresses
- Add/remove node pubkeys
- Modify episode content
- Update personal information

Then run `node customize-feed.js` to regenerate the feed.

---

## Useful Podcasting 2.0 & V4V Ecosystem Links

- [@fountain/podpay (JSR)](https://jsr.io/@fountain/podpay) — JavaScript/TypeScript library for Podcasting 2.0 payments and splits
- [Podcastindex-org/podcast-namespace Discussion #676: <podcast:metaBoost> proposal](https://github.com/Podcastindex-org/podcast-namespace/discussions/676) — Proposal for a new tag and API for boost/metadata
- [thebells1111/thesplitbox](https://github.com/thebells1111/thesplitbox) — Open-source value split and boostagram processor
- [podtoo/boostagramLIVE](https://github.com/podtoo/boostagramLIVE) — Real-time boostagram display and integration
