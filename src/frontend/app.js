// Modal templates
const modalTemplates = {
    ingest: `
        <h3>Ingest Telemetry Data</h3>
        <label>Device ID</label>
        <input type="text" id="deviceId" placeholder="well-001" value="well-001">
        <label>Temperature (°F)</label>
        <input type="number" id="temperature" placeholder="75.5" value="75.5">
        <label>Pressure (PSI)</label>
        <input type="number" id="pressure" placeholder="200.0" value="200.0">
        <label>Status</label>
        <select id="status">
            <option value="OK">OK</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
        </select>
        <button onclick="sendTelemetry()">Send Data</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    list: `
        <h3>Query Telemetry Data</h3>
        <label>Device ID (optional)</label>
        <input type="text" id="queryDevice" placeholder="well-001">
        <label>Limit</label>
        <input type="number" id="queryLimit" value="10">
        <button onclick="queryTelemetry()">Query Data</button>
        <div id="queryResults" style="margin-top: 20px; max-height: 300px; overflow-y: auto;"></div>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    stats: `
        <h3>Telemetry Statistics</h3>
        <label>Device ID (optional)</label>
        <input type="text" id="statsDevice" placeholder="well-001">
        <button onclick="getStats()">Get Statistics</button>
        <div id="statsResults" style="margin-top: 20px;"></div>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    export: `
        <h3>Export Telemetry to CSV</h3>
        <label>Device ID (optional)</label>
        <input type="text" id="exportDevice" placeholder="well-001">
        <label>Limit</label>
        <input type="number" id="exportLimit" value="100">
        <button onclick="exportCSV()">Download CSV</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    createPlan: `
        <h3>Create Subscription Plan</h3>
        <label>Plan ID</label>
        <input type="number" id="planId" placeholder="1" value="1">
        <label>Duration (seconds)</label>
        <input type="number" id="duration" placeholder="2592000" value="2592000">
        <p style="color: #6c757d; font-size: 0.9em;">2592000 = 30 days</p>
        <label>Price (octas)</label>
        <input type="number" id="price" placeholder="100000000" value="100000000">
        <p style="color: #6c757d; font-size: 0.9em;">100000000 octas = 1 APT</p>
        <button onclick="alert('Blockchain integration required. Use Aptos CLI to create plans.')">Create Plan</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    createCode: `
        <h3>Create Discount Code</h3>
        <label>Discount Code</label>
        <input type="text" id="codeText" placeholder="PROMO2024" value="PROMO2024">
        <label>Discount Percentage</label>
        <input type="number" id="codePercent" placeholder="50" value="50" min="1" max="100">
        <p style="color: #6c757d; font-size: 0.9em;">Percentage off the plan price</p>
        <label>Expiry Timestamp (Unix seconds)</label>
        <input type="number" id="codeExpiry" value="${Math.floor(Date.now() / 1000) + 2592000}">
        <p style="color: #6c757d; font-size: 0.9em;">Current time + 30 days</p>
        <label>Max Uses (0 = unlimited)</label>
        <input type="number" id="codeMaxUses" placeholder="0" value="0">
        <button onclick="alert('Blockchain integration required. Use Aptos CLI:\\n\\naptos move run --function-id [addr]::subscription::create_discount_code --args string:[code] u64:[percent] u64:[expiry] u64:[max_uses]')">Create Code</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    subscribe: `
        <h3>Subscribe to Plan</h3>
        <p style="color: #28a745; margin-bottom: 15px;">✅ Current Month: ${getCurrentMonth()}</p>
        <p style="color: #f5576c; margin-bottom: 15px;">${isDiscountMonth() ? '🎉 30% Discount Active!' : '❌ No discount this month'}</p>
        <label>Plan Admin Address</label>
        <input type="text" id="adminAddr" placeholder="0xA11CE5">
        <label>Plan ID</label>
        <input type="number" id="subPlanId" placeholder="1" value="1">
        <button onclick="alert('Blockchain integration required. Use Aptos CLI:\\n\\naptos move run --function-id [addr]::subscription::subscribe --args address:[admin] u64:[plan_id]')">Subscribe Now</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    subscribeWithCode: `
        <h3>Subscribe with Promo Code</h3>
        <p style="color: #28a745; margin-bottom: 15px;">✅ Current Month: ${getCurrentMonth()}</p>
        <p style="color: #f5576c; margin-bottom: 15px;">${isDiscountMonth() ? '🎉 30% Seasonal Discount Active!' : 'Use promo code for discount'}</p>
        <label>Plan Admin Address</label>
        <input type="text" id="adminAddrCode" placeholder="0xA11CE5">
        <label>Plan ID</label>
        <input type="number" id="subPlanIdCode" placeholder="1" value="1">
        <label>Discount Code</label>
        <input type="text" id="discountCode" placeholder="PROMO2024">
        <p style="color: #6c757d; font-size: 0.9em;">Higher of seasonal or promo discount will apply</p>
        <button onclick="alert('Blockchain integration required. Use Aptos CLI:\\n\\naptos move run --function-id [addr]::subscription::subscribe_with_code --args address:[admin] u64:[plan_id] string:[code]')">Subscribe with Code</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    renew: `
        <h3>Renew Subscription</h3>
        <p style="color: #6c757d; margin-bottom: 15px;">Extends your subscription by the plan duration</p>
        <label>Current Timestamp</label>
        <input type="number" id="renewTime" value="${Math.floor(Date.now() / 1000)}" readonly>
        <button onclick="alert('Blockchain integration required. Use Aptos CLI to renew.')">Renew Subscription</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    cancel: `
        <h3>Cancel Subscription</h3>
        <p style="color: #dc3545; margin-bottom: 15px;">⚠️ Warning: Canceling does not refund payments</p>
        <button onclick="alert('Blockchain integration required. Use Aptos CLI to cancel.')">Cancel Subscription</button>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `,
    blockchainInfo: `
        <h3>Blockchain Contract Features</h3>
        <h4 style="color: #1e3c72; margin-top: 20px;">Events</h4>
        <ul class="feature-list">
            <li>PlanCreated - New plan registered</li>
            <li>Subscribed - User subscribed/renewed</li>
            <li>PaymentReceived - Payment successful</li>
            <li>PaymentFailed - Payment validation failed</li>
            <li>DiscountApplied - Seasonal discount applied</li>
            <li>DiscountCodeUsed - Promo code redeemed</li>
            <li>Canceled - Subscription canceled</li>
        </ul>
        <h4 style="color: #1e3c72; margin-top: 20px;">Error Codes</h4>
        <ul class="feature-list">
            <li>E_INSUFFICIENT_BALANCE (9)</li>
            <li>E_COIN_NOT_REGISTERED (10)</li>
            <li>E_ALREADY_SUBSCRIBED (4)</li>
            <li>E_PLAN_NOT_FOUND (5)</li>
        </ul>
        <h4 style="color: #1e3c72; margin-top: 20px;">Discount Types</h4>
        <ul class="feature-list">
            <li>Seasonal: 30% off in March, August, October</li>
            <li>Promo Codes: Custom percentages with expiry</li>
            <li>Smart Stacking: Highest discount applied</li>
        </ul>
        <button class="close-btn" onclick="closeModal()">Close</button>
    `
};

function showModal(type) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = modalTemplates[type] || '<h3>Feature not available</h3><button class="close-btn" onclick="closeModal()">Close</button>';
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function getCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
}

function isDiscountMonth() {
    const month = new Date().getMonth() + 1; // 1-12
    return month === 3 || month === 8 || month === 10;
}

async function sendTelemetry() {
    const data = {
        device_id: document.getElementById('deviceId').value,
        ts: Math.floor(Date.now() / 1000),
        temperature: parseFloat(document.getElementById('temperature').value),
        pressure: parseFloat(document.getElementById('pressure').value),
        status: document.getElementById('status').value
    };

    try {
        const response = await fetch(API_CONFIG.getApiUrl('/api/telemetry'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Success! Created record ID: ${result.id}`);
    } catch (error) {
        alert(`Error: ${error.message}. Make sure the API is running.`);
    }
}

