const sectionList = document.getElementById("sectionList");
const downloadSelectedBtn = document.getElementById("downloadSelected");
const status = document.getElementById("status");

let allData = {
  subjectName: "Course",
  sections: []
};

function sanitizeFileName(name) {
  return name
    .replace(/[\/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.+$/, "")
    .slice(0, 100);
}

function scrapeSections() {
  const sections = [];
  document.querySelectorAll('.section.main.clearfix').forEach(section => {
    const titleEl = section.querySelector('.sectionname');
    const sectionTitle = titleEl?.innerText?.trim() || "Untitled";

    const files = [];
    section.querySelectorAll('li.modtype_resource').forEach((li) => {
      const img = li.querySelector('img.activityicon');
      const isFile = img && (
        img.src.includes('/f/pdf') ||
        img.src.includes('/f/text') ||
        img.src.includes('/f/py')
      );

      if (isFile) {
        const linkEl = li.querySelector('a.aalink');
        const nameEl = li.querySelector('.instancename');
        if (linkEl && nameEl) {
          files.push({
            title: nameEl.innerText.trim(),
            url: linkEl.href
          });
        }
      }
    });

    if (files.length > 0) {
      sections.push({ sectionTitle, files });
    }
  });

  const subjectName = document.querySelector('title')?.innerText?.trim() || "Course";
  return { subjectName, sections };
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: scrapeSections,
  }, (results) => {
    const result = results?.[0]?.result;
    if (!result) {
      sectionList.innerHTML = "<li>Error loading data</li>";
      return;
    }

    allData = result;
    renderSectionsWithFiles();
  });
});
function renderSectionsWithFiles() {
  sectionList.innerHTML = "";

  allData.sections.forEach((section, sectionIndex) => {
    // Section Checkbox
    const sectionLi = document.createElement("li");
    sectionLi.classList.add("section-item");

    const sectionCheckbox = document.createElement("input");
    sectionCheckbox.type = "checkbox";
    sectionCheckbox.id = `section-${sectionIndex}`;
    sectionCheckbox.dataset.index = sectionIndex;

    const sectionLabel = document.createElement("label");
    sectionLabel.htmlFor = sectionCheckbox.id;
    sectionLabel.textContent = section.sectionTitle;

    sectionLi.appendChild(sectionCheckbox);
    sectionLi.appendChild(sectionLabel);
    sectionList.appendChild(sectionLi);

    const fileCheckboxes = [];

    // File List under section
    section.files.forEach((file, fileIndex) => {
      const fileLi = document.createElement("li");
      fileLi.classList.add("file-item");

      const fileCheckbox = document.createElement("input");
      fileCheckbox.type = "checkbox";
      fileCheckbox.id = `file-${sectionIndex}-${fileIndex}`;
      fileCheckbox.dataset.sectionIndex = sectionIndex;
      fileCheckbox.dataset.fileIndex = fileIndex;

      const fileLink = document.createElement("a");
      fileLink.href = file.url;
      fileLink.target = "_blank";
      fileLink.textContent = file.title;

      fileLi.appendChild(fileCheckbox);
      fileLi.appendChild(fileLink);
      sectionList.appendChild(fileLi);

      fileCheckboxes.push(fileCheckbox);
    });

    // Section checkbox toggles all its files
    sectionCheckbox.addEventListener("change", () => {
      fileCheckboxes.forEach(cb => {
        cb.checked = sectionCheckbox.checked;
      });
    });
  });
}

function downloadFiles(files, subject, sectionName) {
  status.textContent = `Downloading ${files.length} file(s)...`;

  files.forEach(file => {
    const safeTitle = sanitizeFileName(file.title);
    const ext = file.url.split('.').pop().split('?')[0];
    const filename = `${subject}/${sectionName}/${safeTitle}.${ext}`;

    chrome.downloads.download({
      url: file.url,
      filename,
      saveAs: false
    });
  });
}

downloadSelectedBtn.addEventListener("click", async () => {
  const selectedFiles = [];

  document.querySelectorAll('#sectionList input[type="checkbox"]').forEach(cb => {
    if (cb.checked && cb.id.startsWith("file-")) {
      const sectionIndex = parseInt(cb.dataset.sectionIndex);
      const fileIndex = parseInt(cb.dataset.fileIndex);
      const section = allData.sections[sectionIndex];
      const file = section.files[fileIndex];
      selectedFiles.push({
        ...file,
        sectionName: sanitizeFileName(section.sectionTitle)
      });
    }
  });

  if (selectedFiles.length === 0) {
    status.textContent = "No files selected.";
    return;
  }

  status.textContent = "Preparing ZIP file...";

  const subject = sanitizeFileName(allData.subjectName);
  const zip = new JSZip();

  for (const file of selectedFiles) {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const safeTitle = sanitizeFileName(file.title);
      const ext = file.url.split('.').pop().split('?')[0];
      const filePath = `${file.sectionName}/${safeTitle}.${ext}`; // fixed template literal
      zip.file(filePath, blob);
    } catch (e) {
      console.error(`Failed to fetch ${file.title}:`, e);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const zipName = `${subject}.zip`; // fixed template literal

  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = zipName;
  link.click();
  URL.revokeObjectURL(link.href);

  status.textContent = "ZIP file ready and downloaded!";
});

const selectAllCheckbox = document.getElementById("selectAllSections");

selectAllCheckbox.addEventListener("change", () => {
  const allCheckboxes = document.querySelectorAll('#sectionList input[type="checkbox"]');
  allCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
});

function syncSelectAllCheckbox() {
  const allCheckboxes = document.querySelectorAll('#sectionList input[type="checkbox"]');
  const checkedCount = [...allCheckboxes].filter(cb => cb.checked).length;
  selectAllCheckbox.checked = (checkedCount === allCheckboxes.length);
}

sectionList.addEventListener("change", syncSelectAllCheckbox);


console.log("All sections:", allData.sections);
console.log("Filtered PDFs:", pdfFiles);
