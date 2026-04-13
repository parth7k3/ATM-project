
const DB_KEY = 'GlobalCommerceBank_DB';
const defaultDatabase = {
    user: { id: "U-88291", name: "ALEX JOHNSON", pinHash: "1234", isAuthenticated: false },
    accounts: {
        checking: { id: "CHK-1234", balance: 1245.89, status: "ACTIVE" },
        savings: { id: "SAV-5678", balance: 7890.12, status: "ACTIVE" },
        loan: { id: "MTG-999", principal: 250000.00, monthlyDue: 1500.00 }
    },
    portfolio: { bitcoin: 0, ethereum: 0, solana: 0 },
    transactions: [] 
};

let db = JSON.parse(localStorage.getItem(DB_KEY)) || defaultDatabase;

function saveState() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    updateUI();
}


function generateTxId() {
    return 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Date.now().toString().slice(-4);
}

function logTransaction(type, amount, account, status, details = "") {
    const logEntry = {
        txId: generateTxId(), timestamp: new Date().toISOString(),
        type: type, amount: amount, accountTarget: account,
        status: status, metadata: details
    };
    db.transactions.push(logEntry);
    console.log(`[SERVER LOG] ${status}: ${type} of $${amount} on ${account}. TXID: ${logEntry.txId}`);
    saveState();
}


const CyberSec = {
    failedAttempts: 0, maxAttempts: 3, lockoutTime: 10000, 
    isLocked: false, txTimestamps: [],

    checkIntrusion(actionType, amount = 0) {
        if (this.isLocked) {
            alert("🚨 SECURITY ALERT: Terminal is currently locked.");
            return false;
        }
        // Velocity Checking (Spam/DDoS protection)
        const now = Date.now();
        this.txTimestamps = this.txTimestamps.filter(t => now - t < 5000);
        this.txTimestamps.push(now);
        
        if (this.txTimestamps.length > 4) { 
            this.triggerLockdown("Rapid automated requests detected (Velocity Threshold Exceeded).");
            return false;
        }
        // Anomaly Detection
        if (actionType === 'WITHDRAWAL' && amount >= 1000) {
            logTransaction('IDS_FLAG', amount, 'SYSTEM', 'WARNING', 'High-value anomaly monitored');
        }
        return true; 
    },

    registerFailedLogin() {
        this.failedAttempts++;
        if (this.failedAttempts >= this.maxAttempts) {
            this.triggerLockdown("Brute force PIN attack detected.");
        }
    },

    triggerLockdown(reason) {
        this.isLocked = true;
        logTransaction('SECURITY_LOCKDOWN', 0, 'SYSTEM', 'CRITICAL', reason);
        alert(`🚨 SYSTEM LOCKDOWN INITIATED 🚨\nReason: ${reason}\nTerminal frozen for 10 seconds.`);
        
        const grid = document.querySelector('.services-grid');
        if(grid) {
            grid.style.pointerEvents = 'none';
            grid.style.filter = 'grayscale(100%) blur(2px)';
        }
        
        setTimeout(() => {
            this.isLocked = false; this.failedAttempts = 0; this.txTimestamps = [];
            if(grid) {
                grid.style.pointerEvents = 'auto'; grid.style.filter = 'none';
            }
            alert("Lockdown lifted. Normal operations resumed.");
        }, this.lockoutTime);
    }
};



function simulateNetworkRequest(processingTime = 800) {
    return new Promise((resolve) => setTimeout(resolve, processingTime));
}

const BankAPI = {
    async verifyPin(enteredPin) {
        await simulateNetworkRequest(500); 
        if (enteredPin === db.user.pinHash) {
            db.user.isAuthenticated = true; CyberSec.failedAttempts = 0; return true;
        } else {
            CyberSec.registerFailedLogin(); return false;
        }
    },
    async processWithdrawal(accountId, amount) {
        if (!CyberSec.checkIntrusion('WITHDRAWAL', amount)) return { success: false, message: "Blocked by IDS." };
        await simulateNetworkRequest(1200); 
        
        const account = db.accounts[accountId];
        if (account.balance < amount) {
            logTransaction('WITHDRAWAL', amount, accountId, 'FAILED', 'Insufficient funds');
            return { success: false, message: "Insufficient network funds." };
        }
        account.balance -= amount;
        logTransaction('WITHDRAWAL', amount, accountId, 'SUCCESS', 'Dispensed cash');
        saveState();
        return { success: true, newBalance: account.balance };
    },
    async payLoan(amount) {
        if (!CyberSec.checkIntrusion('LOAN_PAYMENT', amount)) return { success: false, message: "Blocked by IDS." };
        await simulateNetworkRequest(1000);
        if (db.accounts.checking.balance < amount) {
            logTransaction('LOAN_PAYMENT', amount, 'MTG-999', 'FAILED', 'NSF in Checking');
            return { success: false, message: "Insufficient funds for loan payment." };
        }
        db.accounts.checking.balance -= amount;
        db.accounts.loan.principal -= amount;
        logTransaction('LOAN_PAYMENT', amount, 'MTG-999', 'SUCCESS', 'Applied to Principal');
        saveState();
        return { success: true, remainingPrincipal: db.accounts.loan.principal };
    }
};


