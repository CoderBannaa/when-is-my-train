const fetch = globalThis.fetch;

async function check() {
  try {
    const r = await fetch('https://www.railyatri.in/live-train-status/64491', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = await r.text();
    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) {
      console.log('No next data found');
      return;
    }
    const start = html.indexOf('{', idx);
    const end = html.indexOf('</script>', start);
    const jsonStr = html.substring(start, end);
    const d = JSON.parse(jsonStr);
    const lts = d.props?.pageProps?.ltsData;
    console.log('--- LTS DATA ---');
    console.log('title:', lts.title);
    console.log('current_station_code:', lts.current_station_code);
    console.log('current_station_name:', lts.current_station_name);
    console.log('status_as_of:', lts.status_as_of);
    console.log('at_src:', lts.at_src, 'at_dstn:', lts.at_dstn, 'terminated:', lts.terminated);
    console.log('source_stn_name:', lts.source_stn_name, 'dest_stn_name:', lts.dest_stn_name);
    console.log('prevStations count:', lts.previous_stations?.length);
    console.log('upcomingStations count:', lts.upcoming_stations?.length);
    if (lts.previous_stations?.length) {
      console.log('All prev stations:', lts.previous_stations.map(s => `${s.station_code}: ${s.station_name}`));
    }
    if (lts.upcoming_stations?.length) {
      console.log('All upcoming stations:', lts.upcoming_stations.map(s => `${s.station_code}: ${s.station_name}`));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
