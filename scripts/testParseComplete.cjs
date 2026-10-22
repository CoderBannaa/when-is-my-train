const fs = require('fs');

async function testParser(from, to) {
  const url = `https://erail.in/trains-between-stations/${from}/${to}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();

  // Match all <div class='OneTrain' ... data-train='...'>
  const regex = /<div class=['"]OneTrain['"][^>]*data-train=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/div>/g;
  let match;
  const trains = [];

  while ((match = regex.exec(html)) !== null) {
    const rawData = match[1];
    const innerHtml = match[2];
    const parts = rawData.split('_');
    if (parts.length >= 10) {
      const number = parts[0];
      const name = parts[1];
      const fromStn = parts[2];
      const toStn = parts[3];
      const depTime = parts[5];
      const arrTime = parts[7];
      const durationRaw = parts[8] || ''; // e.g. "03.25 hr"
      const distanceRaw = parts[9] || ''; // e.g. "192 km"
      const daysMask = parts[13] || '1111111'; // Mon-Sun

      // Parse duration to "XXh YYm"
      let duration = durationRaw;
      const hrMatch = durationRaw.match(/(\d+)\.(\d+)\s*hr/i);
      if (hrMatch) {
        const hrs = parseInt(hrMatch[1], 10);
        const mins = Math.round(parseFloat('0.' + hrMatch[2]) * 60);
        duration = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
      }

      // Parse classes from innerHtml
      const classMatches = [...innerHtml.matchAll(/<td>([1-3][A-Z]|CC|EC|SL|2S|EA|FC)<\/td>/g)].map(m => m[1]);
      const classes = classMatches.length > 0 ? classMatches : ['SL', '3A', '2A'];

      // Running days boolean array [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
      // daysMask is typically Mon-Sun (length 7)
      const runsOn = [
        daysMask[6] === '1', // Sun
        daysMask[0] === '1', // Mon
        daysMask[1] === '1', // Tue
        daysMask[2] === '1', // Wed
        daysMask[3] === '1', // Thu
        daysMask[4] === '1', // Fri
        daysMask[5] === '1', // Sat
      ];

      trains.push({
        id: `${number}-${fromStn}-${toStn}`,
        number,
        name,
        fromStationCode: fromStn,
        toStationCode: toStn,
        depTime,
        arrTime,
        duration,
        distance: distanceRaw,
        runsOn,
        classes,
      });
    }
  }

  console.log(`Parsed ${trains.length} trains for ${from} ➔ ${to}:`);
  console.log(trains.slice(0, 5));
}

async function run() {
  await testParser('NDLS', 'CNB');
  await testParser('CSMT', 'PUNE');
  await testParser('HWH', 'PNBE');
}

run();
