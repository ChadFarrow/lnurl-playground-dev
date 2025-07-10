// Add integration with your backend
async function generateCustomFeed(config) {
    const response = await fetch('/api/customize-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    return response.json();
}

function toggleTheme() {
    const toggle = document.querySelector('.theme-toggle');
    const currentIcon = toggle.textContent;
    toggle.textContent = currentIcon === '☀️' ? '🌙' : '☀️';
    // Add rotation animation
    toggle.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        toggle.style.transform = 'rotate(0deg)';
    }, 300);
}

async function parseValueBlock() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⚡ Parsing...';
    btn.disabled = true;
    
    try {
        // Get the RSS feed URL
        const rssInput = document.querySelector('input[type="url"]');
        const feedUrl = rssInput.value;
        
        if (!feedUrl) {
            throw new Error('Please enter a RSS feed URL');
        }
        
        // Fetch the RSS feed with CORS proxy if needed
        let response;
        try {
            response = await fetch(feedUrl);
        } catch (error) {
            // If direct fetch fails, try with CORS proxy
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            response = await fetch(corsProxy + encodeURIComponent(feedUrl));
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch RSS feed: ${response.status}`);
        }
        
        const xmlText = await response.text();
        
        // Parse the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid XML format in RSS feed');
        }
        
        // Extract value blocks from the feed
        const valueBlocks = extractValueBlocks(xmlDoc);
        
        if (valueBlocks.length === 0) {
            btn.innerHTML = '⚠️ No value blocks found';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);
            return;
        }
        
        // Display the results
        displayValueBlocks(valueBlocks);
        
        btn.innerHTML = '✅ Parsed Successfully';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error parsing value block:', error);
        btn.innerHTML = '❌ Error: ' + error.message;
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

function extractValueBlocks(xmlDoc) {
    const valueBlocks = [];
    
    // Look for podcast:value blocks (podcast namespace)
    const valueBlocksElements = xmlDoc.querySelectorAll('podcast\\:value');
    
    valueBlocksElements.forEach((valueBlock, index) => {
        const recipients = valueBlock.querySelectorAll('podcast\\:valueRecipient');
        const lightningAddresses = [];
        const nodePubkeys = [];
        
        recipients.forEach(recipient => {
            const type = recipient.getAttribute('type');
            const address = recipient.getAttribute('address');
            const name = recipient.getAttribute('name');
            const split = recipient.getAttribute('split');
            
            if (type === 'lnaddress' && address) {
                lightningAddresses.push({
                    address: address,
                    name: name,
                    split: split
                });
            } else if (type === 'node' && address) {
                nodePubkeys.push({
                    address: address,
                    name: name,
                    split: split
                });
            }
        });
        
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0) {
            // Get the parent item or channel info
            let title = 'Value Block';
            let description = 'Lightning payment recipients';
            
            const parentItem = valueBlock.closest('item');
            if (parentItem) {
                title = parentItem.querySelector('title')?.textContent || title;
                description = parentItem.querySelector('description')?.textContent || description;
            }
            
            valueBlocks.push({
                title: title,
                description: description,
                lightningAddresses: lightningAddresses,
                nodePubkeys: nodePubkeys,
                index: index + 1
            });
        }
    });
    
    // Also check for Lightning addresses in episode descriptions (fallback)
    const items = xmlDoc.querySelectorAll('item');
    items.forEach((item, index) => {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const content = item.querySelector('content\\:encoded')?.textContent || '';
        
        // Look for Lightning addresses and node pubkeys in text
        const textLightningAddresses = extractLightningAddresses(title + ' ' + description + ' ' + content);
        const textNodePubkeys = extractNodePubkeys(title + ' ' + description + ' ' + content);
        
        if (textLightningAddresses.length > 0 || textNodePubkeys.length > 0) {
            valueBlocks.push({
                title: title,
                description: description,
                lightningAddresses: textLightningAddresses.map(addr => ({ address: addr, name: '', split: '' })),
                nodePubkeys: textNodePubkeys.map(pubkey => ({ address: pubkey, name: '', split: '' })),
                index: valueBlocks.length + index + 1
            });
        }
    });
    
    return valueBlocks;
}

function extractLightningAddresses(text) {
    const lightningRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const addresses = text.match(lightningRegex) || [];
    return [...new Set(addresses)]; // Remove duplicates
}

function extractNodePubkeys(text) {
    const pubkeyRegex = /([0-9a-fA-F]{66})/g;
    const pubkeys = text.match(pubkeyRegex) || [];
    return [...new Set(pubkeys)]; // Remove duplicates
}

function displayValueBlocks(valueBlocks) {
    // Remove any existing results
    const existingResults = document.querySelector('.value-blocks-results');
    if (existingResults) {
        existingResults.remove();
    }
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'card value-blocks-results';
    resultsContainer.innerHTML = `
        <div class="card-header">
            <div class="card-icon">📊</div>
            <h2 class="card-title">Value Blocks Found (${valueBlocks.length})</h2>
        </div>
    `;
    
    // Add each value block
    valueBlocks.forEach((block, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = 'value-block';
        blockElement.style.cssText = `
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border: 1px solid var(--border-color);
        `;
        
        let content = `
            <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">${block.title}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${block.description}</p>
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
                                ${addr.split ? `<div style="font-size: 0.8rem; opacity: 0.8;">Split: ${addr.split}%</div>` : ''}
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
                                ${pubkey.split ? `<div style="font-size: 0.8rem; opacity: 0.8;">Split: ${pubkey.split}%</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        blockElement.innerHTML = content;
        resultsContainer.appendChild(blockElement);
    });
    
    // Insert the results after the RSS feed card
    const rssCard = document.querySelector('.card');
    rssCard.parentNode.insertBefore(resultsContainer, rssCard.nextSibling);
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function clearSettings() {
    if (confirm('Are you sure you want to clear all settings?')) {
        document.querySelectorAll('.form-input').forEach(input => {
            input.value = '';
        });
        // Show success feedback
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Cleared';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 1500);
    }
}

function loadTestFeed() {
    const rssInput = document.querySelector('input[type="url"]');
    rssInput.value = 'https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/refs/heads/main/public/lnurl-test-feed.xml';
    // Add visual feedback
    rssInput.style.borderColor = 'var(--accent-success)';
    setTimeout(() => {
        rssInput.style.borderColor = 'var(--border-color)';
    }, 2000);
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Loaded';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 1500);
}

function connectWallet() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔄 Connecting...';
    btn.disabled = true;
    // Simulate connection process
    setTimeout(() => {
        btn.innerHTML = '✅ Connected';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }, 2000);
}

// Add some interactive effects
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'Enter':
                    e.preventDefault();
                    parseValueBlock();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    clearSettings();
                    break;
            }
        }
    });
});