async function queryTelemetry() {
    const device = document.getElementById('queryDevice').value;
    const limit = document.getElementById('queryLimit').value;
    const url = API_CONFIG.getApiUrl(`/api/telemetry?${device ? 'device_id=' + device + '&' : ''}limit=${limit}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        document.getElementById('queryResults').innerHTML = `
            <h4>Results (${data.length} records)</h4>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
        `;
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function getStats() {
    const device = document.getElementById('statsDevice').value;
    const url = API_CONFIG.getApiUrl(`/api/telemetry/stats${device ? '?device_id=' + device : ''}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        document.getElementById('statsResults').innerHTML = `
            <h4>Statistics</h4>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${JSON.stringify(data, null, 2)}</pre>
        `;
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function exportCSV() {
    const device = document.getElementById('exportDevice').value;
    const limit = document.getElementById('exportLimit').value;
    const url = API_CONFIG.getApiUrl(`/api/telemetry/export?${device ? 'device_id=' + device + '&' : ''}limit=${limit}`);
    window.open(url, '_blank');
}

function startService(type) {
    if (type === 'ts') {
        alert('To start TypeScript backend, run:\\n\\ncd src/ts_backend\\nnpm install\\nnpm run dev\\n\\nOr use the VS Code task: "Run TS Backend"');
    }
}

// Close modal on outside click
document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});

