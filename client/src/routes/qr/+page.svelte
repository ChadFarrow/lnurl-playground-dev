<script>
  import { onMount } from "svelte";
  import { remoteServer } from "$lib/state.svelte.js";
  
  let qrCodeUrl = "";
  let invoiceUrl = "";
  let qrImage = "";
  let amount = 100;
  let loading = false;

  async function generateQR() {
    loading = true;
    try {
      // Create the invoice URL
      invoiceUrl = `${remoteServer}/invoice?address=lushnessprecious644398@getalby.com`;
      
      // Generate the invoice
      const response = await fetch(invoiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "bitcoin-lightning",
          metadata: {
            podcast: "Lightning Prism Test",
            episode: "QR Code Test",
            guid: "9fe51a32-e08d-5ab7-9540-22a25c6bc2bf",
            episode_guid: "QR001",
            ts: 10,
            speed: "1",
            action: "boost",
            app_name: "Lightning Prism Tester",
            value_msat_total: amount * 1000,
            url: "https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/main/public/lnurl-test-feed.xml",
            sender_name: "QR Code Test",
            sender_id: "test@example.com",
            reply_address: "035ad2c954e264004986da2d9499e1732e5175e1dcef2453c921c6cdcc3536e9d8",
            message: "Testing Lightning Prism splits via QR code",
          }
        }),
      });

      const data = await response.json();
      
      if (data.invoice) {
        // Use external QR code service (simpler and no CORS issues)
        qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.invoice)}`;
        qrCodeUrl = data.invoice;
      } else {
        console.error("Failed to generate invoice:", data);
      }
    } catch (error) {
      console.error("Error generating QR:", error);
    }
    loading = false;
  }

  onMount(() => {
    generateQR();
  });
</script>

<main>
  <a href="/">Back</a>
  
  <h1>Lightning Prism QR Code</h1>
  
  <div class="qr-generator">
    <div class="controls">
      <label for="amount">Amount (sats):</label>
      <input 
        id="amount" 
        type="number" 
        bind:value={amount} 
        min="1" 
        max="100000"
      />
      <button on:click={generateQR} disabled={loading}>
        {loading ? "Generating..." : "Generate QR"}
      </button>
    </div>

    {#if qrImage}
      <div class="qr-display">
        <h2>Scan to Test Lightning Prism</h2>
        <div class="qr-container">
          <img src={qrImage} alt="Lightning Invoice QR Code" />
        </div>
        
        <div class="info">
          <p><strong>Amount:</strong> {amount} sats</p>
          <p><strong>Recipient:</strong> lushnessprecious644398@getalby.com (TheSplitBox)</p>
          <p><strong>Splits from RSS feed value block:</strong></p>
          <ul>
            <li>15% each → Alby, Strike, BTCPay, Zeus, Primal, MyNode</li>
            <li>5% each → Wolf, Podcast Index</li>
          </ul>
        </div>

        {#if qrCodeUrl}
          <details>
            <summary>Lightning Invoice</summary>
            <code class="invoice">{qrCodeUrl}</code>
          </details>
        {/if}
      </div>
    {:else if loading}
      <p>Generating QR code...</p>
    {/if}
  </div>
</main>

<style>
  .qr-generator {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  .controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }

  .controls label {
    font-weight: bold;
  }

  .controls input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100px;
  }

  .controls button {
    padding: 8px 16px;
    background: #f7931a;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .controls button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .qr-display {
    text-align: center;
  }

  .qr-container {
    margin: 20px 0;
    padding: 20px;
    border: 2px solid #f7931a;
    border-radius: 10px;
    background: white;
    display: inline-block;
  }

  .qr-container img {
    display: block;
    max-width: 300px;
    height: auto;
  }

  .info {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: left;
  }

  .info ul {
    margin: 10px 0;
    padding-left: 20px;
  }

  .invoice {
    word-break: break-all;
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    display: block;
    margin: 10px 0;
  }

  details {
    margin-top: 20px;
    text-align: left;
  }

  summary {
    cursor: pointer;
    font-weight: bold;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
  }
</style>