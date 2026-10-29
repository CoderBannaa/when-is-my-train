async function inspectConfirmTkt() {
  const r = await fetch('https://www.confirmtkt.com/train-running-status/64491', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  const html = await r.text();
  const marker = 'var data = ';
  const pos = html.indexOf(marker);
  if (pos === -1) {
    console.log('marker not found');
    return;
  }
  const slice = html.substring(pos + marker.length, pos + marker.length + 5000);
  const semi = slice.indexOf(';\n');
  const rawJson = slice.substring(0, semi);
  try {
    const d = JSON.parse(rawJson);
    console.log('ConfirmTkt JSON parsed successfully!');
    console.log('Keys:', Object.keys(d));
    console.log('Train:', d.TrainNo, d.TrainName);
    console.log('CurrentStationName:', d.CurrentStationName, 'Code:', d.CurrentStationCode);
    console.log('Status:', d.Status);
    console.log('Stops count:', d.Schedule?.length);
    if (d.Schedule) {
      d.Schedule.forEach((s, i) => {
        console.log(`[${i}] ${s.StationCode} ${s.StationName}: Sch ${s.ArrivalTime}-${s.DepartureTime}, Act ${s.ActualArrival}-${s.ActualDeparture}, Delay: ${s.DelayInArrival}m, hasDeparted: ${s.hasDeparted}`);
      });
    }
  } catch (e) {
    console.log('JSON parse error, raw starts with:', rawJson.slice(0, 150));
  }
}
inspectConfirmTkt();
