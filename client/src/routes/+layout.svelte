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
    await loadAlby();
  });

  async function loadAlby() {
    user.address = "";
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
        user.address = data.lightning_address;

        const url = new URL(window.location);
        url.searchParams.delete("code");
        goto(url.pathname + url.search, { replaceState: true });
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`${remoteServer}/alby/refresh`, {
          credentials: "include",
        });
        const data = await res.json();

        user.address = data.lightning_address;
      } catch (err) {}
    }
  }
</script>

<nav>
  <ul>
    <li>
      <a href={albyLoginUrl}>Log In With Alby</a>
    </li>
  </ul>
</nav>
{#if user.address}
  <slot />
{/if}

<style>
  ul {
    display: flex;
    justify-content: flex-end;
  }

  li {
    list-style: none;
  }
</style>