async function quickCash() {
    alert("Connecting to bank servers...");
    try {
        const response = await BankAPI.processWithdrawal('checking', 40);
        if (response.success) alert("Transaction Approved.\nDispensing $40.00\nPlease take your cash.");
        else alert("Transaction Declined: " + response.message);
    } catch (error) { alert("System Error: " + error.message); }
}

async function handleLoanPayment() {
    const confirmPay = confirm(`Your mortgage payment is $${db.accounts.loan.monthlyDue}. Pay now from Checking?`);
    if (confirmPay) {
        alert("Processing payment securely...");
        const res = await BankAPI.payLoan(db.accounts.loan.monthlyDue);
        if (res.success) alert(`Payment successful! Remaining mortgage principal: $${res.remainingPrincipal.toFixed(2)}`);
        else alert("Payment failed: " + res.message);
    }
}

function viewMiniStatement() {
    if (db.transactions.length === 0) { alert("No recent transactions found on the server."); return; }
    let statement = "--- RECENT AUDIT LOG ---\n\n";
    const recentTx = db.transactions.slice(-5).reverse();
    recentTx.forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleTimeString();
        statement += `[${date}] ${tx.type} | $${tx.amount} | ${tx.status}\nRef: ${tx.txId}\n\n`;
    });
    alert(statement);
}

function viewSecurityPin() {
    const pin = prompt("Enter Master Admin Password to view encrypted PIN (Hint: 0000):");
    if (pin === "0000") alert("Decrypted Customer PIN: 1234");
    else {
        alert("Security Violation. Access Denied.");
        logTransaction('SECURITY_BREACH', 0, 'SYSTEM', 'FAILED', 'Invalid Admin Access Attempt');
    }
}


let livePrices = {};

async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
        livePrices = await response.json();
        renderMarket();
    } catch (error) {
        document.getElementById('market-list').innerHTML = "<p style='color:red;'>Secure Connection to Exchange Lost.</p>";
    }
}

function renderMarket() {
    const marketList = document.getElementById('market-list');
    if (!marketList) return; 
    marketList.innerHTML = '';
    let totalPortfolioValue = 0;

    for (const [coin, data] of Object.entries(livePrices)) {
        const price = data.usd;
        const owned = db.portfolio[coin];
        const value = owned * price;
        totalPortfolioValue += value;

        marketList.innerHTML += `
            <div class="asset-card">
                <div class="asset-info">
                    <strong>${coin}</strong><br>
                    <small>Live Market Price: $${price.toLocaleString()}</small><br>
                    <small>Holding: ${owned} Unit(s) = $${value.toFixed(2)}</small>
                </div>
                <div class="trade-controls">
                    <button class="btn-buy" onclick="executeTrade('BUY', '${coin}', ${price})">BUY 1</button>
                    <button class="btn-sell" onclick="executeTrade('SELL', '${coin}', ${price})">SELL 1</button>
                </div>
            </div>
        `;
    }
    document.getElementById('invest-cash').innerText = `$${db.accounts.checking.balance.toFixed(2)}`;
    document.getElementById('portfolio-value').innerText = `$${totalPortfolioValue.toFixed(2)}`;
}

async function executeTrade(action, coin, price) {
    if (!CyberSec.checkIntrusion('ASSET_TRADE', price)) return;
    
    if (action === 'BUY') {
        if (db.accounts.checking.balance >= price) {
            db.accounts.checking.balance -= price;
            db.portfolio[coin] += 1;
            logTransaction('ASSET_PURCHASE', price, 'checking', 'SUCCESS', `Bought 1 ${coin}`);
        } else {
            alert(`Trade Rejected: Insufficient funds for ${coin}.`);
            logTransaction('ASSET_PURCHASE', price, 'checking', 'FAILED', `NSF`);
            return;
        }
    } else if (action === 'SELL') {
        if (db.portfolio[coin] >= 1) {
            db.portfolio[coin] -= 1;
            db.accounts.checking.balance += price;
            logTransaction('ASSET_SALE', price, 'checking', 'SUCCESS', `Sold 1 ${coin}`);
        } else {
            alert(`Trade Rejected: You do not hold any ${coin}.`);
            return;
        }
    }
    saveState(); renderMarket(); 
}

function openInvestments() {
    document.getElementById('investment-modal').classList.remove('hidden');
    document.getElementById('invest-cash').innerText = `$${db.accounts.checking.balance.toFixed(2)}`;
    fetchMarketData();
}

function closeInvestments() { document.getElementById('investment-modal').classList.add('hidden'); }


function updateUI() {
    document.getElementById('checking-bal').innerText = `$${db.accounts.checking.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('savings-bal').innerText = `$${db.accounts.savings.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function endTransaction() {
    alert("Session Terminated. Erasing local memory for next user...");
    localStorage.removeItem(DB_KEY); // Wipe database for next demo
    window.location.reload();
}

setInterval(() => {
    const clock = document.getElementById('clock');
    if(clock) clock.innerText = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' });
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    document.getElementById('btn-quick-cash').onclick = quickCash;
    document.getElementById('btn-mini-statement').onclick = viewMiniStatement;
    document.getElementById('btn-loan-payment').onclick = handleLoanPayment;
    document.getElementById('btn-view-pin').onclick = viewSecurityPin;
});
