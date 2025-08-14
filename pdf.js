// Allowed file types
const validTypes = ["application/pdf", "image/jpeg", "image/png"];

// Prevent browser from opening files when dropped outside the drop area
window.addEventListener("dragover", function (e) {
    e.preventDefault();
}, false);

window.addEventListener("drop", function (e) {
    const dropAreaEl = document.getElementById('drop-area');

    // If drop is inside drop area → allow it to propagate
    if (dropAreaEl.contains(e.target)) {
        return; // Let dropArea handler run
    }

    // Otherwise, block the drop and alert if unsupported
    e.preventDefault();
    e.stopPropagation();

    const files = [...(e.dataTransfer?.files || [])];
    if (files.length && files.some(file => !validTypes.includes(file.type))) {
        alert("❌ You can only merge PDF, JPG, or PNG files.");
    }
}, false);

const { PDFDocument } = PDFLib;
let mergedPdfBytes = null;
let selectedFiles = [];

const fileElem = document.getElementById('fileElem');
const mergeBtn = document.getElementById('mergeBtn');
const downloadLink = document.getElementById('downloadLink');
const dropArea = document.getElementById('drop-area');

// Function to filter valid files
function filterValidFiles(files) {
    const validFiles = [];
    const invalidFiles = [];

    for (let file of files) {
        if (validTypes.includes(file.type)) {
            validFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    }

    if (invalidFiles.length > 0) {
        alert("❌ These file types are not supported:\n" + invalidFiles.join("\n"));
    }

    return validFiles;
}

// Prevent default browser behavior for drag events on the whole page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// Highlight body on drag over
window.addEventListener('dragover', () => document.body.classList.add('highlight'));

// Remove highlight on leave
window.addEventListener('dragleave', () => document.body.classList.remove('highlight'));

// Handle drop anywhere on the window
window.addEventListener('drop', (e) => {
    document.body.classList.remove('highlight');
    const files = filterValidFiles([...e.dataTransfer.files]);
    if (files.length > 0) {
        selectedFiles = [...selectedFiles, ...files];
        updateMergeButton();
    }
});


// Handle file input selection
fileElem.addEventListener('change', () => {
    const files = filterValidFiles([...fileElem.files]);
    if (files.length > 0) {
        selectedFiles = [...selectedFiles, ...files];
        updateMergeButton();
    }
});
function updateMergeButton() {
    mergeBtn.disabled = selectedFiles.length === 0;

    const fileList = document.getElementById("file-list");
    const fileNames = document.getElementById("file-names");

    // Update count
    fileList.querySelector("strong").textContent =
        `Number of files selected: ${selectedFiles.length}`;

    // Clear old list
    fileNames.innerHTML = "";

    // Add each file with ❌ remove button
    selectedFiles.forEach((file, index) => {
        const li = document.createElement("li");
        li.style.margin = "5px 0";

        const removeBtn = document.createElement("span");
        removeBtn.textContent = "❌";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.marginRight = "10px";
        removeBtn.style.color = "red";

        // When ❌ clicked → remove file and refresh
        removeBtn.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            updateMergeButton();
        });

        li.appendChild(removeBtn);
        li.appendChild(document.createTextNode(file.name));
        fileNames.appendChild(li);
    });
}



let downloadCount = 0; // Track number of downloads in this session

mergeBtn.addEventListener('click', async () => {
    if (!selectedFiles.length) {
        alert("Please select or drop files first.");
        return;
    }

    const mergedPdf = await PDFDocument.create();

    for (let file of selectedFiles) {
        const fileType = file.type;

        if (fileType === "application/pdf") {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        } else if (["image/jpeg", "image/png"].includes(fileType)) {
            const imgBytes = await file.arrayBuffer();
            const img = fileType === "image/png"
                ? await mergedPdf.embedPng(imgBytes)
                : await mergedPdf.embedJpg(imgBytes);

            const page = mergedPdf.addPage([img.width, img.height]);
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
    }

    mergedPdfBytes = await mergedPdf.save();

    // Generate file name
    downloadCount++;
    const fileName = downloadCount === 1 ? "dot.pdf" : `dot(${downloadCount - 1}).pdf`;

    // Create blob and download link
    const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName; // <-- Dynamic name here
    downloadLink.style.display = "inline-block";
    mergeBtn.textContent = "Merged! Ready to Download";
});
