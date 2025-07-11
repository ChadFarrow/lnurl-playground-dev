// V4V Lightning Payment Tester - Main Script
// Refactored for clarity and maintainability

// --- Theme Toggle ---
function toggleTheme() {
    const toggle = document.querySelector('.theme-toggle');
    const currentIcon = toggle.textContent;
    toggle.textContent = currentIcon === '☀️' ? '🌙' : '☀️';
    toggle.style.transform = 'rotate(360deg)';
    setTimeout(() => { toggle.style.transform = 'rotate(0deg)'; }, 300);
}

// --- Button Feedback Helper ---
function setButtonFeedback(btn, text, duration = 2000, resetText = null, enable = true) {
    btn.innerHTML = text;
    btn.disabled = !enable;
    if (resetText) {
        setTimeout(() => {
            btn.innerHTML = resetText;
            btn.disabled = false;
        }, duration);
    }
}

// --- Fetch and Parse RSS Feed ---
async function fetchRssFeed(feedUrl) {
    // Use a CORS proxy for Vercel deployment
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    let response;
    try {
        response = await fetch(proxyUrl);
    } catch (error) {
        throw new Error('Failed to fetch RSS feed via proxy');
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }
    return response.text();
}

function parseXml(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML format in RSS feed');
    }
    return xmlDoc;
}

// --- Main Parse Button Handler ---
async function parseValueBlock() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    setButtonFeedback(btn, '⚡ Parsing...', null, null, false);
    try {
        const rssInput = document.querySelector('input[type="url"]');
        const feedUrl = rssInput.value;
        if (!feedUrl) throw new Error('Please enter a RSS feed URL');
        const xmlText = await fetchRssFeed(feedUrl);
        const xmlDoc = parseXml(xmlText);
        const valueBlocks = extractValueBlocks(xmlDoc);
        if (valueBlocks.length === 0) {
            setButtonFeedback(btn, '⚠️ No value blocks found', 2000, originalText);
            return;
        }
        displayValueBlocks(valueBlocks);
        setButtonFeedback(btn, '✅ Parsed Successfully', 2000, originalText);
    } catch (error) {
        console.error('Error parsing value block:', error);
        setButtonFeedback(btn, '❌ Error: ' + error.message, 3000, originalText);
    }
}

// --- Value Block Extraction ---
function extractValueBlocks(xmlDoc) {
    const valueBlocks = [];
    // Try all selectors for podcast:value
    let valueBlocksElements = xmlDoc.querySelectorAll('podcast\\:value');
    if (valueBlocksElements.length === 0) valueBlocksElements = xmlDoc.querySelectorAll('value');
    if (valueBlocksElements.length === 0) valueBlocksElements = xmlDoc.querySelectorAll('*[local-name()="value"]');
    valueBlocksElements.forEach((valueBlock, index) => {
        let recipients = valueBlock.querySelectorAll('podcast\\:valueRecipient');
        if (recipients.length === 0) recipients = valueBlock.querySelectorAll('valueRecipient');
        if (recipients.length === 0) recipients = valueBlock.querySelectorAll('*[local-name()="valueRecipient"]');
        const lightningAddresses = [], nodePubkeys = [];
        recipients.forEach(recipient => {
            const type = recipient.getAttribute('type');
            const address = recipient.getAttribute('address');
            const name = recipient.getAttribute('name');
            const split = recipient.getAttribute('split');
            if (type === 'lnaddress' && address) lightningAddresses.push({ address, name, split });
            else if (type === 'node' && address) nodePubkeys.push({ address, name, split });
        });
        // Detect <podcast:metaBoost> tag
        let metaBoost = '';
        // Try namespaced and non-namespaced
        let metaBoostEl = valueBlock.querySelector('podcast\\:metaBoost') ||
                          valueBlock.querySelector('metaBoost');
        if (!metaBoostEl) {
            // Fallback: check all children for localName === 'metaBoost'
            for (const child of valueBlock.children) {
                if (child.localName === 'metaBoost') {
                    metaBoostEl = child;
                    break;
                }
            }
        }
        if (metaBoostEl) {
            metaBoost = metaBoostEl.textContent;
        }
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0 || metaBoost) {
            let title = 'Value Block';
            const parentItem = valueBlock.closest('item');
            if (parentItem) title = parentItem.querySelector('title')?.textContent || title;
            valueBlocks.push({ title, lightningAddresses, nodePubkeys, metaBoost, index: index + 1 });
        }
    });
    // Fallback: scan episode text for addresses
    xmlDoc.querySelectorAll('item').forEach((item, index) => {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const content = item.querySelector('content\\:encoded')?.textContent || '';
        const textLightningAddresses = extractLightningAddresses(title + ' ' + description + ' ' + content);
        const textNodePubkeys = extractNodePubkeys(title + ' ' + description + ' ' + content);
        if (textLightningAddresses.length > 0 || textNodePubkeys.length > 0) {
            valueBlocks.push({
                title,
                lightningAddresses: textLightningAddresses.map(addr => ({ address: addr, name: '', split: '' })),
                nodePubkeys: textNodePubkeys.map(pubkey => ({ address: pubkey, name: '', split: '' })),
                metaBoost: '',
                index: valueBlocks.length + index + 1
            });
        }
    });
    // Fallback: scan entire XML text
    if (valueBlocks.length === 0) {
        const xmlText = xmlDoc.documentElement.outerHTML;
        const lightningAddresses = extractLightningAddresses(xmlText);
        const nodePubkeys = extractNodePubkeys(xmlText);
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0) {
            valueBlocks.push({
                title: 'Value Block (Found in XML)',
                lightningAddresses: lightningAddresses.map(addr => ({ address: addr, name: '', split: '' })),
                nodePubkeys: nodePubkeys.map(pubkey => ({ address: pubkey, name: '', split: '' })),
                metaBoost: '',
                index: 1
            });
        }
    }
    return valueBlocks;
}

