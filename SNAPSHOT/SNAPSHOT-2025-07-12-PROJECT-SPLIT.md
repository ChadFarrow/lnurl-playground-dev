# Project Split Snapshot - July 12, 2025

## Major Changes: Separated Splitbox into Independent Project

### Summary
Successfully split the V4V Lightning Payment Tester project into two focused, independent projects due to growing complexity and different use cases.

### Projects Created

#### 1. V4V Lightning Payment Tester (Original - Cleaned)
- **Repository**: https://github.com/ChadFarrow/v4v-lightning-payment-tester
- **Live URL**: https://v4v-lightning-payment-tester.vercel.app
- **Focus**: Simple RSS feed parsing and Lightning payment testing
- **Status**: ✅ Deployed and working

**Key Features Retained:**
- RSS feed value block parsing
- Payment recipient lookup
- Simple testing interface
- Podcast Index API integration
- Clean, focused codebase

#### 2. Splitbox Lightning Payments (New Standalone)
- **Repository**: https://github.com/ChadFarrow/splitbox-lightning-payments
- **Status**: ✅ Ready for deployment
- **Focus**: Full Lightning payment processing system

**Key Features:**
- Webhook processing for incoming Lightning payments
- Automatic payment splitting based on RSS feed value blocks
- NWC (Nostr Wallet Connect) integration
- Alby API fallback for keysend payments
- SvelteKit frontend interface
- Express.js backend API
- Serverless function compatibility

### Technical Details

#### Backup Strategy
- **Git Tag**: `backup-before-split` created and pushed
- **Local Backup**: Compressed archive created
- **GitHub History**: Complete history preserved

#### Environment Configuration
Both projects now have separate environment configurations:

**V4V Lightning Payment Tester:**
- Podcast Index API credentials
- Simple deployment setup

**Splitbox:**
- Alby API tokens
- NWC connection strings
- Webhook secrets
- Podcast Index API credentials
- Full payment processing environment

#### Files Moved/Cleaned
- Removed `thesplitbox/` directory from V4V tester
- Removed splitbox-specific API endpoints
- Cleaned up Vercel configuration
- Updated .gitignore for both projects

### Payment Processing Capabilities

#### V4V Lightning Payment Tester
- RSS feed parsing
- Value block analysis
- Payment recipient identification
- Testing interface

#### Splitbox
- Full webhook processing
- NWC payment sending
- Alby API keysend fallback
- Automatic split calculations
- Real Lightning payments
- Error handling and logging

### Deployment Status

#### V4V Lightning Payment Tester
- ✅ Deployed on Vercel
- ✅ Working at https://v4v-lightning-payment-tester.vercel.app
- ✅ Clean codebase
- ✅ GitHub updated

#### Splitbox
- ✅ Git repository created
- ✅ Code pushed to GitHub
- ✅ Vercel configuration ready
- 🚀 Ready for independent deployment

### API Credentials Used

#### Podcast Index API
- **Key**: PYYX2JYEJ6XQGTFF3Q3L
- **Secret**: RaVcEAbXvYvW$NMJ2eVkr5brjGGRNtw^Cj7ev3Ac
- **Usage**: Both projects (RSS feed parsing)

#### Alby API
- **Access Token**: YJYYM2QYOWQTZTVKNI0ZOGJJLTLLN2UTMGU4YTZLYZAZZTG0
- **Scopes**: account:read, payments:send
- **Usage**: Splitbox only (keysend fallback)

#### NWC Connection
- **Lightning Address**: lushnessprecious644398@getalby.com
- **Usage**: Splitbox only (primary payment method)

#### Webhook
- **Secret**: whsec_9Qw6t7KamEJPEl93gZiPIBIqHr7kUJj6
- **Usage**: Splitbox only (payment notifications)

### Next Steps

#### For V4V Lightning Payment Tester
- ✅ Continue development as simple testing tool
- ✅ Focus on RSS feed parsing improvements
- ✅ Maintain clean, focused scope

#### For Splitbox
- 🚀 Deploy to Vercel as separate project
- 🔧 Configure environment variables
- 🔗 Update webhook URL after deployment
- 🧪 Test payment processing functionality

### Benefits of Split

1. **Focused Development**: Each project has clear, distinct purpose
2. **Cleaner Codebases**: Reduced complexity in both projects
3. **Independent Deployment**: Separate deployment cycles and configurations
4. **Better Maintenance**: Easier to maintain and update each project
5. **Specialized Use Cases**: V4V tester for analysis, Splitbox for production

### Git History

#### V4V Lightning Payment Tester
- Backup tag: `backup-before-split`
- Clean commit: `be694c8`
- Status: Up to date on GitHub

#### Splitbox
- Initial commit: `6e589ec`
- README commit: `5500d85`
- Status: Up to date on GitHub

---

**Date**: July 12, 2025
**Action**: Project successfully split into two independent repositories
**Status**: ✅ Complete - Both projects ready for independent development and deployment