// ========================
// DATA & CONFIG
// ========================
const getXp = (lvl) => {
    let n = parseInt(lvl);
    if (isNaN(n) || n < 0) n = 0;
    // Minecraft 1.19.4 total XP to reach level n
    if (n <= 15) return (n * n) + (6 * n);
    if (n <= 30) return Math.round(2.5 * n * n - 40.5 * n + 360);
    return Math.round(4.5 * n * n - 162.5 * n + 2220);
};

const armorPrices = {
    "Cuir":    { "Casque": 150, "Plastron": 200, "Jambières": 190, "Bottes": 100 },
    "Fer":     { "Casque": 60,  "Plastron": 96,  "Jambières": 84,  "Bottes": 48 },
    "Or":      { "Casque": 45,  "Plastron": 72,  "Jambières": 63,  "Bottes": 36 },
    "Diamant": { "Casque": 350, "Plastron": 560, "Jambières": 490, "Bottes": 280 }
};

const toolPrices = {
    "Pierre":    { "Pioche": 6.5,  "Épée": 4.25,  "Houe": 4.5,   "Hache": 6.5,   "Pelle": 2.5  },
    "Fer":       { "Pioche": 40,   "Épée": 30,    "Houe": 30,    "Hache": 40,    "Pelle": 20   },
    "Or":        { "Pioche": 30,   "Épée": 25,    "Houe": 20,    "Hache": 30,    "Pelle": 20   },
    "Diamant":   { "Pioche": 230,  "Épée": 170,   "Houe": 150,   "Hache": 230,   "Pelle": 100  },
    "Netherite": { "Pioche": 345,  "Épée": 285,   "Houe": 265,   "Hache": 345,   "Pelle": 215  }
};

const DEFAULT_ENCHANTMENTS = [
    { name: "Affilage III", price: 1000 }, { name: "Agilité aquatique III", price: 1000 },
    { name: "Apnée III", price: 1000 }, { name: "Appât III", price: 1000 },
    { name: "Aura de feu II", price: 1000 }, { name: "Brise-lame III", price: 1000 },
    { name: "Butin III", price: 1000 }, { name: "Canalisation I", price: 1000 },
    { name: "Chance de la mer III", price: 1000 }, { name: "Charge rapide III", price: 1000 },
    { name: "Châtiment V", price: 1000 }, { name: "Chute amortie IV", price: 1000 },
    { name: "Délicatesse I", price: 1000 }, { name: "Efficacité IV", price: 1000 }, { name: "Efficacité V", price: 2000 },
    { name: "Empalement V", price: 1000 }, { name: "Épines III", price: 1000 },
    { name: "Flamme I", price: 1000 }, { name: "Fléau des arthropodes V", price: 1000 },
    { name: "Fortune III", price: 1000 }, { name: "Frappe II", price: 1000 },
    { name: "Infinité I", price: 1000 }, { name: "Loyauté III", price: 1000 },
    { name: "Multitir I", price: 1000 }, { name: "Perforation IV", price: 1000 },
    { name: "Pieds légers III", price: 1000 }, { name: "Protection IV", price: 1000 },
    { name: "Protection contre le feu IV", price: 1000 }, { name: "Protection contre les explosions IV", price: 1000 },
    { name: "Protection contre les projectiles IV", price: 1000 }, { name: "Puissance V", price: 1000 },
    { name: "Solidité IV", price: 1000 }, { name: "Recul II", price: 1000 },
    { name: "Semelles givrantes II", price: 1000 }, { name: "Solidité III", price: 1000 },
    { name: "Tranchant IV", price: 1000 }, { name: "Tranchant V", price: 2000 }, { name: "Vitesse des âmes III", price: 1000 }
];

const STACK = 64;
const STORAGE_KEYS = { theme: 'agoralis_theme' };

// ========================
// FIREBASE CONFIG & INIT
// ========================
const firebaseConfig = {
    apiKey: "AIzaSyDl9KOTesS_H3NnQ-SoyxxcJIpo3JRzbwk",
    authDomain: "forgerons-agoralis.firebaseapp.com",
    projectId: "forgerons-agoralis",
    storageBucket: "forgerons-agoralis.firebasestorage.app",
    messagingSenderId: "1019590433752",
    appId: "1:1019590433752:web:2414017ff0c47b1af7f0ad",
    measurementId: "G-CX4LG350CE"
};
// Initialisation conditionnelle (évite une erreur bloquante s'il n'y a pas de log)
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase Init Error", e);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ========================
// STATE & CACHE
// ========================
let currentNoteFilter = 'all';
let currentVenteFilter = 'all';
let editingNoteId = null;
let editingMaterialId = null;
let editingVenteId = null;
let selectedMaterialId = null;
let calcCartLines = [];
let xpCartLines = [];

let currentUser = null;
let currentRole = null;
let currentPseudo = null;

let appData = {
    notes: [],
    vente: [],
    enchant_mult: 1,
    smelt_prices: { Or: 2.12, Fer: 1.79, Cuivre: 1.30 },
    smelt_priority: null
};
let syncTimeout = null;
let impersonateUid = null; // UID de la personne qu'on regarde
let currentImpersonatedPseudo = null;

function loadData(key) { 
    return appData[key] || []; 
}

function saveData(key, data) { 
    appData[key] = data;
    triggerDbSync();
}

function triggerDbSync() {
    if (!currentUser || !db) return;
    const targetUid = impersonateUid || currentUser.uid;
    
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
        
        db.collection('users').doc(targetUid).collection('data').doc('store').set({
            notes: appData.notes || [],
            vente: appData.vente || [],
            enchant_mult: appData.enchant_mult || 1,
            smelt_prices: appData.smelt_prices || { Or: 2.12, Fer: 1.79, Cuivre: 1.30 }
        }, { merge: true })
        .catch(err => showToast("Erreur synchro cloud", "⚠️"))
        .finally(() => {
            if (overlay) overlay.classList.remove('active');
        });
    }, 1500);
}

// ========================
// NAVIGATION
// ========================
function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('section-' + tabId).classList.add('active');
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
    document.body.setAttribute('data-tab', tabId);
    
    // Auto-load admin data if needed
    if (tabId === 'admin') {
        loadAdminUsers();
        loadActivityLogs();
    }
}

// ========================
// THEME
// ========================
const AVAILABLE_THEMES = ['dark', 'light', 'nether', 'emerald', 'amethyst'];

function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved && AVAILABLE_THEMES.includes(saved)) {
        document.documentElement.setAttribute('data-theme', saved);
    }
    syncThemeUI();
}

function setTheme(themeName) {
    if (!AVAILABLE_THEMES.includes(themeName)) return;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(STORAGE_KEYS.theme, themeName);
    syncThemeUI();
    // Close panel after selection
    const panel = document.getElementById('theme-selector-panel');
    if (panel) panel.classList.remove('active');
    showToast(`Thème "${themeName}" appliqué !`, '🎨');
}

function toggleThemePanel() {
    const panel = document.getElementById('theme-selector-panel');
    if (panel) panel.classList.toggle('active');
}

function syncThemeUI() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.themeValue === current);
    });
}

// ========================
// TOAST
// ========================
function showToast(msg, icon = '✅') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

// ========================
// COPY
// ========================
function copyValue(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copié !', '📋'));
}

// ========================
// HELPERS
// ========================
function fmt(val) { 
    const fixed = (Math.max(0, val)).toFixed(2);
    return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed;
}
function stackStr(qty) {
    qty = Math.floor(qty);
    if (qty <= 0) return '0 items';
    const stacks = Math.floor(qty / STACK);
    const rest = qty % STACK;
    if (stacks === 0) return `${rest} items`;
    if (rest === 0) return `${stacks} stack${stacks > 1 ? 's' : ''}`;
    return `${stacks} stack${stacks > 1 ? 's' : ''} + ${rest} items`;
}

// ========================
// CALCULATOR MODULE (Achat Matériaux)
// ========================
let calcMode = 'total';
let qtyMode = 'items'; // 'items', 'stacks', 'blocs', or 'sblocs'
const BLOCK_SIZE = 9; // 1 block = 9 items

function onQtyUnitChange() {
    qtyMode = document.getElementById('calc-qty-unit').value;
    const label = document.getElementById('calc-qty-label');
    const input = document.getElementById('calc-qty');
    
    const labels = {
        items:  { label: 'Quantité (items)',           placeholder: "Nombre d'items",        step: '1' },
        stacks: { label: 'Quantité (stacks)',          placeholder: 'Nombre de stacks',      step: '0.1' },
        blocs:  { label: 'Quantité (blocs)',            placeholder: 'Nombre de blocs',       step: '1' },
        sblocs: { label: 'Quantité (stacks de blocs)',  placeholder: 'Stacks de blocs',       step: '0.1' }
    };
    const cfg = labels[qtyMode] || labels.items;
    label.textContent = cfg.label;
    input.placeholder = cfg.placeholder;
    input.step = cfg.step;
    runCalc();
}

function runCalc() {
    const unitPrice = parseFloat(document.getElementById('calc-unit').value) || 0;
    let rawQty = parseFloat(document.getElementById('calc-qty').value) || 0;
    const budget = parseFloat(document.getElementById('calc-budget').value) || 0;
    
    // Convert to items based on unit
    let qty = rawQty;
    if (qtyMode === 'stacks') qty = rawQty * STACK;
    else if (qtyMode === 'blocs') qty = rawQty * BLOCK_SIZE;
    else if (qtyMode === 'sblocs') qty = rawQty * STACK * BLOCK_SIZE;
    
    const resultNum = unitPrice * qty;
    const resultText = `${fmt(resultNum)}<span class="unit">€</span>`;
    const subText = `${stackStr(qty)} à ${fmt(unitPrice)}€/u`;
    
    document.getElementById('calc-result-value').innerHTML = resultText;
    document.getElementById('calc-result-sub').textContent = subText;
    document.getElementById('calc-copy-val').dataset.value = fmt(resultNum);
    
    // Profit calculation
    updateProfit(unitPrice, qty);
}

