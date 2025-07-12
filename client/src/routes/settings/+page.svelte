<script>
  import { onMount } from "svelte";
  import { dev } from "$app/environment";
  import {
    user,
    remoteServer,
    albyRedirectUrl,
    albyClientId,
  } from "$lib/state.svelte.js";

  let albyAccessToken = "";
  let tokenSaved = false;
  let approvedGuids = ["917393e3-1b1e-5cef-ace4-edaa54e1f810"]; // Podcasting 2.0 feed GUID
  let invoiceRoute = `${remoteServer}/invoice?address=${user.address}`;
  let webhookRoute = `${remoteServer}/webhook-sync`;

  onMount(fetchSettings);
  async function fetchSettings() {
    try {
      const res = await fetch(`${remoteServer}/fetch-settings`, {
        credentials: "include",
      });
      const data = await res.json();
      console.log(data);
      tokenSaved = data.albyAccessToken;
      approvedGuids = data.approvedGuids;
    } catch (err) {}
  }

  async function saveSettings() {
    const payload = { albyAccessToken, approvedGuids };

    let res = await fetch(remoteServer + "/save-settings", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.status === "saved") {
      tokenSaved = true;
      alert("Setting Saved");
    }
  }
</script>

<main>
  <a href="/">Back</a>
  <h1>{user.address || "lushnessprecious644398@getalby.com"}</h1>
  <p><strong>Payment Method:</strong> NWC (Nostr Wallet Connect)</p>
  <p><strong>Status:</strong> ✅ Connected via NWC</p>
    <div>
      <button class="save-settings" on:click={saveSettings}
        >Save Settings</button
      >
    </div>
    <div class="auth-token-container">
      <label for="alby-access-token">Alby Access Token (Not needed for NWC)</label>
      <div>
        <input
          type="password"
          id="alby-access-token"
          bind:value={albyAccessToken}
          placeholder="NWC is configured via environment variables"
          disabled
        />
        <span>Using NWC</span>
      </div>
    </div>

    <div class="guids-header">
      <h3>Approved Podcast GUIDs</h3>

      <button
        on:click={() => {
          approvedGuids.unshift("");
          approvedGuids = approvedGuids;
        }}>Add GUID</button
      >
    </div>
    {#each approvedGuids as guid, i}
      <div>
        <input type="text" id={`guid=${i}`} bind:value={guid} />
      </div>
    {/each}

    <h2>Instructions</h2>
    <h4>
      This would go in your feed. If you're using your own server, change the
      server route accordingly.
    </h4>
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

    <p>
      <strong>NWC Configuration:</strong> This system is configured to use Nostr Wallet Connect (NWC) 
      for payments, which connects to your AlbyHub account. The NWC connection string and webhook 
      secret are configured in the .env file.
    </p>
    <p>
      <strong>Security Note:</strong> The NWC connection is configured to use your AlbyHub account 
      (lushnessprecious644398@getalby.com). Make sure this account has sufficient funds for testing 
      split payments.
    </p>

    <p>
      You also need to add the feed guids for each of your podcasts. That's to
      prevent someone using your address in their feed. If they do, and the guid
      isn't in your approved list, you'll still get the sats, but The Split Box
      won't send them out to the splits.
    </p>
    
    <h2>NWC Configuration</h2>
    <p>
      <strong>✅ NWC is configured via environment variables:</strong>
    </p>
    <ul>
      <li><strong>Connection String:</strong> Configured in .env</li>
      <li><strong>Webhook Secret:</strong> Configured in .env</li>
      <li><strong>Lightning Address:</strong> lushnessprecious644398@getalby.com</li>
    </ul>
    <p>
      The system will automatically use NWC for sending split payments when invoices are paid.
    </p>
  </main>

<style>
  main {
    width: 100%;
    max-width: 700px;
  }
  span {
    color: green;
    font-weight: 700;
    margin-left: 4px;
  }

  h1 {
    margin: 8px 0 0 0;
    text-align: center;
  }

  .guids-header {
    display: flex;
    align-items: center;
    margin-top: 8px;
  }

  h3 {
    margin: 0;
  }
  button {
    margin: 8px;
    background-color: aliceblue;
    border: 1px solid black;
    border-radius: 5px;
    padding: 8px;
  }

  button.save-settings {
    font-size: 1.2em;
    font-weight: 700;
    padding: 8px;
    width: calc(100% - 16px);
  }

  div {
    width: 100%;
    display: flex;
  }

  div.auth-token-container {
    flex-direction: column;
  }

  input {
    flex-grow: 1;
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
