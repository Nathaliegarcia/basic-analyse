// Global variables
let csvData = [];
let headers = [];
let rawData = []; // Store all parsed rows including potential header
let originalCsvText = ''; // Store the original CSV text for re-parsing

// Multiplier dictionary - add specific values and their default multipliers here
const multiplierDictionary = {
    "CLEM": 8,
    "DE_JAR1": 1,
    "RACPAV": 135,
    "SAV": 10,
    "RACIH": 77,
    "RECOIP": 50,
    "REF DGR": 50,
    "REFRAC": 50,
    "CABLE_PAV_1": 20,
    "CABLE_PAV_2": 40,
    "CABLE_PAV_3": 60,
    "CABLE_PAV_4": 80,
    "REPFOU_PRI": 100,
    "RACPRO_S": 190
    // Add more value-multiplier pairs as needed
};

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const uploadSection = document.querySelector('.upload-section');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const hasHeaderCheckbox = document.getElementById('hasHeaderCheckbox');
const separatorSelect = document.getElementById('separatorSelect');
const columnSelect = document.getElementById('columnSelect');
const extractBtn = document.getElementById('extractBtn');
const resetBtn = document.getElementById('resetBtn');
const results = document.getElementById('results');
const synthesis = document.getElementById('synthesis');
const synthesisTableBody = document.getElementById('synthesisTableBody');
const totalQuantity = document.getElementById('totalQuantity');
const grandTotal = document.getElementById('grandTotal');
const dataList = document.getElementById('dataList');
const totalCount = document.getElementById('totalCount');
const nonEmptyCount = document.getElementById('nonEmptyCount');
const showControlsBtn = document.getElementById('showControlsBtn');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File input click
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
      // Header checkbox change
    hasHeaderCheckbox.addEventListener('change', handleHeaderOptionChange);
    
    // Separator change
    separatorSelect.addEventListener('change', handleSeparatorChange);
      // Button events
    extractBtn.addEventListener('click', extractColumnData);
    resetBtn.addEventListener('click', resetApp);
    showControlsBtn.addEventListener('click', showControls);
    
    // Prevent default drag behaviors on document
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (isValidCSVFile(file)) {
            processFile(file);
        } else {
            showError('Please select a valid CSV file.');
        }
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && isValidCSVFile(file)) {
        processFile(file);
    } else if (file) {
        showError('Please select a valid CSV file.');
    }
}

function isValidCSVFile(file) {
    return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
}

function processFile(file) {
    const reader = new FileReader();    reader.onload = function(e) {
        try {
            let csvText = e.target.result;
            // Remove BOM if present (can cause issues with special characters)
            if (csvText.charCodeAt(0) === 0xFEFF) {
                csvText = csvText.slice(1);
            }
            // Store the original CSV text for re-parsing when separator changes
            originalCsvText = csvText;
            parseCSV(csvText);
            showControls();
        } catch (error) {
            showError('Error reading the file. Please try again.');
            console.error('File reading error:', error);
        }
    };
      reader.onerror = function() {
        showError('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file, 'UTF-8');
}

function parseCSV(csvText) {
    // Simple CSV parser that handles basic cases
    const lines = csvText.split('\n');
    const data = [];
    const separator = separatorSelect.value || ';'; // Use selected separator or default to semicolon
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            // Simple CSV parsing - handles quoted fields
            const row = parseCSVLine(line, separator);
            data.push(row);
        }
    }
    
    if (data.length === 0) {
        throw new Error('No data found in CSV file');
    }
    
    // Store all raw data
    rawData = data;
    
    // Process headers and data based on checkbox state
    processHeadersAndData();
}

