const fs = require('fs');

async function testRoute(from, to) {
  const u = `https://erail.in/trains-between-stations/${from}/${to}`;
  console.log('Testing', u);
  const res = await fetch(u, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    redirect: 'follow'
  });
  console.log('Status:', res.status, 'Final URL:', res.url);
  const html = await res.text();
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('Sample 1000-2000:', textOnly.slice(1000, 2000));
}

testRoute('CSMT', 'PUNE');
