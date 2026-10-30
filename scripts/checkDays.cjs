async function checkMulti(trains) {
  for (const t of trains) {
    for (const day of [1, 2, 0]) {
      const url = `https://www.railyatri.in/live-train-status/${t}?start_day=${day}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (m) {
        const j = JSON.parse(m[1]);
        const lts = j.props?.pageProps?.ltsData;
        const tt = j.props?.pageProps?.timeTableData?.[0]?.route;
        const stops = (lts?.previous_stations?.length || 0) + (lts?.upcoming_stations?.length || 0);
        if (stops > 0 || (tt && tt.length > 0)) {
          console.log(`Train ${t} (Day ${day}): ${lts?.train_name || 'Train'}, cur=${lts?.current_station_name}, stops=${stops || tt?.length}`);
          break;
        }
      }
    }
  }
}
checkMulti(['12417', '12951', '12301', '12004', '22436']);
