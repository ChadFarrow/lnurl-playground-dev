<script>
  let address = "steven@getalby.com";
  let password = "bob";

  let albyLoginUrl = "";
  let invoice = "";
  let qrCodeCanvas;

  function login() {
    console.log("Logging in with:", address, password);
    // Implement login logic here
  }

  async function resetPassword() {
    console.log("Reset password for:", address);
    const payload = { address, password };
    console.log(payload);
    let res = await fetch(`http://localhost:3000/splitbox/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log(data);
    // Implement reset password logic here
  }

  async function getInvoice() {
    try {
      tlv.value_msat_total = recipient.amount * 1000;
      const payload = {
        type: "bitcoin-lightning",
        metadata: tlv,
      };
      let res = await fetch(
        `http://localhost:3000/splitbox/invoice?address=${recipient.lnaddress}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      console.log(data);
      generateQRCode(data.invoice);
    } catch (error) {
      console.log(error);
    }
  }

  async function generateQRCode(code) {
    console.log(code);
    console.log(qrCodeCanvas);
    if (!qrCodeCanvas) {
      return;
    }
    console.log(code);
    try {
      await QRCode.toCanvas(qrCodeCanvas, code, {
        width: 200,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Invoice copied to clipboard");
      })
      .catch((err) => {
        alert("Error copying ID to clipboard");
      });
  }
</script>

<div class="container">
  <h2>Login</h2>
  <div class="input-group">
    <label for="lightning">Lightning Address</label>
    <input type="text" id="lightning" bind:value={address} />
  </div>

  <div class="input-group">
    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} />
  </div>

  <div class="button-group">
    <button on:click={login}>Login</button>
    <button on:click={resetPassword} class="reset">Reset Password</button>
  </div>
</div>

<div class:show={invoice} class="qr-container">
  <canvas bind:this={qrCodeCanvas}></canvas>
  <p>{invoice}</p>
  <button class="copy-qr" on:click={copyToClipboard.bind(this, invoice)}>
    Copy
  </button>
</div>

<style>
  .container {
    width: 300px;
    margin: auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  .input-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .button-group {
    display: flex;
    justify-content: space-between;
  }

  button {
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .reset {
    background-color: #f44336;
    color: white;
  }

  button:hover {
    opacity: 0.9;
  }

  .qr-container {
    flex-direction: column;
    align-items: center;
    width: calc(100% - 16px);
    margin: 0 8px;
    height: 100%;
    position: relative;
    display: none;
  }

  .qr-container.show {
    display: flex;
  }

  p {
    word-break: break-all;
  }
</style>
