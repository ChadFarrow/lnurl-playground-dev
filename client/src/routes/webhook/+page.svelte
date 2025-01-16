<script>
  import { onMount } from "svelte";

  async function sendPostRequest() {
    const data = {
      amount: 100,
      boostagram: null,
      comment: "",
      created_at: "2025-01-15T04:15:07.419Z",
      creation_date: 1736914507,
      currency: "BTC",
      custom_records: {},
      description_hash:
        "365f8b5ce90c335432ebe6b8a1036d6f44bec45dcc933fb41b5723c2fd8278ed",
      destination_alias: null,
      destination_pubkey: null,
      expires_at: "2080-01-31T08:30:14.000Z",
      expiry: 1737000907,
      fee: 0,
      fiat_currency: "USD",
      fiat_in_cents: 3,
      first_route_hint_alias: null,
      first_route_hint_pubkey: null,
      identifier: "E2uUpaViQU58x1uVaNoLfYX8",
      keysend_message: null,
      memo: null,
      metadata: {
        comment: null,
        zap_request: {
          content: "",
          created_at: 1736914507,
          id: "9f7a4c881c50b4474c1d8d4b24d0d575b5cd5a1b84e37458d9ffbcd992ccf1fa",
          kind: 9734,
          pubkey:
            "867ed9eae02530e3d5efb1f596dd37f7db9054a1d9ca3cbae6720ec740278f3f",
          sig: "34b5192532b38cf0b6a4bd76503b3fc340a49e868df224c5c4928410328e44e427ce8bc45ea975dee6b722c4e81d8eefbc42495c2cfb4122b3d803e32489efbe",
          tags: [
            [
              "p",
              "b8f17389a7c3e62c3cffaf16bfce6ca4eac88593c2b2194e1c6abb18a7631ec3",
            ],
            ["amount", "21000"],
            [
              "relays",
              "wss://strfry.iris.to/",
              "wss://relay.damus.io/",
              "wss://relay.nostr.band/",
              "wss://relay.snort.social/",
            ],
            [
              "e",
              "73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436",
              "wss://strfry.iris.to/",
            ],
            [
              "lnurl",
              "https://thesplitbox.com/lnurlp/73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436/callback",
            ],
            [
              "splitbox",
              "73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436",
            ],
          ],
        },
        zap_request_raw:
          '{"created_at":1736914507,"content":"","tags":[["p","b8f17389a7c3e62c3cffaf16bfce6ca4eac88593c2b2194e1c6abb18a7631ec3"],["amount","21000"],["relays","wss://strfry.iris.to/","wss://relay.damus.io/","wss://relay.nostr.band/","wss://relay.snort.social/"],["e","73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436","wss://strfry.iris.to/"],["lnurl","https://thesplitbox.com/lnurlp/73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436/callback"],["splitbox","73f9f344d380df125bdbbd393b9e2f7bc496c973bed12ececced78a0d7146436"]],"kind":9734,"pubkey":"867ed9eae02530e3d5efb1f596dd37f7db9054a1d9ca3cbae6720ec740278f3f","id":"9f7a4c881c50b4474c1d8d4b24d0d575b5cd5a1b84e37458d9ffbcd992ccf1fa","sig":"34b5192532b38cf0b6a4bd76503b3fc340a49e868df224c5c4928410328e44e427ce8bc45ea975dee6b722c4e81d8eefbc42495c2cfb4122b3d803e32489efbe"}',
      },
      payer_email: null,
      payer_name: null,
      payer_pubkey:
        "867ed9eae02530e3d5efb1f596dd37f7db9054a1d9ca3cbae6720ec740278f3f",
      payment_hash:
        "1e169a914a9c80a3c8c3b83a034640ea3c9f966e69a7f94b8e222720fa0844fd",
      payment_request:
        "lnbc210n1pncwdjtdqqnp4qddd9j25ufjqqjvxmgkefx0pwvh9za0pmnhjg57fy8rvmnp4xm5aspp5rctf4y22njq28jxrhqaqx3jqag7fl9nwdxnljjuwygnjp7sggn7ssp50hz45eqk5rwrpt63qwjgessdunhxuly9kdtp2jqgd9af9a2ft5vq9qyysgqcqpcxqyz5vqjrhk8xz99rm6fup460r9z7cqner42tjjp9lwfygp2y6gzjadvrl8uu5lfcttt9jj5xzzusqemgtmh0p4xu9ldu4wfqdm8p6gdmnvx0sqa7wlfr",
      preimage:
        "89c2bf3b1d7ed88b83f34bc9726c5431d6264feabf63825f5a395280ad760aad",
      r_hash_str:
        "1e169a914a9c80a3c8c3b83a034640ea3c9f966e69a7f94b8e222720fa0844fd",
      settled: true,
      settled_at: "2025-01-15T04:15:10.000Z",
      state: "SETTLED",
      type: "incoming",
      value: 21,
    };

    try {
      const response = await fetch("http://localhost:3000/prism/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error("Request failed", response.status, response.statusText);
      } else {
        console.log("Request successful", await response.text());
      }
    } catch (error) {
      console.error("Error sending request", error);
    }
  }
</script>

<button on:click={sendPostRequest}>Send POST Request</button>