function updateProfit(unitPrice, qty) {
    const profitBox = document.getElementById('calc-profit-box');
    const allItems = loadData('vente');
    const mat = allItems.find(m => m.id === selectedMaterialId);
    if (!mat || !mat.sellPrice || mat.sellPrice <= 0) { profitBox.style.display = 'none'; return; }
    
    const profitPerUnit = mat.sellPrice - unitPrice;
    const totalProfit = profitPerUnit * qty;
    const profitColor = totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    const profitSign = totalProfit >= 0 ? '+' : '';
    
    profitBox.style.display = '';
    document.getElementById('calc-profit-value').innerHTML = `${profitSign}${fmt(totalProfit)}<span class="unit">€</span>`;
    document.getElementById('calc-profit-value').style.color = profitColor;
    document.getElementById('calc-profit-sub').textContent = `${profitSign}${fmt(profitPerUnit)}€/u | Revente: ${fmt(mat.sellPrice)}€/u | Coût: ${fmt(unitPrice)}€/u`;
    document.getElementById('calc-profit-copy').dataset.value = fmt(totalProfit);
}

function fillCalcFromMaterial() {
    const sel = document.getElementById('calc-mat-select');
    if (!sel || !sel.value) { selectedMaterialId = null; runCalc(); return; }
    
    const matId = Number(sel.value);
    selectedMaterialId = matId;
    const allItems = loadData('vente');
    const mat = allItems.find(m => m.id === matId);
    
    if (mat) {
        document.getElementById('calc-unit').value = mat.price !== undefined ? mat.price : 0;
        runCalc();
    }
}

// ========================
// CALCULATOR CART (Multi-items)
// ========================
function addCalcLine() {
    const resultVal = document.getElementById('calc-copy-val').dataset.value;
    const resultSub = document.getElementById('calc-result-sub').textContent;
    const numVal = parseFloat(resultVal) || 0;
    if (numVal <= 0) { showToast('Aucun résultat à ajouter', '⚠️'); return; }

    // Build description
    const mats = loadData('vente');
    const sel = document.getElementById('calc-mat-select');
    const matId = Number(sel.value);
    const mat = matId ? mats.find(m => m.id === matId) : null;
    let desc = '';
    const unitPrice = document.getElementById('calc-unit').value;
    const rawQty = document.getElementById('calc-qty').value;
    let qtyLabel = `${rawQty} items`;
    if (qtyMode === 'stacks') qtyLabel = `${rawQty} stacks`;
    else if (qtyMode === 'blocs') qtyLabel = `${rawQty} blocs`;
    else if (qtyMode === 'sblocs') qtyLabel = `${rawQty} stacks de blocs`;
    desc = mat ? `${mat.icon || '📦'} ${mat.name} × ${qtyLabel}` : `${qtyLabel} à ${unitPrice}€/u`;

    calcCartLines.push({
        id: Date.now(),
        desc,
        amount: numVal,
        sub: resultSub
    });

    renderCalcCart();
    showToast('Ajouté au panier !', '🛒');

    // Reset inputs for next item
    document.getElementById('calc-unit').value = '';
    document.getElementById('calc-qty').value = '';
    document.getElementById('calc-budget').value = '';
    document.getElementById('calc-mat-select').value = '';
    selectedMaterialId = null;
    runCalc();
}

function removeCalcLine(id) {
    calcCartLines = calcCartLines.filter(l => l.id !== id);
    renderCalcCart();
}

function clearCalcCart() {
    if (calcCartLines.length === 0) return;
    if (!confirm('Vider le panier ?')) return;
    calcCartLines = [];
    renderCalcCart();
    showToast('Panier vidé', '🗑️');
}

function renderCalcCart() {
    const container = document.getElementById('calc-cart');
    const linesEl = document.getElementById('calc-cart-lines');

    if (calcCartLines.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = '';
    linesEl.innerHTML = calcCartLines.map((line, i) => `
        <div class="cart-line">
            <div class="cart-line-num">${i + 1}</div>
            <div class="cart-line-body">
                <div class="cart-line-desc">${escHtml(line.desc)}</div>
                <div class="cart-line-sub">${escHtml(line.sub)}</div>
            </div>
            <div class="cart-line-amount">${fmt(line.amount)}€</div>
            <button class="btn btn-sm btn-danger" onclick="removeCalcLine(${line.id})">✖</button>
        </div>
    `).join('');

    // Calculate grand total (only sum €-based lines)
    const grandTotal = calcCartLines.reduce((sum, l) => sum + l.amount, 0);
    const totalCount = calcCartLines.length;

    document.getElementById('calc-cart-total').innerHTML = `${fmt(grandTotal)}<span class="unit">€</span>`;
    document.getElementById('calc-cart-count').textContent = `${totalCount} article${totalCount > 1 ? 's' : ''}`;
    document.getElementById('calc-cart-total-raw').value = fmt(grandTotal);
}

// ========================
// FORGE CART (Panier Réparation/Fusion)
// ========================
// xpCartLines already declared at top

function addXpLine() {
    const resultVal = document.getElementById('xp-copy-val').dataset.value;
    const resultSub = document.getElementById('res-xp-sub').textContent;
    const numVal = parseFloat(resultVal) || 0;
    if (numVal <= 0) { showToast('Aucun résultat à ajouter', '⚠️'); return; }

    const inputItem = document.getElementById('xp-base-item-input').value.trim();
    const multVal = parseFloat(document.getElementById('xp-mult').value) || 0;
    const isFusion = multVal >= 3;
    let typeName = isFusion ? 'Fusion' : 'Réparation';
    if (inputItem) typeName += ` (${inputItem})`;

    xpCartLines.push({
        id: Date.now(),
        desc: typeName,
        amount: numVal,
        sub: resultSub
    });

    renderXpCart();
    showToast('Ajouté au ticket !', '🛒');
    
    // Auto-reset du niveau et de l'item optionnellement
    document.getElementById('xp-niv').value = 1;
    document.getElementById('xp-base-item-input').value = '';
    onXpBaseItemChange();
}

function removeXpLine(id) {
    xpCartLines = xpCartLines.filter(l => l.id !== id);
    renderXpCart();
}

function clearXpCart() {
    if (xpCartLines.length === 0) return;
    if (!confirm('Vider le ticket Forge ?')) return;
    xpCartLines = [];
    renderXpCart();
    showToast('Ticket vidé', '🗑️');
}

function renderXpCart() {
    const container = document.getElementById('xp-cart-lines');
    const totalEl = document.getElementById('xp-cart-total');
    const copyBtn = document.getElementById('xp-cart-copy');

    if (xpCartLines.length === 0) {
        container.innerHTML = '<div class="note-empty">Panier vide. Ajoutez des opérations !</div>';
        totalEl.innerHTML = `0.00<span class="unit">€</span>`;
        copyBtn.dataset.value = 0;
        return;
    }

    let total = 0;
    container.innerHTML = xpCartLines.map(line => {
        total += line.amount;
        return `
        <div class="note-item" style="padding:0.5rem 0.8rem">
            <div class="note-body" style="width:100%">
                <div style="display:flex;justify-content:space-between;align-items:center;font-weight:600">
                    <div>${escHtml(line.desc)}</div>
                    <div style="color:var(--gold)">${fmt(line.amount)}€</div>
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${escHtml(line.sub)}</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="removeXpLine(${line.id})" style="padding:0.3rem">✖</button>
        </div>`;
    }).join('');

    totalEl.innerHTML = `${fmt(total)}<span class="unit">€</span>`;
    copyBtn.dataset.value = fmt(total);
}

// ========================
// FORGE MODULE (Réparation/Fusion)
// ========================
function calcXP() {
    const niv = parseFloat(document.getElementById('xp-niv').value) || 0;
    const mult = parseFloat(document.getElementById('xp-mult').value) || 0;
    const anvilCost = parseFloat(document.getElementById('xp-mat').value) || 0;
    const anvilMult = parseFloat(document.getElementById('xp-anvil-mult').value) || 1;
    const margePct = parseFloat(document.getElementById('xp-marge').value) || 0;
    
    // Coût du matériau de l'objet si présent
    const matInput = document.getElementById('xp-base-mat-price');
    const itemMatCost = matInput ? (parseFloat(matInput.value) || 0) : 0;
    const matDetail = (matInput && matInput.dataset.detail) ? ` (${matInput.dataset.detail})` : "";
    
    const xpBase = getXp(niv);
    const xpCost = xpBase * mult;
    const anvilTotal = anvilCost * anvilMult;
    
    const subTotal = xpCost + anvilTotal + itemMatCost;
    const total = Math.ceil(subTotal * (1 + margePct / 100)); // Marge en pourcentage + Arrondi
    const finalMarge = total - subTotal;

    document.getElementById('res-xp-value').innerHTML = `${fmt(total)}<span class="unit">€</span>`;
    
    let subT = "";
    if (itemMatCost > 0) subT += `[Objet${matDetail}: ${fmt(itemMatCost)}€] + `;
    subT += `[XP: ${fmt(xpCost)}€] + [Enclume: ${fmt(anvilTotal)}€]`;
    if (margePct > 0) subT += ` + [Marge ${margePct}%: ${fmt(finalMarge)}€]`;
    subT += ` = <strong style="color:var(--text-main)">${fmt(total)}€</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">Détail XP: ${xpBase} pts × ${mult} | Usure: ${fmt(anvilCost)}€ × ${anvilMult} passages</span>`;

    
    document.getElementById('res-xp-sub').innerHTML = subT;
    document.getElementById('res-xp-pts').textContent = xpBase;
    document.getElementById('xp-copy-val').dataset.value = fmt(total);
    document.getElementById('xp-copy-pts').dataset.value = xpBase;
}

function populateXpItems() {
    const matSel = document.getElementById('xp-cat-select');
    const itemSel = document.getElementById('xp-base-item-input');
    if (!matSel || !itemSel) return;
    
    const selectedMat = matSel.value;
    const allItems = loadData('vente');
    
    let filtered = allItems.filter(i => {
        const cat = (i.category || '').toLowerCase();
        const name = (i.name || '').toLowerCase();
        const isTargetCat = (cat.includes('armure') || cat.includes('outil') || name.includes('canne'));
        if (!isTargetCat) return false;
        
        if (selectedMat !== 'all') {
            // Check for material in name
            return name.includes(selectedMat.toLowerCase());
        }
        return true;
    });

    // Custom sorting: Tools (Outils) first, then Armor (Armures)
    filtered.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        const isToolA = catA.includes('outil') || a.name.toLowerCase().includes('canne');
        const isToolB = catB.includes('outil') || b.name.toLowerCase().includes('canne');
        
        if (isToolA && !isToolB) return -1;
        if (!isToolA && isToolB) return 1;
        
        return a.name.localeCompare(b.name);
    });

    const currentVal = itemSel.value;
    itemSel.innerHTML = '<option value="">— Sélectionner un objet —</option>';
    filtered.forEach(item => {
        itemSel.innerHTML += `<option value="${escHtml(item.name)}">${escHtml(item.name)}</option>`;
    });
    if (currentVal) itemSel.value = currentVal;
}