function extractLightningAddresses(text) {
    const lightningRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    return [...new Set(text.match(lightningRegex) || [])];
}

function extractNodePubkeys(text) {
    const pubkeyRegex = /([0-9a-fA-F]{66})/g;
    return [...new Set(text.match(pubkeyRegex) || [])];
}

// --- Value Block Display ---
function displayValueBlocks(valueBlocks) {
    // Remove any existing results
    document.querySelector('.value-blocks-results')?.remove();
    // Sort so Show Value Block(s) come first
    valueBlocks.sort((a, b) => {
        const isShowA = a.title === 'Value Block' || a.title === 'Value Block (Found in XML)';
        const isShowB = b.title === 'Value Block' || b.title === 'Value Block (Found in XML)';
        if (isShowA && !isShowB) return -1;
        if (!isShowA && isShowB) return 1;
        return 0;
    });
    // Create results container for the header only
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'card value-blocks-results';
    resultsContainer.innerHTML = `
        <div class="card-header">
            <div class="card-icon">📊</div>
            <h2 class="card-title">Value Blocks Found (${valueBlocks.length})</h2>
        </div>
    `;
    // Insert after RSS feed card
    const rssCard = document.querySelector('.card');
    rssCard.parentNode.insertBefore(resultsContainer, rssCard.nextSibling);
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
    // Render each value block as its own card
    valueBlocks.forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'card value-block-card';
        card.appendChild(renderValueBlock(block, index));
        resultsContainer.parentNode.insertBefore(card, resultsContainer.nextSibling);
    });
}

