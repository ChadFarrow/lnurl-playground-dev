# Welcome

Here's the initial code for a REST server built to handle storing/retrieving TLV records and forwarding boosts to splits found in a podcaster's feed.

The client is decoupled from the server, so bring your own client if you want. I like Svelte, so that's what I'm using. But others can build for React, Vue, Vanilla JS, etc. if they want to.

I'm going to continue building this out, but any of you are encouraged to contribute.

# Run it on your own machine

- in the `server` folder, type `npm install`
- in the `client` folder, type `npm install`
- in the main project folder, type `npm run dev`
- navigate to `http://localhost:5173/invoice` in your browser to generate a QR code invoice
- navigate to `http://localhost:5173/autopay` in your browser to simulate an app sending an auto-payment

# What's Next

I'll add the tag to [Sovereign Feeds](https://sovereignfeeds.com) soon, and then code [CurioCaster](https://curiocaster.com) and [LNBeats](https://lnbeats.com) to start sending data to the url if it's present in your feed.

My hope is a server like this can help other coders build more things like Boost Bot and other bridges.

Keep Building,  
-- StevenB

# Metadata and User storage

The idea for the storage folder is to build out your storage functions separate from your routing. That way you can change how your data is stored without need to update your routing calls.

There's an `inMemory` store for testing that lacks persistence. Look here to get a basic idea of what the functions for your store need to be.

There's an `mongo` folder that I'm using for hosting data and users in a mongoDB.

There's a `sqlLiteStore.js` that I haven't fleshed out, but the idea is someone could use that if they're not hosting for others and just need to keep the data stored persistently on their own server.