function onXpBaseItemChange() {
    const input = document.getElementById('xp-base-item-input');
    const val = input ? input.value : '';
    const materials = loadData('vente').filter(m => m.category === '📦 Matériaux' || m.category === 'Minerais');
    
    let baseMatPrice = 0;
    let detailStr = "";
    let craftAmount = 0;
    const nameLower = val.toLowerCase();
    
    if (nameLower.includes('plastron')) craftAmount = 8;
    else if (nameLower.includes('jambière') || nameLower.includes('jambiere') || nameLower.includes('pantalon')) craftAmount = 7;
    else if (nameLower.includes('casque')) craftAmount = 5;
    else if (nameLower.includes('botte')) craftAmount = 4;
    else if (nameLower.includes('pioche') || nameLower.includes('hache')) craftAmount = 3;
    else if (nameLower.includes('épée') || nameLower.includes('epee') || nameLower.includes('houe')) craftAmount = 2;
    else if (nameLower.includes('pelle')) craftAmount = 1;
    
    if (craftAmount > 0) {
        let isNetherite = nameLower.includes('netherite');
        let diamondPrice = (materials.find(m => m.name.toLowerCase() === 'diamant') || {price:0}).price;
        let scrapPrice = (materials.find(m => m.name.toLowerCase().includes('fragment') && m.name.toLowerCase().includes('netherite')) || {price:0}).price;
        let goldPrice = (materials.find(m => m.name.toLowerCase() === 'or brut' || m.name.toLowerCase() === 'lingot d\'or') || {price:0}).price;

        if (isNetherite) {
            let ingotCost = (4 * scrapPrice) + (4 * goldPrice);
            baseMatPrice = (craftAmount * diamondPrice) + ingotCost;
            detailStr = `Diamant × ${craftAmount} + Fragment × 4 + Or × 4`;
        } else {
            let matPrice = 0;
            let matName = "Matériau";
            let foundMat = materials.find(m => nameLower.includes(m.name.toLowerCase()));
            if (!foundMat) {
                for (const m of materials) {
                    const subName = m.name.toLowerCase().replace(' brut', '');
                    if (nameLower.includes(subName)) {
                        foundMat = m;
                        break;
                    }
                }
            }
            if (foundMat) {
                matPrice = foundMat.price || 0;
                matName = foundMat.name;
            }
            else if (nameLower.includes('diamant')) { matPrice = diamondPrice; matName = "Diamant"; }
            else if (nameLower.includes('fer')) { matPrice = (materials.find(m => m.name.toLowerCase().includes('fer')) || {price:0}).price; matName = "Fer"; }
            else if (nameLower.includes('or')) { matPrice = goldPrice; matName = "Or"; }
            
            baseMatPrice = craftAmount * matPrice;
            detailStr = `${matName} × ${craftAmount}`;
        }
    }
    
    const matInput = document.getElementById('xp-base-mat-price');
    if (matInput) {
        matInput.value = baseMatPrice;
        matInput.dataset.detail = detailStr;
    }
    calcXP();
}

// Auto-calc anvil wear: 31 ingots × iron price / 25 avg uses
const ANVIL_INGOTS = 31;
const ANVIL_AVG_USES = 25;

function calcAnvilWear() {
    const mats = loadData('vente');
    const iron = mats.find(m => m.name.toLowerCase().includes('fer') && (m.category === '📦 Matériaux' || m.category === 'Minerais'));
    if (iron) {
        const wear = (ANVIL_INGOTS * iron.price) / ANVIL_AVG_USES;
        document.getElementById('xp-mat').value = wear.toFixed(2);
        calcXP();
    }
}

// ========================
// SMELTING MODULE (Optimisation Cuisson)
// ========================
const ITEMS_PER_FURNACE = 64; // 1 stack per blast furnace per batch

