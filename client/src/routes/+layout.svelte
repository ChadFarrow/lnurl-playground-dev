<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import {
    user,
    remoteServer,
    albyRedirectUrl,
    albyClientId,
  } from "$lib/state.svelte.js";

  let albyLoginUrl = "";

  onMount(async () => {
    albyLoginUrl = `https://getalby.com/oauth?client_id=${albyClientId}&response_type=code&redirect_uri=${albyRedirectUrl}&scope=account:read%20balance:read%20payments:send%20invoices:read`;
    console.log('Alby Client ID:', albyClientId);
    console.log('Alby Login URL:', albyLoginUrl);
    await loadAlby();
  });

  async function loadAlby() {
    // For NWC, we'll use the lightning address from the environment
    // This bypasses the Alby OAuth requirement
    user.address = "lushnessprecious644398@getalby.com";
    
    // Clean up any OAuth code from URL if present
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      url.searchParams.delete("code");
      goto(url.pathname + url.search, { replaceState: true });
    }
  }
</script>

<nav>
  <ul>
    <li>
      <a href="/settings">Settings</a>
    </li>
    <li>
      <a href="/invoice-demo">Invoice Demo</a>
    </li>
    <li>
      <a href="/autopay">Auto Pay</a>
    </li>
    <li>
      <a href="/qr">⚡ Lightning Prism QR</a>
    </li>
  </ul>
</nav>

<slot />

<style>
  nav {
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 0.5rem 0;
    margin-bottom: 1.5rem;
  }
  ul {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1.5rem;
    margin: 0;
    padding: 0 2rem;
  }
  li {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    font-size: 1.1rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;
  }
  a:hover, a:focus {
    background: #f7931a22;
    color: #f7931a;
  }
</style>
