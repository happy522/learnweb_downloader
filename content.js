console.log("🔍 Scraping PDF resources...");

const pdfLinks = [];

document.querySelectorAll('li.modtype_resource').forEach((li) => {
  const img = li.querySelector('img.activityicon');
  const isPdf = img && img.src.includes('/f/pdf');

  if (isPdf) {
    const linkEl = li.querySelector('a.aalink');
    const nameEl = li.querySelector('.instancename');

    if (linkEl && nameEl) {
      pdfLinks.push({
        title: nameEl.innerText.trim(),
        url: linkEl.href
      });
    }
  }
});

console.log("📄 Found PDFs:", pdfLinks);
