const fs = require('fs');

async function test() {
  const urls = [
    'https://www.confirmtkt.com/trains/new-delhi-to-kanpur-central',
    'https://www.confirmtkt.com/trains/ndls-to-cnb',
    'https://www.confirmtkt.com/trains/delhi-to-lucknow',
    'https://erail.in/trains-between-stations/new-delhi-NDLS/kanpur-central-CNB',
  ];
  for (const u of urls) {
    try {
      console.log('Testing:', u);
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow'
      });
      console.log(u, 'Status:', res.status, 'Final URL:', res.url);
      const text = await res.text();
      const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const d = JSON.parse(match[1]);
        const pp = d.props?.pageProps;
        console.log('pp keys:', Object.keys(pp || {}));
        for (const k of Object.keys(pp || {})) {
          if (Array.isArray(pp[k])) {
            console.log(`Key ${k} array length ${pp[k].length}`);
            if (pp[k].length > 0) {
              console.log('Sample:', JSON.stringify(pp[k][0]).slice(0, 150));
            }
          }
        }
      } else {
        console.log('No NEXT_DATA. Body len:', text.length);
        // check for json or script tags containing train data
        const trainMatch = text.match(/(\[\s*\{\s*"trainNumber"[\s\S]*?\])/) || text.match(/(\[\s*\{\s*"TrainNo"[\s\S]*?\])/);
        if (trainMatch) {
          console.log('Found train json array!');
        }
      }
    } catch (e) {
      console.log(u, 'Err:', e.message);
    }
  }
}

test();