function parseCSVLine(line, separator = ';') {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function processHeadersAndData() {
    const hasHeader = hasHeaderCheckbox.checked;
    
    if (hasHeader) {
        // First row is headers
        headers = rawData[0];
        csvData = rawData.slice(1);
    } else {
        // Generate generic headers
        const columnCount = rawData[0] ? rawData[0].length : 0;
        headers = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
        csvData = rawData;
    }
    
    populateColumnSelector();
}

function handleHeaderOptionChange() {
    // Re-process the data when header option changes
    if (rawData.length > 0) {
        processHeadersAndData();
        // Clear any existing results
        results.style.display = 'none';
    }
}

function handleSeparatorChange() {
    // Re-parse the CSV data when separator changes
    if (originalCsvText) {
        try {
            parseCSV(originalCsvText);
            // Clear any existing results since column structure may have changed
            results.style.display = 'none';
            synthesis.style.display = 'none';
        } catch (error) {
            showError('Error re-parsing with new separator. Please check your CSV format.');
            console.error('Re-parsing error:', error);
        }
    }
}

function populateColumnSelector() {
    columnSelect.innerHTML = '<option value="">Choose a column...</option>';
    
    let columnUIndex = -1; // Track if column U exists
    
    headers.forEach((header, index) => {
        const option = document.createElement('option');
        option.value = index;
        
        // Convert index to column letter (A, B, C, ...)
        const columnLetter = getColumnLetter(index);
        
        // Check if this is column U (index 20)
        if (index === 20) {
            columnUIndex = index;
        }
        
        // Format the display text based on whether we have headers or not
        const hasHeader = hasHeaderCheckbox.checked;
        if (hasHeader && header && header.trim() !== '') {
            option.textContent = `${columnLetter} - ${header}`;
        } else {
            option.textContent = `${columnLetter} - Column ${index + 1}`;
        }
        
        columnSelect.appendChild(option);
    });
      // Auto-select column U if it exists
    if (columnUIndex !== -1) {
        columnSelect.value = columnUIndex;
        // Auto-extract data when column U is selected by default
        setTimeout(() => {
            extractColumnData();
        }, 50);
    }
}

function getColumnLetter(index) {
    let result = '';
    while (index >= 0) {
        result = String.fromCharCode(65 + (index % 26)) + result;
        index = Math.floor(index / 26) - 1;
    }    return result;
}

function getDefaultMultiplier(value) {
    // Return the multiplier from dictionary if value exists, otherwise return 0
    return multiplierDictionary[value] || 0;
}

function showControls() {
    // Hide upload section to save space
    uploadSection.classList.add('hidden');
    
    controls.style.display = 'flex';
    showControlsBtn.style.display = 'none';
    results.style.display = 'none';
}

function extractColumnData() {
    const selectedColumnIndex = columnSelect.value;
    
    if (selectedColumnIndex === '') {
        showError('Please select a column first.');
        return;
    }
    
    const columnIndex = parseInt(selectedColumnIndex);
    const columnData = csvData.map(row => row[columnIndex] || '');
    
    // Always split each cell item by comma (not by CSV separator) and flatten the results
    const processedData = [];
    columnData.forEach((item, rowIndex) => {
        if (item && item.trim() !== '') {
            const splitItems = item.split(',').map(part => part.trim()).filter(part => part !== '');
            splitItems.forEach((splitItem, partIndex) => {// Split by "x" and process both parts
                const xSplit = splitItem.split('x');
                let firstPart = '';
                let secondPart = '';
                let isValidNumber = false;
                
                if (xSplit.length >= 2) {
                    firstPart = xSplit[0].trim();
                    secondPart = xSplit[1].trim();
                    // If second part is empty, consider it as 1
                    if (secondPart === '') {
                        secondPart = '1';
                        isValidNumber = true;
                    } else {
                        // Check if second part is a valid number
                        isValidNumber = !isNaN(secondPart) && secondPart !== '';
                    }
                } else {
                    // No "x" found, use original value as first part and 1 as second part
                    firstPart = splitItem;
                    secondPart = '1';
                    isValidNumber = true;
                }
                
                processedData.push({
                    originalValue: splitItem,
                    firstPart: firstPart,
                    secondPart: secondPart,
                    isValidNumber: isValidNumber,
                    originalRow: rowIndex + 1,
                    part: partIndex + 1,
                    totalParts: splitItems.length
                });
            });
        } else {
            processedData.push({
                originalValue: item || '(empty)',
                firstPart: item || '(empty)',
                secondPart: '',
                isValidNumber: false,
                originalRow: rowIndex + 1,
                part: 1,
                totalParts: 1
            });
        }
    });
    
    displayResults(processedData, headers[columnIndex], true);
}

function displayResults(data, columnName, isSplit = true) {
    // Calculate statistics
    const total = data.length;
    const nonEmpty = data.filter(item => item.firstPart && item.firstPart.trim() !== '' && item.firstPart !== '(empty)').length;
    
    // Calculate synthesis data - quantities by individual value
    const quantityByValue = {};
    let totalQuantitySum = 0;
    
    data.forEach(item => {
        if (item.firstPart && item.firstPart.trim() !== '' && item.firstPart !== '(empty)') {
            const value = item.firstPart;
            
            // Add to quantity for this specific value
            if (item.isValidNumber && item.secondPart && !isNaN(item.secondPart)) {
                const quantity = parseFloat(item.secondPart);
                quantityByValue[value] = (quantityByValue[value] || 0) + quantity;
                totalQuantitySum += quantity;
            } else {
                // If no valid number, still count the value but with 0 quantity
                quantityByValue[value] = quantityByValue[value] || 0;
            }
        }
    });
    
    // Update stats
    totalCount.textContent = total;
    nonEmptyCount.textContent = nonEmpty;
    
    // Update synthesis
    displaySynthesis(quantityByValue, totalQuantitySum);
    
    // Clear previous results
    dataList.innerHTML = '';
    
    if (data.length === 0) {
        dataList.innerHTML = '<div class="empty-data">No data found in selected column</div>';
        synthesis.style.display = 'none';
    } else {
        // Show synthesis
        synthesis.style.display = 'block';
        
        // Create data items
        data.forEach((item, index) => {
            const dataItem = document.createElement('div');
            dataItem.className = 'data-item';
              // Create display content - always show both parts since second part defaults to 1
            let displayContent = '';
            if (item.isValidNumber) {
                displayContent = `
                    <div class="split-content">
                        <span class="split-value">
                            <span class="first-part">${item.firstPart}</span> 
                            <span class="x-separator">×</span> 
                            <span class="second-part number">${item.secondPart}</span>
                        </span>
                        <span class="split-info">Row ${item.originalRow}, Part ${item.part}/${item.totalParts}</span>
                    </div>
                `;
            } else {
                displayContent = `
                    <div class="split-content">
                        <span class="split-value">
                            <span class="first-part">${item.firstPart}</span> 
                            <span class="x-separator">×</span> 
                            <span class="second-part">${item.secondPart}</span>
                            <span class="not-number">(not a number)</span>
                        </span>
                        <span class="split-info">Row ${item.originalRow}, Part ${item.part}/${item.totalParts}</span>
                    </div>
                `;
            }
            
            dataItem.innerHTML = displayContent;
            dataItem.title = `Original: "${item.originalValue}" (Row ${item.originalRow}, part ${item.part} of ${item.totalParts})`;
            
            dataList.appendChild(dataItem);
        });
    }    // Show results section
    results.style.display = 'block';
    
    // Hide controls after extraction and show the controls button
    controls.style.display = 'none';
    showControlsBtn.style.display = 'inline-flex';
    
    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth' });
}

function displaySynthesis(quantityByValue, totalSum) {
    // Clear existing table content
    synthesisTableBody.innerHTML = '';
      // Sort values alphabetically
    const sortedEntries = Object.entries(quantityByValue).sort((a, b) => {
        return a[0].localeCompare(b[0]); // Sort alphabetically by value
    });
    
    let grandTotalSum = 0;
    
    if (sortedEntries.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" style="text-align: center; padding: 20px; color: #7f8c8d; font-style: italic;">
                No values found
            </td>
        `;
        synthesisTableBody.appendChild(emptyRow);
    } else {        sortedEntries.forEach(([value, quantity]) => {
            const row = document.createElement('tr');
            const defaultMultiplier = getDefaultMultiplier(value);
            const calculatedTotal = quantity * defaultMultiplier;
            grandTotalSum += calculatedTotal;
              row.innerHTML = `
                <td class="value-cell">${value}</td>
                <td class="quantity-cell">${quantity.toLocaleString()}</td>
                <td class="multiplier-cell">
                    <input type="number" 
                           class="multiplier-input" 
                           value="${defaultMultiplier}" 
                           min="0" 
                           step="1"
                           data-value="${value}"
                           data-quantity="${quantity}">
                </td>
                <td class="total-cell" data-value="${value}">${calculatedTotal.toLocaleString()}</td>
            `;
            
            synthesisTableBody.appendChild(row);
        });
        
        // Add event listeners to multiplier inputs
        addMultiplierEventListeners();
    }
    
    // Update footer totals
    totalQuantity.textContent = totalSum.toLocaleString();
    grandTotal.textContent = grandTotalSum.toLocaleString();
}

function addMultiplierEventListeners() {
    const multiplierInputs = document.querySelectorAll('.multiplier-input');
    
    multiplierInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateRowTotal(this);
            updateGrandTotal();
        });
        
        input.addEventListener('focus', function() {
            this.select(); // Select all text when focused for easy editing
        });
    });
}

function updateRowTotal(input) {
    const value = input.dataset.value;
    const quantity = parseFloat(input.dataset.quantity);
    const multiplier = parseFloat(input.value) || 0;
    const total = quantity * multiplier;
    
    // Find and update the corresponding total cell
    const totalCell = document.querySelector(`.total-cell[data-value="${value}"]`);
    if (totalCell) {
        totalCell.textContent = total.toLocaleString();
    }
}

function updateGrandTotal() {
    const totalCells = document.querySelectorAll('.total-cell[data-value]');
    let newGrandTotal = 0;
    
    totalCells.forEach(cell => {
        const cellValue = parseFloat(cell.textContent.replace(/,/g, '')) || 0;
        newGrandTotal += cellValue;
    });
    
    grandTotal.textContent = newGrandTotal.toLocaleString();
}

function resetApp() {    // Reset all variables
    csvData = [];
    headers = [];
    rawData = [];
    originalCsvText = '';
    
    // Reset form
    fileInput.value = '';
    columnSelect.innerHTML = '<option value="">Choose a column...</option>';
    hasHeaderCheckbox.checked = true;
    separatorSelect.value = ';'; // Reset to default semicolon
    
    // Show upload section again
    uploadSection.classList.remove('hidden');    // Hide sections
    controls.style.display = 'none';
    results.style.display = 'none';
    synthesis.style.display = 'none';
    showControlsBtn.style.display = 'none';
    
    // Clear results
    dataList.innerHTML = '';
    totalCount.textContent = '0';
    nonEmptyCount.textContent = '0';
    
    // Remove any error states
    uploadArea.classList.remove('dragover');
}

function showError(message) {
    // Simple error display - you could enhance this with a proper modal or toast
    alert(message);
}

// Utility function to download extracted data as text file
function downloadData(data, filename) {
    const blob = new Blob([data.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to reset
    if (e.key === 'Escape') {
        resetApp();
    }
    
    // Enter key to extract data if column is selected
    if (e.key === 'Enter' && columnSelect.value !== '' && controls.style.display !== 'none') {
        extractColumnData();
    }
});
