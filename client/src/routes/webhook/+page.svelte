<script>
  import { onMount } from "svelte";

  async function sendPostRequest() {
    const data = {
      amount: 33,
      boostagram: null,
      comment: "",
      created_at: "2025-01-11T21:20:09.796Z",
      creation_date: 1736630410,
      currency: "BTC",
      custom_records: {},
      description_hash:
        "e0ef3adf579975327dcaab34a041dff738ae2c2b4a23bd63e2ebbfd1c9ec2363",
      destination_alias: null,
      destination_pubkey: null,
      expires_at: "2080-01-24T18:40:20.000Z",
      expiry: 1736716810,
      fee: 0,
      fiat_currency: "USD",
      fiat_in_cents: 4,
      first_route_hint_alias: null,
      first_route_hint_pubkey: null,
      identifier: "7yNv3CjDEi71NnDRPwKAnuEU",
      keysend_message: null,
      memo: null,
      metadata: {
        comment: null,
        zap_request: {
          content: "",
          created_at: 1736630409,
          id: "09d5909a7f8644b34d80d85d5fbfe6a84bc32cd4907bbe626e827ff84a5005d2",
          kind: 9734,
          pubkey:
            "23103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403",
          sig: "3f9a1e124152cce281c09ca5377f23fe9411c0b6ca6b99fb700bf3fbeaa5ecd58a259575b86df8b60a2261c4850f8f702202bc93a04fc9068bbcb806c1465192",
          tags: [
            [
              "e",
              "08453b29c24cd4fd18ac964319017fb9d7c452a45ae3a636c695b52e453e3ebf",
            ],
            [
              "p",
              "4660cd71c8a4715b9d23bdb7ff5b33e12508259247b2426423453f8af3b73849",
            ],
            ["splitbox", "Eat at Joes"],
            [
              "relays",
              "wss://relay.damus.io",
              "wss://nostr.land",
              "wss://nostr.wine",
              "wss://nos.lol",
            ],
          ],
        },
        zap_request_raw:
          '{"content":"","created_at":1736630409,"kind":9734,"tags":[["e","08453b29c24cd4fd18ac964319017fb9d7c452a45ae3a636c695b52e453e3ebf"],["p","4660cd71c8a4715b9d23bdb7ff5b33e12508259247b2426423453f8af3b73849"],["relays","wss://relay.damus.io","wss://nostr.land","wss://nostr.wine","wss://nos.lol"]],"sig":"3f9a1e124152cce281c09ca5377f23fe9411c0b6ca6b99fb700bf3fbeaa5ecd58a259575b86df8b60a2261c4850f8f702202bc93a04fc9068bbcb806c1465192","id":"09d5909a7f8644b34d80d85d5fbfe6a84bc32cd4907bbe626e827ff84a5005d2","pubkey":"23103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403"}',
      },
      payer_email: null,
      payer_name: "StevenB",
      payer_pubkey:
        "23103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403",
      payment_hash:
        "3368e32c2e59599b3f1fd711fc0b125bfa2f08508eea8c2177ade20e4006c69b",
      payment_request:
        "lnbc330n1pnc9cy2dqqnp4qddd9j25ufjqqjvxmgkefx0pwvh9za0pmnhjg57fy8rvmnp4xm5aspp5xd5wxtpwt9vek0cl6uglczcjt0az7zzs3m4gcgth4h3qusqxc6dssp5upes0rkp0tdqmxr7pvd82kg8mlyn5pwy20tlnq0sfarawx6juz2q9qyysgqcqpcxqyz5vq7n6c3e0vfznldyhnnmu9tqqcknksax4emrh2qnwturtyjss6rcak35jl7pgl7qxml78mjxx62gzt3uxsy3et2z6lhyyxy7frvluz49gqftq0km",
      preimage:
        "b5264dc23a65a6c0514ae685f89f230b7287a7fcb5082a572508e68224a189cc",
      r_hash_str:
        "3368e32c2e59599b3f1fd711fc0b125bfa2f08508eea8c2177ade20e4006c69b",
      settled: true,
      settled_at: "2025-01-11T21:20:26.000Z",
      state: "SETTLED",
      type: "incoming",
      value: 33,
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
