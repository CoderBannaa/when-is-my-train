async function testSources() {
  // Source 1: ConfirmTkt Live Status
  try {
    const res1 = await fetch('https://services.confirmtkt.com/api/trains/64491/status', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    console.log('ConfirmTkt /status status:', res1.status);
    if (res1.ok) {
      const data = await res1.json();
      console.log('ConfirmTkt data:', JSON.stringify({
        currentStation: data.currentStationName || data.CurrentStationName,
        currentCode: data.currentStationCode || data.CurrentStationCode,
        status: data.status || data.Status,
        terminated: data.isTerminated || data.IsTerminated,
        delay: data.delay || data.Delay,
        message: data.statusMessage || data.StatusMessage,
      }));
    }
  } catch (e) {
    console.log('ConfirmTkt err:', e.message);
  }

  // Source 2: NTES public / irctc
  try {
    const res2 = await fetch('https://railways.api.gov.in/train/64491');
    console.log('Gov API status:', res2.status);
  } catch (e) {
    // expected
  }

  // Source 3: Ixigo
  try {
    const res3 = await fetch('https://www.ixigo.com/action/content/train/search/64491');
    console.log('Ixigo status:', res3.status);
  } catch (e) {}

  // Source 4: ConfirmTkt alternative endpoint
  try {
    const res4 = await fetch('https://www.confirmtkt.com/api/trains/search?from=PWL&to=NDLS');
    console.log('ConfirmTkt search status:', res4.status);
    if (res4.ok) {
      const d4 = await res4.json();
      console.log('ConfirmTkt search keys:', Object.keys(d4));
      if (d4.trainList) {
        console.log('Total trains between PWL & NDLS:', d4.trainList.length);
        const t64491 = d4.trainList.find(t => t.trainNumber === '64491' || t.TrainNo === '64491');
        console.log('Found 64491 in TBS:', !!t64491);
      }
    }
  } catch (e) {
    console.log('ConfirmTkt search err:', e.message);
  }
}

testSources();
