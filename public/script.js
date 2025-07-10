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
    const proxyUrl = `/proxy?url=${encodeURIComponent(feedUrl)}`;
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
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0) {
            let title = 'Value Block';
            const parentItem = valueBlock.closest('item');
            if (parentItem) title = parentItem.querySelector('title')?.textContent || title;
            valueBlocks.push({ title, lightningAddresses, nodePubkeys, index: index + 1 });
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
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'card value-blocks-results';
    resultsContainer.innerHTML = `
        <div class="card-header">
            <div class="card-icon">📊</div>
            <h2 class="card-title">Value Blocks Found (${valueBlocks.length})</h2>
        </div>
    `;
    valueBlocks.forEach((block, index) => {
        resultsContainer.appendChild(renderValueBlock(block, index));
    });
    // Insert after RSS feed card
    const rssCard = document.querySelector('.card');
    rssCard.parentNode.insertBefore(resultsContainer, rssCard.nextSibling);
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

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
        <div id=\"${detailsId}\" style=\"display:none; margin-top:1rem;\">
    `;
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
                            <div>${pubkey.address}</div>
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
    rssInput.value = 'https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/refs/heads/main/public/lnurl-test-feed.xml';
    rssInput.style.borderColor = 'var(--accent-success)';
    setTimeout(() => { rssInput.style.borderColor = 'var(--border-color)'; }, 2000);
    setButtonFeedback(event.target, '✅ Loaded', 1500, event.target.innerHTML);
}

function connectWallet() {
    setButtonFeedback(event.target, '🔄 Connecting...', 2000, event.target.innerHTML, false);
    setTimeout(() => {
        setButtonFeedback(event.target, '✅ Connected', 2000, event.target.innerHTML);
    }, 2000);
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
