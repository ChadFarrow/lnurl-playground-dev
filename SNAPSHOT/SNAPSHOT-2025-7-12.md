# Lightning Splitbox Project Snapshot

## Project Overview
The **Lightning Splitbox** is a Value-for-Value (V4V) payment splitting system that automatically distributes Lightning Network payments to multiple recipients based on RSS feed value blocks. It enables podcasters and content creators to receive payments that are automatically split among all participants according to predefined percentages.

## Core Functionality
- **RSS Feed Integration**: Parses podcast RSS feeds to extract value block recipients and split percentages
- **Lightning Payments**: Uses NWC (Nostr Wallet Connect) to send real Lightning Network payments
- **QR Code Generation**: Creates scannable QR codes for easy Lightning payments
- **Webhook Processing**: Handles payment confirmations and triggers split distributions
- **Multiple Payment Methods**: Supports both Lightning addresses and node pubkey payments

## Technical Architecture
```
Payment Flow:
1. User scans QR code → Pays Lightning invoice
2. Webhook receives payment confirmation  
3. System parses RSS feed value block
4. Generates invoices from recipient Lightning addresses
5. Sends split payments via NWC to all recipients
```

## Major Bug Discovery & Fix

### The Critical Bug
**Problem**: All split payments were routing back to the sender's wallet instead of reaching external recipients.

**Root Cause**: The `sendLightningPayment()` function in `webhookSync.js` was:
1. Creating invoices on the **sender's own wallet** 
2. Then paying those local invoices
3. This caused a circular payment flow where splits appeared as "received" payments on the sender's side

### The Fix
**Solution**: Modified the payment flow to:
1. Fetch invoices from **recipient Lightning addresses** using LNURL
2. Pay those external invoices using NWC
3. Payments now correctly flow to external wallets

**Code Change Location**: `/server/routes/splitbox/routes/webhookSync.js:93-191`

### Before vs After
```javascript
// BEFORE (Broken):
// 1. Create invoice on own wallet for recipient
// 2. Pay own invoice → payment loops back

// AFTER (Fixed):  
// 1. Get invoice from recipient's Lightning address
// 2. Pay external invoice → payment reaches recipient
```

## Key Files Modified
- `server/routes/splitbox/routes/webhookSync.js` - Fixed payment routing logic
- `client/src/routes/qr/+page.svelte` - Updated UI to reflect RSS feed splits
- `server/stores/inMemoryStore.js` - Cleaned up split configuration

## Current Status
✅ **WORKING**: The splitbox now correctly:
- Parses RSS feed value blocks from `https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/main/public/lnurl-test-feed.xml`
- Sends real Lightning payments to external recipients
- Distributes splits according to RSS feed percentages (15% each to 6 recipients, 5% each to 2 recipients)
- Processes payments via NWC connection to Alby wallet (`lushnessprecious644398@getalby.com`)

## Environment Configuration
- **NWC Connection**: `nostr+walletconnect://...` (configured in `.env`)
- **Webhook Secret**: `whsec_Uc2khvr47V94natBcXvQT+wrGXnbsRAq`
- **Development URL**: `http://chads-mac-mini.local:4000`
- **Main Routes**: 
  - `/qr/` - QR code generation
  - `/invoice-demo/` - Manual invoice testing

## Testing Verification
The fix was confirmed when split payments stopped appearing as "received" on the sender's Alby wallet and started reaching the actual external Lightning addresses defined in the RSS feed value block.

## Next Steps
The system is now production-ready for testing real V4V payment splits with podcast RSS feeds containing value blocks.

---
*Last Updated: July 12, 2025*
*Commit: 2140947 - Fix critical NWC payment routing bug*