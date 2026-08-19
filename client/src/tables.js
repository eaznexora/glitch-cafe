document.addEventListener('DOMContentLoaded', () => {
  renderTables();
});

const tables = [
  { id: '1', name: 'Table 1', status: 'Available' },
  { id: '2', name: 'Table 2', status: 'Available' },
  { id: '3', name: 'Table 3', status: 'Available' },
  { id: '4', name: 'Table 4', status: 'Available' },
  { id: '5', name: 'Table 5', status: 'Available' },
];

function renderTables() {
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = '';

  tables.forEach(table => {
    const card = document.createElement('div');
    card.className = 'bg-monochrome-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-between transition-shadow hover:shadow-md';
    
    // URL encoded for the QR
    const tokenObj = { table: table.id, salt: Date.now() };
    const tokenStr = btoa(JSON.stringify(tokenObj));
    const qrUrl = `${window.location.origin}${window.BASE_PATH}/customer.html?token=${tokenStr}`;

    card.innerHTML = `
      <div class="w-full flex justify-between items-start mb-4">
        <h3 class="text-lg font-bold text-monochrome-900">${table.name}</h3>
        <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">${table.status}</span>
      </div>
      
      <div class="bg-gray-50 p-4 rounded-lg mb-4 w-full flex justify-center border border-gray-100">
        <div id="qr-${table.id}"></div>
      </div>
      
      <button onclick="downloadQR('${table.id}', '${table.name}')" class="btn-primary w-full flex items-center justify-center gap-2">
        <i data-lucide="download" class="h-4 w-4"></i> Download QR
      </button>
    `;
    
    grid.appendChild(card);
    
    // Generate QR Code
    new QRCode(document.getElementById(`qr-${table.id}`), {
      text: qrUrl,
      width: 128,
      height: 128,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
  });
  
  lucide.createIcons();
}

function downloadQR(id, name) {
  const qrContainer = document.getElementById(`qr-${id}`);
  const img = qrContainer.querySelector('img');
  
  if (img && img.src) {
    const link = document.createElement('a');
    link.download = `Glitch_Cafe_${name.replace(/\s+/g, '_')}_QR.png`;
    link.href = img.src;
    link.click();
  } else {
    // If rendered as canvas instead of img
    const canvas = qrContainer.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `Glitch_Cafe_${name.replace(/\s+/g, '_')}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  }
}