// Subscription expiration reminder functionality
async function checkSubscriptionStatus() {
    // In production, this would query blockchain via API
    // For demo, we support both API and localStorage
    const userId = localStorage.getItem('userId') || 'demo_user';

    try {
        // Try to fetch from API first
        const response = await fetch(API_CONFIG.getApiUrl(`/api/subscription/${userId}`));
        if (response.ok) {
            const subscription = await response.json();
            if (subscription.error) {
                // No subscription found in API, check localStorage
                checkLocalSubscription();
                return;
            }
            displaySubscriptionReminder(subscription);
        } else {
            // API not available, fallback to localStorage
            checkLocalSubscription();
        }
    } catch (error) {
        // Network error, fallback to localStorage
        console.log('API unavailable, using local data:', error.message);
        checkLocalSubscription();
    }
}

function checkLocalSubscription() {
    // Check if subscription exists in localStorage (for demo purposes)
    const savedSubscription = localStorage.getItem('userSubscription');
    const subscription = savedSubscription ? JSON.parse(savedSubscription) : null;

    if (!subscription || !subscription.isActive) {
        return; // No active subscription
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = subscription.expiresAt;
    const daysRemaining = Math.floor((expiresAt - now) / (24 * 60 * 60));

    displaySubscriptionReminder({
        is_active: subscription.isActive,
        expires_at: expiresAt,
        days_remaining: daysRemaining,
        expired: expiresAt <= now
    });
}

function displaySubscriptionReminder(subscription) {
    if (!subscription.is_active && !subscription.expired) {
        return; // Inactive and not expired - don't show
    }

    const daysRemaining = subscription.days_remaining;
    const reminderBanner = document.getElementById('subscriptionReminder');
    const reminderMessage = document.getElementById('reminderMessage');

    if (subscription.expired || daysRemaining <= 0) {
        // Expired
        reminderBanner.className = 'subscription-reminder critical show';
        reminderMessage.innerHTML = `<strong>Your subscription has expired!</strong><br>Renew now to continue accessing premium features.`;
    } else if (daysRemaining <= 3) {
        // Critical - 3 days or less
        reminderBanner.className = 'subscription-reminder critical show';
        reminderMessage.innerHTML = `<strong>Urgent!</strong> Your subscription expires in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>!`;
    } else if (daysRemaining <= 7) {
        // Warning - 7 days or less
        reminderBanner.className = 'subscription-reminder warning show';
        reminderMessage.innerHTML = `Your subscription expires in ${daysRemaining} days. Renew soon to avoid service interruption.`;
    } else if (daysRemaining <= 14) {
        // Info - 14 days or less
        reminderBanner.className = 'subscription-reminder show';
        reminderMessage.innerHTML = `Your subscription expires in ${daysRemaining} days.`;
    }
}

// For demo: Set a mock subscription (remove this in production)
function setMockSubscription(daysUntilExpiry) {
    const subscription = {
        planId: 1,
        expiresAt: Math.floor(Date.now() / 1000) + (daysUntilExpiry * 24 * 60 * 60),
        isActive: true
    };
    localStorage.setItem('userSubscription', JSON.stringify(subscription));
    checkSubscriptionStatus();
    console.log(`Demo: Subscription set to expire in ${daysUntilExpiry} days`);
}

// Create subscription via API
async function createSubscription(userId, planId, durationDays) {
    try {
        const response = await fetch(API_CONFIG.getApiUrl('/api/subscription'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                plan_id: planId,
                duration_days: durationDays
            })
        });
        const result = await response.json();
        console.log('Subscription created:', result);
        checkSubscriptionStatus();
        return result;
    } catch (error) {
        console.error('Error creating subscription:', error);
        alert('Error creating subscription. Make sure the API is running.');
    }
}

