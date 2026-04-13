let tenderData = {}
let selectedFile = null

window.downloadATC = async function (url, filename) {
    try {
        // Fetch the file as a blob to force the browser to trigger a download
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'ATC_Document.pdf';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            window.URL.revokeObjectURL(objectUrl);
            document.body.removeChild(a);
        }, 1000);
    } catch (e) {
        console.error("Forced download failed:", e);
        // Fallback to opening in a new tab if blob fetch fails
        window.open(url, '_blank');
    }
};

// Get DOM elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileNameDiv = document.getElementById('fileName');
const extractBtn = document.getElementById('extractBtn');

// File input change handler
fileInput.addEventListener('change', function (e) {
    handleFileSelect(e.target.files[0]);
});

// Drag and drop handlers
uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});

// Click to upload
uploadArea.addEventListener('click', function () {
    fileInput.click();
});

function handleFileSelect(file) {
    if (!file) return;

    // Check if it's a PDF
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        showError('Please select a valid PDF file');
        return;
    }

    selectedFile = file;
    fileNameDiv.textContent = `✅ Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    fileNameDiv.style.display = 'block';
    fileNameDiv.style.background = '#e8f5e9';
    fileNameDiv.style.color = '#2e7d32';

    // Enable extract button
    extractBtn.disabled = false;
    extractBtn.style.opacity = '1';

    showSuccess(`File "${file.name}" uploaded successfully!`);
}

// Utility functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `❌ ${message}`;
    const card = document.querySelector('.card');
    card.insertAdjacentElement('afterend', errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
    return errorDiv;
}

// Initialize particles
function initParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 10 + 5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 10 + 10) + 's';
        p.style.animationDelay = Math.random() * 10 + 's';
        container.appendChild(p);
    }
}
initParticles();

// Document selection helpers
window.selectAllDocs = function () {
    document.querySelectorAll('.doc-checkbox').forEach(cb => cb.checked = true);
};
window.deselectAllDocs = function () {
    document.querySelectorAll('.doc-checkbox').forEach(cb => cb.checked = false);
};
window.selectBasicDocs = function () {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        const section = cb.getAttribute('data-section').toLowerCase();
        // Select if it is a basic/mandatory section
        cb.checked = (section.includes('basic') || section.includes('mandatory'));
    });
};

function showValidationError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.borderColor = '#f44336';
        el.style.backgroundColor = 'rgba(239,68,68,0.1)';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Reset style after 3 seconds
        setTimeout(() => {
            el.style.borderColor = '';
            el.style.backgroundColor = '';
        }, 3000);
    }

    // Show non-blocking inline error (no alert popup)
    showError(message);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `✅ ${message}`;
    const card = document.querySelector('.card');
    card.insertAdjacentElement('afterend', successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0'

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (numAmount >= 10000000) {
        return `₹${(numAmount / 10000000).toFixed(2)} Crore`
    } else if (numAmount >= 100000) {
        return `₹${(numAmount / 100000).toFixed(2)} Lakh`
    } else if (numAmount >= 1000) {
        return `₹${(numAmount / 1000).toFixed(2)} Thousand`
    }
    return `₹${numAmount.toLocaleString()}`
}

function formatDocumentName(doc) {
    let cleaned = doc.replace(/\(requested in atc\)/gi, '')
        .replace(/requested in atc/gi, '')
        .trim();

    let words = cleaned.split(' ');
    let formatted = words.map(word => {
        const lowerWords = ['of', 'in', 'the', 'and', 'for', 'to', 'by', 'with'];
        if (lowerWords.includes(word.toLowerCase())) {
            return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');

    return formatted;
}

// ============ ADD THIS FUNCTION HERE ============
// Toggle Q2 warning based on authorization status
function toggleAuthorizationStatus() {
    const hasAuth = document.getElementById('hasAuthorization');
    const q2Warning = document.getElementById('q2Warning');
    const checkBtn = document.getElementById('checkEligibilityBtn');

    if (hasAuth && hasAuth.value === 'Yes') {
        q2Warning.style.display = 'none';
        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.style.opacity = '1';
            checkBtn.style.cursor = 'pointer';
        }
    } else if (hasAuth && hasAuth.value === 'No') {
        q2Warning.style.display = 'block';
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.style.opacity = '0.5';
            checkBtn.style.cursor = 'not-allowed';
        }
    } else {
        q2Warning.style.display = 'none';
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.style.opacity = '0.5';
            checkBtn.style.cursor = 'not-allowed';
        }
    }
}
// ============ END OF ADDED FUNCTION ============

// Main extract function
async function extract() {
    showSuccess('Starting AI extraction pipeline...');
    console.log("extract() triggered!");
    console.log("extract() triggered!");
    if (!selectedFile) {
        showError('Please select a PDF file first');
        return;
    }

    const fd = new FormData();
    fd.append('file', selectedFile);

    showLoading(true);
    uploadArea.classList.add('processing');

    try {
        const res = await fetch('/extract', {
            method: 'POST',
            body: fd
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.detail || 'Failed to extract data');
        }

        tenderData = data.tender;

        // Try to download ATC document locally for viewing
        if (tenderData.atc_document_link) {
            try {
                const downloadRes = await fetch('/download_atc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: tenderData.atc_document_link })
                });
                const downData = await downloadRes.json();
                if (downData.success && downData.local_url) {
                    tenderData.local_atc_url = downData.local_url;
                    tenderData.atc_extension = downData.extension;
                }
            } catch (e) {
                console.error("Local ATC download failed:", e);
            }
        }

        console.log("=== EXTRACTED TENDER DATA ===");
        console.log("Classification Level:", tenderData.classification_level);
        console.log("Turnover (raw):", tenderData.turnover);
        console.log("Experience:", tenderData.experience);
        console.log("Past Performance:", tenderData.past_performance);
        console.log("==============================");

        // Check if it's Q1 tender
        if (tenderData.classification_level === 'Q1') {
            const q1Message = `
                    <div class="card" style="text-align: center; border: 1px solid rgba(244, 67, 54, 0.3); box-shadow: 0 0 30px rgba(244, 67, 54, 0.1);">
                        <div style="font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(244,67,54,0.4));">🚫</div>
                        <h2 style="color: #ff5252; margin-bottom: 15px; font-family: var(--font-head); font-size: 1.8rem;">Not Eligible for This Tender</h2>
                        <div style="background: rgba(244, 67, 54, 0.1); padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(244, 67, 54, 0.2); border-left: 4px solid #f44336;">
                            <p style="font-size: 1.05rem; color: #ff8a80; margin-bottom: 15px; line-height: 1.7;">
                                <strong style="color: #ff5252;">Q1 bidding is exclusive</strong>, making it restricted to the OEM only, often leading to lower participation or no bids if that specific manufacturer does not submit a proposal.
                            </p>
                            <p style="color: var(--text-dim); margin-top: 10px; line-height: 1.6;">
                                This tender is restricted to the Original Equipment Manufacturer (OEM) only. Regular companies are not eligible to participate.
                            </p>
                        </div>
                        <div style="margin-top: 25px;">
                            <button class="btn" onclick="location.reload()">📄 Upload Another Tender</button>
                        </div>
                    </div>
                `;

            document.getElementById('formContainer').innerHTML = q1Message;
            document.getElementById('formContainer').style.display = 'block';
            document.getElementById('resultContainer').style.display = 'none';
            showSuccess('Tender extracted - Q1 Special Tender Detected');
        } else {
            let message = `Tender data extracted successfully!`;
            if (tenderData.turnover) message += `\nTurnover Required: ${formatCurrency(tenderData.turnover)}`;
            if (tenderData.experience) message += `\nExperience Required: ${tenderData.experience} years`;
            if (tenderData.past_performance) message += `\nPast Performance Required: ${tenderData.past_performance}%`;
            if (tenderData.documents_by_section) {
                let docCount = 0;
                for (let sec in tenderData.documents_by_section) docCount += tenderData.documents_by_section[sec].length;
                message += `\nDocuments Required: ${docCount}`;
            }

            showSuccess(message);
            renderForm();
        }

    } catch (error) {
        console.error('Extract error:', error);
        showError('Error extracting data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function handleDocumentSelection() {
    const selectedDocs = document.querySelectorAll('.doc-checkbox:checked').length;
    const warning = document.getElementById('documentWarning');
    if (selectedDocs > 0 && warning) {
        warning.style.display = 'none';
    }
}

// Validate past performance input
function validatePerformance(input) {
    const errorEl = document.getElementById('perfError');
    const value = Number(input.value);

    if (input.value === "") {
        errorEl.style.display = 'none';
        return true;
    }

    if (value > 100) {
        errorEl.innerText = "❌ Value cannot be more than 100%";
        errorEl.style.display = 'block';
        return false;
    }

    if (value < 0) {
        errorEl.innerText = "❌ Value cannot be negative";
        errorEl.style.display = 'block';
        return false;
    }

    errorEl.style.display = 'none';
    return true;
}
// Update exemption info
function updateExemptionInfo() {
    // Deprecated logic. Now handled dynamically during renderForm via tenderData extraction.
}

// Select all documents
function selectAllDocuments() {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = true;
    });

    const warning = document.getElementById('documentWarning');
    if (warning) warning.style.display = 'none';  // ✅ FIX
}

// Deselect all documents
function deselectAllDocuments() {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = false;
    });

    const warning = document.getElementById('documentWarning');
    if (warning) warning.style.display = 'block';  // optional
}

// Render form
function renderForm() {
    // Check if it's Q1 tender
    if (tenderData.classification_level === 'Q1') {
        const q1Message = `
                <div class="card" style="text-align: center; border: 1px solid rgba(244, 67, 54, 0.3); box-shadow: 0 0 30px rgba(244, 67, 54, 0.1);">
                    <div style="font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(244,67,54,0.4));">🚫</div>
                    <h2 style="color: #ff5252; margin-bottom: 15px; font-family: var(--font-head); font-size: 1.8rem;">Not Eligible for This Tender</h2>
                    <div style="background: rgba(244, 67, 54, 0.1); padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(244, 67, 54, 0.2); border-left: 4px solid #f44336;">
                        <p style="font-size: 1.05rem; color: #ff8a80; margin-bottom: 15px; line-height: 1.7;">
                            <strong style="color: #ff5252;">Q1 bidding is exclusive</strong>, making it restricted to the OEM only, often leading to lower participation or no bids if that specific manufacturer does not submit a proposal.
                        </p>
                        <p style="color: var(--text-dim); margin-top: 10px; line-height: 1.6;">
                            This tender is restricted to the Original Equipment Manufacturer (OEM) only. Regular companies are not eligible to participate.
                        </p>
                    </div>
                    <div style="margin-top: 25px;">
                        <button class="btn" onclick="location.reload()">📄 Upload Another Tender</button>
                    </div>
                </div>
            `;

        document.getElementById('formContainer').innerHTML = q1Message;
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('resultContainer').style.display = 'none';
        return;
    }
    // For non-Q1 tenders, show the normal form
    let html = `
            <div class="card" style="margin-bottom: 30px;">
                <h2 style="font-family: var(--font-head); font-size: 1.8rem; margin-bottom: 20px; color: var(--primary); display: flex; align-items: center; gap: 12px;">
                    🏢 <span>Company Profile</span>
                </h2>
                <form id="companyForm">
        `;

    // Show classification info
    if (tenderData.classification_level) {
        let classificationInfo = '';
        let classificationColor = '';
        let classificationBg = '';

        if (tenderData.classification_level === 'Q2') {
            classificationInfo = '🔐 Q2 - Requires OEM Authorization';
            classificationColor = '#ff9800';
            classificationBg = '#fff3e0';
        } else if (tenderData.classification_level === 'Q3') {
            classificationInfo = '🟢 Q3 - No Restrictions';
            classificationColor = '#4caf50';
            classificationBg = '#e8f5e9';
        } else if (tenderData.classification_level === 'Q4') {
            classificationInfo = '🟢 Q4 - No Restrictions';
            classificationColor = '#4caf50';
            classificationBg = '#e8f5e9';
        } else {
            classificationInfo = '🟢 Universal Tender - No Restrictions';
            classificationColor = '#4caf50';
            classificationBg = '#e8f5e9';
        }

        html += `
                <div class="form-group">
                    <label>📋 Tender Classification</label>
                    <div style="background: ${classificationBg}; padding: 15px; border-radius: 10px; border-left: 4px solid ${classificationColor};">
                        <strong style="color: ${classificationColor};">${classificationInfo}</strong>
                    </div>
                </div>
            `;
    }

    // Categorize sections for better UX
    html += `
            <div id="section-fundamental" class="card" style="border-top: 4px solid var(--primary);">
                <h3 style="font-family: var(--font-head); font-size: 1.4rem; margin-bottom: 25px; color: var(--primary);">
                    🛡️ Fundamental Eligibility
                </h3>
            `;

    // Exemptions
    const mseAllowed = tenderData.mse_status === 'Yes';
    const startupAllowed = tenderData.startup_status === 'Yes';

    const mseBadge = mseAllowed
        ? '✅ <span style="color:var(--success); font-weight:bold;">ALLOWED</span>'
        : '❌ <span style="color:var(--error);">NOT ALLOWED</span>';

    const startupBadge = startupAllowed
        ? '✅ <span style="color:var(--success); font-weight:bold;">ALLOWED</span>'
        : '❌ <span style="color:var(--error);">NOT ALLOWED</span>';

    html += `
            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:18px; border-radius:16px; margin-bottom:15px; border: 1px solid var(--glass-border);">
                <div>
                    <label style="margin:0; font-size: 1rem;">MSE Status</label>
                    <small style="color:var(--text-dim); font-size: 0.8rem;">Does this tender allow MSE exemptions?</small>
                </div>
                <div style="font-family: var(--font-head); font-weight: 700;">${mseBadge}</div>
                <input type="hidden" id="mse" value="${tenderData.mse_status}">
            </div>
            
            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:18px; border-radius:16px; margin-bottom:20px; border: 1px solid var(--glass-border);">
                <div>
                    <label style="margin:0; font-size: 1rem;">Startup Status</label>
                    <small style="color:var(--text-dim); font-size: 0.8rem;">Does this tender allow Startup exemptions?</small>
                </div>
                <div style="font-family: var(--font-head); font-weight: 700;">${startupBadge}</div>
                <input type="hidden" id="startup" value="${tenderData.startup_status}">
            </div>
            `;

    if (mseAllowed || startupAllowed) {
        html += `
                <div id="exemptionInfo" style="background: rgba(16, 185, 129, 0.05); padding: 18px; border-radius: 16px; margin: 20px 0; border: 1px dashed var(--success);">
                    <strong style="color: var(--success); font-size: 0.95rem;">✨ EXEMPTION BENEFITS ACTIVE:</strong>
                    <ul style="margin: 12px 0 0 20px; color:var(--text-main); font-size: 0.85rem; opacity: 0.8;">
                        <li style="margin-bottom:4px;">Turnover requirement may be waived</li>
                        <li style="margin-bottom:4px;">Experience requirement may be waived</li>
                        <li>Must still submit all other mandatory documents</li>
                    </ul>
                </div>`;
    }

    // Keyword Analysis Panel
    if (tenderData.keyword_checks && Object.keys(tenderData.keyword_checks).length > 0) {
        html += `
                <div class="form-group">
                    <label>🔍 Tender Keyword Analysis</label>
                    <div style="background: #f8f9ff; padding: 15px; border-radius: 10px; border: 1px solid #e0e0e0;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 8px;">
            `;
        for (const [keyword, found] of Object.entries(tenderData.keyword_checks)) {
            const color = found ? '#2e7d32' : '#c62828';
            const bg = found ? '#e8f5e9' : '#ffebee';
            const border = found ? '#4caf50' : '#f44336';
            const icon = found ? '✅' : '❌';
            const label = found ? 'Yes' : 'No';
            html += `
                    <div style="display:flex; justify-content:space-between; align-items:center;
                                padding:8px 12px; background:${bg}; border-radius:6px;
                                border-left:3px solid ${border};">
                        <span style="font-size:13px; color:#333; font-weight:500;">${keyword}</span>
                        <span style="font-size:13px; font-weight:bold; color:${color}; white-space:nowrap; margin-left:8px;">${icon} ${label}</span>
                    </div>`;
        }
        html += `
                        </div>
                    </div>
                </div>
            `;
    }

    // For Q2 tenders - Simple Yes/No question
    if (tenderData.classification_level === 'Q2') {
        html += `
                <div id="q2Section" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px; border-radius: 16px; border: 1px solid rgba(255, 152, 0, 0.4); border-left: 5px solid #ff9800; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(255, 152, 0, 0.15);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
                        <span style="font-size: 1.8rem; filter: drop-shadow(0 0 6px rgba(255,152,0,0.5));">🔐</span>
                        <h3 style="color: #ffb74d; margin: 0; font-size: 1.3rem; font-weight: 700; letter-spacing: 0.5px;">OEM Authorization Required</h3>
                    </div>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0 0 18px 0; line-height: 1.5;">
                        This is a <strong style="color: #ffb74d;">Q2 (Quadrant 2)</strong> tender. Only authorized resellers with valid OEM authorization can participate.
                    </p>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="color: #fff; font-size: 1rem; font-weight: 600; margin-bottom: 10px; display: block;">Do you have an OEM Authorization? <span style="color: #ff5252;">*</span></label>
                        <select id="hasAuthorization" onchange="toggleAuthorizationStatus()" style="width: 100%; padding: 14px 16px; border: 2px solid rgba(255, 152, 0, 0.5); border-radius: 10px; background: rgba(255,255,255,0.08); color: #fff; font-size: 1rem; font-family: inherit; cursor: pointer; appearance: auto; transition: border-color 0.3s, box-shadow 0.3s; outline: none;">
                            <option value="" style="background: #1a1a2e; color: #ccc;">-- Select an option --</option>
                            <option value="Yes" style="background: #1a1a2e; color: #4caf50;">✅ Yes, I have OEM Authorization</option>
                            <option value="No" style="background: #1a1a2e; color: #f44336;">❌ No, I don't have OEM Authorization</option>
                        </select>
                    </div>
                    <div id="q2Warning" style="display: none; margin-top: 18px; padding: 18px; background: rgba(244, 67, 54, 0.12); border-radius: 12px; color: #ff8a80; border: 1px solid rgba(244, 67, 54, 0.3); border-left: 4px solid #f44336;">
                        <strong style="color: #ff5252; font-size: 1.05rem;">⚠️ Not Eligible for This Tender</strong><br><br>
                        <span style="color: rgba(255,255,255,0.75); line-height: 1.6;">Q2 tenders are designed specifically for branded products where the Original Equipment Manufacturer (OEM) controls the catalog, and only authorized resellers are allowed to participate.</span>
                    </div>
                </div>
            `;
    }

    // Close Fundamental Section
    html += `</div>`;

    // FINANCIAL SECTION
    html += `
            <div id="section-financial" class="card" style="border-top: 4px solid var(--secondary);">
                <h3 style="font-family: var(--font-head); font-size: 1.4rem; margin-bottom: 25px; color: var(--secondary);">
                    💰 Financial Requirements
                </h3>
            `;

    let hasFinancial = false;

    // Turnover
    if (tenderData.turnover !== undefined && tenderData.turnover !== null && tenderData.turnover > 0) {
        hasFinancial = true;
        const requiredTurnoverFormatted = formatCurrency(tenderData.turnover);
        let exemptionText = '';
        if (tenderData.mse_status === "Yes" && tenderData.startup_status === "Yes") {
            exemptionText = '<br><span style="color:var(--success);">✓ Exemption possible for MSE & Startup</span>';
        } else if (tenderData.mse_status === "Yes") {
            exemptionText = '<br><span style="color:var(--success);">✓ Exemption possible for MSE only</span>';
        } else if (tenderData.startup_status === "Yes") {
            exemptionText = '<br><span style="color:var(--success);">✓ Exemption possible for Startup only</span>';
        } else {
            exemptionText = '<br><span style="color:var(--error);">❌ Exemption NOT allowed for this tender</span>';
        }

        html += `
                <div class="form-group">
                    <label>Annual Turnover (₹) ${(tenderData.mse_status === "No" && tenderData.startup_status === "No") ? '<span style="color:red;">*</span>' : ''}</label>
                    <input type="number" id="turnover" placeholder="Enter turnover in rupees">
                    <small style="color:var(--text-dim); margin-top:5px; display:block;">
                        Required: ${requiredTurnoverFormatted}
                        ${exemptionText}
                    </small>
                </div>
                `;
    }

    // OEM Turnover
    if (tenderData.oem_turnover !== undefined && tenderData.oem_turnover !== null && tenderData.oem_turnover > 0) {
        hasFinancial = true;
        const requiredOEM = formatCurrency(tenderData.oem_turnover);
        html += `
                <div class="form-group">
                    <label>OEM Turnover (₹)</label>
                    <input type="number" id="oem" placeholder="Enter OEM turnover">
                    <small style="color:var(--text-dim); margin-top:5px; display:block;">Required: ${requiredOEM}</small>
                </div>
                `;
    }

    if (!hasFinancial) {
        html += `<div style="text-align:center; padding:20px; color:var(--text-dim); font-style:italic;">No financial requirements found for this tender.</div>`;
    }

    html += `</div>`; // Close Financial Section

    // EXPERIENCE & PERFORMANCE SECTION
    html += `
            <div id="section-experience" class="card" style="border-top: 4px solid var(--accent);">
                <h3 style="font-family: var(--font-head); font-size: 1.4rem; margin-bottom: 25px; color: var(--accent);">
                    📈 Experience & Performance
                </h3>
            `;

    let hasExp = false;

    // Experience
    if (tenderData.experience !== undefined && tenderData.experience !== null && tenderData.experience > 0) {
        hasExp = true;
        let exemptionTextExp = '';
        if (tenderData.mse_status === "Yes" && tenderData.startup_status === "Yes") {
            exemptionTextExp = '<br><span style="color:var(--success);">✓ Exemption possible for MSE & Startup</span>';
        } else if (tenderData.mse_status === "Yes") {
            exemptionTextExp = '<br><span style="color:var(--success);">✓ Exemption possible for MSE only</span>';
        } else if (tenderData.startup_status === "Yes") {
            exemptionTextExp = '<br><span style="color:var(--success);">✓ Exemption possible for Startup only</span>';
        } else {
            exemptionTextExp = '<br><span style="color:var(--error);">❌ Exemption NOT allowed</span>';
        }

        html += `
                <div class="form-group">
                    <label>Years of Experience ${(tenderData.mse_status === "No" && tenderData.startup_status === "No") ? '<span style="color:red;">*</span>' : ''}</label>
                    <input type="number" id="exp" placeholder="Enter years of experience">
                    <small style="color:var(--text-dim); margin-top:5px; display:block;">
                        Required: ${tenderData.experience} years
                        ${exemptionTextExp}
                    </small>
                </div>
                `;
    }

    // Past Performance
    if (tenderData.past_performance !== undefined && tenderData.past_performance !== null && tenderData.past_performance > 0) {
        hasExp = true;
        html += `
                <div class="form-group">
                    <label>Past Performance Score (%)</label>
                    <input type="number" id="perf" placeholder="Enter past performance score" min="0" max="100" oninput="validatePerformance(this)">
                    <small style="color:var(--text-dim); margin-top:5px; display:block;">Required: ${tenderData.past_performance}%</small>
                    <small id="perfError" style="color:red; display:none;"></small>
                </div>
                `;
    }

    if (!hasExp) {
        html += `<div style="text-align:center; padding:20px; color:var(--text-dim); font-style:italic;">No experience requirements found for this tender.</div>`;
    }

    html += `</div></div>`; // Close Experience Card and Profile Form

    // ===============================
    // 📂 CARD 2: DOCUMENT CHECKLIST
    // ===============================
    html += `
            <div class="card" style="margin-top: 40px; border-top: 5px solid var(--warning);">
                <h2 style="font-family: var(--font-head); font-size: 1.6rem; margin-bottom: 30px; color: var(--warning); display: flex; align-items: center; gap: 12px;">
                    📂 <span>Required Documents</span>
                </h2>
                <div style="color: var(--text-dim); margin-bottom: 25px; font-size: 1rem; opacity: 0.8;">
                    Select all the documents you have currently uploaded or available in your profile.
                </div>
            `;


    // ATC Document Panel
    if (tenderData.atc_document_link) {
        const documentUrl = tenderData.local_atc_url || tenderData.atc_document_link; // Fallback to external
        const ext = tenderData.atc_extension ? tenderData.atc_extension.toLowerCase() : '';
        const isPdf = (!ext) || ext === '.pdf';

        let viewButtonHtml = '';
        if (isPdf) {
            viewButtonHtml = `
                            <a href="${documentUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1rem; box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3); transition: background 0.2s;">
                                📄 View Document In Tab
                            </a>`;
        } else {
            viewButtonHtml = `
                            <div style="padding: 10px 15px; background: #fff9c4; border-radius: 6px; border: 1px solid #fbc02d; color: #f57f17; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                                ⚠️ Browser viewing not supported for ${ext.toUpperCase() || 'this'} files. Please download instead.
                            </div>`;
        }

        // Collect docs from ALL sections (atc, or any AI-named section from ATC extraction)
        // The AI categories docs into dynamic section names — collect them all for the ATC panel
        let allAtcDocs = [];
        const docsBySection = tenderData.documents_by_section || {};

        // Primary: the 'atc' key
        if (docsBySection.atc && docsBySection.atc.length > 0) {
            allAtcDocs = allAtcDocs.concat(docsBySection.atc);
        }

        // Secondary: any other section keys that are NOT 'main', 'basic', 'financial', 'technical', 'certificates', 'additional'
        // These are likely AI-generated section names from the ATC document's own structure
        const standardSections = new Set(['main', 'basic', 'financial', 'technical', 'certificates', 'additional', 'atc']);
        for (const [key, docs] of Object.entries(docsBySection)) {
            if (!standardSections.has(key.toLowerCase()) && docs && docs.length > 0) {
                allAtcDocs = allAtcDocs.concat(docs);
            }
        }

        // Deduplicate ATC list
        allAtcDocs = [...new Set(allAtcDocs)];

        console.log("📑 ATC Docs collected for panel:", allAtcDocs);
        console.log("📊 All sections from backend:", Object.keys(docsBySection));

        let atcDocsListHtml = '';
        if (allAtcDocs.length > 0) {
            let docsGrid = '';
            allAtcDocs.forEach((doc, idx) => {
                docsGrid += '<div class="doc-item" style="display: flex; align-items: center; padding: 12px 15px; background: #ffffff; border-radius: 12px; border: 1px solid #90caf9; transition: transform 0.2s ease;">' +
                    '<span style="font-size: 1.2rem; margin-right: 15px;">📄</span>' +
                    '<span style="flex: 1; color: #1976d2; font-weight: 600; font-size: 1rem;">' +
                    formatDocumentName(doc) +
                    '</span>' +
                    '</div>';
            });

            atcDocsListHtml = `
                        <div style="margin: 15px 0; padding: 15px; background: rgba(255, 255, 255, 0.6); border-radius: 8px; border: 1px dashed #90caf9;">
                            <strong style="color: #1976d2; font-size: 0.95rem;">📋 ${allAtcDocs.length} Required Documents Extracted from this ATC:</strong>
                            <div class="docs-list" style="margin-top: 15px; display: grid; gap: 8px;">
                                ${docsGrid}
                            </div>
                        </div>
                    `;
        } else {
            atcDocsListHtml = `
                        <div style="margin: 15px 0; padding: 10px 15px; background: #fff9c4; border-radius: 8px; border: 1px solid #fbc02d; color: #7b5e00; font-size: 0.9rem;">
                            ⚠️ No specific documents were extracted from the ATC file. Please review it manually.
                        </div>
                    `;
        }

        html += `
                <div class="form-group">
                    <label>📎 Important ATC Document</label>
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
                        <p style="margin-top: 0; color: #1565c0; font-size: 1.05rem;"><strong>📘 Buyer uploaded an ATC document.</strong> An additional terms and conditions document was found. Please review it carefully.</p>
                        
                        <div style="margin: 15px 0; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                            ${viewButtonHtml}
                            <button type="button" onclick="window.downloadATC('${documentUrl}', 'ATC_Document${tenderData.atc_extension || '.pdf'}')" style="display: inline-flex; align-items: center; gap: 8px; background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border: none; border-radius: 6px; font-weight: bold; font-family: inherit; cursor: pointer; font-size: 1rem; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3); transition: background 0.2s;">
                                📥 Download File Locally
                            </button>
                        </div>
                        
                        ${atcDocsListHtml}

                        <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 15px;">
                            <input type="checkbox" id="readAtcDoc" style="margin-top: 4px; width: 18px; height: 18px; cursor: pointer;">
                            <label for="readAtcDoc" style="font-size: 0.95rem; font-weight: normal; cursor: pointer; color: #333;">I have clicked to view and read this ATC document carefully. <span style="color:red;">*</span></label>
                        </div>
                    </div>
                </div>
            `;
    }

    // Documents Section - Always show Basic Documents first
    html += `
            <div class="form-group">
                <label>📄 Required Documents (Select all that you have uploaded)</label>
                <div style="margin: 15px 0; display: flex; gap: 15px; flex-wrap: wrap;">
                    <button type="button" class="btn-select" onclick="selectAllDocuments()" style="background: rgba(16, 185, 129, 0.2); border: 1px solid var(--success); color: var(--success); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 8px; align-items: center; transition: all 0.2s;">
                        ☑️ Select All
                    </button>
                    <button type="button" class="btn-select" onclick="selectBasicDocuments()" style="background: rgba(245, 158, 11, 0.2); border: 1px solid var(--warning); color: var(--warning); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 8px; align-items: center; transition: all 0.2s;">
                        ⭐ Select Basic Docs
                    </button>
                    <button type="button" class="btn-deselect" onclick="deselectAllDocuments()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid var(--error); color: var(--error); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 8px; align-items: center; transition: all 0.2s;">
                        ☐ Deselect All
                    </button>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 10px; background: #f9f9f9; max-height: 600px; overflow-y: auto;">
        `;

    // Dynamic Sections construction
    // Global dedup: normalize by stripping punctuation, spaces, lowercasing
    const seenDocs = new Set();
    function normalizeDocKey(doc) {
        return doc.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    const sectionsFromBackend = tenderData.documents_by_section || {};

    // Helper: classify a section key as ATC or Main tender using fuzzy matching
    function isAtcSection(key) {
        const k = key.toLowerCase();
        // Explicitly ATC
        if (k === 'atc' || k.includes('atc') || k.includes('buyer') || k.includes('additional term')) return true;
        // Known main tender section patterns
        const mainPatterns = ['main', 'financial', 'technical', 'certificate', 'additional', 'annexure',
            'declaration', 'compliance', 'experience', 'turnover', 'performance',
            'mandatory', 'eligibility', 'general', 'basic'];
        // If it matches a main pattern, it's NOT an ATC section
        return false; // Default: treat all dynamic AI sections as main sections (safer)
    }

    // Collect ATC docs from all sources (atc key + non-standard sections)
    const allAtcChecklistDocs = [];
    const atcChecklistSeen = new Set();
    const atcSourceKeys = new Set();

    // The 'atc' key is always ATC. Any key that was ADDED (not in standard pass) is also ATC.
    const standardSectionNames = new Set(['main', 'basic', 'financial', 'technical', 'certificates', 'additional', 'atc']);

    // Add docs from explicit 'atc' key
    if (sectionsFromBackend['atc'] && sectionsFromBackend['atc'].length > 0) {
        atcSourceKeys.add('atc');
        for (const doc of sectionsFromBackend['atc']) {
            const nk = normalizeDocKey(doc);
            if (!atcChecklistSeen.has(nk)) {
                atcChecklistSeen.add(nk);
                allAtcChecklistDocs.push(doc);
            }
        }
    }

    // Add docs from dynamically generated ATC sections
    for (const [key, docs] of Object.entries(sectionsFromBackend)) {
        if (!standardSectionNames.has(key.toLowerCase()) && docs && docs.length > 0) {
            atcSourceKeys.add(key);
            for (const doc of docs) {
                const nk = normalizeDocKey(doc);
                if (!atcChecklistSeen.has(nk)) {
                    atcChecklistSeen.add(nk);
                    allAtcChecklistDocs.push(doc);
                }
            }
        }
    }

    // Build the final ordered sections object for rendering
    const dynamicSections = {
        // Always show Basic/Mandatory first
        'basic': {
            icon: '⭐', name: 'Basic Documents (Mandatory for All Tenders)',
            color: '#ff9800', mandatory: true,
            docs: ["PAN Card", "GST Certificate", "MSME / Udyam Registration Certificate", "Cancelled Cheque / Bank Account Proof", "CA Certificate for Turnover"]
        }
    };

    // Icon/color mapper based on key name fuzzy match
    function getSectionMeta(key) {
        const k = key.toLowerCase();
        if (k === 'main' || k.includes('main')) return { icon: '📋', color: '#4caf50' };
        if (k.includes('finan') || k.includes('turnover') || k.includes('emd')) return { icon: '💰', color: '#2196f3' };
        if (k.includes('tech') || k.includes('product') || k.includes('data')) return { icon: '🔧', color: '#9c27b0' };
        if (k.includes('cert')) return { icon: '📜', color: '#795548' };
        if (k.includes('annex') || k.includes('declar') || k.includes('affid')) return { icon: '📝', color: '#eb4034' };
        if (k.includes('compli')) return { icon: '✅', color: '#00bcd4' };
        if (k.includes('experi') || k.includes('perform')) return { icon: '📈', color: '#8bc34a' };
        return { icon: '📎', color: '#607d8b' };
    }

    // Add ALL backend sections EXCEPT 'atc' (which goes to consolidated ATC section)
    for (const [key, docs] of Object.entries(sectionsFromBackend)) {
        if (atcSourceKeys.has(key)) continue; // skip, goes to ATC section
        if (!docs || docs.length === 0) continue;
        const meta = getSectionMeta(key);
        dynamicSections[key] = {
            icon: meta.icon,
            name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
            color: meta.color,
            mandatory: false,
            docs: docs
        };
    }

    // Add consolidated ATC section LAST
    if (allAtcChecklistDocs.length > 0) {
        dynamicSections['_atc_consolidated'] = {
            icon: '📑', name: 'ATC Documents (Buyer Added Terms & Conditions)',
            color: '#e91e63', mandatory: false,
            docs: allAtcChecklistDocs
        };
    }

    // Iterate through each section and render, skipping global duplicates
    for (const [sectionKey, sectionInfo] of Object.entries(dynamicSections)) {
        let sectionDocs = sectionInfo.docs || [];

        // Filter out globally seen duplicates
        const uniqueSectionDocs = sectionDocs.filter(doc => {
            const nk = normalizeDocKey(doc);
            if (seenDocs.has(nk)) return false;
            seenDocs.add(nk);
            return true;
        });

        if (uniqueSectionDocs.length > 0) {
            html += `
                    <div style="background: rgba(10, 15, 30, 0.95); border: 2px solid rgba(0, 210, 255, 0.2); border-radius: 28px; padding: 25px; margin-bottom: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.5);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 1.5rem;">${sectionInfo.icon}</span>
                                <h4 style="margin: 0; color: ${sectionInfo.color}; font-family: var(--font-head); font-size: 1.25rem; letter-spacing: 0.5px;">
                                    ${sectionInfo.name.toUpperCase()}
                                </h4>
                            </div>
                            <span style="background: ${sectionInfo.color}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                ${uniqueSectionDocs.length} items
                            </span>
                        </div>
                        <div class="docs-list" style="display: grid; gap: 12px;">
                `;

            uniqueSectionDocs.forEach((doc, index) => {
                const docId = `doc_${sectionKey}_${index}`;
                const cleanDocName = formatDocumentName(doc);

                html += `
                        <div class="doc-item" style="display: flex; align-items: center; padding: 16px 20px; background: rgba(0, 0, 0, 0.5); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.12); margin-bottom: 12px; transition: transform 0.2s ease;">
                            <input type="checkbox" id="${docId}" value="${doc.replace(/"/g, '&quot;')}" class="doc-checkbox" data-section="${sectionKey}" style="width:22px; height:22px; cursor:pointer; accent-color: var(--primary);">
                            <label for="${docId}" style="flex: 1; cursor: pointer; color: #ffffff; font-weight: 600; font-size: 1.05rem; margin-left: 18px; display: flex; justify-content: space-between; align-items: center;">
                                <span>${cleanDocName}</span>
                                ${sectionInfo.mandatory ? '<span style="background: var(--warning); color: #000; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">⭐ Mandatory</span>' : ''}
                            </label>
                        </div>
                    `;
            });

            html += `</div></div>`;
        }
    }

    // Close the documents list container and the form-group div
    // Also add a documentWarning placeholder for validation
    html += `
                </div>
                <div id="documentWarning" style="display:none; margin-top:15px; padding:15px 20px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:12px; color:#fb7185; font-weight:600;">
                    ⚠️ Please select at least one document from the list before proceeding.
                </div>
            </div>
            `;

    // ===============================
    // ANALYZE ELIGIBILITY BUTTON IN REQUIRED DOCS CARD
    // ===============================
    html += `
            <div style="margin-top: 40px; text-align: center; padding-top: 30px; border-top: 1px dashed rgba(255,255,255,0.1);">
                <style>
                    @keyframes border-flow-hub {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    @keyframes pulse-glow-final {
                        0% { box-shadow: 0 0 0 0 rgba(255, 0, 204, 0.6); transform: scale(1); }
                        50% { box-shadow: 0 0 0 25px rgba(255, 0, 204, 0); transform: scale(1.03); }
                        100% { box-shadow: 0 0 0 0 rgba(255, 0, 204, 0); transform: scale(1); }
                    }
                    .btn-ai-eligibility {
                        width: 100%;
                        max-width: 480px;
                        padding: 24px;
                        font-size: 1.4rem;
                        letter-spacing: 3px;
                        font-weight: 900;
                        text-transform: uppercase;
                        font-family: var(--font-head);
                        cursor: pointer;
                        display: inline-flex;
                        justify-content: center;
                        align-items: center;
                        gap: 15px;
                        
                        background: rgba(15, 23, 42, 0.95);
                        color: white;
                        border: 3px solid transparent;
                        background-clip: padding-box, border-box;
                        background-origin: padding-box, border-box;
                        background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(90deg, #ff00cc, #3a7bd5, #00d2ff, #ff00cc);
                        background-size: 100% 100%, 300% 100%;
                        border-radius: 60px;
                        
                        animation: border-flow-hub 4s linear infinite, pulse-glow-final 2.5s infinite;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .btn-ai-eligibility:hover {
                        filter: brightness(1.3);
                        transform: scale(1.05) translateY(-3px);
                    }
                    .ai-gradient-text-alt {
                        background: linear-gradient(90deg, #ff00cc, #00d2ff);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                </style>
                
                <button type="button" class="btn-ai-eligibility" onclick="checkEligibility()" id="checkEligibilityBtn">
                    <span style="font-size: 1.6rem; text-shadow: 0 0 15px #ff00cc;">🤖</span>
                    <span class="ai-gradient-text-alt">AI TO CHECK ELIGIBILITY</span>
                </button>
                
                <p style="margin-top: 25px; font-size: 0.9rem; color: var(--success); font-weight: bold; letter-spacing: 1.5px; opacity: 0.9;">
                    🔒 SECURE NEURAL PROCESSING
                </p>
            </div>
            </div> <!-- Close Required Documents Card -->
            </form> <!-- Close companyForm -->
            `;

    document.getElementById('formContainer').innerHTML = html;
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('resultContainer').style.display = 'none';

    document.getElementById('formContainer').scrollIntoView({ behavior: 'smooth' });
}

// Update selectBasicDocuments function
function selectBasicDocuments() {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        const section = cb.getAttribute('data-section');
        if (section === 'basic') {
            cb.checked = true;
        }
    });

    const warning = document.getElementById('documentWarning');
    if (warning) warning.style.display = 'none';
    showSuccess('✅ Basic documents selected');
}

// Update selectAllDocuments function
function selectAllDocuments() {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = true;
    });
    const warning = document.getElementById('documentWarning');
    if (warning) warning.style.display = 'none';
    showSuccess('✅ All documents selected');
}

// Update deselectAllDocuments function
function deselectAllDocuments() {
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = false;
    });
    const warning = document.getElementById('documentWarning');
    if (warning) warning.style.display = 'block';
    showSuccess('❌ All documents deselected');
}

// Check eligibility
// In index.html, locate the checkEligibility() function
// It should be around line 600-700 in your file
// Replace the existing document collection code with this:

async function checkEligibility() {
    if (!selectedFile) {
        showError('Please upload a tender PDF first');
        return;
    }

    // Check if ATC doc is read
    if (tenderData.atc_document_link) {
        const atcCheckbox = document.getElementById('readAtcDoc');
        if (atcCheckbox && !atcCheckbox.checked) {
            showValidationError('readAtcDoc', 'Please confirm you have read the ATC document before proceeding.');
            return;
        }
    }

    // Check for Q2 Authorization
    if (tenderData.classification_level === 'Q2') {
        const hasAuthSelect = document.getElementById('hasAuthorization');

        if (!hasAuthSelect || !hasAuthSelect.value) {
            showValidationError('hasAuthorization', 'Please select whether you have OEM Authorization');
            return;
        }

        if (hasAuthSelect.value === 'No') {
            const q2Message = `
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                            <h2 style="color: #f44336; margin-bottom: 15px;">Not Eligible for This Tender</h2>
                            <div style="background: #ffebee; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <p style="font-size: 1.1rem; color: #c62828; margin-bottom: 15px;">
                                    <strong>Q2 (Quadrant 2) tenders are designed specifically for branded products where the Original Equipment Manufacturer (OEM) controls the catalog, and only authorized resellers are allowed to participate.</strong>
                                </p>
                                <p style="color: #666; margin-top: 10px;">
                                    You need OEM Authorization to participate in this tender. Please contact the OEM to obtain authorization.
                                </p>
                            </div>
                            <div style="margin-top: 20px;">
                                <button class="btn" onclick="location.reload()">📄 Upload Another Tender</button>
                            </div>
                        </div>
                    `;

            document.getElementById('resultContainer').innerHTML = q2Message;
            document.getElementById('resultContainer').style.display = 'block';
            document.getElementById('formContainer').style.display = 'none';
            return;
        }
    }

    // ============================================================
    // STEP 1: VALIDATE DOCUMENTS SELECTION
    // ============================================================
    const docCheckboxes = document.querySelectorAll('.doc-checkbox');
    const totalDocs = docCheckboxes.length;
    const selectedDocs = document.querySelectorAll('.doc-checkbox:checked').length;

    if (totalDocs > 0 && selectedDocs === 0) {
        const warning = document.getElementById('documentWarning');
        if (warning) {
            warning.style.display = 'block';
            warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showError('Please select at least one document from the list before proceeding.');
        }
        return;
    }

    // Hide warning if previously shown
    const docWarn = document.getElementById('documentWarning');
    if (docWarn) docWarn.style.display = 'none';

    // ============================================================
    // STEP 2: COLLECT COMPANY DATA
    // ============================================================
    const company = {
        mse_status: document.getElementById('mse').value,
        startup_status: document.getElementById('startup').value,
        documents: []  // Just a simple array, no sections
    };

    // Collect selected documents
    document.querySelectorAll('.doc-checkbox:checked').forEach(cb => {
        company.documents.push(cb.value);
    });

    // ============================================================
    // STEP 4: COLLECT NUMERIC VALUES
    // ============================================================

    // Turnover
    const turnoverInput = document.getElementById('turnover');
    if (tenderData.turnover > 0 && (tenderData.mse_status === "No" && tenderData.startup_status === "No")) {
        if (!turnoverInput || !turnoverInput.value) {
            showValidationError('turnover', 'Annual Turnover is a mandatory field for this tender.');
            return;
        }
    }
    if (turnoverInput && turnoverInput.value) {
        company.turnover = Number(turnoverInput.value);
    }

    // OEM Turnover
    const oemInput = document.getElementById('oem');
    if (oemInput && oemInput.value) {
        company.oem_turnover = Number(oemInput.value);
    }

    // Experience
    const expInput = document.getElementById('exp');
    if (tenderData.experience > 0 && (tenderData.mse_status === "No" && tenderData.startup_status === "No")) {
        if (!expInput || !expInput.value) {
            showValidationError('exp', 'Years of Experience is a mandatory field for this tender.');
            return;
        }
    }
    if (expInput && expInput.value) {
        company.experience = Number(expInput.value);
    }

    // Past Performance
    const perfInput = document.getElementById('perf');
    if (perfInput && perfInput.value) {
        const perfValue = Number(perfInput.value);

        // Validate past performance
        if (perfValue > 100) {
            showError('❌ Past Performance cannot be more than 100%');
            perfInput.focus();
            return;
        }
        if (perfValue < 0) {
            showError('❌ Past Performance cannot be negative');
            perfInput.focus();
            return;
        }

        company.past_performance = perfValue;
    }

    // ============================================================
    // STEP 5: ADD Q2 AUTHORIZATION IF APPLICABLE
    // ============================================================
    if (tenderData.classification_level === 'Q2') {
        const hasAuthSelect = document.getElementById('hasAuthorization');
        company.oem_authorization = hasAuthSelect.value === 'Yes' ? 'Yes' : 'No';
    }

    // ============================================================
    // STEP 6: LOG COLLECTED DATA FOR DEBUGGING
    // ============================================================
    console.log("=".repeat(60));
    console.log("📊 COMPANY DATA COLLECTED:");
    console.log("=".repeat(60));
    console.log("Company Info:");
    console.log(`  MSE Status: ${company.mse_status}`);
    console.log(`  Startup Status: ${company.startup_status}`);
    console.log(`  Turnover: ₹${company.turnover?.toLocaleString() || '0'}`);
    console.log(`  OEM Turnover: ₹${company.oem_turnover?.toLocaleString() || '0'}`);
    console.log(`  Experience: ${company.experience || 0} years`);
    console.log(`  Past Performance: ${company.past_performance || 0}%`);

    console.log("\n📋 Documents Selected:");
    for (const [section, docs] of Object.entries(company.documents_by_section || {})) {
        if (docs.length > 0) {
            console.log(`  [${section.toUpperCase()}] (${docs.length}):`);
            docs.forEach(doc => console.log(`    • ${doc}`));
        }
    }

    console.log(`\nTotal Documents Selected: ${company.documents.length}`);
    console.log("=".repeat(60));

    // ============================================================
    // STEP 7: SEND TO BACKEND
    // ============================================================
    const fd = new FormData();
    fd.append('tender_data', JSON.stringify(tenderData));
    fd.append('company_data', JSON.stringify(company));

    showLoading(true);

    try {
        const res = await fetch('/check', {
            method: 'POST',
            body: fd
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.detail || 'Failed to check eligibility');
        }

        displayResult(data.result, data.ai);
        showSuccess('Eligibility check completed!');

    } catch (error) {
        console.error('Check error:', error);
        showError('Error checking eligibility: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Typewriter effect for AI text
function typeText(element, text, speed = 20) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Display result
function displayResult(result, ai) {

    const scorePercent = (result.score / 100) * 360;
    const scoreColor = result.score >= 80 ? '#4caf50' : result.score >= 50 ? '#ff9800' : '#f44336';

    let html = `
                <div class="card">
                    <h2>📊 Eligibility Result</h2>
            `;

    // ===============================
    // 🎯 TOP SUMMARY (HERO SECTION)
    // ===============================
    let bgGradient = result.score >= 80
        ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
        : result.score >= 50
            ? 'linear-gradient(135deg, #ff9800, #ef6c00)'
            : 'linear-gradient(135deg, #f44336, #c62828)';

    html += `
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding:25px;
                border-radius:16px;
                margin:20px 0;
                background: ${bgGradient};
                color:white;
                box-shadow:0 8px 25px rgba(0,0,0,0.15);
            ">

                <div>
                    <div style="font-size:1.8rem;font-weight:bold;">
                        🎯 ${result.eligibility_level} Eligible
                    </div>

                    <div style="margin-top:10px;font-size:15px;opacity:0.9;">
                        ${result.passed
            ? '🚀 You are fully eligible to participate in this tender'
            : '⚠️ Your eligibility needs improvement'}
                    </div>

                    <div style="margin-top:15px;font-size:13px;opacity:0.8;">
                        ${result.score === 100
            ? '💼 Strong position to win this tender'
            : '📊 Improve key factors to increase chances'}
                    </div>
                </div>

                <div class="score-visual" style="margin: 0; width: 130px; height: 130px;">
                    <div class="score-inner" style="width: 110px; height: 110px; box-shadow: 0 0 20px rgba(0, 210, 255, 0.5); border-color: white;">
                        <span style="font-size: 2.2rem; font-family: var(--font-head); color: white;">${result.score}</span>
                        <span style="font-size: 0.65rem; color: rgba(255,255,255,0.7); font-weight: 600;">/100</span>
                    </div>
                </div>

            </div>
            `;

    // ===============================
    // 🤖 AI EXPLANATION
    // ===============================
    if (ai && ai.explanation) {
        html += `
                <div style="margin-bottom:20px;padding:22px;background:rgba(255, 248, 225, 0.05);border-radius:24px;border:1px solid rgba(255, 152, 0, 0.2);box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom:12px; font-family: var(--font-head); color: var(--warning); display:flex; align-items:center; gap:8px;">
                        <span>${result.score === 100 ? "🎉" : "🤖"}</span>
                        ${result.score === 100 ? "AI Recommendation" : "Why Your Score is Low"}
                    </h3>
                    <ul id="ai-explanation-list" style="line-height:1.8;padding-left:20px; color: var(--text-main); opacity: 0.9;">
                        ${ai.explanation.map(e => `<li style="margin-bottom:8px;">${e}</li>`).join('')}
                    </ul>
                </div>
                `;
    }

    // ===============================
    // 📊 SUGGESTIONS
    // ===============================
    if (ai && ai.suggestions) {
        html += `
                <div style="margin-bottom:20px;padding:22px;background:rgba(232, 245, 233, 0.05);border-radius:24px;border:1px solid rgba(76, 175, 80, 0.2);box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom:12px; font-family: var(--font-head); color: var(--success); display:flex; align-items:center; gap:8px;">
                        <span>🚀</span>
                        ${result.score === 100 ? "Next Steps" : "Improve Your Eligibility"}
                    </h3>
                    <ul id="ai-suggestions-list" style="line-height:1.8;padding-left:20px; color: var(--text-main); opacity: 0.9;">
                        ${ai.suggestions.map(s => `<li style="margin-bottom:8px;">👉 ${s}</li>`).join('')}
                    </ul>
                </div>
                `;
    }

    // ===============================
    // ⚠️ IMPORTANT NOTICE
    // ===============================
    if (tenderData.mse_status === "No" || tenderData.startup_status === "No") {
        html += `
                <div style="margin-bottom:20px;padding:15px;background:#fff3e0;border-radius:10px;border-left:4px solid #ff9800;color:#d84315;">
                    <strong style="color: #e65100;">⚠️ Important Notice:</strong>
                    <ul style="margin-top:10px;padding-left:20px;line-height:1.6;color:#5d4037;font-weight:500;">
                        ${tenderData.mse_status === "No" ? "<li>MSE exemption not allowed</li>" : ""}
                        ${tenderData.startup_status === "No" ? "<li>Startup exemption not allowed</li>" : ""}
                        ${tenderData.experience > 0 ? "<li>Experience is mandatory</li>" : ""}
                        ${tenderData.turnover > 0 ? "<li>Turnover requirement must be met</li>" : ""}
                    </ul>
                </div>
                `;
    }

    // ===============================
    // 📊 CLASSIFICATION CHECK (Integrated)
    // ===============================
    if (result.classification_check) {
        const c = result.classification_check;
        html += `
                <div style="margin-bottom:20px;padding:22px;background:rgba(16, 185, 129, 0.1);border-radius:20px;border:1px solid rgba(16, 185, 129, 0.3);box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                        <span style="font-size: 1.5rem;">💎</span>
                        <strong style="color:var(--success); font-family:var(--font-head); font-size: 1.2rem;">Classification Approval: ${c.level}</strong>
                    </div>
                    <div style="color:var(--text-main); font-size: 0.95rem; opacity: 0.9; line-height: 1.5;">${c.reason}</div>
                </div>
                `;
    }

    // ===============================
    // 📊 DETAILED CHECKS
    // ===============================
    html += `
            <div class="card" style="background: rgba(255,255,255,0.02); padding: 30px;">
                <h3 style="font-family: var(--font-head); margin-bottom: 25px; display: flex; align-items: center; gap: 10px;">
                    <span>🔍</span> Detailed Parameter Check
                </h3>
                <ul class="checks-list">
            `;

    result.checks.forEach(check => {
        const icon = check.status === 'passed' ? '✅' :
            check.status === 'exempted' ? '🎯' : '❌';

        const statusColor = check.status === 'passed' ? 'var(--success)' :
            check.status === 'exempted' ? 'var(--warning)' : 'var(--error)';

        html += `
                <li class="${check.status}" style="border-left: 4px solid ${statusColor}; margin-bottom: 12px; opacity: 0.9;">
                    <span style="margin-right: 15px; font-size: 1.2rem;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.5px;">${check.field.replace(/_/g, ' ')}</strong>
                            <span style="font-size: 0.75rem; font-weight: 600; color: ${statusColor};">${check.status.toUpperCase()}</span>
                        </div>
                        ${check.message ? `<div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 4px;">${check.message}</div>` : ''}
                    </div>
                </li>
                `;
    });

    html += `</ul></div>`;

    html += `</div>`;

    document.getElementById('resultContainer').innerHTML = html;
    document.getElementById('resultContainer').style.display = 'block';
    document.getElementById('resultContainer').scrollIntoView({ behavior: 'smooth' });
}

// Check backend connection on page load
async function checkBackendConnection() {
    try {
        const res = await fetch('/health');
        if (res.ok) {
            console.log('✅ Backend is running');
        } else {
            console.warn('⚠️ Backend returned error');
        }
    } catch (error) {
        console.warn('⚠️ Backend not reachable. Make sure it\'s running on port 8000');
        showError('Backend server is not running. Please start the backend server on port 8000');
    }
}

// Initialize on page load
checkBackendConnection();