function calcSmelt() {
    const checked = Array.from(document.querySelectorAll('input[name="smelt-mat"]:checked'));
    const maxBudget = parseFloat(document.getElementById('smelt-budget').value) || 0;
    
    if (checked.length === 0 || maxBudget <= 0) {
        document.getElementById('smelt-haut-result').textContent = '0';
        document.getElementById('smelt-four-result').textContent = '0';
        document.getElementById('smelt-revenue').innerHTML = `0.00<span class="unit">€</span>`;
        document.getElementById('smelt-revenue-sub').textContent = "Sélectionnez au moins un matériau";
        return;
    }

    const items = checked.map(input => {
        const parent = input.parentElement;
        const name = parent.querySelector('.mat-name').textContent;
        const icon = parent.querySelector('.mat-icon').textContent;
        const priceInput = document.getElementById(`smelt-price-${name.toLowerCase()}`);
        const unitPrice = priceInput ? parseFloat(priceInput.value) : 0;
        return { name, icon, unitPrice, stackPrice: unitPrice * 64 };
    });

    // Tri des items : On met le matériau prioritaire en PREMIER pour qu'il soit favorisé par le solver
    // S'il n'y a pas de priorité, on garde le tri par prix décroissant
    items.sort((a, b) => {
        if (a.name === appData.smelt_priority) return -1;
        if (b.name === appData.smelt_priority) return 1;
        return b.stackPrice - a.stackPrice;
    });

    // Algorithme d'optimisation (Solver de combinaison)
    // On cherche à maximiser le revenu tout en favorisant le matériau prioritaire
    let bestCombo = null;
    let bestRevenue = -1;
    let bestTotalStacks = 0;
    let bestScore = -1; // Le score combine revenu et priorité

    function solve(idx, currentBudget, currentCombo, currentTotalStacks) {
        if (idx === items.length) {
            const revenue = maxBudget - currentBudget;
            const priorityItemName = appData.smelt_priority;
            const priorityStacks = priorityItemName ? (currentCombo[priorityItemName] || 0) : 0;
            
            // LOGIQUE D'ÉQUILIBRE : 
            // Chaque pile du matériau favori apporte un "bonus" de 25€ de valeur virtuelle
            // Cela permet de préférer une combinaison avec plus de favori même si elle est un peu moins précise
            const score = revenue + (priorityStacks * 25);

            if (score > bestScore || (score === bestScore && currentTotalStacks < bestTotalStacks)) {
                bestScore = score;
                bestRevenue = revenue;
                bestCombo = { ...currentCombo };
                bestTotalStacks = currentTotalStacks;
            }
            return;
        }

        const item = items[idx];
        const maxStacks = Math.floor(currentBudget / item.stackPrice);
        
        // On teste toutes les possibilités pour ce matériau
        // Optimisation : si on a déjà un revenu parfait (0€ de reste), on s'arrête
        for (let s = maxStacks; s >= 0; s--) {
            currentCombo[item.name] = s;
            solve(idx + 1, currentBudget - (s * item.stackPrice), currentCombo, currentTotalStacks + s);
            if (bestRevenue === maxBudget) break; 
        }
    }

    // Si le budget est énorme (> 10 double coffres), on utilise une approche gloutonne pour dégrossir
    let startupRevenue = 0;
    let startupStacks = 0;
    let startupCombo = {};
    let searchBudget = maxBudget;

    const MAX_SEARCH_STACKS = 64; // On optimise finement sur les derniers 64 stacks
    
    // Phase gloutonne standard (le score gérera la priorité pendant l'optimisation fine)
    items.sort((a, b) => b.stackPrice - a.stackPrice);
    
    if (maxBudget > MAX_SEARCH_STACKS * items[0].stackPrice) {
        const item = items[0];
        const bulkyStacks = Math.floor(maxBudget / item.stackPrice) - MAX_SEARCH_STACKS;
        if (bulkyStacks > 0) {
            startupCombo[item.name] = bulkyStacks;
            startupRevenue = bulkyStacks * item.stackPrice;
            startupStacks = bulkyStacks;
            searchBudget = maxBudget - startupRevenue;
        }
    }

    solve(0, searchBudget, startupCombo, startupStacks);

    // Mise à jour de l'UI
    const totalStacks = bestTotalStacks;
    const actualRevenue = bestRevenue;

    const nbHaut = Math.min(15, totalStacks);
    const nbFour = Math.max(0, totalStacks - 15);

    document.getElementById('smelt-haut-result').textContent = nbHaut;
    document.getElementById('smelt-four-result').textContent = nbFour;

    document.getElementById('smelt-revenue').innerHTML = `${fmt(actualRevenue)}<span class="unit">€</span>`;
    
    // Construction de la "liste de courses"
    let breakdownParts = [];
    let itemDetails = [];
    
    items.forEach(it => {
        const s = bestCombo[it.name] || 0;
        if (s > 0) {
            let labelText = "";
            let color = "";
            
            if (it.name === "Or") { labelText = "d'Or"; color = "var(--gold)"; }
            else if (it.name === "Fer") { labelText = "de Fer"; color = "#e5e7eb"; }
            else if (it.name === "Cuivre") { labelText = "de Cuivre"; color = "#fb923c"; }
            
            breakdownParts.push(`<span style="color:${color}; font-weight:bold;">${s} pile${s > 1 ? 's' : ''} ${labelText}</span>`);
            itemDetails.push(`${s * 64} ${it.name}`);
        }
    });
    
    const resultElement = document.getElementById('smelt-revenue-sub');
    if (breakdownParts.length > 0) {
        resultElement.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Répartition :</strong> ${breakdownParts.join(' + ')}</div>
            <div style="font-size: 0.95rem; color: var(--text-muted); font-weight: normal;">
                Soit ${itemDetails.join(' + ')} (${totalStacks * 64} items au total)
            </div>
        `;
    } else {
        resultElement.textContent = "Budget trop faible pour une pile entière";
    }
        
    document.getElementById('smelt-copy').dataset.value = fmt(actualRevenue);
}

function updateSmeltPrice(mat, val) {
    if (!appData.smelt_prices) appData.smelt_prices = { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
        appData.smelt_prices[mat] = numVal;
        addActivityLog('Prix Cuisson', `${mat} -> ${numVal}€`);
        triggerDbSync();
    }
    calcSmelt();
}

function toggleSmeltPriority(name, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (appData.smelt_priority === name) {
        appData.smelt_priority = null;
        addActivityLog('Priorité Cuisson', `Retirée pour ${name}`);
    } else {
        appData.smelt_priority = name;
        addActivityLog('Priorité Cuisson', `Définie sur ${name}`);
    }
    
    syncSmeltPriorityUI();
    triggerDbSync();
    calcSmelt();
}

function syncSmeltPriorityUI() {
    document.querySelectorAll('.mat-priority-btn').forEach(btn => {
        const wrapper = btn.closest('.mat-item-wrapper');
        const matName = wrapper.querySelector('.mat-name').textContent;
        if (matName === appData.smelt_priority) {
            btn.classList.add('is-priority');
        } else {
            btn.classList.remove('is-priority');
        }
    });
}

function updateSmeltPricesUI() {
    if (!appData.smelt_prices) appData.smelt_prices = { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
    
    const orInput = document.getElementById('smelt-price-or');
    const ferInput = document.getElementById('smelt-price-fer');
    const cuivreInput = document.getElementById('smelt-price-cuivre');
    
    if (orInput) orInput.value = (appData.smelt_prices.Or !== undefined) ? appData.smelt_prices.Or : 2.12;
    if (ferInput) ferInput.value = (appData.smelt_prices.Fer !== undefined) ? appData.smelt_prices.Fer : 1.79;
    if (cuivreInput) cuivreInput.value = (appData.smelt_prices.Cuivre !== undefined) ? appData.smelt_prices.Cuivre : 1.30;
    
    syncSmeltPriorityUI();
    calcSmelt();
}

// ========================
// VENTE MODULE
// ========================
function openVenteModal(item = null) {
    editingVenteId = item ? item.id : null;
    document.getElementById('vente-modal-title').textContent = item ? "Modifier l'article" : 'Nouvel article en vente';
    document.getElementById('vente-input-name').value = item ? item.name : '';
    document.getElementById('vente-input-category').value = item ? (item.category || '') : '';
    document.getElementById('vente-input-price').value = item ? item.price : '';
    document.getElementById('vente-input-sell').value = item && item.sellPrice ? item.sellPrice : '';
    const icon = item ? (item.icon || '🏪') : '🏪';
    document.getElementById('vente-input-icon').value = icon;
    document.getElementById('vente-icon-preview').textContent = icon;
    const picker = document.getElementById('vente-emoji-picker');
    if (picker) picker.classList.remove('active');
    
    updateVenteCategories();
    document.getElementById('vente-modal').classList.add('active');
}

function closeVenteModal() {
    document.getElementById('vente-modal').classList.remove('active');
    const picker = document.getElementById('vente-emoji-picker');
    if (picker) picker.classList.remove('active');
    editingVenteId = null;
}

function saveVenteItem() {
    const name = document.getElementById('vente-input-name').value.trim();
    const category = document.getElementById('vente-input-category').value.trim() || 'Général';
    const price = parseFloat(document.getElementById('vente-input-price').value);
    const sellPrice = parseFloat(document.getElementById('vente-input-sell').value) || 0;
    const icon = document.getElementById('vente-input-icon').value.trim() || '🏪';
    if (!name) { showToast('Le nom est requis', '⚠️'); return; }
    if (isNaN(price) || price < 0) { showToast('Prix invalide/Requis', '⚠️'); return; }

    const items = loadData('vente');
    if (editingVenteId) {
        const idx = items.findIndex(i => i.id === editingVenteId);
        if (idx !== -1) { items[idx].name = name; items[idx].category = category; items[idx].price = price; items[idx].sellPrice = sellPrice; items[idx].icon = icon; }
    } else {
        items.push({ id: Date.now(), name, category, price, sellPrice, icon, system: false });
    }
    saveData('vente', items);
    renderVente();
    populateCalcCategories();
    populateMaterialSelects();
    populateXpItems();
    closeVenteModal();
    const actionLabel = editingVenteId ? 'Modification article' : 'Ajout article';
    addActivityLog(actionLabel, `${name} (${fmt(price)}€)`);
    showToast(editingVenteId ? 'Article modifié' : 'Article ajouté', '🏪');
}

function deleteVenteItem(id) {
    if (!confirm('Supprimer cet article ?')) return;
    const deletedItem = loadData('vente').find(i => i.id === id);
    const items = loadData('vente').filter(i => i.id !== id);
    saveData('vente', items);
    renderVente();
    populateCalcCategories();
    populateMaterialSelects();
    populateXpItems();
    if (deletedItem) addActivityLog('Suppression article', deletedItem.name);
    showToast('Article supprimé', '🗑️');
}

function updateVenteCategories() {
    const allItems = loadData('vente');
    const standardCategories = ['📦 Matériaux', '🛡️ Armures', '⚔️ Outils', '✨ Livres', '🧶 Divers'];
    const existingCategories = allItems.map(i => i.category || 'Général');
    
    // Union of standard and existing, unique names
    const categories = [...new Set([...standardCategories, ...existingCategories])];
    
    const datalist = document.getElementById('vente-categories-list');
    if (datalist) {
        datalist.innerHTML = categories
            .filter(c => c && c.trim() !== '' && !c.includes('Cuisson'))
            .map(c => `<option value="${escHtml(c)}">`)
            .join('');
    }
}

function setVenteFilter(tag) {
    currentVenteFilter = tag;
    document.querySelectorAll('.vente-filters .tag').forEach(t => t.classList.toggle('active', t.dataset.venteTag === tag));
    renderVente();
}

function renderVente() {
    let allItems = loadData('vente');
    updateVenteCategories();

    let itemsToRender = allItems;
    if (currentVenteFilter !== 'all') {
        const fStr = currentVenteFilter.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, "");
        itemsToRender = allItems.filter(i => {
            const cat = (i.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, "");
            return cat.includes(fStr);
        });
    }

    const container = document.getElementById('vente-dynamic-section');
    if (itemsToRender.length === 0) {
        container.innerHTML = '<div class="card"><div class="note-empty">🏪 Aucun article trouvé. Ajoutez-en ou changez de filtre !</div></div>';
        return;
    }

    // Group by category
    const grouped = {};
    itemsToRender.forEach(item => {
        const cat = item.category || 'Général';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    let html = '';
    for (const [cat, items] of Object.entries(grouped)) {
        html += `
        <div class="card" style="margin-bottom:1.5rem">
            <div class="card-title">${escHtml(cat)}</div>
            <div class="vente-grid">
                ${items.map(item => {
                    const hasProfit = item.sellPrice && item.sellPrice > 0;
                    const profitText = hasProfit 
                        ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;font-family:'JetBrains Mono',monospace">Achat: ${fmt(item.price)}€ | Gain Trait.: ${fmt(item.sellPrice)}€</div>` 
                        : `<div class="vente-item-price">${fmt(item.price)}€</div>`;
                    
                    return `
                    <div class="vente-item">
                        <div class="vente-item-icon">${item.icon || '🏪'}</div>
                        <div class="vente-item-info" style="cursor:pointer;flex:1" onclick='openVenteModal(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                            <div class="vente-item-name">${escHtml(item.name)}</div>
                            ${profitText}
                        </div>
                        <button class="btn btn-sm" onclick="copyValue('${fmt(item.price)}')" title="Copier le prix de base">📋</button>
                        ${item.system ? '' : `<button class="btn btn-sm btn-danger" onclick="deleteVenteItem(${item.id})" style="padding:0.4rem" title="Supprimer">✖</button>`}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
    container.innerHTML = html;
    
    // Refresh the enchantment items select when Vente is re-rendered
    populateEnchantItems();
}

function initVenteDataIfEmpty() {
    let items = loadData('vente');
    
    // Matériaux de base essentiels
    const baseMats = [
        { name: "Fer brut", price: 7, icon: "⚪" },
        { name: "Diamant", price: 45, icon: "💎" },
        { name: "Or brut", price: 9, icon: "🟡" },
        { name: "Pierre", price: 0.5, icon: "🪨" },
        { name: "Fragment de Netherite", price: 20, icon: "⬛" },
        { name: "Cuivre brut", price: 0.5, icon: "🟠" }
    ];

    const extraEnchants = [
        { name: "Livre : Efficacité IV", price: 1000, icon: "📖" },
        { name: "Livre : Tranchant IV", price: 1000, icon: "📖" }
    ];

    if (items.length === 0) {
        for (const [mat, pieces] of Object.entries(armorPrices)) {
            for (const [piece, price] of Object.entries(pieces)) {
                items.push({ id: Date.now() + Math.random(), name: `${piece} en ${mat}`, category: '🛡️ Armures', price: price, icon: '🛡️', system: true });
            }
        }
        for (const [mat, pieces] of Object.entries(toolPrices)) {
            for (const [piece, price] of Object.entries(pieces)) {
                items.push({ id: Date.now() + Math.random(), name: `${piece} en ${mat}`, category: '⚔️ Outils', price: price, icon: '⚔️', system: true });
            }
        }
        for (const enc of DEFAULT_ENCHANTMENTS) {
            items.push({ id: Date.now() + Math.random(), name: `Livre : ${enc.name}`, category: '✨ Livres', price: enc.price, icon: '📖', system: true });
        }
        for (const mat of baseMats) {
            items.push({ id: Date.now() + Math.random(), name: mat.name, category: '📦 Matériaux', price: mat.price, icon: mat.icon, system: true });
        }
        saveData('vente', items);
    } else {
        // Mode admin: injection forcée des matériaux et nouveaux enchantements (vérification par nom)
        const userPseudo = (currentPseudo || "").toLowerCase();
        if (userPseudo.includes('zaes') || userPseudo.includes('zaès')) {
            let changed = false;
            
            // Inject missing materials
            baseMats.forEach(bm => {
                const alreadyHas = items.some(i => i.name.toLowerCase() === bm.name.toLowerCase());
                if (!alreadyHas) {
                    items.push({ id: Date.now() + Math.random(), name: bm.name, category: '📦 Matériaux', price: bm.price, icon: bm.icon, system: true });
                    changed = true;
                }
            });

            // Inject specific new enchantments for Zaès
            extraEnchants.forEach(ee => {
                const alreadyHas = items.some(i => i.name.toLowerCase() === ee.name.toLowerCase());
                if (!alreadyHas) {
                    items.push({ id: Date.now() + Math.random(), name: ee.name, category: '✨ Livres', price: ee.price, icon: ee.icon, system: true });
                    changed = true;
                }
            });

            if (changed) {
                saveData('vente', items);
                renderVente();
            }
        }
    }
}

// Vente emoji picker
function toggleVenteEmojiPicker() {
    const picker = document.getElementById('vente-emoji-picker');
    picker.classList.toggle('active');
}

function selectVenteEmoji(emoji) {
    document.getElementById('vente-input-icon').value = emoji;
    document.getElementById('vente-icon-preview').textContent = emoji;
    document.getElementById('vente-emoji-picker').classList.remove('active');
}

function buildVenteEmojiPicker() {
    const picker = document.getElementById('vente-emoji-picker');
    if (!picker) return;
    let html = '';
    for (const [category, emojis] of Object.entries(MC_EMOJIS)) {
        html += `<div class="emoji-category">${category}</div>`;
        html += '<div class="emoji-grid">';
        emojis.forEach(e => {
            html += `<button type="button" class="emoji-option" onclick="selectVenteEmoji('${e}')">${e}</button>`;
        });
        html += '</div>';
    }
    picker.innerHTML = html;
}

// ========================
// TIMER (Customizable)
// ========================
let timerInterval = null;
let timerRemaining = 15 * 60;
let timerEndTime = null;
let timerState = 'idle'; // idle, running, done
let currentTimerDuration = 15 * 60; // Par défaut 15 min

function handleTimerClick() {
    if (timerState === 'running') {
        stopTimer();
    }
    openTimerConfig();
}

function openTimerConfig() {
    const modal = document.getElementById('timer-config-modal');
    if (modal) {
        document.getElementById('timer-custom-min').value = 15;
        modal.classList.add('active');
    }
}

function closeTimerConfig() {
    const modal = document.getElementById('timer-config-modal');
    if (modal) modal.classList.remove('active');
}

function startCustomTimer() {
    const minInput = document.getElementById('timer-custom-min');
    let mins = parseInt(minInput.value) || 15;
    
    // Contrainte : Max 15 minutes
    if (mins > 15) {
        showToast('Maximum 15 minutes !', '⚠️');
        mins = 15;
    }
    if (mins < 1) mins = 1;

    currentTimerDuration = mins * 60;
    timerRemaining = currentTimerDuration;
    closeTimerConfig();
    startTimer();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerState = 'running';
    timerEndTime = Date.now() + (currentTimerDuration * 1000);
    
    const widget = document.getElementById('timer-widget');
    if (widget) {
        widget.classList.add('running');
        widget.classList.remove('done');
    }
    document.getElementById('timer-icon').textContent = '⏳';
    
    updateTimerRemaining();
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        updateTimerRemaining();
        updateTimerDisplay();

        if (timerRemaining <= 0) {
            completeTimer();
        }
    }, 1000);

    const mins = Math.floor(currentTimerDuration / 60);
    showToast(`Minuteur ${mins} min lancé !`, '⏳');
}

function updateTimerRemaining() {
    if (!timerEndTime) return;
    timerRemaining = Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000));
}

function completeTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerState = 'done';
    
    const widget = document.getElementById('timer-widget');
    if (widget) {
        widget.classList.remove('running');
        widget.classList.add('done');
    }
    document.getElementById('timer-icon').textContent = '✅';
    document.getElementById('timer-display').textContent = '00:00';
    document.getElementById('timer-progress').style.transform = 'scaleX(0)';
    showToast('Minuteur terminé ! ⏰', '✅');
    showTimerModal();
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerState = 'idle';
    timerRemaining = currentTimerDuration;
    timerEndTime = null;
    
    const widget = document.getElementById('timer-widget');
    if (widget) widget.classList.remove('running', 'done');
    document.getElementById('timer-icon').textContent = '⏲️';
    updateTimerDisplay();
    document.getElementById('timer-progress').style.transform = 'scaleX(1)';
    showToast('Minuteur arrêté', '⏹️');
}

function resetTimer() {
    stopTimer();
}

function updateTimerDisplay() {
    const mins = Math.floor(timerRemaining / 60);
    const secs = timerRemaining % 60;
    const disp = document.getElementById('timer-display');
    if (disp) disp.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const progress = timerRemaining / currentTimerDuration;
    const progBar = document.getElementById('timer-progress');
    if (progBar) progBar.style.transform = `scaleX(${progress})`;
}

function playTimerSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playBeep(time, freq, dur) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'square';
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
            gain.gain.setValueAtTime(0.1, time + dur - 0.05);
            gain.gain.linearRampToValueAtTime(0, time + dur);
            osc.start(time);
            osc.stop(time + dur);
        }
        
        const t = audioCtx.currentTime;
        playBeep(t, 880, 0.2);     // A5
        playBeep(t + 0.3, 880, 0.2); // A5
        playBeep(t + 0.6, 1108.73, 0.4); // C#6
        
    } catch(e) {
        console.warn('Audio non supporté');
    }
}

function showTimerModal() {
    const m = document.getElementById('timer-modal');
    if (m) m.classList.add('active');
    playTimerSound();
}

function closeTimerModal() {
    const m = document.getElementById('timer-modal');
    if (m) m.classList.remove('active');
}

function restartTimer15() {
    currentTimerDuration = 15 * 60;
    timerRemaining = currentTimerDuration;
    closeTimerModal();
    startTimer();
}

// ========================
// NOTES MODULE
// ========================
function openNoteModal(note = null) {
    editingNoteId = note ? note.id : null;
    document.getElementById('note-modal-title').textContent = note ? 'Modifier la note' : 'Nouvelle note';
    document.getElementById('note-input-title').value = note ? note.title : '';
    document.getElementById('note-input-text').value = note ? note.text : '';
    document.getElementById('note-input-tag').value = note ? note.tag : 'encours';
    document.getElementById('note-modal').classList.add('active');
}

function closeNoteModal() {
    document.getElementById('note-modal').classList.remove('active');
    editingNoteId = null;
}

function saveNote() {
    const title = document.getElementById('note-input-title').value.trim();
    const text = document.getElementById('note-input-text').value.trim();
    const tag = document.getElementById('note-input-tag').value;
    if (!title) { showToast('Le titre est requis', '⚠️'); return; }
    
    const notes = loadData('notes');
    if (editingNoteId) {
        const idx = notes.findIndex(n => n.id === editingNoteId);
        if (idx !== -1) { notes[idx].title = title; notes[idx].text = text; notes[idx].tag = tag; notes[idx].updated = new Date().toLocaleString('fr-FR'); }
    } else {
        notes.unshift({ id: Date.now(), title, text, tag, created: new Date().toLocaleString('fr-FR'), updated: null });
    }
    saveData('notes', notes);
    renderNotes();
    closeNoteModal();
    const actionLabel = editingNoteId ? 'Modification note' : 'Ajout note';
    addActivityLog(actionLabel, title);
    showToast(editingNoteId ? 'Note modifiée' : 'Note ajoutée', '📝');
}

function deleteNote(id) {
    if (!confirm('Supprimer cette note ?')) return;
    const deletedNote = loadData('notes').find(n => n.id === id);
    const notes = loadData('notes').filter(n => n.id !== id);
    saveData('notes', notes);
    renderNotes();
    if (deletedNote) addActivityLog('Suppression note', deletedNote.title);
    showToast('Note supprimée', '🗑️');
}

function setNoteFilter(tag) {
    currentNoteFilter = tag;
    document.querySelectorAll('.tag-filters .tag').forEach(t => t.classList.toggle('active', t.dataset.tag === tag));
    renderNotes();
}

const tagLabels = { encours: 'En cours', attente: 'En attente', termine: 'Terminé', urgent: 'Urgent' };
const tagClasses = { encours: 'tag-encours', attente: 'tag-attente', termine: 'tag-termine', urgent: 'tag-urgent' };

function renderNotes() {
    let notes = loadData('notes');
    if (currentNoteFilter !== 'all') notes = notes.filter(n => n.tag === currentNoteFilter);
    const container = document.getElementById('notes-list');
    
    if (notes.length === 0) {
        container.innerHTML = '<div class="note-empty">📜 Aucune note pour le moment...</div>';
        return;
    }
    
    container.innerHTML = notes.map(n => `
        <div class="note-item">
            <div class="note-body">
                <div class="note-title">${escHtml(n.title)}</div>
                ${n.text ? `<div class="note-text">${escHtml(n.text)}</div>` : ''}
                <div class="note-meta">
                    <span class="tag ${tagClasses[n.tag]}">${tagLabels[n.tag]}</span>
                    <span class="note-date">${n.updated ? 'modifié ' + n.updated : n.created}</span>
                </div>
            </div>
            <div class="note-actions">
                <button class="btn btn-sm" onclick='openNoteModal(${JSON.stringify(n)})'>✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteNote(${n.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ========================
// EMOJI PICKER (Minecraft themed)
// ========================
const MC_EMOJIS = {
    '⛏️ Minerais & Lingots': ['💎','🪨','🧱','🪙','⬛','🟫','🔶','🟡','⚪','🟠','🔵','🟣'],
    '⚔️ Outils & Armes': ['⛏️','⚔️','🗡️','🏹','🪓','🎣','🛡️','🔱','✂️','🪣','🧲','🔔'],
    '🛡️ Armures': ['🪖','👕','👖','👢','⛑️','🧤','👑','🎩','🥾','🦺','🧥','👗'],
    '🌿 Nature & Bois': ['🪵','🌳','🍂','🌿','🌾','🌻','🌹','🍄','🌵','🎋','🎍','🪴'],
    '🍖 Nourriture': ['🍖','🥩','🍞','🥕','🍎','🍉','🥔','🍪','🎂','🍰','🐟','🥧'],
    '🧪 Potions & Enchant': ['🧪','⚗️','✨','🔮','📖','🏷️','⭐','💫','🌟','🎆','♻️','🧬'],
    '🏗️ Blocs & Matériaux': ['🧊','🪨','🏗️','🧱','🪵','📦','🪣','🫧','🔥','❄️','💧','🌊'],
    '🐾 Mobs & Animaux': ['🐄','🐑','🐷','🐔','🐴','🐺','🕷️','💀','🧟','🐉','🦜','🐝'],
    '⚙️ Redstone & Méca': ['⚙️','🔧','🔩','💡','🔌','🧨','🕹️','🎚️','🚂','⏰','🗜️','🪤'],
    '🎮 Divers': ['🗺️','🧭','🔑','💰','🏆','🎯','🪙','📜','🎪','🪈','🏮','🔔']
};

function closeEmojiPickerOnClickOutside(e) {
    const picker = document.getElementById('emoji-picker');
    const wrapper = document.querySelector('.emoji-picker-wrapper');
    if (picker && wrapper && !wrapper.contains(e.target)) {
        picker.classList.remove('active');
    }
    // Also close vente emoji picker
    const ventePicker = document.getElementById('vente-emoji-picker');
    const venteWrapper = ventePicker?.closest('.emoji-picker-wrapper');
    if (ventePicker && venteWrapper && !venteWrapper.contains(e.target)) {
        ventePicker.classList.remove('active');
    }
}


function populateCalcCategories() {
    const sel = document.getElementById('calc-cat-select');
    if (!sel) return;
    
    const items = loadData('vente');
    // Requested order
    const orderedKeys = ['📦 Matériaux', '⚔️ Outils', '🛡️ Armures', '✨ Livres', '🧶 Divers'];
    
    const existingCats = [...new Set(items.map(i => i.category || '🧶 Divers'))];
    const otherCats = existingCats.filter(c => !orderedKeys.includes(c) && !c.includes('Cuisson')).sort();
    
    const finalCategories = [...orderedKeys, ...otherCats];
    
    const currentVal = sel.value;
    sel.innerHTML = ''; 
    finalCategories.forEach(c => {
        sel.innerHTML += `<option value="${escHtml(c)}">${escHtml(c)}</option>`;
    });
    
    if (currentVal && finalCategories.includes(currentVal)) {
        sel.value = currentVal;
    } else if (finalCategories.length > 0) {
        sel.value = finalCategories[0];
    }
}

function populateMaterialSelects() {
    const catSel = document.getElementById('calc-cat-select');
    const selectedCat = catSel ? catSel.value : 'all';
    
    let items = loadData('vente');
    if (selectedCat !== 'all') {
        items = items.filter(m => (m.category || '🧶 Divers') === selectedCat);
    }
    
    const sel = document.getElementById('calc-mat-select');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— Sélectionner un article —</option>';
    items.sort((a,b) => a.name.localeCompare(b.name)).forEach(m => {
        sel.innerHTML += `<option value="${m.id}">${m.icon || '📦'} ${escHtml(m.name)}</option>`;
    });
    if (currentVal) sel.value = currentVal;
}


// ========================
// PARTICLES
// ========================
function initParticles() {
    const container = document.getElementById('particles');
    setInterval(() => {
        const s = document.createElement('div');
        s.classList.add('spark');
        const size = Math.random() * 3 + 1;
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = Math.random() * 100 + 'vw';
        s.style.top = Math.random() * 100 + 'vh';
        const dur = Math.random() * 4 + 2;
        s.style.animationDuration = dur + 's';
        container.appendChild(s);
        setTimeout(() => s.remove(), dur * 1000);
    }, 400);
}

// ========================
// ENCHANTEMENT MODULE
// ========================

const ENCHANT_MAPPING = {
    "Affilage III": ["épée", "epee", "sword"],
    "Agilité aquatique III": ["botte", "boots"],
    "Apnée III": ["casque", "helmet"],
    "Appât III": ["canne", "pêche", "peche", "rod"],
    "Aura de feu II": ["épée", "epee", "sword"],
    "Brise-lame III": ["trident"],
    "Butin III": ["épée", "epee", "sword"],
    "Canalisation I": ["trident"],
    "Chance de la mer III": ["canne", "pêche", "peche", "rod"],
    "Charge rapide III": ["arbalète", "arbalete", "crossbow"],
    "Châtiment V": ["épée", "epee", "hache", "axe"],
    "Chute amortie IV": ["botte", "boots"],
    "Délicatesse I": ["pioche", "pickaxe", "pelle", "shovel", "hache", "axe", "houe", "hoe"],
    "Efficacité IV": ["pioche", "pickaxe", "pelle", "shovel", "hache", "axe", "houe", "hoe", "cisaille", "shears"],
    "Efficacité V": ["pioche", "pickaxe", "pelle", "shovel", "hache", "axe", "houe", "hoe", "cisaille", "shears"],
    "Empalement V": ["trident"],
    "Épines III": ["casque", "plastron", "jambière", "botte"],
    "Flamme I": ["arc", "bow"],
    "Fléau des arthropodes V": ["épée", "epee", "hache", "axe"],
    "Fortune III": ["pioche", "pickaxe", "pelle", "shovel", "hache", "axe", "houe", "hoe"],
    "Frappe II": ["arc", "bow"],
    "Infinité I": ["arc", "bow"],
    "Loyauté III": ["trident"],
    "Multitir I": ["arbalète", "arbalete", "crossbow"],
    "Perforation IV": ["arbalète", "arbalete", "crossbow"],
    "Pieds légers III": ["jambière", "jambiere", "pant", "legging"],
    "Protection IV": ["casque", "plastron", "jambière", "botte"],
    "Protection contre le feu IV": ["casque", "plastron", "jambière", "botte"],
    "Protection contre les explosions IV": ["casque", "plastron", "jambière", "botte"],
    "Protection contre les projectiles IV": ["casque", "plastron", "jambière", "botte"],
    "Puissance V": ["arc", "bow"],
    "Solidité IV": ["tous"],
    "Recul II": ["épée", "epee", "sword"],
    "Semelles givrantes II": ["botte", "boots"],
    "Solidité III": ["tous"],
    "Tranchant IV": ["épée", "epee", "hache", "axe"],
    "Tranchant V": ["épée", "epee", "hache", "axe"],
    "Vitesse des âmes III": ["botte", "boots"]
};

function runEnchantConfigCalc() {
    const mult = parseFloat(document.getElementById('ench-mult').value) || 1;
    const xp10 = 25; // 1 niveau
    const xp20 = 98; // 2 niveaux
    const xp30 = 306; // 3 niveaux (ex: 30->27)
    
    document.getElementById('ench-price-1').value = fmt(xp10 * mult) + '€';
    document.getElementById('ench-price-2').value = fmt(xp20 * mult) + '€';
    document.getElementById('ench-price-3').value = fmt(xp30 * mult) + '€';
    
    saveData('enchant_mult', mult);
}

function loadEnchantConfig() {
    let mult = appData.enchant_mult;
    if (typeof mult !== 'number') mult = 1;
    if(document.getElementById('ench-mult')) {
        document.getElementById('ench-mult').value = mult;
        runEnchantConfigCalc();
    }
}

function renderEnchantCheckboxes(itemName = '') {
    const container = document.getElementById('ench-checkboxes');
    if (!container) return;
    
    let html = '';
    const itemLower = itemName.toLowerCase();
    
    // Récupérer les livres depuis le catalogue Vente
    const allItems = loadData('vente');
    const enchantList = allItems
        .filter(item => item.category === '✨ Livres')
        .map(item => ({
            name: item.name.replace('Livre : ', '').replace('Livre: ', '').trim(),
            price: item.price
        }));
    
    enchantList.forEach((enc, index) => {
        let allowed = true;
        if (itemName !== '') {
            const mappings = ENCHANT_MAPPING[enc.name] || [];
            if (!mappings.includes("tous")) {
                allowed = mappings.some(word => itemLower.includes(word));
            }
        }
        
        if (allowed) {
            html += `
            <label class="enchant-checkbox-label">
                <input type="checkbox" id="chk-enc-${index}" data-price="${enc.price}" data-name="${enc.name}" onchange="calcEnchantedStuff()">
                <span class="enchant-name">${enc.name} <span class="enchant-price">(+${enc.price}€)</span></span>
            </label>
            `;
        }
    });
    
    if (html === '') {
        html = '<div style="color:var(--text-muted);font-style:italic">Aucun enchantement spécifique trouvé.</div>';
    }
    container.innerHTML = html;
}

function onEnchantBaseItemChange() {
    const input = document.getElementById('ench-base-item-input');
    const val = input ? input.value : '';
    const items = loadData('vente');
    
    let basePrice = 0;
    const matches = items.filter(i => i.name === val);
    if (matches.length > 0) {
        basePrice = matches[0].price;
    }
    
    document.getElementById('ench-base-price').value = basePrice;
    
    // Updates checkboxes specific to the item type
    renderEnchantCheckboxes(val);
    
    calcEnchantedStuff();
}

function populateEnchantItems() {
    const datalist = document.getElementById('ench-base-item-list');
    if (!datalist) return;
    const items = loadData('vente');
    
    const validItems = items.filter(i => {
        const cat = (i.category || '').toLowerCase();
        const name = (i.name || '').toLowerCase();
        return cat.includes('armure') || cat.includes('outil') || name.includes('canne');
    });

    const uniqueNames = [...new Set(validItems.map(i => i.name))];
    datalist.innerHTML = uniqueNames.map(name => `<option value="${escHtml(name)}">`).join('');
    
    onEnchantBaseItemChange();
}

function calcEnchantedStuff() {
    const input = document.getElementById('ench-base-item-input');
    const baseName = input ? input.value : '';
    const basePrice = parseFloat(document.getElementById('ench-base-price').value) || 0;
    const margePct = parseFloat(document.getElementById('ench-marge').value) || 0;
    
    let enchantsPrice = 0;
    let selectedEnchants = [];

    document.querySelectorAll('#ench-checkboxes input[type="checkbox"]').forEach(chk => {
        if (chk.checked) {
            enchantsPrice += parseFloat(chk.dataset.price) || 0;
            selectedEnchants.push(chk.dataset.name);
        }
    });

    const subTotal = basePrice + enchantsPrice;
    const total = subTotal * (1 + margePct / 100);
    const finalMarge = total - subTotal;

    let sub = '';
    if (baseName !== '') {
        sub = `[Base: ${fmt(basePrice)}€] + [Enchantements: ${fmt(enchantsPrice)}€]`;
        if (margePct > 0) sub += ` + [Marge ${margePct}%: ${fmt(finalMarge)}€]`;
        sub += ` = <strong style="color:var(--text-main)">${fmt(total)}€</strong>`;
        if (selectedEnchants.length > 0) {
            sub += `<br><span style="color:var(--gold);font-style:normal;font-size:0.8rem;margin-top:4px;display:block">${selectedEnchants.join(' • ')}</span>`;
        }
    } else {
        sub = "Sélectionnez ou tapez un item de base.";
    }

    document.getElementById('ench-total-value').innerHTML = `${fmt(total)}<span class="unit">€</span>`;
    document.getElementById('ench-total-sub').innerHTML = sub;
    document.getElementById('ench-copy-val').dataset.value = fmt(total);
}

// ========================
// INIT
// ========================


function initAppListeners() {
    initTheme();
    initParticles();
    
    // Nav
    document.querySelectorAll('.nav-item').forEach(n => {
        n.addEventListener('click', () => {
            if (n.id === 'nav-logout') return;
            switchTab(n.dataset.tab);
        });
    });
    
    // Theme toggle (opens panel)
    document.getElementById('theme-toggle')?.addEventListener('click', toggleThemePanel);
    
    // Close theme panel on outside click
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('theme-selector-panel');
        const toggle = document.getElementById('theme-toggle');
        if (panel && panel.classList.contains('active') && !panel.contains(e.target) && !toggle.contains(e.target)) {
            panel.classList.remove('active');
        }
    });
    
    // Calculator & Forge inputs
    ['calc-unit', 'calc-qty', 'calc-budget'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.addEventListener('input', runCalc); el.addEventListener('change', runCalc); }
    });
    ['xp-niv','xp-mult','xp-mat','xp-anvil-mult','xp-marge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.addEventListener('input', calcXP); el.addEventListener('change', calcXP); }
    });
    
    // Copy buttons
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetBtn = btn;
            const val = targetBtn.dataset.value || targetBtn.closest('.result-box')?.querySelector('[data-value]')?.dataset.value;
            if (val) copyValue(val);
        });
    });
    
    // Modals & Keyboard
    document.getElementById('note-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'note-modal') closeNoteModal();
    });
    document.getElementById('vente-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'vente-modal') closeVenteModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNoteModal(); closeVenteModal();
            const themePanel = document.getElementById('theme-selector-panel');
            if (themePanel) themePanel.classList.remove('active');
        }
    });
    
    buildVenteEmojiPicker();
    document.addEventListener('click', closeEmojiPickerOnClickOutside);
    
    // Scroll wheel on number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('wheel', (e) => {
            if (input.readOnly) return;
            e.preventDefault();
            const step = 1;
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);
            let val = parseFloat(input.value) || 0;
            if (e.deltaY < 0) val += step;
            else val -= step;
            val = Math.round(val * 1000) / 1000;
            if (!isNaN(min) && val < min) val = min;
            if (!isNaN(max) && val > max) val = max;
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    // Listeners spéciaux pour les prix de cuisson
    ['or', 'fer', 'cuivre'].forEach(mat => {
        const input = document.getElementById(`smelt-price-${mat}`);
        if (input) {
            input.addEventListener('input', (e) => {
                const matName = mat.charAt(0).toUpperCase() + mat.slice(1);
                updateSmeltPrice(matName, e.target.value);
            });
        }
    });
}

