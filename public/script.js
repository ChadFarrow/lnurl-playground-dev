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

function parseValueBlock() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⚡ Parsing...';
    btn.disabled = true;
    // Simulate parsing process
    setTimeout(() => {
        btn.innerHTML = '✅ Parsed Successfully';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }, 1500);
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
