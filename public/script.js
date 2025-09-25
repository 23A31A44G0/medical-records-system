// Global variables
let currentUser = null;
let currentPatientId = null;
let allPatients = [];
let diseaseChart = null;
let currentFilters = {};
let confirmCallback = null;
let localStorageManager = null;
let offlineMode = false;

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

const userWelcome = document.getElementById('userWelcome');
const loading = document.getElementById('loading');
const messageContainer = document.getElementById('messageContainer');
const refreshDashboard = document.getElementById('refreshDashboard');

// Enhanced dashboard elements
const showFiltersBtn = document.getElementById('showFilters');
const exportDataBtn = document.getElementById('exportData');
const filterPanel = document.getElementById('filterPanel');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const exportPatientsBtn = document.getElementById('exportPatients');

// Edit modal elements
const editPatientModal = document.getElementById('editPatientModal');
const closeEditModal = document.getElementById('closeEditModal');
const editPatientForm = document.getElementById('editPatientForm');
const cancelEditBtn = document.getElementById('cancelEdit');

// Confirm modal elements
const confirmModal = document.getElementById('confirmModal');
const closeConfirmModal = document.getElementById('closeConfirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// File preview modal elements
const filePreviewModal = document.getElementById('filePreviewModal');
const closePreviewModal = document.getElementById('closePreviewModal');
const previewFileName = document.getElementById('previewFileName');
const filePreviewContent = document.getElementById('filePreviewContent');
const downloadPreviewFile = document.getElementById('downloadPreviewFile');
const extractTextBtn = document.getElementById('extractTextBtn');
const extractedTextPanel = document.getElementById('extractedTextPanel');
const extractedTextContent = document.getElementById('extractedTextContent');

// Notification container
const notificationContainer = document.getElementById('notificationContainer');

// Tab elements
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Patient elements
const patientsGrid = document.getElementById('patientsGrid');
const addPatientForm = document.getElementById('addPatientForm');
const patientSearch = document.getElementById('patientSearch');

// Modal elements
const patientModal = document.getElementById('patientModal');
const closeModal = document.getElementById('closeModal');
const modalPatientName = document.getElementById('modalPatientName');
const patientDetails = document.getElementById('patientDetails');
const uploadReportForm = document.getElementById('uploadReportForm');
const patientReports = document.getElementById('patientReports');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize offline storage
    if (typeof LocalStorageManager !== 'undefined') {
        localStorageManager = new LocalStorageManager();
        setupOfflineIndicators();
    }
    
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation tabs
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Add patient form
    addPatientForm.addEventListener('submit', handleAddPatient);
    
    // Patient search
    patientSearch.addEventListener('input', handlePatientSearch);
    
    // Modal close
    closeModal.addEventListener('click', closePatientModal);
    window.addEventListener('click', (e) => {
        if (e.target === patientModal) {
            closePatientModal();
        }
    });
    
    // Upload report form
    uploadReportForm.addEventListener('submit', handleUploadReport);
    
    // Dashboard refresh button
    if (refreshDashboard) {
        refreshDashboard.addEventListener('click', loadDashboardData);
    }
    
    // Enhanced dashboard controls
    if (showFiltersBtn) {
        showFiltersBtn.addEventListener('click', toggleFilterPanel);
    }
    
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', showExportOptions);
    }
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyDashboardFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearDashboardFilters);
    }
    
    if (exportPatientsBtn) {
        exportPatientsBtn.addEventListener('click', exportPatientData);
    }
    
    // Edit modal events
    if (closeEditModal) {
        closeEditModal.addEventListener('click', closeEditPatientModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditPatientModal);
    }
    
    if (editPatientForm) {
        editPatientForm.addEventListener('submit', handleEditPatient);
    }
    
    // Confirm modal events
    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', closeConfirmationModal);
    }
    
    if (confirmYes) {
        confirmYes.addEventListener('click', handleConfirmYes);
    }
    
    if (confirmNo) {
        confirmNo.addEventListener('click', closeConfirmationModal);
    }
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === editPatientModal) {
            closeEditPatientModal();
        }
        if (e.target === confirmModal) {
            closeConfirmationModal();
        }
        if (e.target === filePreviewModal) {
            closeFilePreview();
        }
    });
    
    // File preview modal events
    if (closePreviewModal) {
        closePreviewModal.addEventListener('click', closeFilePreview);
    }
    
    if (downloadPreviewFile) {
        downloadPreviewFile.addEventListener('click', handlePreviewDownload);
    }
    
    if (extractTextBtn) {
        extractTextBtn.addEventListener('click', handleTextExtraction);
    }
}

// Authentication functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            currentUser = await response.json();
            showMainApplication();
        } else {
            showLoginForm();
        }
    } catch (error) {
        showLoginForm();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showMessage('Login successful!', 'success');
            showMainApplication();
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showLoginForm();
        showMessage('Logged out successfully!', 'success');
    } catch (error) {
        showMessage('Logout failed', 'error');
    }
}

