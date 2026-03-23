/**
 * Converts an array of objects to a CSV string.
 * @param {Array} data - Array of objects to export.
 * @param {Array} headers - Array of objects { key, label }.
 * @returns {string}
 */
export function convertToCSV(data, headers) {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(item => {
    return headers.map(h => {
      let val = item[h.key] || '';
      // Escape commas and quotes
      if (typeof val === 'string') {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
}

/**
 * Triggers a browser download of a CSV file.
 * @param {string} csvContent - The CSV string content.
 * @param {string} filename - The name of the file to save.
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats the entire relationship history for export.
 */
export async function exportRelationshipData(activities, checkins, coupleName) {
  const activityHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Activity Type' },
    { key: 'duration', label: 'Duration (min)' },
    { key: 'notes', label: 'Notes' },
    { key: 'userName', label: 'Logged By' },
  ];

  const checkinHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'rating', label: 'Rating (1-5)' },
    { key: 'moodEmoji', label: 'Mood' },
    { key: 'message', label: 'Message' },
    { key: 'userName', label: 'Logged By' },
  ];

  const activityCSV = convertToCSV(activities, activityHeaders);
  const checkinCSV = convertToCSV(checkins, checkinHeaders);

  const combinedContent = `RELATIONSHIP HISTORY - ${coupleName.toUpperCase()}\n\n` +
    `ACTIVITIES\n${activityCSV}\n\n` +
    `DAILY CHECK-INS\n${checkinCSV}`;

  downloadCSV(combinedContent, `bond-tracker-${coupleName.toLowerCase().replace(/\s+/g, '-')}.csv`);
}

/**
 * Generates a styled HTML report and triggers the print dialog for PDF export.
 */
export function exportToPDF(activities, checkins, coupleName) {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('It looks like your browser blocked the PDF preview popup. Please allow popups for this site and try again!');
    return;
  }

  const dateStr = new Date().toLocaleDateString();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relationship History - ${coupleName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
        h1 { margin: 0; color: #4f46e5; font-size: 28px; font-family: 'Syne', sans-serif; font-weight: 800; }
        .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; font-family: 'Inter', sans-serif; }
        h2 { font-size: 18px; color: #4f46e5; margin-top: 40px; margin-bottom: 16px; border-left: 4px solid #4f46e5; padding-left: 12px; font-family: 'Syne', sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { text-align: left; background: #f8fafc; padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .emoji { font-size: 1.2em; vertical-align: middle; margin-right: 4px; }
        .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bond Tracker History</h1>
        <div class="subtitle">${coupleName} • Generated on ${dateStr}</div>
      </div>

      <h2>Activity Feed</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Duration</th>
            <th>Logged By</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${activities.map(a => `
            <tr>
              <td>${a.date ? new Date(a.date).toLocaleDateString() : '-'}</td>
              <td>${a.type || 'Activity'}</td>
              <td>${a.duration || 0} min</td>
              <td>${a.userName || 'Unknown'}</td>
              <td>${a.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Daily Reflections</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Mood</th>
            <th>Rating</th>
            <th>Logged By</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${checkins.map(c => `
            <tr>
              <td>${c.date ? new Date(c.date).toLocaleDateString() : '-'}</td>
              <td><span class="emoji">${c.moodEmoji || '✨'}</span></td>
              <td>${'❤️'.repeat(c.rating || 0) || '-'}</td>
              <td>${c.userName || 'Partner'}</td>
              <td>${c.message || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Generated by AstraBond Tracker • Your stories, kept forever.
      </div>

      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

