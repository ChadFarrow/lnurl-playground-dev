<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { dev } from "$app/environment";
  import {
    userState,
    remoteServer,
    albyRedirectUrl,
    albyClientId,
  } from "$lib/state.svelte.js";
  let name = userState.name;

  let albyLoginUrl = "";
  let loggedIn = false;
  let loading = true;
  let address;
  let albyAccessToken = "";
  let tokenSaved = false;
  let approvedGuids = [""];

  onMount(async () => {
    albyLoginUrl = `https://getalby.com/oauth?client_id=${albyClientId}&response_type=code&redirect_uri=${albyRedirectUrl}&scope=account:read%20balance:read%20payments:send%20invoices:read`;
    await loadAlby();
    loading = false;
    console.log("DOM is fully loaded");
  });

  async function loadAlby() {
    console.log(remoteServer);
    address = null;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      try {
        const res = await fetch(
          `${remoteServer}/alby/auth?code=${code}&redirect_uri=${albyRedirectUrl}`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();
        address = data.lightning_address;

        const url = new URL(window.location);
        url.searchParams.delete("code");
        goto(url.pathname + url.search, { replaceState: true });
        await fetchSettings();
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`${remoteServer}/alby/refresh`, {
          credentials: "include",
        });
        const data = await res.json();

        address = data.lightning_address;
        await fetchSettings();
      } catch (err) {}
    }
  }

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
    console.log("Reset password for:", address);
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

{#if loading}
  <h1>Loading...</h1>
{:else if address}
  <h1>{address}</h1>
  <div>
    <button on:click={saveSettings}>Save Settings</button>
  </div>
  <div class="input-group">
    <label for="alby-access-token">Alby Access Token</label>
    <input
      type="password"
      id="alby-access-token"
      bind:value={albyAccessToken}
    />
    <span>{tokenSaved ? "saved" : ""}</span>
  </div>

  <h3>Approved Podcast GUIDs</h3>
  <div>
    <button
      on:click={() => {
        approvedGuids.unshift("");
        approvedGuids = approvedGuids;
      }}>Add GUID</button
    >
  </div>
  {#each approvedGuids as guid, i}
    <div class="input-group">
      <label for={`guid=${i}`}>Podcast GUID</label>
      <input type="text" id={`guid=${i}`} bind:value={guid} />
    </div>
  {/each}
{:else}
  <h2>
    Log in with <a id="alby-login" href={albyLoginUrl}>Alby</a>
  </h2>
{/if}

<style>
  span {
    color: green;
    font-weight: 700;
  }

  h1 {
    margin: 8px 0 0 0;
  }

  h3 {
    margin: 8px 0 0 0;
  }
  button {
    margin: 8px;
  }
</style>
