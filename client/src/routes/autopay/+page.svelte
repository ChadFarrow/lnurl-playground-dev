<script>
  import { onMount } from "svelte";
  import tlv from "./tlv.js";

  import {
    user,
    remoteServer,
    albyRedirectUrl,
    albyClientId,
  } from "$lib/state.svelte.js";

  let recipient = { lnaddress: "thesplitbox@getalby.com", amount: 100 };
  let invoiceRoute = `${remoteServer}/invoice?address=${recipient.lnaddress}`;
  let webhookRoute = `${remoteServer}/webhook-sync`;
  let invoice = "";
  let payload = {
    type: "bitcoin-lightning",
    metadata: tlv,
  };
  let status = [];

  async function getInvoice(payload) {
    status = [`Press F12 to view updates in console`];
    status = status;
    try {
      payload.metadata.value_msat_total = recipient.amount * 1000;
      payload = payload;

      status.push(`Fetching invoice from ${invoiceRoute}`);
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
      status.push(`Paying Invoice`);
      status = status;
      let payment = await sendSats(invoice);
      console.log(payment);
      status.push(`Invoice paid.`);
      status = status;
      handlePaid(payment.info);
    } catch (error) {
      console.log(error);
    }
  }

  async function sendSats(invoice) {
    try {
      const res = await fetch(`${remoteServer}/alby/pay-invoice`, {
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

    status.push(
      `Sending payment info to ${webhookRoute} and sending out splits`
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
    status.push(`Splits sent. View split status in console`);
    status = status;
  }

  function updatePayload(e) {
    payload.metadata.value_msat_total = e.target.value * 1000;
    payload = payload;
  }
</script>

<main>
  {#if user.address}
    <a href="/">Back</a>
    <h1>Split Box Autopay Demo</h1>

    <h2>Paying from {user.address}</h2>

    <div class="autopay">
      <div class="recipient">
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
        >Autopay</button
      >
    </div>

    {#each status as note, i}
      <p>Step {i + 1}. {note}</p>
    {/each}

    <pre>
        <code>
          {`
<podcast:splitbox
  invoice="${invoiceRoute}" 
  webhook="${webhookRoute}" 
/>
`}
</code>
</pre>

    <h3>
      When the user sends a boost, the <code>invoice</code> is fetched from the
      url,
      <br />your app pays the <code>invoice</code> for the user,
      <br />then forwards the payment details to the <code>webhook</code> url.
      <br />The webhook url will send back a lookup GUID to fetch payment status
      asynchronously,
      <br />or the payment status synchronously.
    </h3>

    <h2>Simulated Payload to The Split Box</h2>
    <p>{JSON.stringify(payload, null, 2)}</p>
  {/if}
</main>

<style>
  div.autopay {
    display: flex;
    align-items: flex-end;
  }

  label {
    display: block;
  }
  .autopay > button {
    width: 100px;
    margin: 0 8px;
    height: 100%;
    font-weight: 600;
  }

  p {
    white-space: pre-wrap;
  }

  pre {
    background-color: #f4f4f4;
    padding: 0 16px;
    border: 1px solid #ddd;
    border-radius: 5px;
    overflow-x: auto;
    display: inline-block;
  }
  code {
    font-family: "Courier New", monospace;
    color: #333;
  }

  h3 > code {
    background-color: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-weight: 500;
    font-size: 0.9em;
  }
</style>
