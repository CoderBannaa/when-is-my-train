async function checkConfirmTkt() {
  try {
    const res = await fetch('https://www.confirmtkt.com/train-running-status/64491', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = await res.text();
    console.log('HTML length:', html.length);
    const scriptIdx = html.indexOf('window.data =');
    if (scriptIdx !== -1) {
      console.log('Found window.data!');
      const endIdx = html.indexOf('</script>', scriptIdx);
      console.log(html.substring(scriptIdx, scriptIdx + 250));
    } else {
      // Look for next data or state
      const nextIdx = html.indexOf('__NEXT_DATA__');
      if (nextIdx !== -1) {
        console.log('Found __NEXT_DATA__!');
      } else {
        const matches = html.match(/(NEW DELHI|PALWAL|FARIDABAD|NIZAMUDDIN)/g);
        console.log('Station matches in HTML:', matches ? matches.slice(0, 10) : 'none');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkConfirmTkt();
