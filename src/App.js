import React, { useState } from "react";
import { nwc } from "@getalby/sdk";

export default function App() {
  const [activeTab, setActiveTab] = useState("payment");
  const [rssUrl, setRssUrl] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [nwcUrl, setNwcUrl] = useState("");
  const [walletInfo, setWalletInfo] = useState(null);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Helper function to validate and format node pubkey
  function validateNodePubkey(pubkey) {
    // Remove any whitespace
    const cleanPubkey = pubkey.trim();
    
    // Check if it's a valid Lightning node pubkey (33 bytes, hex encoded)
    if (cleanPubkey.length !== 66) {
      throw new Error(`Invalid pubkey length: ${cleanPubkey.length}, expected 66 characters`);
    }
    
    // Check if it starts with 02 or 03
    if (!cleanPubkey.startsWith('02') && !cleanPubkey.startsWith('03')) {
      throw new Error(`Invalid pubkey format: must start with 02 or 03, got ${cleanPubkey.substring(0, 2)}`);
    }
    
    // Check if it's valid hex
    if (!/^[0-9a-fA-F]+$/.test(cleanPubkey)) {
      throw new Error("Invalid pubkey format: must be valid hex");
    }
    
    return cleanPubkey;
  }

  // Known working Lightning node pubkeys for testing
  const KNOWN_NODES = [
    {
      name: "minr",
      pubkey: "032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51",
      description: "Known working Lightning node"
    },
    {
      name: "ACINQ",
      pubkey: "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
      description: "ACINQ Lightning node (Phoenix wallet)"
    },
    {
      name: "Bitcoin Lightning",
      pubkey: "02eec7245d6b7d2ccb30380bfbe2a3648cd7a942653f5aa340edcea1f283686619",
      description: "Bitcoin Lightning node"
    },
    {
      name: "Lightning Labs",
      pubkey: "03a9d1e8f25b9aac3360eaea6a8b7a163c6f1f563c0a90947c460172ddd1f5b4f1",
      description: "Lightning Labs node"
    },
    {
      name: "Blixt",
      pubkey: "02eec7245d6b7d2ccb30380bfbe2a3648cd7a942653f5aa340edcea1f283686619",
      description: "Blixt Lightning node"
    }
  ];



  // Fetch and parse RSS
  async function fetchRss() {
    setLoading(true);
    setStatus("");
    setRecipients([]);
    try {
      // Don't use CORS proxy for localhost URLs
      const url = rssUrl.startsWith("http") && !rssUrl.includes("localhost")
        ? `https://corsproxy.io/?url=${encodeURIComponent(rssUrl)}`
        : rssUrl;
      console.log("Fetching URL:", url);
      const res = await fetch(url);
      const text = await res.text();
      console.log("RSS content length:", text.length);
      console.log("RSS content preview:", text.substring(0, 500));
      
      // Check if we got HTML instead of XML (CORS proxy error)
      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        throw new Error("Received HTML instead of XML. CORS proxy may be blocking the request.");
      }
      
      const doc = new window.DOMParser().parseFromString(text, "text/xml");
      console.log("Parsed XML document:", doc);
      
      // Check for XML parsing errors
      const parserError = doc.querySelector("parsererror");
      if (parserError) {
        throw new Error("XML parsing failed: " + parserError.textContent);
      }
      
      // Try different approaches to find the value block
      let valueBlock = null;
      
      // Method 1: Try with namespace
      const podcastNamespace = "https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md";
      const valueElements = doc.getElementsByTagNameNS(podcastNamespace, "value");
      if (valueElements.length > 0) {
        valueBlock = valueElements[0];
      }
      
      // Method 2: Try without namespace
      if (!valueBlock) {
        valueBlock = doc.querySelector("value");
      }
      
      // Method 3: Try with escaped colon
      if (!valueBlock) {
        valueBlock = doc.querySelector("podcast\\:value");
      }
      
      // Method 4: Try attribute selector
      if (!valueBlock) {
        valueBlock = doc.querySelector("[name='podcast:value']");
      }
      
      console.log("Value block found:", valueBlock);
      
      if (!valueBlock) {
        // Log all elements to debug
        console.log("All elements in RSS:", doc.documentElement.innerHTML);
        throw new Error("No <podcast:value> block found");
      }
      
      // Try different approaches to find recipients
      let recipientElements = [];
      
      // Method 1: Try with namespace
      const recipientNS = doc.getElementsByTagNameNS(podcastNamespace, "valueRecipient");
      if (recipientNS.length > 0) {
        recipientElements = Array.from(recipientNS);
      }
      
      // Method 2: Try without namespace
      if (recipientElements.length === 0) {
        recipientElements = Array.from(valueBlock.querySelectorAll("valueRecipient"));
      }
      
      // Method 3: Try with escaped colon
      if (recipientElements.length === 0) {
        recipientElements = Array.from(valueBlock.querySelectorAll("podcast\\:valueRecipient"));
      }
      
      const recips = recipientElements.map((el) => ({
        name: el.getAttribute("name"),
        address: el.getAttribute("address"),
        split: el.getAttribute("split"),
        type: el.getAttribute("type"),
      }));
      
      console.log("Parsed recipients:", recips);
      setRecipients(recips);
      setStatus("Parsed value block!");
    } catch (e) {
      console.error("Error parsing RSS:", e);
      setStatus("Error: " + e.message);
    }
    setLoading(false);
  }

  // Connect wallet via NWC
  async function connectWallet() {
    setStatus("Connecting wallet...");
    try {
      if (!nwcUrl.trim()) {
        throw new Error("Please enter an NWC connection string");
      }
      
      console.log("Original NWC URL:", nwcUrl.trim());
      
      // Parse the NWC URL to extract components
      const url = nwcUrl.trim();
      let pubkey, relay, secret, lud16;
      
      try {
        if (url.startsWith('nostr+walletconnect://')) {
          const cleanUrl = url.replace('nostr+walletconnect://', '');
          const [pubkeyPart, params] = cleanUrl.split('?');
          pubkey = pubkeyPart;
          
          if (params) {
            const searchParams = new URLSearchParams(params);
            relay = searchParams.get('relay');
            secret = searchParams.get('secret');
            lud16 = searchParams.get('lud16');
          }
        } else if (url.startsWith('nwc://')) {
          const cleanUrl = url.replace('nwc://', '');
          const [pubkeyPart, params] = cleanUrl.split('?');
          pubkey = pubkeyPart;
          
          if (params) {
            const searchParams = new URLSearchParams(params);
            relay = searchParams.get('relay');
            secret = searchParams.get('secret');
            lud16 = searchParams.get('lud16');
          }
        } else {
          throw new Error("Invalid NWC URL format. Must start with 'nostr+walletconnect://' or 'nwc://'");
        }
        
        // Validate required components
        if (!pubkey) {
          throw new Error("Missing pubkey in NWC URL");
        }
        if (!relay) {
          throw new Error("Missing relay in NWC URL");
        }
        if (!secret) {
          throw new Error("Missing secret in NWC URL");
        }
        
        console.log("Parsed NWC components:", { pubkey, relay, secret, lud16 });
      } catch (parseError) {
        console.error("NWC URL parsing error:", parseError);
        throw new Error(`Failed to parse NWC URL: ${parseError.message}`);
      }
      
      // Create NWC client with the full URL
      const nwcClientConfig = {
        nostrWalletConnectUrl: nwcUrl.trim()
      };
      
      console.log("NWC Client config:", nwcClientConfig);
      
      const nwcClient = new nwc.NWCClient(nwcClientConfig);
      console.log("NWC Client created:", nwcClient);
      
      // Test the connection by getting wallet info
      console.log("Attempting to get wallet info...");
      
      // Simple single attempt with reasonable timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout after 20 seconds")), 20000)
      );
      
      const infoPromise = nwcClient.getInfo();
      const info = await Promise.race([infoPromise, timeoutPromise]);
      console.log("Wallet info:", info);
      
      // Test available methods
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(nwcClient));
      console.log("Available methods:", methods);
      
      setWallet(nwcClient);
      setWalletInfo(info);
      setAvailableMethods(methods);
      
      // Handle different wallet info structures
      let walletName = "Unknown";
      if (info && info.node && info.node.alias) {
        walletName = info.node.alias;
      } else if (info && info.alias) {
        walletName = info.alias;
      } else if (info && info.name) {
        walletName = info.name;
      } else if (info) {
        walletName = "Connected Wallet";
      }
      
      setStatus(`Wallet connected! (${walletName})`);
    } catch (e) {
      console.error("NWC connection error:", e);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      setStatus("Wallet connect failed: " + e.message);
    }
  }

  // Test wallet functionality
  async function testWallet() {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }
    
    setStatus("Testing wallet functionality...");
    try {
      // Test getBalance
      const balance = await wallet.getBalance();
      console.log("Wallet balance:", balance);
      
      // Test getInfo again
      const info = await wallet.getInfo();
      console.log("Wallet info:", info);
      
      // Test what methods are available
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(wallet));
      console.log("Available methods:", methods);
      
      // Check for payment-related methods
      const paymentMethods = methods.filter(m => 
        m.includes('pay') || m.includes('invoice') || m.includes('send')
      );
      console.log("Payment methods:", paymentMethods);
      
      // Handle balance display (could be sats or millisats)
      let balanceDisplay = balance.balance;
      let unit = "sats";
      
      if (balance.balance > 1000000) {
        // Likely millisats, convert to sats
        balanceDisplay = Math.round(balance.balance / 1000);
        unit = "sats";
      } else if (balance.balance > 1000) {
        // Likely sats
        unit = "sats";
      } else {
        // Could be sats or millisats, show both
        unit = "units";
      }
      
      setStatus(`Wallet test successful! Balance: ${balanceDisplay} ${unit} | Payment methods: ${paymentMethods.join(', ')}`);
    } catch (e) {
      console.error("Wallet test failed:", e);
      setStatus("Wallet test failed: " + e.message);
    }
  }

  // Test keysend functionality
  async function testKeysend() {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }
    
    setStatus("Testing keysend functionality...");
    try {
      // Test with the real minr node pubkey
      const testNodePubkey = "032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51";
      const testAmount = 10; // 10 sats
      
      // Validate the pubkey
      const validatedPubkey = validateNodePubkey(testNodePubkey);
      console.log("Testing keysend to node pubkey:", validatedPubkey);
      console.log("Node pubkey length:", validatedPubkey.length);
      console.log("Node pubkey starts with:", validatedPubkey.substring(0, 2));
      
      // Check for different keysend method names
      let keysendMethod = null;
      if (typeof wallet.payKeysend === 'function') {
        keysendMethod = 'payKeysend';
      } else if (typeof wallet.keysend === 'function') {
        keysendMethod = 'keysend';
      } else if (typeof wallet.sendKeysend === 'function') {
        keysendMethod = 'sendKeysend';
      }
      
      if (!keysendMethod) {
        throw new Error("Keysend method not available on this wallet");
      }
      
      console.log("Using keysend method:", keysendMethod);
      
      // Try to send a keysend payment with the correct method
      let keysendResult;
      if (keysendMethod === 'payKeysend') {
        // Try different parameter formats for payKeysend
        try {
          console.log("Trying payKeysend with destination parameter...");
          console.log("Destination pubkey:", validatedPubkey);
          console.log("Destination pubkey type:", typeof validatedPubkey);
          console.log("Destination pubkey length:", validatedPubkey.length);
          
          keysendResult = await wallet.payKeysend({
            destination: validatedPubkey,
            amount: testAmount * 1000, // Convert to millisats
            customRecords: {
              "696969": "Value4Value test payment" // Custom record for fun
            }
          });
        } catch (e) {
          console.log("First attempt failed, trying with pubkey parameter...");
          console.log("Error from first attempt:", e.message);
          console.log("Pubkey parameter:", validatedPubkey);
          
          keysendResult = await wallet.payKeysend({
            pubkey: validatedPubkey,
            amount: testAmount * 1000, // Convert to millisats
            customRecords: {
              "696969": "Value4Value test payment" // Custom record for fun
            }
          });
        }
      } else if (keysendMethod === 'keysend') {
        keysendResult = await wallet.keysend({
          destination: validatedPubkey,
          amount: testAmount * 1000, // Convert to millisats
          customRecords: {
            "696969": "Value4Value test payment" // Custom record for fun
          }
        });
      } else if (keysendMethod === 'sendKeysend') {
        keysendResult = await wallet.sendKeysend({
          destination: validatedPubkey,
          amount: testAmount * 1000, // Convert to millisats
          customRecords: {
            "696969": "Value4Value test payment" // Custom record for fun
          }
        });
      }
      
      console.log("Keysend result:", keysendResult);
      setStatus(`Keysend test successful! Payment ID: ${keysendResult.paymentHash || keysendResult.paymentId || 'N/A'}`);
      
    } catch (e) {
      console.error("Keysend test failed:", e);
      setStatus("Keysend test failed: " + e.message);
    }
  }

  // Automated comprehensive testing
  async function runAutomatedTests() {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }
    
    setIsRunningTests(true);
    setTestResults([]);
    setStatus("Running automated tests...");
    
    const results = [];
    
    try {
             // Test 1: Check available methods
       const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(wallet));
       const paymentMethods = methods.filter(m => 
         m.includes('pay') || m.includes('invoice') || m.includes('send') || m.includes('keysend')
       );
       
       // Inspect the payKeysend method to understand its signature
       let methodSignature = "Unknown";
       if (typeof wallet.payKeysend === 'function') {
         try {
           // Try to get function source (this might not work in all browsers)
           const funcStr = wallet.payKeysend.toString();
           methodSignature = funcStr.substring(0, 100) + "...";
         } catch (e) {
           methodSignature = "payKeysend function available";
         }
       }
       
       results.push({
         test: "Available Methods",
         status: "PASS",
         details: `Found ${paymentMethods.length} payment methods: ${paymentMethods.join(', ')} | payKeysend signature: ${methodSignature}`
       });
      
      // Test 2: Check keysend support
      let keysendSupported = false;
      let keysendMethod = null;
      
      if (typeof wallet.payKeysend === 'function') {
        keysendSupported = true;
        keysendMethod = 'payKeysend';
      } else if (typeof wallet.keysend === 'function') {
        keysendSupported = true;
        keysendMethod = 'keysend';
      } else if (typeof wallet.sendKeysend === 'function') {
        keysendSupported = true;
        keysendMethod = 'sendKeysend';
      }
      
      results.push({
        test: "Keysend Support",
        status: keysendSupported ? "PASS" : "FAIL",
        details: keysendSupported ? `Keysend supported via ${keysendMethod}` : "No keysend method found"
      });
      
             // Test 3: Test keysend with known nodes
       if (keysendSupported) {
         for (const node of KNOWN_NODES) {
           console.log(`Testing keysend to ${node.name} with pubkey:`, node.pubkey);
           console.log(`Pubkey length:`, node.pubkey.length);
           console.log(`Pubkey type:`, typeof node.pubkey);
          try {
            console.log(`Testing keysend to ${node.name}:`, node.pubkey);
            
                                      let keysendResult;
             if (keysendMethod === 'payKeysend') {
               // Try different parameter formats for payKeysend
               try {
                 console.log(`Trying payKeysend with destination for ${node.name}:`, node.pubkey);
                 keysendResult = await wallet.payKeysend({
                   destination: node.pubkey,
                   amount: 10000, // 10 sats
                   customRecords: {
                     "696969": `Automated test to ${node.name}`
                   }
                 });
               } catch (e) {
                 console.log(`Destination failed for ${node.name}, trying pubkey parameter:`, e.message);
                 keysendResult = await wallet.payKeysend({
                   pubkey: node.pubkey,
                   amount: 10000, // 10 sats
                   customRecords: {
                     "696969": `Automated test to ${node.name}`
                   }
                 });
               }
             } else if (keysendMethod === 'keysend') {
               keysendResult = await wallet.keysend({
                 destination: node.pubkey,
                 amount: 10000,
                 customRecords: {
                   "696969": `Automated test to ${node.name}`
                 }
               });
             } else if (keysendMethod === 'sendKeysend') {
               keysendResult = await wallet.sendKeysend({
                 destination: node.pubkey,
                 amount: 10000,
                 customRecords: {
                   "696969": `Automated test to ${node.name}`
                 }
               });
             }
             
             results.push({
               test: `Keysend to ${node.name}`,
               status: "PASS",
               details: `Payment successful! ID: ${keysendResult.paymentHash || keysendResult.paymentId || 'N/A'}`
             });
             
             // Wait a bit between tests
             await new Promise(resolve => setTimeout(resolve, 1000));
             
           } catch (e) {
             console.log(`Keysend failed for ${node.name}, trying minimal parameters:`, e.message);
             
             // Try with minimal parameters (no custom records)
             try {
               let minimalKeysendResult;
               if (keysendMethod === 'payKeysend') {
                 minimalKeysendResult = await wallet.payKeysend({
                   destination: node.pubkey,
                   amount: 10000
                 });
                 results.push({
                   test: `Keysend to ${node.name} (minimal)`,
                   status: "PASS",
                   details: `Payment successful! ID: ${minimalKeysendResult.paymentHash || minimalKeysendResult.paymentId || 'N/A'}`
                 });
               } else {
                 results.push({
                   test: `Keysend to ${node.name}`,
                   status: "FAIL",
                   details: e.message
                 });
               }
             } catch (minimalError) {
               console.log(`Minimal keysend also failed for ${node.name}:`, minimalError.message);
               
               // Try with different parameter names
               try {
                 console.log(`Trying alternative parameter names for ${node.name}`);
                 let altKeysendResult = await wallet.payKeysend({
                   nodeId: node.pubkey,
                   amount: 10000
                 });
                 results.push({
                   test: `Keysend to ${node.name} (nodeId)`,
                   status: "PASS",
                   details: `Payment successful! ID: ${altKeysendResult.paymentHash || altKeysendResult.paymentId || 'N/A'}`
                 });
               } catch (altError) {
                 console.log(`Alternative parameters also failed for ${node.name}:`, altError.message);
                 results.push({
                   test: `Keysend to ${node.name}`,
                   status: "FAIL",
                   details: `${e.message} | Minimal: ${minimalError.message} | Alternative: ${altError.message}`
                 });
               }
             }
           }
        }
      }
      
             // Test 4: Test Lightning address payment
       try {
         const testAddress = "chadf@getalby.com";
         // Try a different endpoint that should work
         let lnurlResponse = await fetch(`https://getalby.com/.well-known/lnurlp/chadf`);
         
         // If HTTPS fails with 426 UPGRADE REQUIRED, try HTTP for local testing
         if (lnurlResponse.status === 426) {
           console.log("HTTPS failed with 426 UPGRADE REQUIRED, trying HTTP for local testing...");
           lnurlResponse = await fetch(`http://getalby.com/.well-known/lnurlp/chadf`);
         }
        
        if (lnurlResponse.ok) {
          const lnurlData = await lnurlResponse.json();
          if (lnurlData.callback) {
            const invoiceResponse = await fetch(`${lnurlData.callback}?amount=10000&description=Automated test`);
            
            if (invoiceResponse.ok) {
              const invoiceData = await invoiceResponse.json();
              if (invoiceData.pr) {
                const paymentResult = await wallet.payInvoice({ invoice: invoiceData.pr });
                results.push({
                  test: "Lightning Address Payment",
                  status: "PASS",
                  details: `Payment successful! ID: ${paymentResult.paymentHash || paymentResult.paymentId || 'N/A'}`
                });
              } else {
                results.push({
                  test: "Lightning Address Payment",
                  status: "FAIL",
                  details: "No payment request in response"
                });
              }
            } else {
              results.push({
                test: "Lightning Address Payment",
                status: "FAIL",
                details: `Invoice request failed: ${invoiceResponse.status}`
              });
            }
          } else {
            results.push({
              test: "Lightning Address Payment",
              status: "FAIL",
              details: "No callback in LNURL response"
            });
          }
        } else {
          results.push({
            test: "Lightning Address Payment",
            status: "FAIL",
            details: `LNURL request failed: ${lnurlResponse.status}`
          });
        }
      } catch (e) {
        results.push({
          test: "Lightning Address Payment",
          status: "FAIL",
          details: e.message
        });
      }
      
      setTestResults(results);
      setStatus("Automated tests completed!");
      
    } catch (e) {
      console.error("Automated tests failed:", e);
      setStatus("Automated tests failed: " + e.message);
    }
    
    setIsRunningTests(false);
  }

  // Test different payment methods
  async function testPaymentMethods() {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }
    
    setStatus("Testing all available payment methods...");
    const results = [];
    
    try {
      // Test 1: Check for different keysend method names
      let keysendAvailable = false;
      if (typeof wallet.payKeysend === 'function') {
        results.push("✓ PayKeysend method available");
        keysendAvailable = true;
      } else if (typeof wallet.keysend === 'function') {
        results.push("✓ Keysend method available");
        keysendAvailable = true;
      } else if (typeof wallet.sendKeysend === 'function') {
        results.push("✓ SendKeysend method available");
        keysendAvailable = true;
      } else {
        results.push("✗ Keysend method not available");
      }
      
      // Test 2: Check if payInvoice method exists
      if (typeof wallet.payInvoice === 'function') {
        results.push("✓ Pay invoice method available");
      } else {
        results.push("✗ Pay invoice method not available");
      }
      
      // Test 3: Check if sendPayment method exists
      if (typeof wallet.sendPayment === 'function') {
        results.push("✓ Send payment method available");
      } else {
        results.push("✗ Send payment method not available");
      }
      
      // Test 4: Check if makeInvoice method exists
      if (typeof wallet.makeInvoice === 'function') {
        results.push("✓ Make invoice method available");
      } else {
        results.push("✗ Make invoice method not available");
      }
      
      // Test 5: Check if getBalance method exists
      if (typeof wallet.getBalance === 'function') {
        results.push("✓ Get balance method available");
      } else {
        results.push("✗ Get balance method not available");
      }
      
      // Test 6: Check for multiPayKeysend
      if (typeof wallet.multiPayKeysend === 'function') {
        results.push("✓ MultiPayKeysend method available");
      } else {
        results.push("✗ MultiPayKeysend method not available");
      }
      
      const keysendStatus = keysendAvailable ? "SUPPORTS KEYSEND" : "NO KEYSEND SUPPORT";
      setStatus(`${keysendStatus} | Payment method test results: ${results.join(' | ')}`);
      
    } catch (e) {
      console.error("Payment method test failed:", e);
      setStatus("Payment method test failed: " + e.message);
    }
  }

  // Send sats
  async function sendSats() {
    if (!wallet || !selected || !amount) return;
    setStatus("Sending...");
    try {
      console.log("Would send", amount, "sats to", selected.name, "at", selected.address);
      
      // Check if this is a Lightning node pubkey (starts with 02 or 03)
      const isNodePubkey = selected.address.startsWith('02') || selected.address.startsWith('03');
      
      if (isNodePubkey) {
        // For node pubkeys, try keysend with the correct method name
        console.log("Node pubkey detected, attempting keysend payment");
        
        try {
          // Check for different keysend method names
          let keysendMethod = null;
          if (typeof wallet.payKeysend === 'function') {
            keysendMethod = 'payKeysend';
          } else if (typeof wallet.keysend === 'function') {
            keysendMethod = 'keysend';
          } else if (typeof wallet.sendKeysend === 'function') {
            keysendMethod = 'sendKeysend';
          }
          
          if (!keysendMethod) {
            throw new Error("Keysend method not available on this wallet");
          }
          
          console.log("Using keysend method:", keysendMethod);
          
          // Validate the node pubkey
          const validatedPubkey = validateNodePubkey(selected.address);
          
          // Send keysend payment
          let keysendResult;
          if (keysendMethod === 'payKeysend') {
            keysendResult = await wallet.payKeysend({
              destination: validatedPubkey,
              amount: parseInt(amount) * 1000, // Convert to millisats
              customRecords: {
                "696969": `Value4Value payment to ${selected.name}` // Custom record
              }
            });
          } else if (keysendMethod === 'keysend') {
            keysendResult = await wallet.keysend({
              destination: validatedPubkey,
              amount: parseInt(amount) * 1000, // Convert to millisats
              customRecords: {
                "696969": `Value4Value payment to ${selected.name}` // Custom record
              }
            });
          } else if (keysendMethod === 'sendKeysend') {
            keysendResult = await wallet.sendKeysend({
              destination: validatedPubkey,
              amount: parseInt(amount) * 1000, // Convert to millisats
              customRecords: {
                "696969": `Value4Value payment to ${selected.name}` // Custom record
              }
            });
          }
          
          console.log("Keysend result:", keysendResult);
          setStatus(`Keysend payment sent! ${amount} sats to ${selected.name} (Payment ID: ${keysendResult.paymentHash || keysendResult.paymentId || 'N/A'})`);
          
        } catch (keysendError) {
          console.error("Keysend failed:", keysendError);
          setStatus("Keysend payment failed: " + keysendError.message);
        }
      } else {
        // For Lightning addresses, we need to get an invoice first
        console.log("Lightning address detected:", selected.address);
        
        try {
          // Extract username from Lightning address
          const username = selected.address.split('@')[0];
          const domain = selected.address.split('@')[1];
          
          // Try to create an invoice using LNURL - try HTTPS first, then HTTP
          let lnurlResponse = await fetch(`https://${domain}/.well-known/lnurlp/${username}`);
          
          // If HTTPS fails with 426 UPGRADE REQUIRED, try HTTP for local testing
          if (lnurlResponse.status === 426) {
            console.log("HTTPS failed with 426 UPGRADE REQUIRED, trying HTTP for local testing...");
            lnurlResponse = await fetch(`http://${domain}/.well-known/lnurlp/${username}`);
          }
          
          if (!lnurlResponse.ok) {
            throw new Error(`LNURL request failed: ${lnurlResponse.status} ${lnurlResponse.statusText}`);
          }
          
          const lnurlData = await lnurlResponse.json();
          console.log("LNURL data:", lnurlData);
          
          if (lnurlData.callback) {
            // Create invoice using LNURL
            const invoiceResponse = await fetch(`${lnurlData.callback}?amount=${parseInt(amount) * 1000}&description=Value4Value`);
            
            if (!invoiceResponse.ok) {
              throw new Error(`Invoice request failed: ${invoiceResponse.status} ${invoiceResponse.statusText}`);
            }
            
            const invoiceData = await invoiceResponse.json();
            console.log("Invoice data:", invoiceData);
            
            if (invoiceData.pr) {
              // Pay the invoice
              const paymentResult = await wallet.payInvoice({ invoice: invoiceData.pr });
              console.log("Payment result:", paymentResult);
              setStatus(`Payment sent! ${amount} sats to ${selected.name}`);
            } else {
              throw new Error("Failed to create invoice - no payment request");
            }
          } else {
            throw new Error("LNURL not supported - no callback");
          }
        } catch (lnurlError) {
          console.error("LNURL failed:", lnurlError);
          setStatus("Lightning address payment failed: " + lnurlError.message);
        }
      }
      
    } catch (e) {
      console.error("Payment error:", e);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      setStatus("Payment failed: " + e.message);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Podcast Value4Value Demo (Mobile)</h2>
      
      {/* RSS Feed Input */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          style={{ width: "100%", marginBottom: "0.5rem" }}
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          placeholder="Enter podcast RSS feed URL"
        />
        <button onClick={fetchRss} disabled={loading || !rssUrl}>
          {loading ? "Loading..." : "Parse Value Block"}
        </button>
      </div>

      {/* NWC Connection */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          style={{ width: "100%", marginBottom: "0.5rem" }}
          value={nwcUrl}
          onChange={(e) => setNwcUrl(e.target.value)}
          placeholder="Enter NWC connection string (nostr+walletconnect://... or nwc://...)"
        />
        <button onClick={connectWallet} disabled={!nwcUrl.trim()}>
          Connect Wallet (NWC)
        </button>
      </div>

      {/* Recipients Display */}
      <div style={{ margin: "1rem 0" }}>
        {recipients.length > 0 && (
          <div>
            <h4>Recipients:</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recipients.map((r, i) => (
                <li key={i} style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      name="recipient"
                      checked={selected === r}
                      onChange={() => setSelected(r)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <div>
                      <strong>{r.name}</strong> ({r.split}%)
                      <br />
                      <small style={{ color: "#666" }}>{r.address}</small>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Payment Section */}
      {wallet && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ color: "green", marginBottom: "0.5rem" }}>✓ Wallet connected!</div>
          <button onClick={testWallet} style={{ marginBottom: "0.5rem", marginRight: "0.5rem" }}>
            Test Wallet
          </button>
          <button onClick={testKeysend} style={{ marginBottom: "0.5rem", marginRight: "0.5rem" }}>
            Test Keysend
          </button>
          <button onClick={async () => {
            if (!wallet) {
              setStatus("Please connect wallet first");
              return;
            }
            setStatus("Testing keysend with real Lightning node...");
            try {
              // Test with the real minr node pubkey
              const realNodePubkey = "032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51";
              const testAmount = 10;
              
              console.log("Testing keysend with real Lightning node:", realNodePubkey);
              console.log("Real node pubkey length:", realNodePubkey.length);
              
              // Validate the pubkey first
              const validatedRealPubkey = validateNodePubkey(realNodePubkey);
              console.log("Validated real node pubkey:", validatedRealPubkey);
              
              if (typeof wallet.payKeysend === 'function') {
                const result = await wallet.payKeysend({
                  destination: validatedRealPubkey,
                  amount: testAmount * 1000,
                  customRecords: {
                    "696969": "Real Lightning node test"
                  }
                });
                console.log("Real node keysend result:", result);
                setStatus(`Real node keysend successful! Payment ID: ${result.paymentHash || result.paymentId || 'N/A'}`);
              } else {
                setStatus("payKeysend method not available");
              }
            } catch (e) {
              console.error("Real node keysend failed:", e);
              setStatus("Real node keysend failed: " + e.message);
            }
          }} style={{ marginBottom: "0.5rem", marginRight: "0.5rem" }}>
            Test Real Node
          </button>
          <button onClick={testPaymentMethods} style={{ marginBottom: "0.5rem", marginRight: "0.5rem" }}>
            Test All Payment Methods
          </button>
          <button onClick={async () => {
            if (!wallet) {
              setStatus("Please connect wallet first");
              return;
            }
            setStatus("Testing minimal keysend...");
            try {
              // Test with the real minr node pubkey
              const testPubkey = "032870511bfa0309bab3ca1832ead69eed848a4abddbc4d50e55bb2157f9525e51";
              console.log("Testing minimal keysend with pubkey:", testPubkey);
              
              if (typeof wallet.payKeysend === 'function') {
                // Try with just destination and amount
                const result = await wallet.payKeysend({
                  destination: testPubkey,
                  amount: 10000 // 10 sats in millisats
                });
                console.log("Minimal keysend result:", result);
                setStatus(`Minimal keysend successful! Payment ID: ${result.paymentHash || result.paymentId || 'N/A'}`);
              } else {
                setStatus("payKeysend method not available");
              }
            } catch (e) {
              console.error("Minimal keysend failed:", e);
              setStatus("Minimal keysend failed: " + e.message);
            }
          }} style={{ marginBottom: "0.5rem", marginRight: "0.5rem" }}>
            Test Minimal Keysend
          </button>
          <button 
            onClick={runAutomatedTests} 
            disabled={isRunningTests}
            style={{ marginBottom: "0.5rem", marginRight: "0.5rem", backgroundColor: isRunningTests ? "#ccc" : "#4CAF50", color: "white" }}
          >
            {isRunningTests ? "Running Tests..." : "🚀 Run All Tests"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="number"
              placeholder="Amount (sats)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: 120 }}
            />
            <button
              onClick={sendSats}
              disabled={!selected || !amount}
            >
              Send Sats
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <div style={{ marginTop: 16, color: "green" }}>{status}</div>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div style={{ marginTop: 16, padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
          <h4>🧪 Test Results:</h4>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ 
                marginBottom: "0.5rem", 
                padding: "0.5rem", 
                backgroundColor: result.status === "PASS" ? "#e8f5e8" : "#ffe8e8",
                borderRadius: "4px",
                border: `1px solid ${result.status === "PASS" ? "#4CAF50" : "#f44336"}`
              }}>
                <div style={{ fontWeight: "bold", color: result.status === "PASS" ? "#2e7d32" : "#c62828" }}>
                  {result.status === "PASS" ? "✅" : "❌"} {result.test}
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "0.25rem" }}>
                  {result.details}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "12px", color: "#666" }}>
            <strong>Summary:</strong> {testResults.filter(r => r.status === "PASS").length}/{testResults.length} tests passed
          </div>
        </div>
      )}
      
      {/* Wallet Info Display */}
      {walletInfo && (
        <div style={{ marginTop: 16, padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <h4>Wallet Information:</h4>
          <pre style={{ fontSize: "12px", overflow: "auto" }}>
            {JSON.stringify(walletInfo, null, 2)}
          </pre>
          
          <h4>Available Methods:</h4>
          <div style={{ fontSize: "12px", marginTop: "0.5rem" }}>
            {availableMethods.map((method, index) => (
              <span key={index} style={{ 
                display: "inline-block", 
                margin: "2px", 
                padding: "2px 6px", 
                backgroundColor: "#e0e0e0", 
                borderRadius: "4px" 
              }}>
                {method}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* NWC Wallet Testing Guide */}
      <div style={{ marginTop: 32, padding: "1rem", backgroundColor: "#e8f4fd", borderRadius: "8px" }}>
        <h3>Testing Different NWC Wallets for Keysend Support</h3>
        <p style={{ fontSize: "14px", marginBottom: "1rem" }}>
          Use this app to test different NWC wallets and see which ones support keysend payments, 
          which are essential for podcast value blocks with node pubkeys.
        </p>
        
        <h4>Wallets to Test:</h4>
        <ul style={{ fontSize: "14px", marginBottom: "1rem" }}>
          <li><strong>Alby</strong> - ✅ Keysend supported via payKeysend (tested)</li>
          <li><strong>Primal</strong> - ⚠️ Keysend method exists but not implemented</li>
          <li><strong>Phoenix</strong> - Should support keysend (test next)</li>
          <li><strong>Blixt</strong> - Lightning wallet with NWC support</li>
          <li><strong>Zeus</strong> - Advanced Lightning wallet</li>
          <li><strong>Coinos</strong> - ❌ Does NOT support keysend (confirmed)</li>
          <li><strong>YakiHonne</strong> - ❌ NWC support discontinued</li>
          <li><strong>Wallet of Satoshi</strong> - Check NWC support</li>
        </ul>
        
        <h4>Testing Steps:</h4>
        <ol style={{ fontSize: "14px", marginBottom: "1rem" }}>
          <li>Connect your wallet using NWC connection string</li>
          <li>Click "🚀 Run All Tests" for comprehensive automated testing</li>
          <li>Review test results showing keysend support and routing</li>
          <li>Check console logs for detailed debugging info</li>
        </ol>
        
        <h4>Expected Results:</h4>
        <ul style={{ fontSize: "14px", marginBottom: "1rem" }}>
          <li><strong>✅ Good Keysend Support:</strong> "SUPPORTS KEYSEND" with successful payments to multiple nodes</li>
          <li><strong>⚠️ Limited Keysend:</strong> Keysend works but "FAILURE_REASON_NO_ROUTE" for some nodes</li>
          <li><strong>❌ No Keysend:</strong> "NO KEYSEND SUPPORT" or "invalid vertex length" errors</li>
        </ul>
        
        <h4>Current Test Results:</h4>
        <ul style={{ fontSize: "14px" }}>
          <li><strong>Alby:</strong> ✅ Keysend works, successfully sent to minr node, some routing issues</li>
          <li><strong>Primal:</strong> ⚠️ Keysend method exists but returns "not implemented yet"</li>
          <li><strong>Coinos:</strong> ❌ No keysend method available</li>
          <li><strong>YakiHonne:</strong> ❌ NWC support discontinued</li>
                    <li><strong>Next to test:</strong> Phoenix, Blixt, Zeus</li>
        </ul>
      </div>
      
      {/* Help Text */}
      <div style={{ marginTop: 32, fontSize: 12, color: "#888" }}>
        <div>
          <b>Test Feeds:</b>
        </div>
        <div style={{ marginTop: 4 }}>
          • <code>http://localhost:3000/test-feed.xml</code> (Lightning addresses)
        </div>
        <div style={{ marginTop: 4 }}>
          • <code>http://localhost:3000/test-keysend-feed.xml</code> (Node pubkeys for keysend testing)
        </div>
        <div style={{ marginTop: 8 }}>
          <b>Supported Formats:</b>
        </div>
        <div style={{ marginTop: 4 }}>
          • <code>nostr+walletconnect://[pubkey]?relay=[relay]&secret=[secret]</code>
        </div>
        <div style={{ marginTop: 4 }}>
          • <code>nwc://[pubkey]?relay=[relay]&secret=[secret]</code>
        </div>
      </div>

      <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Test Lightning Address Payment</h3>
          <p className="text-sm text-gray-600 mb-2">Test with a known working Lightning address (minimum 10 sats):</p>
          <button 
            onClick={async () => {
              if (!wallet) {
                setStatus("Please connect wallet first");
                return;
              }
              setStatus("Testing Lightning address payment...");
              try {
                // Test with a known working Lightning address
                const testAddress = "chadf@getalby.com";
                const amount = 10; // 10 sats (1 sat was too low)
                
                console.log("Testing Lightning address payment to:", testAddress);
                
                // Try to create an invoice using LNURL
                let lnurlResponse = await fetch(`https://api.getalby.com/.well-known/lnurlp/chadf`);
                
                // If HTTPS fails with 426 UPGRADE REQUIRED, try HTTP for local testing
                if (lnurlResponse.status === 426) {
                  console.log("HTTPS failed with 426 UPGRADE REQUIRED, trying HTTP for local testing...");
                  lnurlResponse = await fetch(`http://api.getalby.com/.well-known/lnurlp/chadf`);
                }
                
                if (!lnurlResponse.ok) {
                  throw new Error(`LNURL request failed: ${lnurlResponse.status} ${lnurlResponse.statusText}`);
                }
                
                const lnurlData = await lnurlResponse.json();
                console.log("LNURL data:", lnurlData);
                
                if (lnurlData.callback) {
                  // Create invoice using LNURL
                  const invoiceResponse = await fetch(`${lnurlData.callback}?amount=${amount * 1000}&description=Test payment`);
                  
                  if (!invoiceResponse.ok) {
                    throw new Error(`Invoice request failed: ${invoiceResponse.status} ${invoiceResponse.statusText}`);
                  }
                  
                  const invoiceData = await invoiceResponse.json();
                  console.log("Invoice data:", invoiceData);
                  
                  if (invoiceData.pr) {
                    // Pay the invoice
                    const paymentResult = await wallet.payInvoice({ invoice: invoiceData.pr });
                    console.log("Payment result:", paymentResult);
                    setStatus(`Test payment sent! ${amount} sats to ${testAddress}`);
                  } else {
                    throw new Error("Failed to create invoice - no payment request");
                  }
                } else {
                  throw new Error("LNURL not supported - no callback");
                }
              } catch (e) {
                console.error("Test payment error:", e);
                setStatus("Test payment failed: " + e.message);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Test 10 Sats Payment
          </button>
        </div>
    </div>
  );
}