function finishAppBoot() {
    document.getElementById('auth-overlay').classList.remove('active');
    document.getElementById('app-wrapper').style.display = 'block';
    
    // Role-based visibility
    const forgeTab = document.querySelector('.nav-item[data-tab="forge"]');
    const enchantTab = document.querySelector('.nav-item[data-tab="enchantement"]');
    const adminTab = document.querySelector('.nav-item[data-tab="admin"]');
    
    // Default hiding before checks
    if(forgeTab) forgeTab.classList.add('hidden-tab');
    if(enchantTab) enchantTab.classList.add('hidden-tab');
    if(adminTab) adminTab.style.display = 'none';
    
    if (currentPseudo === 'Zaès') {
        if(forgeTab) forgeTab.classList.remove('hidden-tab');
        if(enchantTab) enchantTab.classList.remove('hidden-tab');
        if(adminTab) adminTab.style.display = 'flex';
        
        // Show/Hide impersonation banner
        const banner = document.getElementById('impersonation-banner');
        if (impersonateUid) {
            banner.style.display = 'flex';
            document.getElementById('impersonated-user-name').textContent = currentImpersonatedPseudo;
        } else {
            banner.style.display = 'none';
        }
        
        if (!impersonateUid) switchTab('calc'); 
    } else if (currentRole === 'enchant') {
        if(enchantTab) enchantTab.classList.remove('hidden-tab');
        switchTab('enchantement');
    } else if (currentRole === 'forge') {
        if(forgeTab) forgeTab.classList.remove('hidden-tab');
        if(enchantTab) enchantTab.classList.remove('hidden-tab'); // Forgerons can now see Enchantments
        switchTab('forge');
    } else {
        switchTab('calc');
    }

    calcXP();
    calcSmelt();
    renderNotes();
    renderVente();
    populateCalcCategories();
    populateMaterialSelects();
    populateXpItems();
    calcAnvilWear();
    loadEnchantConfig();
    renderEnchantCheckboxes();
    populateEnchantItems();
    
    // Initialiser les prix de cuisson dans l'UI
    updateSmeltPricesUI();
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

// ========================
// AUTHENTICATION LOGIC
// ========================
function switchAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById('login-box').classList.add('hidden');
        document.getElementById('register-box').classList.remove('hidden');
    } else {
        document.getElementById('register-box').classList.add('hidden');
        document.getElementById('login-box').classList.remove('hidden');
    }
}

