const fs = require('fs');

async function inspectHtml() {
  const u = 'https://erail.in/trains-between-stations/CSMT/PUNE';
  const res = await fetch(u, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    redirect: 'follow'
  });
  const html = await res.text();
  
  // Find where the train items start
  const idx = html.indexOf('01013');
  console.log('Index of 01013:', idx);
  if (idx !== -1) {
    console.log('Surrounding HTML (500 before, 1000 after):');
    console.log(html.slice(Math.max(0, idx - 200), idx + 1000));
  }
}

inspectHtml();
