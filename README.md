# LNURL Playground - Development & Testing Environment

This repository contains the development and testing tools for Lightning Network payment integration, with a focus on Value-for-Value (V4V) podcasting.

## Components

### 1. V4V Demo App (`v4v-demo/`)
A React-based web application for testing Lightning Network payment integration:

- **RSS Feed Parser**: Parses podcast RSS feeds to extract Lightning payment information
- **Wallet Integration**: Connects to Lightning wallets via Nostr Wallet Connect (NWC)
- **Payment Testing**: Tests Lightning payments to both Lightning addresses and node pubkeys
- **Feed Validator**: Validates RSS feeds for proper value block formatting
- **Automated Testing**: Runs comprehensive tests on different payment methods

### 2. Feed Generation Scripts
- `customize-feed.js`: Node.js script to generate RSS feeds with Lightning payment value blocks
- Supports multiple Lightning addresses and node pubkeys
- Creates podcast-compatible feeds for testing

### 3. Infrastructure Setup
- `docker-compose.yml`: Sets up LNbits (Lightning wallet backend) and PostgreSQL
- `btcpay.conf`: Configuration for BTCPay Server

## Quick Start

### Running the V4V Demo App

```bash
cd v4v-demo
npm install
npm start
```

The app will be available at `http://localhost:3000`

### Setting up the Infrastructure

```bash
# Start LNbits and PostgreSQL
docker-compose up -d
```

LNbits will be available at `http://localhost:5001`

### Generating Test Feeds

```bash
cd v4v-demo
node customize-feed.js
```

This will generate updated RSS feeds in the `public/` directory.

## Testing Capabilities

The project can test:
- **Lightning Addresses**: `user@domain.com` format
- **Node Pubkeys**: 66-character hex keys for keysend
- **RSS Feed Parsing**: Extracts payment info from podcast feeds
- **Wallet Connections**: NWC and direct wallet connections
- **Payment Flows**: End-to-end Lightning payment testing

## Feed Hosting

The actual RSS feeds are hosted in a separate repository at:
https://github.com/ChadFarrow/lnurl-test-feed

This repository contains only the development and testing tools.

## Use Cases

1. **Podcast Developers**: Test Lightning payment integration in podcast apps
2. **Lightning Developers**: Test LNURL and Lightning payment flows
3. **Content Creators**: Set up value-for-value monetization
4. **Wallet Developers**: Test wallet integration with podcast feeds

## Development

### Adding New Test Cases

1. Edit the `config` object in `customize-feed.js`
2. Add new Lightning addresses or node pubkeys
3. Run `node customize-feed.js` to regenerate feeds
4. Test with the V4V demo app

### Testing with Real Feeds

The app can parse any RSS feed with value blocks. Test with:
- Your own generated feeds
- Real podcast feeds with Lightning payments
- Custom feeds for specific testing scenarios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License. 