// In renderValueBlock, display metaBoost endpoint if present
function renderValueBlock(block, index) {
    const blockElement = document.createElement('div');
    blockElement.className = 'value-block';
    blockElement.style.cssText = `
        background: var(--bg-secondary);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        border: 1px solid var(--border-color);
    `;
    // Label
    let label = '';
    if (block.title === 'Value Block' || block.title === 'Value Block (Found in XML)') {
        label = '<span style="display:inline-block;background:var(--accent-secondary);color:white;padding:0.2em 0.7em;border-radius:6px;font-size:0.9em;margin-bottom:0.5em;">Show Value Block</span>';
    } else if (block.title && block.title !== 'Value Block') {
        label = '<span style="display:inline-block;background:var(--accent-primary);color:white;padding:0.2em 0.7em;border-radius:6px;font-size:0.9em;margin-bottom:0.5em;">Episode Value Block</span>';
    } else {
        label = '<span style="display:inline-block;background:#888;color:white;padding:0.2em 0.7em;border-radius:6px;font-size:0.9em;margin-bottom:0.5em;">Other Value Block</span>';
    }
    // Collapsible content
    const detailsId = `value-block-details-${index}`;
    let content = `
        ${label}
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <h3 style=\"color: var(--text-primary); margin-bottom: 0.5rem; margin-right: 1rem;\">${block.title}</h3>
            <button class=\"btn btn-secondary\" style=\"font-size:1rem;padding:0.3em 1em;\" onclick=\"toggleValueBlock('${detailsId}')\">Expand</button>
        </div>
        <div id=\"${detailsId}\" style=\"display:none; margin-top:1rem;\">`;
    if (block.metaBoost) {
        content += `
            <div style="margin-bottom: 1rem;">
                <strong>metaBoost Endpoint:</strong>
                <a href="${block.metaBoost}" target="_blank" rel="noopener noreferrer">${block.metaBoost}</a>
            </div>
        `;
    }
    if (block.lightningAddresses.length > 0) {
        content += `
            <div style="margin-bottom: 1rem;">
                <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;">⚡ Lightning Addresses:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${block.lightningAddresses.map(addr => `
                        <div style="
                            background: var(--accent-primary);
                            color: white;
                            padding: 0.5rem;
                            border-radius: 8px;
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 0.9rem;
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                        ">
                            <div style="font-weight: bold;">${addr.name || 'Lightning Address'}</div>
                            <div>${addr.address}</div>
                            ${addr.split ? `<div style=\"font-size: 0.8rem; opacity: 0.8;\">Split: ${addr.split}%</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    if (block.nodePubkeys.length > 0) {
        content += `
            <div>
                <h4 style="color: var(--accent-secondary); margin-bottom: 0.5rem;">🔑 Node Pubkeys:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${block.nodePubkeys.map(pubkey => `
                        <div style="
                            background: var(--accent-secondary);
                            color: white;
                            padding: 0.5rem;
                            border-radius: 8px;
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 0.9rem;
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                            word-break: break-all;
                        ">
                            <div style="font-weight: bold;">${pubkey.name || 'Node Pubkey'}</div>
                            <a href=\"https://amboss.space/node/${pubkey.address}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: #fff; text-decoration: underline;\">${pubkey.address}</a>
                            ${pubkey.split ? `<div style=\"font-size: 0.8rem; opacity: 0.8;\">Split: ${pubkey.split}%</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    content += `</div>`;
    blockElement.innerHTML = content;
    return blockElement;
}

// --- UI Actions ---
window.toggleValueBlock = function(detailsId) {
    const details = document.getElementById(detailsId);
    if (!details) return;
    const btn = details.previousElementSibling.querySelector('button');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        if (btn) btn.textContent = 'Collapse';
    } else {
        details.style.display = 'none';
        if (btn) btn.textContent = 'Expand';
    }
};

function clearSettings() {
    if (confirm('Are you sure you want to clear all settings?')) {
        document.querySelectorAll('.form-input').forEach(input => { input.value = ''; });
        setButtonFeedback(event.target, '✅ Cleared', 1500, event.target.innerHTML);
    }
}

function loadTestFeed() {
    const rssInput = document.querySelector('input[type="url"]');
    rssInput.value = 'https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/main/public/lnurl-test-feed.xml';
    rssInput.style.borderColor = 'var(--accent-success)';
    setTimeout(() => { rssInput.style.borderColor = 'var(--border-color)'; }, 2000);
    setButtonFeedback(event.target, '✅ Loaded', 1500, event.target.innerHTML);
}

// --- NWC Wallet Connection ---
async function connectWallet() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    setButtonFeedback(btn, '🔄 Connecting...', null, null, false);
    
    try {
        const nwcInput = document.querySelector('input[placeholder*="nostr+walletconnect"]');
        const nwcString = nwcInput.value.trim();
        
        if (!nwcString) {
            throw new Error('Please enter a Nostr Wallet Connect string');
        }
        
        // Parse NWC connection string
        const nwcUrl = new URL(nwcString);
        if (!nwcUrl.protocol.startsWith('nostr+walletconnect')) {
            throw new Error('Invalid NWC connection string format');
        }
        
        // Extract connection details
        const relay = nwcUrl.searchParams.get('relay');
        const secret = nwcUrl.searchParams.get('secret');
        const pubkey = nwcUrl.hostname;
        
        if (!relay || !secret || !pubkey) {
            throw new Error('Missing required NWC parameters (relay, secret, pubkey)');
        }
        
        // Check wallet capabilities using NIP-47 get_info
        const walletInfo = await checkWalletCapabilities(relay, secret, pubkey);
        
        // Display capabilities
        displayWalletCapabilities(walletInfo);
        
        setButtonFeedback(btn, '✅ Connected', 2000, originalText);
        
    } catch (error) {
        console.error('NWC connection error:', error);
        setButtonFeedback(btn, '❌ ' + error.message, 3000, originalText);
    }
}

async function checkWalletCapabilities(relay, secret, pubkey) {
    // This is a mock implementation - in a real app you'd use a Nostr library
    // For now, we'll simulate the NIP-47 get_info response
    
    // Simulate checking if wallet supports pay_keysend
    const capabilities = {
        methods: ['get_info', 'pay_invoice', 'pay_keysend', 'get_balance'],
        pay_keysend: {
            max_amount: 1000000, // 1M sats
            min_amount: 1,
            fee_reserve: 1000
        },
        pay_invoice: {
            max_amount: 1000000,
            min_amount: 1
        }
    };
    
    return {
        pubkey,
        relay,
        capabilities,
        supports_keysend: capabilities.methods.includes('pay_keysend'),
        max_keysend_amount: capabilities.pay_keysend?.max_amount || 0
    };
}

function displayWalletCapabilities(walletInfo) {
    // Remove any existing wallet info
    document.querySelector('.wallet-capabilities')?.remove();
    
    // Create capabilities display
    const capabilitiesDiv = document.createElement('div');
    capabilitiesDiv.className = 'card wallet-capabilities';
    capabilitiesDiv.innerHTML = `
        <div class="card-header">
            <div class="card-icon">🔗</div>
            <h2 class="card-title">Wallet Connected</h2>
        </div>
        <div style="padding: 1rem;">
            <div style="margin-bottom: 1rem;">
                <strong>Pubkey:</strong> <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">${walletInfo.pubkey}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Relay:</strong> <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">${walletInfo.relay}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Supported Methods:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                    ${walletInfo.capabilities.methods.map(method => `
                        <span style="
                            background: var(--accent-primary);
                            color: white;
                            padding: 0.2rem 0.5rem;
                            border-radius: 4px;
                            font-size: 0.8rem;
                        ">${method}</span>
                    `).join('')}
                </div>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Keysend Support:</strong> 
                <span style="color: ${walletInfo.supports_keysend ? 'var(--accent-success)' : 'var(--accent-danger)'}; font-weight: bold;">
                    ${walletInfo.supports_keysend ? '✅ Supported' : '❌ Not Supported'}
                </span>
            </div>
            ${walletInfo.supports_keysend ? `
                <div>
                    <strong>Keysend Limits:</strong>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                        <div>Max Amount: ${walletInfo.max_keysend_amount.toLocaleString()} sats</div>
                        <div>Min Amount: ${walletInfo.capabilities.pay_keysend.min_amount} sats</div>
                        <div>Fee Reserve: ${walletInfo.capabilities.pay_keysend.fee_reserve} sats</div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Insert after wallet connection card
    const walletCard = document.querySelector('.card:nth-child(2)');
    walletCard.parentNode.insertBefore(capabilitiesDiv, walletCard.nextSibling);
    capabilitiesDiv.scrollIntoView({ behavior: 'smooth' });
}

// --- Card Hover and Keyboard Shortcuts ---
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; });
        card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
    });
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'Enter': e.preventDefault(); parseValueBlock(); break;
                case 'Backspace': e.preventDefault(); clearSettings(); break;
            }
        }
    });
});
