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
        
        // Fetch the RSS feed using backend proxy
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
        
        // Debug: Log what we found
        console.log('XML Document:', xmlDoc);
        console.log('Value blocks found:', valueBlocks);
        
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
    
    // Look for podcast:value blocks (podcast namespace) - try different selectors
    let valueBlocksElements = xmlDoc.querySelectorAll('podcast\\:value');
    if (valueBlocksElements.length === 0) {
        // Try without namespace prefix
        valueBlocksElements = xmlDoc.querySelectorAll('value');
    }
    if (valueBlocksElements.length === 0) {
        // Try with wildcard namespace
        valueBlocksElements = xmlDoc.querySelectorAll('*[local-name()="value"]');
    }
    
    valueBlocksElements.forEach((valueBlock, index) => {
        let recipients = valueBlock.querySelectorAll('podcast\\:valueRecipient');
        if (recipients.length === 0) {
            recipients = valueBlock.querySelectorAll('valueRecipient');
        }
        if (recipients.length === 0) {
            recipients = valueBlock.querySelectorAll('*[local-name()="valueRecipient"]');
        }
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
    
    // If no value blocks found with podcast namespace, try searching the entire XML text
    if (valueBlocks.length === 0) {
        const xmlText = xmlDoc.documentElement.outerHTML;
        const lightningAddresses = extractLightningAddresses(xmlText);
        const nodePubkeys = extractNodePubkeys(xmlText);
        
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0) {
            valueBlocks.push({
                title: 'Value Block (Found in XML)',
                description: 'Lightning addresses and node pubkeys found in the RSS feed',
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
        
        // Determine label
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
        resultsContainer.appendChild(blockElement);
    });
    
    // Insert the results after the RSS feed card
    const rssCard = document.querySelector('.card');
    rssCard.parentNode.insertBefore(resultsContainer, rssCard.nextSibling);
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Add this function to the global scope
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
