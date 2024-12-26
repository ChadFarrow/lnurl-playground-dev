# Welcome

Here's the initial code for a REST server built to handle storing/retrieving TLV records and forwarding boosts to splits found in a podcaster's feed.

I'm going to continue building this out, but any of you are encouraged to contribute.

# Run it on your own machine

- in the `server` folder, type `npm install`
- in the `client` folder, type `npm install`
- in the main project folder, type `npm run dev`
- navigate to `http://localhost:5173/splitbox/invoice` in your browser to generate a QR code invoice
- navigate to `http://localhost:5173/splitbox/autopay` in your browser to simulate an app sending an auto-payment

# What's Next

I'll add the tag to [Sovereign Feeds](https://sovereignfeeds.com) soon, and then code [CurioCaster](https://curiocaster.com) and [LNBeats](https://lnbeats.com) to start sending data to the url if it's present in your feed.

My hope is a server like this can help other coders build more things like Boost Bot and other bridges.

Keep Building,  
-- StevenB
