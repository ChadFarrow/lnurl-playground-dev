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
        
        // Fetch the RSS feed
        const response = await fetch(feedUrl);
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
    
    // Look for value blocks in different possible formats
    const items = xmlDoc.querySelectorAll('item');
    
    items.forEach((item, index) => {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const content = item.querySelector('content\\:encoded')?.textContent || '';
        
        // Look for Lightning addresses and node pubkeys
        const lightningAddresses = extractLightningAddresses(title + ' ' + description + ' ' + content);
        const nodePubkeys = extractNodePubkeys(title + ' ' + description + ' ' + content);
        
        if (lightningAddresses.length > 0 || nodePubkeys.length > 0) {
            valueBlocks.push({
                title: title,
                description: description,
                lightningAddresses: lightningAddresses,
                nodePubkeys: nodePubkeys,
                index: index + 1
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
                            <span style="
                                background: var(--accent-primary);
                                color: white;
                                padding: 0.25rem 0.5rem;
                                border-radius: 6px;
                                font-family: 'JetBrains Mono', monospace;
                                font-size: 0.9rem;
                            ">${addr}</span>
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
                            <span style="
                                background: var(--accent-secondary);
                                color: white;
                                padding: 0.25rem 0.5rem;
                                border-radius: 6px;
                                font-family: 'JetBrains Mono', monospace;
                                font-size: 0.9rem;
                                word-break: break-all;
                            ">${pubkey}</span>
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
    rssInput.value = 'https://raw.githubusercontent.com/ChadFarrow/lnurl-test-feed/refs/heads/main/public/lnurl_test_feed.xml';
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
