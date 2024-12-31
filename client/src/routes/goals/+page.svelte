<blockquote>
  "There are no solutions. There are only trade-offs." <br />
  <cite>-Thomas Sowell</cite>
</blockquote>

<blockquote>
  "You can't always get what you want." <br />
  <cite>-The Rolling Stones</cite>
</blockquote>

<section>
  <p>
    Sending splits is hard in a Podcasting 2.0 app is hard. It's by far the most
    complicated part of my code. And there's a lot of bakers making this cake.
    The podcaster has to add their splits to the feed, but not all hosting
    companies support the value block. The Podcast Index decided to put in value
    blocks using Podcaster Wallet to help with adoption, but that made wallets
    more difficult for the app. Now the feed is no longer the source of truth,
    and I have to fetch from two different source to get all of the info a
    podcaster wants me to have. Additionally, the Index isn't always as up to
    date as the feed. While testing recently, I spent two hours trying to figure
    out why the value block in my app wasn't correct only to realize the Index
    was sending an old value block, which is why my updated blocks weren't
    showing up in my functions. I'm not pointing fingers, I'm pointing out the
    facts we have to deal with.
  </p>

  <p>
    To further complicate things, we have wallet builders that have different
    goals than podcasters, but the podcasters are reliant on the wallet
    builders. So what happens when the wallet builders decide not to support the
    method of payment we've been using for the last four years. We have four
    years worth of feeds and Podcaster Wallets using one method, and the more
    popular wallets have decided they won't be supporting that method. So, the
    app now needs to support two different methods of payments to handle the
    legacy value payment method and the new value payment method. Additionally,
    one of those methods allows the app to send metadata to the podcaster, the
    other method, not so much.
  </p>

  <p>
    Another problem with multiple wallets is not every wallet makes it easy for
    a listener to seamlessly send payments. That requires an API the apps are
    allowed to access. But is an app developer now required to support every
    wallet API out there, or just the four major ones. This starts to feel more
    and more like Google, Apple, Facebook, and Twitter getting their mitts into
    every app there is. And widespread solution is to show a QR code and the
    listener can copy/paste or scan it from their wallet of choice, but this is
    hardly seamless. Copying a code from your podcast app, opening your wallet,
    pasting the code in, pushing send... yeah, it works, but it's a hassle.
  </p>

  <p>
    And then there's the apps. iOS, Android, WebApps, mobile, desktop. There's a
    lot going on, and they hardly play well together. Desktop is great, because
    you can install browser plug ins for your wallet of choice, but most people
    are listening on their phone, and browser plugins don't work. There's things
    like AlbyHub that give an oAuth API so the app can connect with any wallet
    connected to the Hub, but that only works with certain wallets. Strike has
    an API, but it's only for business accounts, and only works with Strike
    Wallets. An app could host wallets, but now they're taking ownership of
    other people's money, and many app devs don't want the responsibility. Or
    they could pay a company to host the wallets, but that's going to cost $500
    a month, and that's a lot of dough for an indie app developer.
  </p>

  <p>
    The other issue is, people don't realize most of the heavy lifting for
    payments has been handled by the wallet provider. Take Alby for example.
    Alby has a single endpoint an app can send all of the splits to, and Alby
    will make all the payments and send back a single response with all of the
    payment details. This works great for mobile app devs who are worried about
    battery life and bandwidth. The new wallet methods don't all that. The way
    the new wallet methods work is the app needs to send three requests PER
    SPLIT to make all of the payments. For a feed with 12 splits, you're looking
    at 36 requests PER BOOST. It's a difficult situation for them to be in
    considering they've spent the last two years only making one request per
    boost.
  </p>

  <h2>So who are the players:</h2>
  <ul>
    <li>Podcaster</li>
    <li>Podcaster's Hosting Solution</li>
    <li>Podcast Index</li>
    <li>Podcaster Wallet</li>
    <li>Wallet Providers</li>
    <li>Apps</li>
  </ul>

  <p>
    So who's responsibility is it that the podcaster get paid? In a sense, all
    of ours, but this question is more who cares most that the podcaster gets
    paid? The podcaster should. So when it comes to who takes the responsibility
    for ensuring easy payments, I would argue the podcaster has a more vested
    interest and should take on that responsibility, either personally or
    through their hosting company.
  </p>

  <h2>The Split Box is my solution.</h2>
  <p>
    It's one of many possibilities. It's flawed, there are things about it I
    don't like. Any issues you have, I probably also have. I'm not interested in
    arguing anymore. If you don't like this solution, don't use it. Or fork it
    and make it better.
  </p>

  <h3>Goals with The Split Box (TSB):</h3>
  <ul>
    <li>TSB is not a company, it's an idea.</li>
    <li>A single URL to send metadata to.</li>
    <li>Existing apps make three calls per boost.</li>
    <li>The feed is the source of truth.</li>
    <li>Keysend for TLV records.</li>
    <li>Support for lnurlp with TLV comments.</li>
  </ul>
</section>
