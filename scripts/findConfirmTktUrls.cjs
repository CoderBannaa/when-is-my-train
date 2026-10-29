async function findUrls() {
  const r = await fetch('https://www.confirmtkt.com/train-running-status/64491', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await r.text();
  const regex = /https?:\/\/[a-zA-Z0-9.\-_/]+/g;
  const urls = html.match(regex) || [];
  const filtered = urls.filter(u => u.includes('api') || u.includes('train') || u.includes('status'));
  console.log('Filtered URLs:', [...new Set(filtered)].slice(0, 30));
}

findUrls();