function selectRole(role) {
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
    document.querySelector(`.role-option[data-role="${role}"]`).classList.add('active');
    document.getElementById('register-role').value = role;
}

function handleLogin() {
    console.log("handleLogin called");
    const pseudo = document.getElementById('login-pseudo').value.trim();
    const pin = document.getElementById('login-pin').value;
    if (!pseudo || pin.length !== 4) { showToast("Veuillez entrer votre Pseudo et PIN (4 chiffres)", "⚠️"); return; }
    
    document.getElementById('btn-login').textContent = "Connexion...";
    document.getElementById('btn-login').disabled = true;
    
    // Email sans accents pour Firebase
    const cleanPseudo = pseudo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const email = cleanPseudo + "@agoralis.local";
    const password = pin + '00';
    
    auth.signInWithEmailAndPassword(email, password)
    .then(() => {
        // Le log sera fait dans onAuthStateChanged pour être sûr
    })
    .catch(error => {
        console.error("Login Error:", error);
        alert("Erreur de connexion : " + error.message);
        showToast("Erreur: Pseudo ou PIN incorrect", "❌");
        document.getElementById('btn-login').textContent = "S'authentifier";
        document.getElementById('btn-login').disabled = false;
    });
}

function handleRegister() {
    console.log("handleRegister called");
    const pseudo = document.getElementById('register-pseudo').value.trim();
    const pin = document.getElementById('register-pin').value;
    const pinConf = document.getElementById('register-pin-confirm').value;
    const role = document.getElementById('register-role').value;
    
    if (!pseudo || pin.length !== 4) { showToast("Veuillez remplir Pseudo et PIN (4 chiffres)", "⚠️"); return; }
    if (pin !== pinConf) { showToast("Les PINs ne correspondent pas", "⚠️"); return; }
    if (!role) { showToast("Veuillez choisir une spécialisation", "⚠️"); return; }
    if (!pseudo.match(/^[a-zA-ZÀ-ÿ0-9_-]{3,16}$/)) { showToast("Pseudo invalide (3-16 caractères, lettres, chiffres)", "⚠️"); return; }

    document.getElementById('btn-register').textContent = "Inscription...";
    document.getElementById('btn-register').disabled = true;

    // Email sans accents pour Firebase
    const cleanPseudo = pseudo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const email = cleanPseudo + "@agoralis.local";
    const password = pin + '00';
    
    auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
        return db.collection('users').doc(cred.user.uid).set({
            pseudo: pseudo,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    })
    .catch(error => {
        console.error("Register Error:", error);
        alert("Erreur d'inscription : " + error.message);
        let msg = "Erreur d'inscription";
        if (error.code === 'auth/email-already-in-use') msg = "Ce pseudo est déjà utilisé";
        showToast(msg, "❌");
        document.getElementById('btn-register').textContent = "S'inscrire";
        document.getElementById('btn-register').disabled = false;
    });
}