// Clear subscription (for testing)
function clearSubscription() {
    localStorage.removeItem('userSubscription');
    document.getElementById('subscriptionReminder').classList.remove('show');
    console.log('Demo: Subscription cleared');
}

// Backend status checking
async function checkBackendStatus() {
    // Check Python API
    try {
        const response = await fetch(API_CONFIG.PYTHON_API + '/health');
        if (response.ok) {
            document.getElementById('pythonApiStatus').className = 'status online';
        } else {
            document.getElementById('pythonApiStatus').className = 'status offline';
        }
    } catch (error) {
        document.getElementById('pythonApiStatus').className = 'status offline';
    }

    // Check TypeScript Backend
    try {
        const response = await fetch(API_CONFIG.TS_GATEWAY + '/health');
        if (response.ok) {
            document.getElementById('tsBackendStatus').className = 'status online';
        } else {
            document.getElementById('tsBackendStatus').className = 'status offline';
        }
    } catch (error) {
        document.getElementById('tsBackendStatus').className = 'status offline';
    }
}

// Check subscription status on page load
window.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    checkSubscriptionStatus();
    // Recheck every 5 minutes
    setInterval(checkSubscriptionStatus, 5 * 60 * 1000);
    // Recheck backend status every 30 seconds
    setInterval(checkBackendStatus, 30 * 1000);
});

// Demo function - call this in console to test:
// setMockSubscription(5) - expires in 5 days
// setMockSubscription(2) - expires in 2 days (critical)
// createSubscription('demo_user', 1, 5) - create via API, expires in 5 days
// clearSubscription() - clear the subscription
console.log('🛢️ SMART Oil Field Dashboard Loaded');
console.log('API Configuration:', API_CONFIG.USE_GATEWAY ? 'Using TypeScript Gateway' : 'Direct Python API');
console.log('Python API:', API_CONFIG.PYTHON_API);
console.log('TypeScript Gateway:', API_CONFIG.TS_GATEWAY);
console.log('');
console.log('Test subscription reminders:');
console.log('  createSubscription("demo_user", 1, 5) - expires in 5 days');
console.log('  setMockSubscription(2) - expires in 2 days (critical)');
console.log('  clearSubscription() - remove subscription');
