// analytics.js
// Handles fetching data and rendering Chart.js for the Analytics view

const API_BASE = 'http://localhost:3000/api'; // Same as main.js
let currentRange = 'today';
let revenueChartInstance = null;
let peakChartInstance = null;

// Initialize Chart Defaults (Monochrome)
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748b'; // slate-500
Chart.defaults.scale.grid.color = '#f1f5f9'; // slate-100

async function fetchAnalyticsData() {
  try {
    const res = await fetch(`${API_BASE}/analytics?range=${currentRange}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      updateDashboard(data);
    } else {
      console.error('Failed to fetch analytics data');
    }
  } catch (err) {
    console.error('Error fetching analytics:', err);
  }
}

function updateDashboard(data) {
  // Update KPIs
  document.getElementById('stat-revenue').innerText = `₹${data.revenue.toLocaleString()}`;
  document.getElementById('stat-growth').innerText = data.growth;
  document.getElementById('stat-growth').className = `inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${data.growth.startsWith('+') ? 'bg-green-500' : 'bg-red-500'} text-white`;
  document.getElementById('stat-settled').innerText = data.settledOrders;
  document.getElementById('stat-cancelled').innerText = `(${data.cancelledOrders} Cancelled)`;
  document.getElementById('stat-aov').innerText = `₹${data.aov.toLocaleString()}`;
  document.getElementById('stat-prep').innerText = data.avgPrepTime;

  // Update Top Items Table
  const tbody = document.getElementById('top-items-body');
  tbody.innerHTML = '';
  if (data.topItems && data.topItems.length > 0) {
    data.topItems.forEach((item, index) => {
      let rankColor = 'text-gray-500';
      if (index === 0) rankColor = 'text-yellow-500 font-bold';
      else if (index === 1) rankColor = 'text-gray-400 font-bold';
      else if (index === 2) rankColor = 'text-amber-700 font-bold';
      
      tbody.innerHTML += `
        <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
          <td class="py-3 px-2 ${rankColor}">#${index + 1}</td>
          <td class="py-3 px-2">
            <div class="font-bold text-monochrome-900 text-sm">${item.name}</div>
            <div class="text-xs text-gray-500">${item.category}</div>
          </td>
          <td class="py-3 px-2 text-right font-medium text-gray-700">${item.units}</td>
          <td class="py-3 px-2 text-right font-bold text-monochrome-900">₹${item.revenue.toLocaleString()}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500 text-sm">No items sold in this period.</td></tr>`;
  }

  // Update Payment Bars
  if (data.payments) {
    document.getElementById('pay-upi').innerText = `${data.payments.upi}%`;
    document.getElementById('bar-upi').style.width = `${data.payments.upi}%`;
    document.getElementById('pay-card').innerText = `${data.payments.card}%`;
    document.getElementById('bar-card').style.width = `${data.payments.card}%`;
    document.getElementById('pay-cash').innerText = `${data.payments.cash}%`;
    document.getElementById('bar-cash').style.width = `${data.payments.cash}%`;
  }

  // Update Rejections
  const rejContainer = document.getElementById('rejection-list');
  rejContainer.innerHTML = '';
  if (data.rejections && data.rejections.length > 0) {
    data.rejections.forEach(rej => {
      rejContainer.innerHTML += `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
          <span class="text-sm font-medium text-gray-700">${rej.reason}</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">${rej.count}</span>
        </div>
      `;
    });
  } else {
    rejContainer.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm">No rejections recorded.</div>`;
  }

  // Update Charts
  renderRevenueChart(data.chartData);
  renderPeakChart(data.chartData);
}

function renderRevenueChart(chartData) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: chartData.revenue,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          borderWidth: 2,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#000000',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Orders',
          data: chartData.volume,
          type: 'bar',
          backgroundColor: '#e2e8f0', // slate-200
          borderRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { size: 13 },
          bodyFont: { size: 13 },
          padding: 10,
          cornerRadius: 4,
          displayColors: false,
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Revenue (₹)' },
          grid: { borderDash: [4, 4] }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Orders' },
          grid: { drawOnChartArea: false },
          beginAtZero: true
        }
      }
    }
  });
}

function renderPeakChart(chartData) {
  const ctx = document.getElementById('peakChart').getContext('2d');
  
  if (peakChartInstance) {
    peakChartInstance.destroy();
  }

  // Use the volume data to represent peak hours
  peakChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Order Volume',
        data: chartData.volume,
        backgroundColor: '#000000',
        borderRadius: 4,
        hoverBackgroundColor: '#334155'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          callbacks: {
            title: (ctx) => `Time: ${ctx[0].label}`,
            label: (ctx) => `${ctx.raw} Orders`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { 
          beginAtZero: true,
          grid: { borderDash: [4, 4] },
          ticks: { stepSize: 5 }
        }
      }
    }
  });
}

window.setDateFilter = (range, btnElement) => {
  currentRange = range;
  
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-monochrome-900', 'text-white');
    btn.classList.add('bg-monochrome-100', 'text-gray-600');
  });
  
  if (btnElement) {
    btnElement.classList.add('active', 'bg-monochrome-900', 'text-white');
    btnElement.classList.remove('bg-monochrome-100', 'text-gray-600');
  }

  // Fetch new data
  fetchAnalyticsData();
};

// Initial load
document.addEventListener('DOMContentLoaded', fetchAnalyticsData);
