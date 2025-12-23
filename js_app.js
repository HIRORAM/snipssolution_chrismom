// Global variables
// let supabase = null;
let tasks = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentDayNumber = 1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkSupabaseConfig();
    setupEventListeners();
});

// Check if Supabase is configured
function checkSupabaseConfig() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');
    console.log(url, 'url');
    console.log(key, 'key');
    
    if (url && key) {
        initSupabase(url, key);
        document.getElementById('configModal').classList.add('hidden');
        loadTasks();
    } else {
        document.getElementById('configModal').classList.remove('hidden');
    }
}

// Initialize Supabase client
function initSupabase(url, key) {
    supabase = window.supabase.createClient(url, key);
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('viewTasksBtn').addEventListener('click', () => switchView('table'));
    document.getElementById('addTaskBtn').addEventListener('click', () => switchView('admin'));

    // Filters
    document.getElementById('toggleFiltersBtn').addEventListener('click', toggleFilters);
    document.getElementById('filterStaffName').addEventListener('input', applyFilters);
    document.getElementById('filterTeamName').addEventListener('input', applyFilters);
    document.getElementById('filterStartDate').addEventListener('input', applyFilters);
    document.getElementById('filterEndDate').addEventListener('input', applyFilters);

    // Pagination
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

    // Form
    document.getElementById('imageUpload').addEventListener('change', handleImageSelect);
    document.getElementById('dayNumber').addEventListener('input', updateDayDisplay);
    document.getElementById('submitTaskBtn').addEventListener('click', submitTask);

    // Config modal
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
}

// Save Supabase configuration
function saveConfig() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();

    if (!url || !key) {
        showNotification('Please enter both URL and API key', 'error');
        return;
    }

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);

    initSupabase(url, key);
    document.getElementById('configModal').classList.add('hidden');
    loadTasks();
    showNotification('Configuration saved successfully!');
}

// Switch between views
function switchView(view) {
    const tableView = document.getElementById('tableView');
    const adminView = document.getElementById('adminView');
    const viewTasksBtn = document.getElementById('viewTasksBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');

    if (view === 'table') {
        tableView.classList.remove('hidden');
        adminView.classList.add('hidden');
        viewTasksBtn.classList.add('active');
        addTaskBtn.classList.remove('active');
        loadTasks();
    } else {
        tableView.classList.add('hidden');
        adminView.classList.remove('hidden');
        viewTasksBtn.classList.remove('active');
        addTaskBtn.classList.add('active');
    }
}

