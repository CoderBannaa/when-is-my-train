const fs = require('fs');

function parseTimeToMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.trim().split(' ');
  const [hStr, mStr] = parts[0].split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const mer = parts[1]?.toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

async function checkCompletion() {
  const r = await fetch('https://www.railyatri.in/live-train-status/64491', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  const html = await r.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  const nextData = JSON.parse(match[1]);
  const lts = nextData.props?.pageProps?.ltsData;
  const prevStations = lts.previous_stations || [];
  const upStations = lts.upcoming_stations || [];

  const allStations = [];
  for (const s of prevStations) {
    if (s.station_code) allStations.push({ code: s.station_code, name: s.station_name, sta: s.sta, std: s.std, eta: s.eta, etd: s.etd, status: 'departed' });
  }
  if (lts.current_station_code) {
    allStations.push({ code: lts.current_station_code, name: lts.current_station_name, sta: lts.cur_stn_sta, std: lts.cur_stn_std, eta: lts.cur_stn_sta, etd: lts.cur_stn_std, status: 'current' });
  }
  for (const s of upStations) {
    if (s.station_code && s.station_code !== lts.current_station_code) {
      allStations.push({ code: s.station_code, name: s.station_name, sta: s.sta, std: s.std, eta: s.eta, etd: s.etd, status: 'upcoming' });
    }
  }

  // Current IST time
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
  const currentIstMinutes = istDate.getHours() * 60 + istDate.getMinutes();

  const destStation = allStations[allStations.length - 1];
  const destArrStr = destStation?.eta || destStation?.sta || '10:00';
  const destMins = parseTimeToMinutes(destArrStr);

  const statusAsOf = String(lts.status_as_of || '');
  const isStaleByHours = statusAsOf.includes('hr') || statusAsOf.includes('hour');
  let minsPastDest = currentIstMinutes - destMins;
  if (minsPastDest < -720) minsPastDest += 1440;

  const currentIdx = allStations.findIndex(s => s.code === lts.current_station_code);
  const routeProgress = currentIdx >= 0 ? currentIdx / allStations.length : 0;

  const isCompleted = lts.terminated || lts.at_dstn || lts.title === 'Train Run Complete' ||
    (minsPastDest > 20 && (isStaleByHours || routeProgress >= 0.70)) || minsPastDest > 90;

  console.log({
    currentIstTime: `${istDate.getHours()}:${istDate.getMinutes()}`,
    currentIstMinutes,
    destStation: destStation?.name,
    destTime: destArrStr,
    destMins,
    minsPastDest,
    isStaleByHours,
    routeProgress: Math.round(routeProgress * 100) + '%',
    isCompleted,
  });

  if (isCompleted) {
    // Advance to destination!
    allStations.forEach(s => s.status = 'departed');
    destStation.status = 'current';
    console.log('RESULT AFTER AUTO-COMPLETION:');
    console.log('Active Station:', destStation.name, `(${destStation.code})`);
    console.log('Status: ARRIVED at Destination / Journey Completed');
    console.log('All intermediate stations marked departed: true');
  }
}

checkCompletion();
