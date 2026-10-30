const fs = require('fs');

async function testTrain(num) {
  const url = `https://www.railyatri.in/live-train-status/${num}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    const json = JSON.parse(m[1]);
    const pp = json.props?.pageProps;
    console.log('PageProps keys:', Object.keys(pp || {}));
    console.log('LTS:', pp?.ltsData ? Object.keys(pp.ltsData) : 'null');
    console.log('TT len:', pp?.timeTableData?.length);
    if (pp?.ltsData) {
      console.log('ltsData.previous_stations len:', pp.ltsData.previous_stations?.length);
      console.log('ltsData.upcoming_stations len:', pp.ltsData.upcoming_stations?.length);
      console.log('ltsData.title:', pp.ltsData.title);
      console.log('ltsData.status_message:', pp.ltsData.status_message);
      console.log('ltsData sample:', JSON.stringify(pp.ltsData).slice(0, 300));
    }
  } else {
    console.log('No __NEXT_DATA__ match');
  }
}

testTrain('22436');
