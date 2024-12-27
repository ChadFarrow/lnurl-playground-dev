<script>
  import { onMount } from "svelte";
  import tlv from "./tlv.js";

  import {
    remoteServer,
    albyRedirectUrl,
    albyClientId,
  } from "$lib/state.svelte.js";

  let address;
  let recipient = { lnaddress: "thesplitbox@getalby.com", amount: 100 };
  let albyLoginUrl = "";
  let invoice = "";
  let payload = {
    type: "bitcoin-lightning",
    metadata: tlv,
  };
  let status = [];

  onMount(() => {
    albyLoginUrl = `https://getalby.com/oauth?client_id=${albyClientId}&response_type=code&redirect_uri=${albyRedirectUrl}&scope=account:read%20balance:read%20payments:send%20invoices:read`;
    loadAlby();
  });

  async function getInvoice(payload) {
    status = [`Press F12 to view uupdates in console.`];
    status = status;
    try {
      payload.metadata.value_msat_total = recipient.amount * 1000;
      payload = payload;

      let invoiceRoute = `${remoteServer}/invoice?address=${recipient.lnaddress}`;

      status.push(`fetching invoice from ${invoiceRoute}`);
      status = status;

      let res = await fetch(invoiceRoute, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const invoice = await res.json();
      console.log(invoice);
      status.push(`paying Invoice`);
      status = status;
      let payment = await sendSats(invoice);
      console.log(payment);
      status.push(`invoice paid.`);
      status = status;
      handlePaid(payment.info);
    } catch (error) {
      console.log(error);
    }
  }

  async function sendSats(invoice) {
    try {
      const res = await fetch("http://localhost:3000/alby/invoice", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoice),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePaid(paymentInfo) {
    console.log(paymentInfo);
    let webhookRoute = `${remoteServer}/webhook-sync`;
    status.push(
      `sending payment info to ${webhookRoute} and sending out splits`
    );
    status = status;
    let res = await fetch(webhookRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentInfo),
    });

    let data = await res.json();
    console.log(data);
    status.push(`splits sent. View split status in console.`);
    status = status;
  }

  async function loadAlby() {
    try {
      const res = await fetch(`${remoteServer}/alby/refresh`, {
        credentials: "include",
      });
      const data = await res.json();
      console.log(data);
      address = data.lightning_address;
    } catch (err) {}
  }

  function updatePayload(e) {
    payload.metadata.value_msat_total = e.target.value * 1000;
    payload = payload;
  }
</script>

<main>
  <h1>Split Box Autopay Demo</h1>

  {#if address}
    <h2>Paying from {address}</h2>
  {:else}
    <h2>
      Log in with <a id="alby-login" href={albyLoginUrl}>Alby</a>
    </h2>
  {/if}

  <div class="recipient">
    <label for="control-lnaddress">Lightning Address:</label>
    <input
      id="control-lnaddress"
      type="text"
      bind:value={recipient.lnaddress}
      placeholder="Enter Lightning Address"
      required
    />

    <label for="boost-amount">Amount (sats):</label>
    <input
      id="boost-amount"
      type="number"
      bind:value={recipient.amount}
      placeholder="Enter Amount in sats"
      on:input={updatePayload}
      required
    />
  </div>
  <button type="button" on:click={getInvoice.bind(this, payload)}
    >Get Invoice</button
  >

  {#each status as note}
    <p>{note}</p>
  {/each}

  <h2>Simulated Payload to The Split Box</h2>
  <p>{JSON.stringify(payload, null, 2)}</p>
</main>

<style>
  .recipient {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    margin-bottom: 1rem;
  }

  button {
    margin-top: 1rem;
  }

  p {
    white-space: pre-wrap;
  }
</style>
