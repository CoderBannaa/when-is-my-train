const fs = require('fs');

async function test() {
  try {
    const r = await fetch('https://erail.in/trains-between-stations/PWL/NDLS', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    console.log('Status:', r.status);
    const html = await r.text();
    const regex = /<div class=['"]OneTrain['"][^>]*data-train=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/div>/g;
    let m;
    let count = 0;
    while ((m = regex.exec(html)) !== null) {
      count++;
      const parts = m[1].split('_');
      if (count <= 5) console.log(`Train ${count}:`, parts[0], parts[1], 'Dep:', parts[5], 'Arr:', parts[7]);
    }
    console.log('Total authentic trains found for PWL ➔ NDLS:', count);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
