<script>
  import { remoteServer } from "$lib/state.svelte.js";
  let guid = "9325d046-c0fd-4988-9704-86ed62b68390";
  let jsonData = null;
  let error = null;

  const fetchData = async () => {
    error = null;
    jsonData = null;
    try {
      const res = await fetch(`${remoteServer}/metadata/${guid}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      jsonData = await res.json();
    } catch (err) {
      error = err.message;
    }
  };
</script>

<main>
  <div>
    <input type="text" bind:value={guid} placeholder="Enter GUID" />
    <button on:click={fetchData}>Fetch JSON</button>
  </div>

  {#if error}
    <p>Error: {error}</p>
  {:else if jsonData}
    <pre>{JSON.stringify(jsonData, null, 2)}</pre>
  {:else}
    <p>Enter a GUID and click fetch</p>
  {/if}
</main>

<style>
  pre {
    background-color: #f4f4f4;
    padding: 1rem;
    border-radius: 5px;
    overflow-x: auto;
  }
</style>
