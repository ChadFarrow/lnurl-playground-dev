<script>
  import { onMount } from "svelte";
  import webhook from "./webhook-test";
  async function sendPostRequest() {
    try {
      const response = await fetch("http://localhost:3000/webhook-async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhook),
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
