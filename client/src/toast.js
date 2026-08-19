window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  
  let bgClass, borderClass, textClass, icon;
  switch (type) {
    case 'error':
      bgClass = 'bg-red-50';
      borderClass = 'border-red-200';
      textClass = 'text-red-800';
      icon = '⚠️';
      break;
    case 'success':
      bgClass = 'bg-emerald-50';
      borderClass = 'border-emerald-200';
      textClass = 'text-emerald-800';
      icon = '✅';
      break;
    default:
      bgClass = 'bg-white';
      borderClass = 'border-neutral-200';
      textClass = 'text-neutral-800';
      icon = 'ℹ️';
      break;
  }

  toast.className = `flex items-center gap-3 p-3.5 rounded-xl shadow-lg border ${bgClass} ${borderClass} ${textClass} pointer-events-auto transform transition-all duration-300 translate-y-[-20px] opacity-0`;
  
  toast.innerHTML = `
    <span class="text-base">${icon}</span>
    <span class="text-sm font-semibold flex-1 leading-snug">${message}</span>
    <button class="text-neutral-400 hover:text-neutral-600 focus:outline-none ml-2 text-lg leading-none shrink-0" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-20px]', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
};

window.showConfirm = function(message) {
  return new Promise((resolve) => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'flex flex-col gap-3 p-4 rounded-xl shadow-xl border bg-white border-neutral-200 pointer-events-auto transform transition-all duration-300 translate-y-[-20px] opacity-0';
    
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-xl">🤔</span>
        <span class="text-sm font-semibold text-neutral-800 leading-snug flex-1">${message}</span>
      </div>
      <div class="flex justify-end gap-2 mt-1">
        <button id="btn-confirm-cancel" class="px-4 py-1.5 rounded-lg text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">Cancel</button>
        <button id="btn-confirm-ok" class="px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-black hover:bg-neutral-800 transition-colors shadow-md">Confirm</button>
      </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    const close = (result) => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-[-20px]', 'opacity-0');
      setTimeout(() => {
        toast.remove();
        resolve(result);
      }, 300);
    };

    toast.querySelector('#btn-confirm-cancel').onclick = () => close(false);
    toast.querySelector('#btn-confirm-ok').onclick = () => close(true);
  });
};