// Toggle filters visibility
function toggleFilters() {
    const container = document.getElementById('filtersContainer');
    const btnText = document.getElementById('filterBtnText');
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btnText.textContent = 'Hide Filters';
    } else {
        container.classList.add('hidden');
        btnText.textContent = 'Show Filters';
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');

    messageEl.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

// Load tasks from Supabase
async function loadTasks() {
    if (!supabase) return;

    const loadingSpinner = document.getElementById('loadingSpinner');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');

    loadingSpinner.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('assigned_date', { ascending: false });

        if (error) throw error;

        tasks = data || [];
        currentPage = 1;
        renderTable();
    } catch (error) {
        showNotification('Error loading tasks: ' + error.message, 'error');
        tasks = [];
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Apply filters
function applyFilters() {
    currentPage = 1;
    renderTable();
}

// Get filtered tasks
function getFilteredTasks() {
    const staffFilter = document.getElementById('filterStaffName').value.toLowerCase();
    const teamFilter = document.getElementById('filterTeamName').value.toLowerCase();
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    return tasks.filter(task => {
        const matchesStaff = !staffFilter || task.staff_name.toLowerCase().includes(staffFilter);
        const matchesTeam = !teamFilter || task.team_name.toLowerCase().includes(teamFilter);
        const matchesStartDate = !startDate || new Date(task.assigned_date) >= new Date(startDate);
        const matchesEndDate = !endDate || new Date(task.assigned_date) <= new Date(endDate);

        return matchesStaff && matchesTeam && matchesStartDate && matchesEndDate;
    });
}

// Render table
function renderTable() {
    const filteredTasks = getFilteredTasks();
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    if (filteredTasks.length === 0) {
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        paginationContainer.classList.add('hidden');
        return;
    }

    tableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    // Render rows
    tableBody.innerHTML = paginatedTasks.map(task => `
        <tr>
            <td>
                <span class="day-badge">Day ${task.day_number}</span>
            </td>
            <td>${escapeHtml(task.staff_name)}</td>
            <td>${escapeHtml(task.team_name)}</td>
            <td>${formatDate(task.assigned_date)}</td>
            <td>
                <div class="media-icons">
                    ${task.image_base64 ? `<a href="#" onclick="showImageModal('${task.image_base64}'); return false;">🖼️</a>` : ''}
                    ${task.video_link ? `<a href="${task.video_link}" target="_blank">🎥</a>` : ''}
                </div>
            </td>
            <td class="description-cell" title="${escapeHtml(task.task_description)}">
                ${escapeHtml(task.task_description)}
            </td>
        </tr>
    `).join('');

    // Update pagination
    if (totalPages > 1) {
        paginationContainer.classList.remove('hidden');
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredTasks.length)} of ${filteredTasks.length} tasks`;
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    } else {
        paginationContainer.classList.add('hidden');
    }
}

// Show image in modal (you can add this function to display base64 images)
function showImageModal(base64) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
        <div style="position:relative;max-width:90%;max-height:90%;">
            <img src="${base64}" style="max-width:100%;max-height:90vh;border-radius:8px;">
            <button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:10px;right:10px;background:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:20px;">×</button>
        </div>
    `;
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// Change page
function changePage(direction) {
    const filteredTasks = getFilteredTasks();
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderTable();
}

// Handle image selection
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// Update day number display
function updateDayDisplay() {
    const dayNumber = document.getElementById('dayNumber').value;
    document.getElementById('dayNumberDisplay').textContent = `Day ${dayNumber}`;
}

// Convert image file to base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Check if staff name already exists on the same date
async function checkDuplicateStaff(staffName, assignedDate) {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('id')
            .eq('staff_name', staffName)
            .eq('assigned_date', assignedDate);

        if (error) throw error;

        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return false;
    }
}

// Submit task
async function submitTask() {
    if (!supabase) {
        showNotification('Please configure Supabase first', 'error');
        return;
    }

    const staffName = document.getElementById('staffName').value.trim();
    const teamName = document.getElementById('teamName').value.trim();
    const taskDescription = document.getElementById('taskDescription').value.trim();
    const assignedDate = document.getElementById('assignedDate').value;
    const dayNumber = parseInt(document.getElementById('dayNumber').value);
    const videoLink = document.getElementById('videoLink').value.trim();
    const imageFile = document.getElementById('imageUpload').files[0];

    // Validation
    if (!staffName || !teamName || !taskDescription || !assignedDate) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitTaskBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    
    submitBtn.disabled = true;
    submitBtnText.innerHTML = '⏳ Checking...';

    try {
        // Check for duplicate staff name on the same date
        const isDuplicate = await checkDuplicateStaff(staffName, assignedDate);
        
        if (isDuplicate) {
            showNotification(`Staff "${staffName}" already has a task assigned on ${formatDate(assignedDate)}. Please use a different staff name or date.`, 'error');
            submitBtn.disabled = false;
            submitBtnText.innerHTML = '➕ Add Task';
            return;
        }

        submitBtnText.innerHTML = '⏳ Uploading...';

        // Convert image to base64 if present
        let imageBase64 = null;
        if (imageFile) {
            imageBase64 = await convertImageToBase64(imageFile);
        }

        submitBtnText.innerHTML = '⏳ Submitting...';

        // Insert task with base64 image
        const { error } = await supabase.from('tasks').insert([{
            staff_name: staffName,
            team_name: teamName,
            task_description: taskDescription,
            assigned_date: assignedDate,
            day_number: dayNumber,
            image_base64: imageBase64,
            video_link: videoLink || null
        }]);

        if (error) throw error;

        showNotification('Task added successfully!');

        // Reset form
        document.getElementById('staffName').value = '';
        document.getElementById('teamName').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('assignedDate').value = '';
        document.getElementById('videoLink').value = '';
        document.getElementById('imageUpload').value = '';
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('uploadPlaceholder').classList.remove('hidden');
        
        // Increment day number
        const newDayNumber = dayNumber + 1;
        document.getElementById('dayNumber').value = newDayNumber;
        document.getElementById('dayNumberDisplay').textContent = `Day ${newDayNumber}`;

        // Reload tasks
        loadTasks();

    } catch (error) {
        showNotification('Error adding task: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtnText.innerHTML = '➕ Add Task';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}