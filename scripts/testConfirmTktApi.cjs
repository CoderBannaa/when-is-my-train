async function testApi() {
  try {
    const url = 'https://api.confirmtkt.com/api/trains/search?from=PWL&to=NDLS';
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    console.log('Status:', r.status);
    if (r.ok) {
      const data = await r.json();
      console.log('Keys:', Object.keys(data));
      console.log('Train count:', data.trainList?.length || data.data?.length);
      console.log('First 2 trains:', (data.trainList || data.data || []).slice(0, 2));
    } else {
      console.log('Error text:', (await r.text()).slice(0, 200));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testApi();