// UI functions
function showLoginForm() {
    loginContainer.style.display = 'flex';
    mainContainer.style.display = 'none';
    loginForm.reset();
}

function showMainApplication() {
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'flex';
    userWelcome.textContent = `Welcome, ${currentUser.full_name}`;
    loadDashboardData();
    loadPatients();
}

function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'success') {
    // Use enhanced notification system
    const title = type === 'success' ? 'Success' : 
                  type === 'error' ? 'Error' : 
                  type === 'warning' ? 'Warning' : 'Info';
    
    showNotification(title, message, type);
    
    // Keep legacy support for existing code
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Tab navigation
function switchTab(tabName) {
    // Update nav tabs
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
    
    // Load specific content if needed
    if (tabName === 'patients') {
        loadPatients();
    } else if (tabName === 'dashboard') {
        loadDashboardData();
    }
}

// Patient management functions
async function loadPatients() {
    showLoading(true);
    try {
        const response = await fetch('/api/mysql/patients', {
            credentials: 'include'
        });
        if (response.ok) {
            const result = await response.json();
            allPatients = result.data || result; // Handle MySQL response format
            displayPatients(allPatients);
        } else {
            showMessage('Failed to load patients', 'error');
        }
    } catch (error) {
        showMessage('Network error while loading patients', 'error');
    } finally {
        showLoading(false);
    }
}

function displayPatients(patients) {
    if (patients.length === 0) {
        patientsGrid.innerHTML = '<div class="no-patients">No patients found. Add a new patient to get started.</div>';
        return;
    }
    
    patientsGrid.innerHTML = patients.map(patient => {
        // Handle both MySQL and SQLite data structures
        const fullName = patient.name || `${patient.first_name} ${patient.last_name}`;
        const nameParts = patient.name ? patient.name.split(' ') : [patient.first_name, patient.last_name];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return `
        <div class="patient-card" onclick="openPatientModal(${patient.id})">
            <div class="patient-actions">
                <button class="action-btn edit" onclick="event.stopPropagation(); editPatient(${patient.id})" title="Edit Patient">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="event.stopPropagation(); deletePatient(${patient.id}, '${fullName}')" title="Delete Patient">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <h3>
                <i class="fas fa-user"></i>
                ${fullName}
            </h3>
            <p><strong>ID:</strong> <span class="patient-id">${patient.patient_id}</span></p>
            <p><strong>Disease:</strong> ${patient.disease_diagnosis || 'Not diagnosed'}</p>
            <p><strong>Location:</strong> ${formatLocation(patient.city, patient.state)}</p>
            <p><strong>Phone:</strong> ${patient.phone || 'Not provided'}</p>
            <p><strong>Added:</strong> ${formatDate(patient.created_at)}</p>
        </div>
        `;
    }).join('');
}

function handlePatientSearch() {
    const searchTerm = patientSearch.value.toLowerCase();
    const filteredPatients = allPatients.filter(patient => 
        patient.first_name.toLowerCase().includes(searchTerm) ||
        patient.last_name.toLowerCase().includes(searchTerm) ||
        patient.patient_id.toLowerCase().includes(searchTerm) ||
        (patient.phone && patient.phone.includes(searchTerm)) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm))
    );
    displayPatients(filteredPatients);
}

// Dashboard functions
async function loadDashboardData() {
    showLoading(true);
    try {
        // Load filter options first
        await loadFilterOptions();
        
        // Load summary statistics
        await loadSummaryStats();
        
        // Load disease distribution
        await loadDiseaseDistribution();
        
        // Load area disease data
        await loadAreaDiseaseData();
        
        // Load AI statistics
        await loadAIStatistics();
        
        // Add storage info section if not already present
        if (localStorageManager && !document.querySelector('.dashboard-section')) {
            addStorageInfoToDashboard();
        }
        
    } catch (error) {
        showMessage('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadFilterOptions() {
    try {
        const response = await fetch('/api/dashboard/filter-options');
        if (response.ok) {
            const options = await response.json();
            
            // Populate filter dropdowns
            populateFilterDropdown('diseaseFilter', options.diseases);
            populateFilterDropdown('cityFilter', options.cities);
            populateFilterDropdown('stateFilter', options.states);
        }
    } catch (error) {
        console.error('Failed to load filter options:', error);
    }
}

function populateFilterDropdown(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;
    
    // Keep the first option ("All ...")
    const firstOption = select.querySelector('option');
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        showFiltersBtn.innerHTML = '<i class="fas fa-times"></i> Hide Filters';
    } else {
        panel.style.display = 'none';
        showFiltersBtn.innerHTML = '<i class="fas fa-filter"></i> Filters';
    }
}

function applyDashboardFilters() {
    currentFilters = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        disease: document.getElementById('diseaseFilter').value,
        city: document.getElementById('cityFilter').value,
        state: document.getElementById('stateFilter').value
    };
    
    loadDashboardData();
    showMessage('Filters applied successfully!', 'success');
}

function clearDashboardFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('diseaseFilter').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('stateFilter').value = '';
    
    currentFilters = {};
    loadDashboardData();
    showMessage('Filters cleared!', 'success');
}

function showExportOptions() {
    const options = [
        { label: 'Export Patient List (CSV)', action: () => exportPatientData() },
        { label: 'Export Disease Statistics (CSV)', action: () => exportDiseaseData() },
        { label: 'Export Area Data (CSV)', action: () => exportAreaData() }
    ];
    
    // Create a simple dropdown menu (you could enhance this with a proper modal)
    let menu = '<div class="export-menu">\n';
    options.forEach(option => {
        menu += `<button class="export-option" onclick="${option.action.toString().slice(6, -1)}">${option.label}</button>\n`;
    });
    menu += '</div>';
    
    // For now, just export patient data
    exportPatientData();
}

async function exportPatientData() {
    try {
        const params = new URLSearchParams({
            format: 'csv',
            ...currentFilters
        });
        
        const response = await fetch(`/api/export/patients?${params}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'patients.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showMessage('Patient data exported successfully!', 'success');
        } else {
            showMessage('Failed to export patient data', 'error');
        }
    } catch (error) {
        showMessage('Export failed: ' + error.message, 'error');
    }
}

async function loadSummaryStats() {
    try {
        const response = await fetch('/api/dashboard/summary');
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('totalPatients').textContent = stats.totalPatients || 0;
            document.getElementById('uniqueDiseases').textContent = stats.uniqueDiseases || 0;
            document.getElementById('affectedAreas').textContent = stats.affectedAreas || 0;
            document.getElementById('totalReports').textContent = stats.totalReports || 0;
        }
    } catch (error) {
        console.error('Failed to load summary stats:', error);
    }
}

async function loadDiseaseDistribution() {
    try {
        const response = await fetch('/api/dashboard/diseases');
        if (response.ok) {
            const diseases = await response.json();
            updateDiseaseChart(diseases);
            updateDiseaseList(diseases);
        }
    } catch (error) {
        console.error('Failed to load disease distribution:', error);
    }
}

function updateDiseaseChart(diseases) {
    const ctx = document.getElementById('diseaseChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (diseaseChart) {
        diseaseChart.destroy();
    }
    
    if (diseases.length === 0) {
        document.getElementById('diseaseChart').style.display = 'none';
        return;
    }
    
    document.getElementById('diseaseChart').style.display = 'block';
    
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];
    
    diseaseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: diseases.map(d => d.disease),
            datasets: [{
                data: diseases.map(d => d.count),
                backgroundColor: colors.slice(0, diseases.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        }
    });
}

function updateDiseaseList(diseases) {
    const diseaseList = document.getElementById('diseaseList');
    
    if (diseases.length === 0) {
        diseaseList.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">No disease data available</p>';
        return;
    }
    
    diseaseList.innerHTML = diseases.map(disease => `
        <div class="disease-item">
            <span class="disease-name">${disease.disease}</span>
            <span class="disease-count">${disease.count}</span>
        </div>
    `).join('');
}

async function loadAreaDiseaseData() {
    try {
        const response = await fetch('/api/dashboard/top-diseases-by-area');
        if (response.ok) {
            const areaData = await response.json();
            updateAreaDiseaseDisplay(areaData);
        }
    } catch (error) {
        console.error('Failed to load area disease data:', error);
    }
}

function updateAreaDiseaseDisplay(areaData) {
    const container = document.getElementById('areaDisease');
    
    if (Object.keys(areaData).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">No area disease data available</p>';
        return;
    }
    
    container.innerHTML = Object.entries(areaData).map(([area, diseases]) => `
        <div class="area-section">
            <div class="area-title">
                <i class="fas fa-map-marker-alt"></i>
                ${area}
            </div>
            <div class="area-diseases">
                ${diseases.map(disease => `
                    <div class="area-disease-item">
                        <span class="area-disease-name">${disease.disease}</span>
                        <span class="area-disease-count">${disease.count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

async function handleAddPatient(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(addPatientForm);
    const patientData = Object.fromEntries(formData.entries());
    
    // Check if offline and store locally
    if (!navigator.onLine && localStorageManager) {
        try {
            await localStorageManager.storePatient(patientData);
            showMessage('Patient added offline - will sync when online', 'warning');
            addPatientForm.reset();
            await loadPatientsFromLocal();
            switchTab('patients');
            return;
        } catch (error) {
            showMessage('Failed to save patient locally', 'error');
            return;
        } finally {
            showLoading(false);
        }
    }
    
    try {
        const response = await fetch('/api/mysql/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(patientData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Patient added successfully!', 'success');
            addPatientForm.reset();
            loadPatients(); // Refresh patient list
            switchTab('patients'); // Switch to patients tab
        } else {
            showMessage(data.error || 'Failed to add patient', 'error');
        }
    } catch (error) {
        // If online request fails, try storing offline
        if (localStorageManager) {
            try {
                await localStorageManager.storePatient(patientData);
                showMessage('Saved offline - will sync when connection is restored', 'warning');
                addPatientForm.reset();
                await loadPatientsFromLocal();
                switchTab('patients');
            } catch (offlineError) {
                showMessage('Failed to save patient', 'error');
            }
        } else {
            showMessage('Network error and offline storage unavailable', 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Modal functions
async function openPatientModal(patientId) {
    currentPatientId = patientId;
    showLoading(true);
    
    try {
        // Load patient details
        const patientResponse = await fetch(`/api/mysql/patient/${patientId}`, {
            credentials: 'include'
        });
        if (!patientResponse.ok) {
            throw new Error('Failed to load patient details');
        }
        const patientResult = await patientResponse.json();
        const patient = patientResult.data || patientResult; // Handle MySQL response format
        
        // Load patient reports
        const reportsResponse = await fetch(`/api/patients/${patientId}/reports`, {
            credentials: 'include'
        });
        if (!reportsResponse.ok) {
            throw new Error('Failed to load patient reports');
        }
        const reports = await reportsResponse.json();
        
        // Update modal content
        const fullName = patient.name || `${patient.first_name} ${patient.last_name}`;
        modalPatientName.textContent = fullName;
        displayPatientDetails(patient);
        displayPatientReports(reports);
        
        patientModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        showMessage('Failed to load patient information', 'error');
    } finally {
        showLoading(false);
    }
}

function closePatientModal() {
    patientModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentPatientId = null;
    uploadReportForm.reset();
}

function displayPatientDetails(patient) {
    // Handle both MySQL and SQLite data structures
    const fullName = patient.name || `${patient.first_name} ${patient.last_name}`;
    
    patientDetails.innerHTML = `
        <h4><i class="fas fa-user-circle"></i> Patient Information</h4>
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">Patient ID</span>
                <span class="detail-value">${patient.patient_id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Full Name</span>
                <span class="detail-value">${fullName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date of Birth</span>
                <span class="detail-value">${patient.date_of_birth || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Gender</span>
                <span class="detail-value">${patient.gender || 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${patient.phone || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">${patient.email || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Disease Diagnosis</span>
                <span class="detail-value">${patient.disease_diagnosis || 'Not diagnosed'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location</span>
                <span class="detail-value">${formatLocation(patient.city, patient.state)}</span>
            </div>
            <div class="detail-item" style="grid-column: 1 / -1;">
                <span class="detail-label">Address</span>
                <span class="detail-value">${patient.address || 'Not provided'}</span>
            </div>
        </div>
    `;
}

function displayPatientReports(reports) {
    if (reports.length === 0) {
        patientReports.innerHTML = '<p class="no-reports">No medical reports uploaded yet.</p>';
        return;
    }
    
    patientReports.innerHTML = reports.map(report => `
        <div class="report-item">
            <div class="report-header">
                <div>
                    <div class="report-title">${report.report_title}</div>
                    <div class="report-meta">
                        Uploaded on ${formatDate(report.uploaded_at)}
                        ${report.ai_processed_at ? `<br><small class="ai-processed">AI Processed: ${formatDate(report.ai_processed_at)}</small>` : ''}
                    </div>
                </div>
                <div class="report-actions">
                    ${report.processing_status === 'processing' ? 
                        `<span class="ai-status processing"><i class="fas fa-spinner fa-spin"></i> AI Processing...</span>` : 
                        report.processing_status === 'completed' ? 
                        `<span class="ai-status completed"><i class="fas fa-check-circle"></i> AI: ${report.confidence_score}%</span>` :
                        report.processing_status === 'failed' ? 
                        `<span class="ai-status failed"><i class="fas fa-exclamation-triangle"></i> AI Failed</span>` : ''
                    }
                    ${report.processing_status === 'completed' ? 
                        `<button class="btn btn-sm btn-info" onclick="viewMedicalData(${report.id})">
                            <i class="fas fa-brain"></i> AI Data
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-secondary" onclick="previewFile(${report.id}, '${report.file_name}')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-primary" onclick="downloadReport(${report.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
            ${report.report_description ? `<div class="report-description">${report.report_description}</div>` : ''}
            <div class="file-info">
                <span class="file-type">${getFileExtension(report.file_name)}</span>
                <span><i class="fas fa-file"></i> ${report.file_name}</span>
                <span><i class="fas fa-hdd"></i> ${formatFileSize(report.file_size)}</span>
            </div>
        </div>
    `).join('');
}

async function handleUploadReport(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(uploadReportForm);
    
    try {
        const response = await fetch(`/api/patients/${currentPatientId}/reports`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Report uploaded successfully!', 'success');
            uploadReportForm.reset();
            // Reload reports
            const reportsResponse = await fetch(`/api/patients/${currentPatientId}/reports`, {
                credentials: 'include'
            });
            const reports = await reportsResponse.json();
            displayPatientReports(reports);
        } else {
            showMessage(data.error || 'Failed to upload report', 'error');
        }
    } catch (error) {
        showMessage('Network error while uploading report', 'error');
    } finally {
        showLoading(false);
    }
}

async function downloadReport(reportId) {
    try {
        const response = await fetch(`/api/reports/${reportId}/download`);
        if (response.ok) {
            // Get filename from Content-Disposition header or use a default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'medical-report';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showMessage('Report downloaded successfully!', 'success');
        } else {
            showMessage('Failed to download report', 'error');
        }
    } catch (error) {
        showMessage('Network error while downloading report', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
    return filename.split('.').pop().toUpperCase();
}

function formatLocation(city, state) {
    if (city && state) {
        return `${city}, ${state}`;
    } else if (city) {
        return city;
    } else if (state) {
        return state;
    } else {
        return 'Not provided';
    }
}

// Edit and Delete Patient Functions
function editPatient(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) {
        showMessage('Patient not found', 'error');
        return;
    }
    
    // Populate edit form
    document.getElementById('editFirstName').value = patient.first_name || '';
    document.getElementById('editLastName').value = patient.last_name || '';
    document.getElementById('editDateOfBirth').value = patient.date_of_birth || '';
    document.getElementById('editGender').value = patient.gender || '';
    document.getElementById('editPhone').value = patient.phone || '';
    document.getElementById('editEmail').value = patient.email || '';
    document.getElementById('editAddress').value = patient.address || '';
    document.getElementById('editDisease').value = patient.disease_diagnosis || '';
    document.getElementById('editCity').value = patient.city || '';
    document.getElementById('editState').value = patient.state || '';
    
    // Store current patient ID for editing
    currentPatientId = patientId;
    
    // Show edit modal
    editPatientModal.style.display = 'block';
}

function closeEditPatientModal() {
    editPatientModal.style.display = 'none';
    currentPatientId = null;
    editPatientForm.reset();
}

async function handleEditPatient(e) {
    e.preventDefault();
    
    if (!currentPatientId) {
        showMessage('No patient selected for editing', 'error');
        return;
    }
    
    const formData = new FormData(editPatientForm);
    const patientData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        disease: formData.get('disease'),
        city: formData.get('city'),
        state: formData.get('state')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/patients/${currentPatientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        if (response.ok) {
            showMessage('Patient updated successfully!', 'success');
            closeEditPatientModal();
            loadPatients();
            // Reload dashboard if on dashboard tab
            if (document.querySelector('.nav-tab.active').dataset.tab === 'dashboard') {
                loadDashboardData();
            }
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to update patient', 'error');
        }
    } catch (error) {
        showMessage('Network error while updating patient', 'error');
    } finally {
        showLoading(false);
    }
}

function deletePatient(patientId, patientName) {
    confirmCallback = async () => {
        try {
            showLoading(true);
            
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showMessage(`Patient ${patientName} deleted successfully!`, 'success');
                loadPatients();
                // Reload dashboard if on dashboard tab
                if (document.querySelector('.nav-tab.active').dataset.tab === 'dashboard') {
                    loadDashboardData();
                }
            } else {
                const error = await response.json();
                showMessage(error.error || 'Failed to delete patient', 'error');
            }
        } catch (error) {
            showMessage('Network error while deleting patient', 'error');
        } finally {
            showLoading(false);
        }
    };
    
    showConfirmationModal(
        'Delete Patient',
        `Are you sure you want to delete patient "${patientName}"? This action cannot be undone and will also delete all associated medical reports.`
    );
}

function showConfirmationModal(title, message) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmModal.style.display = 'block';
}

function closeConfirmationModal() {
    confirmModal.style.display = 'none';
    confirmCallback = null;
}

function handleConfirmYes() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirmationModal();
}

// File Preview Functions
let currentPreviewFile = null;
let currentPreviewFilename = null;

async function previewFile(reportId, filename) {
    currentPreviewFile = reportId;
    currentPreviewFilename = filename;
    
    // Update modal title
    previewFileName.textContent = `Preview: ${filename}`;
    
    // Show loading
    filePreviewContent.innerHTML = '<div class="preview-loading"><i class="fas fa-spinner fa-spin"></i> Loading file...</div>';
    
    // Show modal
    filePreviewModal.style.display = 'block';
    
    try {
        const response = await fetch(`/api/reports/${reportId}/preview`);
        if (response.ok) {
            const fileExtension = getFileExtension(filename).toLowerCase();
            
            if (fileExtension === 'pdf') {
                await displayPDF(response);
            } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
                await displayImage(response);
            } else if (['txt', 'text'].includes(fileExtension)) {
                await displayText(response);
            } else {
                filePreviewContent.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-file" style="font-size: 4em; color: #ccc; margin-bottom: 20px;"></i>
                        <h3>Preview not available</h3>
                        <p>File type "${fileExtension}" is not supported for preview.</p>
                        <button class="btn btn-primary" onclick="downloadReport(${reportId})" style="margin-top: 20px;">
                            <i class="fas fa-download"></i> Download File
                        </button>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to load file');
        }
    } catch (error) {
        filePreviewContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>Preview Failed</h3>
                <p>Could not load file for preview.</p>
            </div>
        `;
        showNotification('File Preview Error', 'Could not load file for preview', 'error');
    }
}

async function displayPDF(response) {
    try {
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'pdf-canvas';
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        filePreviewContent.innerHTML = '';
        filePreviewContent.appendChild(canvas);
        
        if (pdf.numPages > 1) {
            const info = document.createElement('div');
            info.style.cssText = 'text-align: center; margin-top: 10px; color: #666;';
            info.textContent = `Page 1 of ${pdf.numPages} (Download to view all pages)`;
            filePreviewContent.appendChild(info);
        }
    } catch (error) {
        throw error;
    }
}

async function displayImage(response) {
    try {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const img = document.createElement('img');
        img.src = url;
        img.className = 'image-preview';
        img.onload = () => URL.revokeObjectURL(url);
        
        filePreviewContent.innerHTML = '';
        filePreviewContent.appendChild(img);
    } catch (error) {
        throw error;
    }
}

async function displayText(response) {
    try {
        const text = await response.text();
        
        const pre = document.createElement('pre');
        pre.className = 'text-preview';
        pre.textContent = text;
        
        filePreviewContent.innerHTML = '';
        filePreviewContent.appendChild(pre);
    } catch (error) {
        throw error;
    }
}

function closeFilePreview() {
    filePreviewModal.style.display = 'none';
    extractedTextPanel.style.display = 'none';
    currentPreviewFile = null;
    currentPreviewFilename = null;
}

function handlePreviewDownload() {
    if (currentPreviewFile) {
        downloadReport(currentPreviewFile);
    }
}

async function handleTextExtraction() {
    if (!currentPreviewFile) return;
    
    showNotification('Text Extraction', 'Extracting text from document...', 'info');
    
    try {
        const response = await fetch(`/api/reports/${currentPreviewFile}/extract-text`);
        if (response.ok) {
            const result = await response.json();
            
            if (result.text && result.text.trim()) {
                extractedTextContent.textContent = result.text;
                extractedTextPanel.style.display = 'block';
                showNotification('Text Extraction Complete', 'Text extracted successfully!', 'success');
            } else {
                extractedTextContent.textContent = 'No text could be extracted from this document.';
                extractedTextPanel.style.display = 'block';
                showNotification('Text Extraction', 'No text found in document', 'warning');
            }
        } else {
            throw new Error('Text extraction failed');
        }
    } catch (error) {
        showNotification('Text Extraction Error', 'Failed to extract text from document', 'error');
    }
}

// Enhanced Notification System
function showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const progressBar = duration > 0 ? '<div class="notification-progress"><div class="notification-progress-bar"></div></div>' : '';
    
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${title}</div>
            <button class="notification-close" onclick="closeNotification(this)">&times;</button>
        </div>
        <div class="notification-message">${message}</div>
        ${progressBar}
    `;
    
    notificationContainer.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove notification
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification.querySelector('.notification-close'));
        }, duration);
    }
    
    return notification;
}

function closeNotification(closeButton) {
    const notification = closeButton.closest('.notification');
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Offline Storage Functions
function setupOfflineIndicators() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    // Update offline indicator
    function updateOfflineStatus() {
        if (navigator.onLine) {
            offlineIndicator.style.display = 'none';
            offlineMode = false;
            // Trigger sync when coming back online
            if (localStorageManager) {
                localStorageManager.syncWithServer();
            }
        } else {
            offlineIndicator.style.display = 'block';
            offlineMode = true;
        }
    }
    
    // Initial status
    updateOfflineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
}

// Load patients from local storage
async function loadPatientsFromLocal() {
    if (!localStorageManager) return [];
    
    try {
        const localPatients = await localStorageManager.getPatients();
        allPatients = localPatients;
        displayPatients(localPatients);
        return localPatients;
    } catch (error) {
        console.error('Error loading local patients:', error);
        return [];
    }
}

// Enhanced loadPatients function with offline support
async function loadPatientsEnhanced() {
    if (!navigator.onLine && localStorageManager) {
        return await loadPatientsFromLocal();
    }
    
    try {
        // Try to load from server first
        const response = await fetch('/api/patients');
        if (response.ok) {
            const patients = await response.json();
            allPatients = patients;
            displayPatients(patients);
            return patients;
        } else {
            throw new Error('Server request failed');
        }
    } catch (error) {
        // Fall back to local storage
        if (localStorageManager) {
            showMessage('Loading offline data', 'warning');
            return await loadPatientsFromLocal();
        } else {
            showMessage('Failed to load patients', 'error');
            return [];
        }
    }
}

// Store report offline
async function storeReportOffline(reportData) {
    if (!localStorageManager) return false;
    
    try {
        await localStorageManager.storeReport(reportData);
        return true;
    } catch (error) {
        console.error('Error storing report offline:', error);
        return false;
    }
}

// Get storage information
async function getStorageInfo() {
    if (!localStorageManager) {
        return { supported: false, online: navigator.onLine };
    }
    
    return await localStorageManager.getStorageInfo();
}

// Clear all offline data
async function clearOfflineData() {
    if (!localStorageManager) return;
    
    try {
        await localStorageManager.clearAllData();
        showNotification('Storage Cleared', 'All offline data has been cleared', 'success');
    } catch (error) {
        showNotification('Clear Failed', 'Failed to clear offline data', 'error');
    }
}

// Manual sync trigger
async function triggerManualSync() {
    if (!localStorageManager || !navigator.onLine) {
        showNotification('Sync Not Available', 'Must be online to sync data', 'warning');
        return;
    }
    
    showNotification('Syncing', 'Starting manual sync...', 'info');
    await localStorageManager.syncWithServer();
}

// Add storage management to dashboard
function addStorageInfoToDashboard() {
    const dashboardContainer = document.querySelector('#dashboard .dashboard-content');
    if (dashboardContainer && localStorageManager) {
        const storageSection = document.createElement('div');
        storageSection.className = 'dashboard-section';
        storageSection.innerHTML = `
            <h3><i class="fas fa-database"></i> Storage Information</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4 id="storageStatus">Checking...</h4>
                    <p>Storage Status</p>
                </div>
                <div class="stat-card">
                    <h4 id="syncQueueCount">0</h4>
                    <p>Pending Sync</p>
                </div>
                <div class="stat-card">
                    <button class="btn btn-primary" onclick="triggerManualSync()">
                        <i class="fas fa-sync"></i> Manual Sync
                    </button>
                </div>
                <div class="stat-card">
                    <button class="btn btn-secondary" onclick="clearOfflineData()" style="background-color: #dc3545;">
                        <i class="fas fa-trash"></i> Clear Storage
                    </button>
                </div>
            </div>
        `;
        
        dashboardContainer.appendChild(storageSection);
        
        // Update storage info
        updateStorageInfo();
    }
}

async // AI Medical Data Functions
async function viewMedicalData(reportId) {
    try {
        const response = await fetch(`/api/reports/${reportId}/medical-data`);
        if (response.ok) {
            const data = await response.json();
            
            if (data.message) {
                showNotification('No AI Data', data.message, 'info');
                return;
            }
            
            displayMedicalDataModal(data);
        } else {
            showNotification('Error', 'Failed to load AI-extracted medical data', 'error');
        }
    } catch (error) {
        showNotification('Network Error', 'Could not fetch medical data', 'error');
    }
}

function displayMedicalDataModal(data) {
    const { medicalRecord, vitalSigns, medications, labResults } = data;
    
    const modalContent = `
        <div class="modal ai-data-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <span class="close" onclick="closeAIDataModal()">&times;</span>
                    <h2><i class="fas fa-brain"></i> AI-Extracted Medical Data</h2>
                    <div class="confidence-badge">
                        Confidence: ${medicalRecord.ai_confidence}%
                    </div>
                </div>
                <div class="ai-data-container">
                    <div class="ai-data-section">
                        <h3><i class="fas fa-stethoscope"></i> Medical Information</h3>
                        <div class="data-grid">
                            ${medicalRecord.diagnosis ? `<div class="data-item"><strong>Diagnosis:</strong> ${medicalRecord.diagnosis}</div>` : ''}
                            ${medicalRecord.disease_category ? `<div class="data-item"><strong>Category:</strong> ${medicalRecord.disease_category}</div>` : ''}
                            ${medicalRecord.allergies ? `<div class="data-item"><strong>Allergies:</strong> ${medicalRecord.allergies}</div>` : ''}
                            ${medicalRecord.symptoms.length > 0 ? `<div class="data-item"><strong>Symptoms:</strong> ${medicalRecord.symptoms.join(', ')}</div>` : ''}
                        </div>
                    </div>
                    
                    ${vitalSigns.length > 0 ? `
                        <div class="ai-data-section">
                            <h3><i class="fas fa-heartbeat"></i> Vital Signs</h3>
                            <div class="data-grid">
                                ${vitalSigns.map(vital => `
                                    ${vital.blood_pressure ? `<div class="data-item"><strong>Blood Pressure:</strong> ${vital.blood_pressure}</div>` : ''}
                                    ${vital.temperature ? `<div class="data-item"><strong>Temperature:</strong> ${vital.temperature}°</div>` : ''}
                                    ${vital.pulse ? `<div class="data-item"><strong>Pulse:</strong> ${vital.pulse} bpm</div>` : ''}
                                    ${vital.respiratory_rate ? `<div class="data-item"><strong>Respiratory Rate:</strong> ${vital.respiratory_rate}</div>` : ''}
                                    ${vital.oxygen_saturation ? `<div class="data-item"><strong>O2 Saturation:</strong> ${vital.oxygen_saturation}%</div>` : ''}
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${medications.length > 0 ? `
                        <div class="ai-data-section">
                            <h3><i class="fas fa-pills"></i> Medications</h3>
                            <div class="medications-list">
                                ${medications.map(med => `
                                    <div class="medication-item">
                                        <strong>${med.medication_name}</strong>
                                        ${med.dosage ? ` - ${med.dosage}` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${labResults.length > 0 ? `
                        <div class="ai-data-section">
                            <h3><i class="fas fa-flask"></i> Lab Results</h3>
                            <div class="lab-results-grid">
                                ${labResults.map(lab => `
                                    <div class="lab-item">
                                        <strong>${lab.test_name}:</strong> ${lab.test_value} ${lab.test_unit || ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="ai-data-section">
                        <h3><i class="fas fa-calendar-alt"></i> Visit Information</h3>
                        <div class="data-grid">
                            ${medicalRecord.visit_date ? `<div class="data-item"><strong>Visit Date:</strong> ${formatDate(medicalRecord.visit_date)}</div>` : ''}
                            ${medicalRecord.appointment_date ? `<div class="data-item"><strong>Next Appointment:</strong> ${formatDate(medicalRecord.appointment_date)}</div>` : ''}
                            <div class="data-item"><strong>Extracted:</strong> ${formatDate(medicalRecord.extracted_at)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal with animation
    setTimeout(() => {
        const modal = document.querySelector('.ai-data-modal');
        modal.style.display = 'block';
        modal.classList.add('show');
    }, 100);
}

function closeAIDataModal() {
    const modal = document.querySelector('.ai-data-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Load AI statistics for dashboard
async function loadAIStatistics() {
    try {
        const response = await fetch('/api/dashboard/ai-stats');
        if (response.ok) {
            const stats = await response.json();
            updateAIDashboard(stats);
        }
    } catch (error) {
        console.error('Failed to load AI statistics:', error);
    }
}

function updateAIDashboard(stats) {
    // Check if AI section already exists
    let aiSection = document.querySelector('.ai-stats-section');
    
    if (!aiSection) {
        // Create AI section
        const dashboardContainer = document.querySelector('#dashboard .dashboard-content');
        if (dashboardContainer) {
            aiSection = document.createElement('div');
            aiSection.className = 'dashboard-section ai-stats-section';
            aiSection.innerHTML = `
                <h3><i class="fas fa-robot"></i> AI Processing Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card ai-stat">
                        <h4 id="totalProcessed">0</h4>
                        <p>Documents Processed</p>
                    </div>
                    <div class="stat-card ai-stat">
                        <h4 id="avgConfidence">0%</h4>
                        <p>Average Confidence</p>
                    </div>
                    <div class="stat-card ai-stat">
                        <h4 id="aiEnhancedPatients">0</h4>
                        <p>AI-Enhanced Patients</p>
                    </div>
                    <div class="stat-card ai-stat">
                        <h4 id="avgProcessingTime">0s</h4>
                        <p>Avg Processing Time</p>
                    </div>
                </div>
                <div class="ai-success-rate">
                    <div class="success-bar">
                        <div id="successBar" class="success-fill"></div>
                    </div>
                    <p>Success Rate: <span id="successRate">0%</span></p>
                </div>
            `;
            
            dashboardContainer.appendChild(aiSection);
        }
    }
    
    // Update statistics
    document.getElementById('totalProcessed').textContent = stats.totalProcessed;
    document.getElementById('avgConfidence').textContent = `${stats.avgConfidence}%`;
    document.getElementById('aiEnhancedPatients').textContent = stats.aiEnhancedPatients;
    document.getElementById('avgProcessingTime').textContent = `${stats.avgProcessingTime}s`;
    
    // Calculate and display success rate
    const successRate = stats.totalProcessed > 0 
        ? Math.round((stats.successfulProcessing / stats.totalProcessed) * 100)
        : 0;
    
    document.getElementById('successRate').textContent = `${successRate}%`;
    document.getElementById('successBar').style.width = `${successRate}%`;
}

async function updateStorageInfo() {
    if (!localStorageManager) return;
    
    try {
        const info = await getStorageInfo();
        
        const statusElement = document.getElementById('storageStatus');
        const syncQueueElement = document.getElementById('syncQueueCount');
        
        if (statusElement) {
            statusElement.textContent = info.online ? 'Online' : 'Offline';
            statusElement.style.color = info.online ? '#28a745' : '#dc3545';
        }
        
        if (syncQueueElement) {
            syncQueueElement.textContent = info.syncQueue;
        }
    } catch (error) {
        console.error('Error updating storage info:', error);
    }
}