function handleLogout() {
    auth.signOut();
}

// ========================
// ADMIN LOGIC
// ========================

function loadAdminUsers() {
    console.log("Loading Admin Users. Current Pseudo:", currentPseudo);
    // On passe outre la vérification stricte ici car l'onglet n'est déjà visible qu'à Zaès
    // Cela évite tout problème d'encodage (è vs è) sur cette fonction critique.
    const listEl = document.getElementById('admin-user-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">⏳ Chargement des joueurs...</td></tr>';
    
    // On retire le orderBy temporairement pour s'assurer que ce n'est pas un problème d'index Firestore
    db.collection('users').get().then(snap => {
        listEl.innerHTML = '';
        if (snap.empty) {
            listEl.innerHTML = '<tr><td colspan="4" style="text-align:center">Aucun utilisateur trouvé.</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const u = doc.data();
            const uid = doc.id;
            const tr = document.createElement('tr');
            
            const isSelf = uid === currentUser.uid;
            
            tr.innerHTML = `
                <td style="font-weight:600; color:var(--gold)">${u.pseudo}${isSelf ? ' <small>(Vous)</small>' : ''}</td>
                <td>${u.role === 'enchant' ? '✨ Enchanteur' : '⚡ Forgeron'}</td>
                <td style="font-family:monospace; opacity:0.6; font-size:0.75rem">${uid}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-icon btn-gold" onclick="impersonateUser('${uid}', '${u.pseudo}')" title="Voir à la place de ce joueur">👁️</button>
                        ${!isSelf ? `<button class="btn btn-icon" style="background:var(--accent-red); color:white; border:none" onclick="deleteUser('${uid}', '${u.pseudo}')" title="Supprimer ce compte">🗑️</button>` : ''}
                    </div>
                </td>
            `;
            listEl.appendChild(tr);
        });
    }).catch(err => {
        console.error("Admin Load Error:", err);
        alert("Erreur base de données : " + err.message);
        showToast("Erreur lors du chargement des utilisateurs", "❌");
    });
}

