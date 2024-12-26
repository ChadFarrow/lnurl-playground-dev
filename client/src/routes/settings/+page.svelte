<script>
  import { onMount } from "svelte";

  let recipient = { lnaddress: "steven@getalby.com", amount: 100 };
  let albyLoginUrl = "";
  let invoice = "";
  let loggedIn = false;
  let loading = true;
  let address;

  onMount(async () => {
    const albyClientId = "TGu2U0ptCn";
    albyLoginUrl = `https://getalby.com/oauth?client_id=${albyClientId}&response_type=code&redirect_uri=${window.location.href.split("?")[0]}&scope=account:read%20balance:read%20payments:send%20invoices:read`;
    await loadAlby();
    loading = false;
    console.log("DOM is fully loaded");
  });

  async function loadAlby() {
    address = null;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const redirect_uri = "http://localhost:5173/settings";
      try {
        const res = await fetch(
          `http://localhost:3000/alby/auth5173?code=${code}&redirect_uri=${redirect_uri}`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();
        console.log(data);
        address = data.lightning_address;
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch("http://localhost:3000/alby/refresh5173", {
          credentials: "include",
        });
        const data = await res.json();
        console.log(data);
        address = data.lightning_address;
      } catch (err) {}
    }
  }

  async function saveSettings() {
    console.log("Reset password for:", address);
    const payload = { albyAuthKey, guid };
    console.log(payload);
    let res = await fetch(`http://localhost:3000/splitbox/save-settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log(data);
  }

  let albyAuthKey = "fdfsahoer";
  let guid = 1234;
</script>

{#if loading}
  <h1>Loading...</h1>
{:else if address}
  <h1>{address}</h1>
  <div class="input-group">
    <label for="lightning">Lightning Address</label>
    <input type="password" id="lightning" bind:value={albyAuthKey} />
  </div>

  <div class="input-group">
    <label for="password">Password</label>
    <input type="password" id="password" bind:value={guid} />
  </div>

  <div class="button-group">
    <button on:click={saveSettings} class="reset">Save Settings</button>
  </div>
{:else}
  <h2>
    Log in with <a id="alby-login" href={albyLoginUrl}>Alby</a>
  </h2>
{/if}
