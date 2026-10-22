const fs = require('fs');

async function test() {
  const trainNo = '22436';
  const res = await fetch(`https://www.railyatri.in/live-train-status/${trainNo}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const scriptRegex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
  const match = html.match(scriptRegex);
  if (match) {
    const nextData = JSON.parse(match[1]);
    const lts = nextData.props?.pageProps?.ltsData;
    const prev = (lts.previous_stations || []).filter(s => s.station_code);
    const up = (lts.upcoming_stations || []).filter(s => s.station_code);
    console.log('Passed stops:', prev.map(s => `${s.station_code} (${s.station_name}): STA=${s.sta}, ETA=${s.eta}, delay=${s.arrival_delay}m, pf=${s.platform_number}`));
    console.log('Current:', lts.current_station_code, lts.current_station_name);
    console.log('Upcoming stops:', up.map(s => `${s.station_code} (${s.station_name}): STA=${s.sta}, ETA=${s.eta}, delay=${s.arrival_delay}m, pf=${s.platform_number}`));
  }
}

test().catch(console.error);