function deleteUser(uid, pseudo) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${pseudo} ? Cette action supprimera également toutes ses données.`)) return;
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');
    
    // Supprimer les données puis le profil
    db.collection('users').doc(uid).collection('data').doc('store').delete().then(() => {
        return db.collection('users').doc(uid).delete();
    }).then(() => {
        addActivityLog('Suppression Joueur', pseudo);
        showToast(`Joueur ${pseudo} supprimé`, "✅");
        loadAdminUsers();
    }).catch(err => {
        console.error(err);
        showToast("Erreur lors de la suppression", "❌");
    }).finally(() => {
        if (overlay) overlay.classList.remove('active');
    });
}

function impersonateUser(uid, pseudo) {
    if (uid === impersonateUid) return;
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');
    
    impersonateUid = uid;
    currentImpersonatedPseudo = pseudo;
    
    // Charger les données de la cible
    db.collection('users').doc(uid).collection('data').doc('store').get().then(storeDoc => {
        if (storeDoc.exists) {
            const data = storeDoc.data();
            appData.notes = data.notes || [];
            appData.vente = data.vente || [];
            appData.enchant_mult = data.enchant_mult || 1;
            appData.smelt_prices = data.smelt_prices || { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
        } else {
            appData.notes = [];
            appData.vente = [];
            appData.enchant_mult = 1;
            appData.smelt_prices = { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
            initVenteDataIfEmpty();
        }
        
        // Rafraîchir l'interface
        finishAppBoot();
        updateSmeltPricesUI();
        addActivityLog('Impersonnalisation', `Regarde le compte de ${pseudo}`);
        showToast(`Impersonnalisation : ${pseudo}`, "👁️");
    }).catch(err => {
        console.error(err);
        showToast("Erreur lors du chargement des données", "❌");
        stopImpersonating();
    }).finally(() => {
        if (overlay) overlay.classList.remove('active');
    });
}

function stopImpersonating() {
    impersonateUid = null;
    currentImpersonatedPseudo = null;
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');
    
    // Recharger mes propres données
    db.collection('users').doc(currentUser.uid).collection('data').doc('store').get().then(storeDoc => {
        if (storeDoc.exists) {
            const data = storeDoc.data();
            appData.notes = data.notes || [];
            appData.vente = data.vente || [];
            appData.enchant_mult = data.enchant_mult || 1;
            appData.smelt_prices = data.smelt_prices || { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
        } else {
            initVenteDataIfEmpty();
        }
        finishAppBoot();
        updateSmeltPricesUI();
        addActivityLog('Fin Impersonnalisation', "Retour sur son propre compte");
        showToast("Retour sur votre compte", "✅");
    }).catch(err => {
        console.error(err);
    }).finally(() => {
        if (overlay) overlay.classList.remove('active');
    });
}

// --- NOUVELLES FONCTIONS LOGGING ---

function addActivityLog(action, details) {
    if (!db || !currentUser || !currentPseudo) return;
    
    // On ne loggue pas si on est en train d'impersonner quelqu'un (trop bruyant et fausse les logs)
    // Sauf si c'est l'action d'impersonnalisation elle-même (qui est gérée dans les fonctions dédiées)
    
    db.collection('activity_logs').add({
        pseudo: currentPseudo,
        action: action,
        details: details || "",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error("Error adding log:", err));
}

function loadActivityLogs() {
    const listEl = document.getElementById('admin-activity-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">⏳ Chargement de l\'historique...</td></tr>';
    
    db.collection('activity_logs')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
        .then(snap => {
            listEl.innerHTML = '';
            if (snap.empty) {
                listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; opacity: 0.5;">Aucune activité enregistrée.</td></tr>';
                return;
            }
            
            snap.forEach(doc => {
                const log = doc.data();
                const tr = document.createElement('tr');
                
                let dateStr = "En cours...";
                if (log.timestamp) {
                    dateStr = log.timestamp.toDate().toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                }
                
                tr.innerHTML = `
                    <td style="font-size:0.8rem; opacity:0.7">${dateStr}</td>
                    <td style="font-weight:600; color:var(--gold)">${log.pseudo}</td>
                    <td><span class="tag" style="background:var(--bg-body); border:1px solid var(--border); font-size:0.7rem">${log.action}</span></td>
                    <td style="font-size:0.9rem">${log.details}</td>
                `;
                listEl.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Error loading logs:", err);
            listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--accent-red)">Erreur de chargement des logs.</td></tr>';
        });
}

// Initialise Firebase Auth Listener
document.addEventListener('DOMContentLoaded', () => {
    try {
        initAppListeners();
        
        // Wait for Firebase to determine auth state
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                const overlay = document.getElementById('loading-overlay');
                if (overlay) overlay.classList.add('active');
                
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        currentRole = doc.data().role;
                        const pseudo = doc.data().pseudo;
                        currentPseudo = pseudo;
                        document.getElementById('logged-in-user').textContent = pseudo;
                        
                        db.collection('users').doc(user.uid).collection('data').doc('store').get().then(storeDoc => {
                            if (storeDoc.exists) {
                                const data = storeDoc.data();
                                appData.notes = data.notes || [];
                                appData.vente = data.vente || [];
                                appData.enchant_mult = data.enchant_mult || 1;
                                appData.smelt_prices = data.smelt_prices || { Or: 2.12, Fer: 1.79, Cuivre: 1.30 };
                            } else {
                                // Default catalogue auto-generation on first login
                                appData.vente = [];
                                initVenteDataIfEmpty();
                            }
                            // Si c'est l'admin ou si le catalogue est vide, on initialise/vérifie les données
                            if (appData.vente.length === 0 || currentPseudo === 'Zaès') {
                                initVenteDataIfEmpty();
                            }
                            addActivityLog('Connexion', 'Session démarrée');
                            finishAppBoot();
                        }).catch(e => {
                            console.error(e);
                            showToast("Erreur de lecture des données de l'utilisateur", "❌");
                        });
                    } else {
                        console.warn("User document not found for UID:", user.uid);
                        showToast("Profil utilisateur introuvable. Déconnexion...", "⚠️");
                        auth.signOut();
                    }
                }).catch(e => {
                    console.error("Firestore get user error:", e);
                    showToast("Erreur de récupération du rôle", "❌");
                });
            } else {
                // Logged out state
                currentUser = null;
                currentRole = null;
                document.getElementById('app-wrapper').style.display = 'none';
                document.getElementById('auth-overlay').classList.add('active');
                document.getElementById('btn-login').textContent = "S'authentifier";
                document.getElementById('btn-register').textContent = "S'inscrire";
                document.getElementById('btn-login').disabled = false;
                document.getElementById('btn-register').disabled = false;
                document.body.setAttribute('data-tab', 'auth');
            }
        });

    } catch(e) {
        showToast("Erreur critique: " + e.message, "❌");
        console.error(e);
    }
});
