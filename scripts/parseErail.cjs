const fs = require('fs');

async function test() {
  const u = 'https://erail.in/trains-between-stations/new-delhi-NDLS/kanpur-central-CNB';
  const res = await fetch(u, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  
  // Strip tags and print first 1000 characters of meaningful content
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('Text snippet 1000-3000:', textOnly.slice(1000, 3000));
}

test();
