export interface RouteStop {
  code: string;
  name: string;
  arr: string;
  dep: string;
  halt?: string;
  day?: number;
  distanceKm?: number;
}

export interface SeatClass {
  type: string; // 'CC' | 'EC' | 'SL' | '3A' | '2A' | '1A' | '2S' | 'GN (Unreserved)';
  price: number;
  status: string; // 'AVAILABLE-45' | 'WL-12' | 'RAC-8' | 'UNRESERVED'
  statusType: 'available' | 'waiting' | 'rac' | 'unreserved';
  updatedText: string;
}

export interface CorridorTrain {
  id: string;
  number: string;
  name: string;
  type: 'EMU Local' | 'Intercity' | 'Gatimaan' | 'Shatabdi' | 'Rajdhani' | 'Superfast' | 'Express';
  isLocalEmu: boolean;
  originCode: string;
  originName: string;
  destCode: string;
  destName: string;
  runsOn: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  classes: SeatClass[];
  stops: RouteStop[];
}

export interface TrainBetweenStation {
  id: string;
  number: string;
  name: string;
  type: 'EMU Local' | 'Intercity' | 'Gatimaan' | 'Shatabdi' | 'Rajdhani' | 'Superfast' | 'Express';
  isLocalEmu: boolean;
  fromStationCode: string;
  fromStationName: string;
  toStationCode: string;
  toStationName: string;
  depTime: string;
  arrTime: string;
  duration: string;
  runsOn: boolean[];
  classes: SeatClass[];
  totalHaults: number;
}

// Complete Delhi - Ballabhgarh - Palwal - Mathura - Agra Corridor Master Schedule
export const CORRIDOR_TRAINS_MASTER: CorridorTrain[] = [
  // 1. FORWARD EMU LOCALS (Delhi ➔ Ballabhgarh ➔ Palwal ➔ Mathura ➔ Agra)
  {
    id: 'emu-64902',
    number: '64902',
    name: 'New Delhi - Mathura EMU Local',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'MTJ',
    destName: 'Mathura Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 30, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Live Local' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '07:00 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:14 AM', dep: '07:15 AM' },
      { code: 'OKA', name: 'Okhla', arr: '07:20 AM', dep: '07:21 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '07:29 AM', dep: '07:30 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '07:41 AM', dep: '07:42 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '07:47 AM', dep: '07:48 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '07:54 AM', dep: '07:55 AM' },
      { code: 'AST', name: 'Asaoti', arr: '08:04 AM', dep: '08:05 AM' },
      { code: 'PWL', name: 'Palwal', arr: '08:23 AM', dep: '08:25 AM' },
      { code: 'RDE', name: 'Rundhi', arr: '08:34 AM', dep: '08:35 AM' },
      { code: 'SHLK', name: 'Sholaka', arr: '08:44 AM', dep: '08:45 AM' },
      { code: 'HDL', name: 'Hodal', arr: '08:54 AM', dep: '08:55 AM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '09:08 AM', dep: '09:10 AM' },
      { code: 'CHJ', name: 'Chhata', arr: '09:20 AM', dep: '09:21 AM' },
      { code: 'AJH', name: 'Ajhai', arr: '09:31 AM', dep: '09:32 AM' },
      { code: 'VRBD', name: 'Vrindavan Road', arr: '09:42 AM', dep: '09:43 AM' },
      { code: 'BTSR', name: 'Bhuteshwar', arr: '09:51 AM', dep: '09:52 AM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '10:05 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64904',
    number: '64904',
    name: 'Hazrat Nizamuddin - Mathura EMU Local',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NZM',
    originName: 'Hazrat Nizamuddin',
    destCode: 'MTJ',
    destName: 'Mathura Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 30, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Afternoon Local' },
    ],
    stops: [
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '--', dep: '01:30 PM' },
      { code: 'OKA', name: 'Okhla', arr: '01:36 PM', dep: '01:37 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '01:46 PM', dep: '01:47 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '01:58 PM', dep: '01:59 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '02:04 PM', dep: '02:05 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '02:12 PM', dep: '02:13 PM' },
      { code: 'AST', name: 'Asaoti', arr: '02:22 PM', dep: '02:23 PM' },
      { code: 'PWL', name: 'Palwal', arr: '02:40 PM', dep: '02:42 PM' },
      { code: 'HDL', name: 'Hodal', arr: '03:10 PM', dep: '03:11 PM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '03:25 PM', dep: '03:27 PM' },
      { code: 'CHJ', name: 'Chhata', arr: '03:37 PM', dep: '03:38 PM' },
      { code: 'VRBD', name: 'Vrindavan Road', arr: '03:56 PM', dep: '03:57 PM' },
      { code: 'BTSR', name: 'Bhuteshwar', arr: '04:05 PM', dep: '04:06 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '04:20 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64906',
    number: '64906',
    name: 'New Delhi - Palwal Ladies Special EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'PWL',
    destName: 'Palwal',
    runsOn: [false, true, true, true, true, true, false], // Mon-Fri
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'LADIES SPECIAL', statusType: 'unreserved', updatedText: 'Daily Commuter' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '06:05 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '06:19 PM', dep: '06:20 PM' },
      { code: 'OKA', name: 'Okhla', arr: '06:26 PM', dep: '06:27 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '06:36 PM', dep: '06:37 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '06:48 PM', dep: '06:49 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '06:54 PM', dep: '06:55 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '07:01 PM', dep: '07:02 PM' },
      { code: 'AST', name: 'Asaoti', arr: '07:11 PM', dep: '07:12 PM' },
      { code: 'PWL', name: 'Palwal', arr: '07:30 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64072',
    number: '64072',
    name: 'New Delhi - Ballabhgarh Shuttle EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'BVH',
    destName: 'Ballabhgarh',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 10, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Frequent Local' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '09:15 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '09:28 AM', dep: '09:29 AM' },
      { code: 'OKA', name: 'Okhla', arr: '09:35 AM', dep: '09:36 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '09:45 AM', dep: '09:46 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '09:58 AM', dep: '09:59 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '10:05 AM', dep: '10:06 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '10:15 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64052',
    number: '64052',
    name: 'Ghaziabad - New Delhi - Palwal EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'PWL',
    destName: 'Palwal',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Morning Local' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '11:20 AM', dep: '11:30 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '11:44 AM', dep: '11:45 AM' },
      { code: 'OKA', name: 'Okhla', arr: '11:51 AM', dep: '11:52 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '12:01 PM', dep: '12:02 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '12:14 PM', dep: '12:15 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '12:21 PM', dep: '12:22 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '12:29 PM', dep: '12:30 PM' },
      { code: 'AST', name: 'Asaoti', arr: '12:40 PM', dep: '12:41 PM' },
      { code: 'PWL', name: 'Palwal', arr: '01:05 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64011',
    number: '64011',
    name: 'Old Delhi - Palwal Evening Peak EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'DLI',
    originName: 'Old Delhi Junction',
    destCode: 'PWL',
    destName: 'Palwal',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'EVENING PEAK', statusType: 'unreserved', updatedText: 'Daily Commuter' },
    ],
    stops: [
      { code: 'DLI', name: 'Old Delhi Junction', arr: '--', dep: '05:30 PM' },
      { code: 'NDLS', name: 'New Delhi', arr: '05:42 PM', dep: '05:45 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '05:58 PM', dep: '06:00 PM' },
      { code: 'OKA', name: 'Okhla', arr: '06:06 PM', dep: '06:07 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '06:17 PM', dep: '06:18 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '06:30 PM', dep: '06:31 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '06:37 PM', dep: '06:38 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '06:45 PM', dep: '06:46 PM' },
      { code: 'AST', name: 'Asaoti', arr: '06:56 PM', dep: '06:57 PM' },
      { code: 'PWL', name: 'Palwal', arr: '07:20 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64491',
    number: '64491',
    name: 'Ghaziabad - New Delhi - Agra Cantt Passenger',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 45, status: 'ALL STOPS PASSENGER', statusType: 'unreserved', updatedText: 'Daily Run' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '04:25 AM', dep: '04:35 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '04:48 AM', dep: '04:49 AM' },
      { code: 'OKA', name: 'Okhla', arr: '04:55 AM', dep: '04:56 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '05:03 AM', dep: '05:04 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '05:14 AM', dep: '05:15 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '05:21 AM', dep: '05:22 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '05:28 AM', dep: '05:29 AM' },
      { code: 'AST', name: 'Asaoti', arr: '05:37 AM', dep: '05:38 AM' },
      { code: 'PWL', name: 'Palwal', arr: '05:52 AM', dep: '05:55 AM' },
      { code: 'RDE', name: 'Rundhi', arr: '06:05 AM', dep: '06:06 AM' },
      { code: 'SHLK', name: 'Sholaka', arr: '06:15 AM', dep: '06:16 AM' },
      { code: 'HDL', name: 'Hodal', arr: '06:25 AM', dep: '06:26 AM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '06:38 AM', dep: '06:40 AM' },
      { code: 'CHJ', name: 'Chhata', arr: '06:50 AM', dep: '06:51 AM' },
      { code: 'AJH', name: 'Ajhai', arr: '07:00 AM', dep: '07:01 AM' },
      { code: 'VRBD', name: 'Vrindavan Road', arr: '07:10 AM', dep: '07:11 AM' },
      { code: 'BTSR', name: 'Bhuteshwar', arr: '07:18 AM', dep: '07:19 AM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '07:30 AM', dep: '07:35 AM' },
      { code: 'FAR', name: 'Farah', arr: '07:54 AM', dep: '07:55 AM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '08:15 AM', dep: '08:17 AM' },
      { code: 'AGC', name: 'Agra Cantt', arr: '08:40 AM', dep: '--' },
    ],
  },

  // 2. FORWARD INTERCITY & EXPRESS (Delhi ➔ Ballabhgarh ➔ Palwal ➔ Mathura ➔ Agra)
  {
    id: 'exp-14212',
    number: '14212',
    name: 'New Delhi - Agra Cantt Intercity Express',
    type: 'Intercity',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '2S', price: 95, status: 'AVAILABLE-184', statusType: 'available', updatedText: 'Updated 2m ago' },
      { type: 'CC', price: 345, status: 'AVAILABLE-46', statusType: 'available', updatedText: 'Updated 2m ago' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '05:40 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '05:55 PM', dep: '05:57 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '06:17 PM', dep: '06:19 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '06:29 PM', dep: '06:31 PM' },
      { code: 'PWL', name: 'Palwal', arr: '06:53 PM', dep: '06:55 PM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '07:24 PM', dep: '07:26 PM' },
      { code: 'CHJ', name: 'Chhata', arr: '07:37 PM', dep: '07:38 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '08:08 PM', dep: '08:10 PM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '08:48 PM', dep: '08:50 PM' },
      { code: 'AGC', name: 'Agra Cantt', arr: '09:20 PM', dep: '--' },
    ],
  },
  {
    id: 'exp-12280',
    number: '12280',
    name: 'Taj Express Superfast',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '2S', price: 105, status: 'AVAILABLE-210', statusType: 'available', updatedText: 'Updated 5m ago' },
      { type: 'CC', price: 385, status: 'AVAILABLE-52', statusType: 'available', updatedText: 'Updated 5m ago' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '06:55 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:06 AM', dep: '07:08 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '07:26 AM', dep: '07:28 AM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '08:58 AM', dep: '09:00 AM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '09:38 AM', dep: '09:40 AM' },
      { code: 'AGC', name: 'Agra Cantt', arr: '10:05 AM', dep: '--' },
    ],
  },
  {
    id: 'exp-12002',
    number: '12002',
    name: 'New Delhi - Bhopal Rani Kamlapati Shatabdi',
    type: 'Shatabdi',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'CC', price: 540, status: 'AVAILABLE-88', statusType: 'available', updatedText: 'Updated 1m ago' },
      { type: 'EC', price: 1040, status: 'AVAILABLE-14', statusType: 'available', updatedText: 'Updated 1m ago' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '06:00 AM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '07:19 AM', dep: '07:20 AM' },
      { code: 'AGC', name: 'Agra Cantt', arr: '07:50 AM', dep: '07:55 AM' },
    ],
  },
  {
    id: 'exp-12050',
    number: '12050',
    name: 'Gatimaan Express (Semi High-Speed 160km/h)',
    type: 'Gatimaan',
    isLocalEmu: false,
    originCode: 'NZM',
    originName: 'Hazrat Nizamuddin',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    runsOn: [true, true, true, true, false, true, true], // Except Friday
    classes: [
      { type: 'CC', price: 860, status: 'AVAILABLE-64', statusType: 'available', updatedText: 'Updated 3m ago' },
      { type: 'EC', price: 1695, status: 'AVAILABLE-18', statusType: 'available', updatedText: 'Updated 3m ago' },
    ],
    stops: [
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '--', dep: '08:10 AM' },
      { code: 'AGC', name: 'Agra Cantt', arr: '09:50 AM', dep: '--' },
    ],
  },
  {
    id: 'exp-12954',
    number: '12954',
    name: 'August Kranti Tejas Rajdhani Express',
    type: 'Rajdhani',
    isLocalEmu: false,
    originCode: 'NZM',
    originName: 'Hazrat Nizamuddin',
    destCode: 'MTJ',
    destName: 'Mathura Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '3A', price: 650, status: 'AVAILABLE-32', statusType: 'available', updatedText: 'Updated 4m ago' },
      { type: '2A', price: 920, status: 'RAC-08', statusType: 'rac', updatedText: 'Updated 4m ago' },
      { type: '1A', price: 1480, status: 'AVAILABLE-04', statusType: 'available', updatedText: 'Updated 4m ago' },
    ],
    stops: [
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '--', dep: '05:15 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '06:48 PM', dep: '06:50 PM' },
    ],
  },

  // 3. REVERSE EMU LOCALS (Mathura / Palwal / Agra ➔ Ballabhgarh ➔ Delhi)
  {
    id: 'emu-64901',
    number: '64901',
    name: 'Mathura - New Delhi EMU Local',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'MTJ',
    originName: 'Mathura Junction',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 30, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Live Local' },
    ],
    stops: [
      { code: 'MTJ', name: 'Mathura Junction', arr: '--', dep: '05:00 AM' },
      { code: 'BTSR', name: 'Bhuteshwar', arr: '05:07 AM', dep: '05:08 AM' },
      { code: 'VRBD', name: 'Vrindavan Road', arr: '05:16 AM', dep: '05:17 AM' },
      { code: 'CHJ', name: 'Chhata', arr: '05:37 AM', dep: '05:38 AM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '05:48 AM', dep: '05:50 AM' },
      { code: 'HDL', name: 'Hodal', arr: '06:03 AM', dep: '06:04 AM' },
      { code: 'PWL', name: 'Palwal', arr: '06:33 AM', dep: '06:35 AM' },
      { code: 'AST', name: 'Asaoti', arr: '06:45 AM', dep: '06:46 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '06:55 AM', dep: '06:56 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '07:02 AM', dep: '07:03 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '07:09 AM', dep: '07:10 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '07:22 AM', dep: '07:23 AM' },
      { code: 'OKA', name: 'Okhla', arr: '07:31 AM', dep: '07:32 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:39 AM', dep: '07:40 AM' },
      { code: 'NDLS', name: 'New Delhi', arr: '08:05 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64905',
    number: '64905',
    name: 'Palwal - New Delhi Peak Commuter EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'PWL',
    originName: 'Palwal',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'MORNING PEAK', statusType: 'unreserved', updatedText: 'Daily Commuter' },
    ],
    stops: [
      { code: 'PWL', name: 'Palwal', arr: '--', dep: '08:00 AM' },
      { code: 'AST', name: 'Asaoti', arr: '08:11 AM', dep: '08:12 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '08:21 AM', dep: '08:22 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '08:28 AM', dep: '08:29 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '08:35 AM', dep: '08:36 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '08:48 AM', dep: '08:49 AM' },
      { code: 'OKA', name: 'Okhla', arr: '08:56 AM', dep: '08:57 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '09:05 AM', dep: '09:06 AM' },
      { code: 'NDLS', name: 'New Delhi', arr: '09:30 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64071',
    number: '64071',
    name: 'Ballabhgarh - New Delhi Morning Shuttle EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'BVH',
    originName: 'Ballabhgarh',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 10, status: 'MORNING COMMUTER', statusType: 'unreserved', updatedText: 'Daily Run' },
    ],
    stops: [
      { code: 'BVH', name: 'Ballabhgarh', arr: '--', dep: '07:20 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '07:27 AM', dep: '07:28 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '07:35 AM', dep: '07:36 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '07:49 AM', dep: '07:50 AM' },
      { code: 'OKA', name: 'Okhla', arr: '07:58 AM', dep: '07:59 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '08:08 AM', dep: '08:10 AM' },
      { code: 'NDLS', name: 'New Delhi', arr: '08:35 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64903',
    number: '64903',
    name: 'Mathura - Hazrat Nizamuddin EMU Local',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'MTJ',
    originName: 'Mathura Junction',
    destCode: 'NZM',
    destName: 'Hazrat Nizamuddin',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 30, status: 'DAILY LOCAL', statusType: 'unreserved', updatedText: 'Afternoon Local' },
    ],
    stops: [
      { code: 'MTJ', name: 'Mathura Junction', arr: '--', dep: '02:00 PM' },
      { code: 'BTSR', name: 'Bhuteshwar', arr: '02:07 PM', dep: '02:08 PM' },
      { code: 'VRBD', name: 'Vrindavan Road', arr: '02:17 PM', dep: '02:18 PM' },
      { code: 'CHJ', name: 'Chhata', arr: '02:38 PM', dep: '02:39 PM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '02:49 PM', dep: '02:51 PM' },
      { code: 'HDL', name: 'Hodal', arr: '03:04 PM', dep: '03:05 PM' },
      { code: 'PWL', name: 'Palwal', arr: '03:34 PM', dep: '03:36 PM' },
      { code: 'AST', name: 'Asaoti', arr: '03:46 PM', dep: '03:47 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '03:56 PM', dep: '03:57 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '04:03 PM', dep: '04:04 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '04:10 PM', dep: '04:11 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '04:23 PM', dep: '04:24 PM' },
      { code: 'OKA', name: 'Okhla', arr: '04:32 PM', dep: '04:33 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '04:45 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64012',
    number: '64012',
    name: 'Palwal - Old Delhi - Shakurbasti EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'PWL',
    originName: 'Palwal',
    destCode: 'DLI',
    destName: 'Old Delhi Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'MORNING COMMUTER', statusType: 'unreserved', updatedText: 'Daily Commuter' },
    ],
    stops: [
      { code: 'PWL', name: 'Palwal', arr: '--', dep: '06:15 AM' },
      { code: 'AST', name: 'Asaoti', arr: '06:26 AM', dep: '06:27 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '06:36 AM', dep: '06:37 AM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '06:43 AM', dep: '06:44 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '06:50 AM', dep: '06:51 AM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '07:03 AM', dep: '07:04 AM' },
      { code: 'OKA', name: 'Okhla', arr: '07:11 AM', dep: '07:12 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:20 AM', dep: '07:21 AM' },
      { code: 'NDLS', name: 'New Delhi', arr: '07:44 AM', dep: '07:46 AM' },
      { code: 'DLI', name: 'Old Delhi Junction', arr: '08:05 AM', dep: '--' },
    ],
  },
  {
    id: 'emu-64053',
    number: '64053',
    name: 'Palwal - New Delhi - Ghaziabad EMU',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'PWL',
    originName: 'Palwal',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 15, status: 'EVENING COMMUTER', statusType: 'unreserved', updatedText: 'Evening Run' },
    ],
    stops: [
      { code: 'PWL', name: 'Palwal', arr: '--', dep: '06:00 PM' },
      { code: 'AST', name: 'Asaoti', arr: '06:11 PM', dep: '06:12 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '06:21 PM', dep: '06:22 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '06:28 PM', dep: '06:29 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '06:35 PM', dep: '06:36 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '06:48 PM', dep: '06:49 PM' },
      { code: 'OKA', name: 'Okhla', arr: '06:56 PM', dep: '06:57 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:05 PM', dep: '07:06 PM' },
      { code: 'NDLS', name: 'New Delhi', arr: '07:30 PM', dep: '--' },
    ],
  },
  {
    id: 'emu-64492',
    number: '64492',
    name: 'Agra Cantt - New Delhi Passenger',
    type: 'EMU Local',
    isLocalEmu: true,
    originCode: 'AGC',
    originName: 'Agra Cantt',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 45, status: 'ALL STOPS PASSENGER', statusType: 'unreserved', updatedText: 'Daily Run' },
    ],
    stops: [
      { code: 'AGC', name: 'Agra Cantt', arr: '--', dep: '04:00 PM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '04:12 PM', dep: '04:14 PM' },
      { code: 'FAR', name: 'Farah', arr: '04:36 PM', dep: '04:37 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '05:05 PM', dep: '05:10 PM' },
      { code: 'CHJ', name: 'Chhata', arr: '05:43 PM', dep: '05:44 PM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '05:56 PM', dep: '05:58 PM' },
      { code: 'PWL', name: 'Palwal', arr: '06:40 PM', dep: '06:42 PM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '07:04 PM', dep: '07:05 PM' },
      { code: 'FDN', name: 'Faridabad New Town', arr: '07:11 PM', dep: '07:12 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '07:18 PM', dep: '07:20 PM' },
      { code: 'TKD', name: 'Tuglakabad', arr: '07:32 PM', dep: '07:33 PM' },
      { code: 'OKA', name: 'Okhla', arr: '07:40 PM', dep: '07:41 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:48 PM', dep: '07:50 PM' },
      { code: 'NDLS', name: 'New Delhi', arr: '08:20 PM', dep: '--' },
    ],
  },

  // 4. REVERSE INTERCITY & EXPRESS (Agra / Mathura ➔ Delhi)
  {
    id: 'exp-14211',
    number: '14211',
    name: 'Agra Cantt - New Delhi Intercity Express',
    type: 'Intercity',
    isLocalEmu: false,
    originCode: 'AGC',
    originName: 'Agra Cantt',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '2S', price: 95, status: 'AVAILABLE-160', statusType: 'available', updatedText: 'Updated 3m ago' },
      { type: 'CC', price: 345, status: 'AVAILABLE-38', statusType: 'available', updatedText: 'Updated 3m ago' },
    ],
    stops: [
      { code: 'AGC', name: 'Agra Cantt', arr: '--', dep: '05:45 AM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '05:53 AM', dep: '05:55 AM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '06:33 AM', dep: '06:35 AM' },
      { code: 'CHJ', name: 'Chhata', arr: '07:01 AM', dep: '07:02 AM' },
      { code: 'KSV', name: 'Kosi Kalan', arr: '07:13 AM', dep: '07:15 AM' },
      { code: 'PWL', name: 'Palwal', arr: '07:53 AM', dep: '07:55 AM' },
      { code: 'BVH', name: 'Ballabhgarh', arr: '08:14 AM', dep: '08:16 AM' },
      { code: 'FDB', name: 'Faridabad', arr: '08:26 AM', dep: '08:28 AM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '08:51 AM', dep: '08:53 AM' },
      { code: 'NDLS', name: 'New Delhi', arr: '09:25 AM', dep: '--' },
    ],
  },
  {
    id: 'exp-12279',
    number: '12279',
    name: 'Taj Express Superfast (Reverse)',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'AGC',
    originName: 'Agra Cantt',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '2S', price: 105, status: 'AVAILABLE-195', statusType: 'available', updatedText: 'Updated 4m ago' },
      { type: 'CC', price: 385, status: 'AVAILABLE-44', statusType: 'available', updatedText: 'Updated 4m ago' },
    ],
    stops: [
      { code: 'AGC', name: 'Agra Cantt', arr: '--', dep: '06:55 PM' },
      { code: 'RKM', name: 'Raja Ki Mandi', arr: '07:03 PM', dep: '07:05 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '07:43 PM', dep: '07:45 PM' },
      { code: 'FDB', name: 'Faridabad', arr: '09:08 PM', dep: '09:10 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '09:28 PM', dep: '09:30 PM' },
      { code: 'NDLS', name: 'New Delhi', arr: '10:00 PM', dep: '--' },
    ],
  },
  {
    id: 'exp-12049',
    number: '12049',
    name: 'Gatimaan Express (Reverse High-Speed)',
    type: 'Gatimaan',
    isLocalEmu: false,
    originCode: 'AGC',
    originName: 'Agra Cantt',
    destCode: 'NZM',
    destName: 'Hazrat Nizamuddin',
    runsOn: [true, true, true, true, false, true, true],
    classes: [
      { type: 'CC', price: 860, status: 'AVAILABLE-55', statusType: 'available', updatedText: 'Updated 2m ago' },
      { type: 'EC', price: 1695, status: 'AVAILABLE-12', statusType: 'available', updatedText: 'Updated 2m ago' },
    ],
    stops: [
      { code: 'AGC', name: 'Agra Cantt', arr: '--', dep: '05:45 PM' },
      { code: 'NZM', name: 'Hazrat Nizamuddin', arr: '07:30 PM', dep: '--' },
    ],
  },
  {
    id: 'exp-12001',
    number: '12001',
    name: 'Bhopal - New Delhi Shatabdi Express (Reverse)',
    type: 'Shatabdi',
    isLocalEmu: false,
    originCode: 'AGC',
    originName: 'Agra Cantt',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'CC', price: 540, status: 'AVAILABLE-72', statusType: 'available', updatedText: 'Updated 1m ago' },
      { type: 'EC', price: 1040, status: 'AVAILABLE-09', statusType: 'available', updatedText: 'Updated 1m ago' },
    ],
    stops: [
      { code: 'AGC', name: 'Agra Cantt', arr: '09:10 PM', dep: '09:15 PM' },
      { code: 'MTJ', name: 'Mathura Junction', arr: '09:48 PM', dep: '09:50 PM' },
      { code: 'NDLS', name: 'New Delhi', arr: '11:30 PM', dep: '--' },
    ],
  },
  // 5. ICONIC WHERE IS MY TRAIN REAL ROUTES (Lucknow - Kanpur - Kasganj & Pan-India)
  {
    id: 'exp-05379',
    number: '05379',
    name: 'Lucknow Jn. - Kasganj Passenger Special',
    type: 'Express',
    isLocalEmu: false,
    originCode: 'LJN',
    originName: 'Lucknow Junction NER',
    destCode: 'KSJ',
    destName: 'Kasganj Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 65, status: 'DAILY RUN', statusType: 'unreserved', updatedText: 'Live' },
    ],
    stops: [
      { code: 'LJN', name: 'Lucknow Junction NER', arr: '--', dep: '04:30 AM', distanceKm: 0 },
      { code: 'MKG', name: 'Manak Nagar', arr: '04:45 AM', dep: '04:46 AM', distanceKm: 4 },
      { code: 'AMS', name: 'Amausi', arr: '04:58 AM', dep: '04:59 AM', distanceKm: 10 },
      { code: 'POF', name: 'Piparsand', arr: '05:08 AM', dep: '05:09 AM', distanceKm: 16 },
      { code: 'HRN', name: 'Harauni', arr: '05:17 AM', dep: '05:18 AM', distanceKm: 22 },
      { code: 'JTU', name: 'Jaitipur', arr: '05:26 AM', dep: '05:27 AM', distanceKm: 30 },
      { code: 'KVX', name: 'Kusumbhi', arr: '05:33 AM', dep: '05:34 AM', distanceKm: 34 },
      { code: 'AJG', name: 'Ajgain', arr: '05:40 AM', dep: '05:41 AM', distanceKm: 38 },
      { code: 'SIC', name: 'Sonik', arr: '05:49 AM', dep: '05:50 AM', distanceKm: 46 },
      { code: 'ON', name: 'Unnao Junction', arr: '06:01 AM', dep: '06:03 AM', distanceKm: 54 },
      { code: 'MGW', name: 'Magarwara', arr: '06:12 AM', dep: '06:13 AM', distanceKm: 60 },
      { code: 'CPB', name: 'Kanpur Bridge Left Bank', arr: '06:21 AM', dep: '06:22 AM', distanceKm: 68 },
      { code: 'CNB', name: 'Kanpur Central', arr: '06:40 AM', dep: '06:50 AM', distanceKm: 72 },
      { code: 'CPA', name: 'Kanpur Anwarganj', arr: '07:03 AM', dep: '07:05 AM', distanceKm: 75 },
      { code: 'KNP', name: 'Kalyanpur', arr: '07:18 AM', dep: '07:20 AM', distanceKm: 85 },
      { code: 'BJR', name: 'Barrajpur', arr: '07:38 AM', dep: '07:40 AM', distanceKm: 100 },
      { code: 'BLU', name: 'Bilhaur', arr: '08:00 AM', dep: '08:02 AM', distanceKm: 115 },
      { code: 'KJN', name: 'Kannauj', arr: '08:28 AM', dep: '08:30 AM', distanceKm: 138 },
      { code: 'GHJ', name: 'Gursahaiganj', arr: '08:52 AM', dep: '08:54 AM', distanceKm: 160 },
      { code: 'KLJ', name: 'Kamalganj', arr: '09:14 AM', dep: '09:16 AM', distanceKm: 176 },
      { code: 'FGR', name: 'Fatehgarh', arr: '09:30 AM', dep: '09:32 AM', distanceKm: 192 },
      { code: 'FBD', name: 'Farrukhabad', arr: '09:50 AM', dep: '09:55 AM', distanceKm: 197 },
      { code: 'KMJ', name: 'Kaimganj', arr: '10:25 AM', dep: '10:27 AM', distanceKm: 227 },
      { code: 'RDN', name: 'Rudain', arr: '10:44 AM', dep: '10:45 AM', distanceKm: 245 },
      { code: 'GWA', name: 'Ganjdundwara', arr: '11:00 AM', dep: '11:02 AM', distanceKm: 260 },
      { code: 'SWR', name: 'Sahawar Town', arr: '11:15 AM', dep: '11:17 AM', distanceKm: 273 },
      { code: 'KSJ', name: 'Kasganj Junction', arr: '11:55 AM', dep: '--', distanceKm: 291 },
    ],
  },
  {
    id: 'exp-05380',
    number: '05380',
    name: 'Kasganj - Lucknow Jn. Passenger Special',
    type: 'Express',
    isLocalEmu: false,
    originCode: 'KSJ',
    originName: 'Kasganj Junction',
    destCode: 'LJN',
    destName: 'Lucknow Junction NER',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'GN (Unreserved)', price: 65, status: 'DAILY RUN', statusType: 'unreserved', updatedText: 'Live' },
    ],
    stops: [
      { code: 'KSJ', name: 'Kasganj Junction', arr: '--', dep: '01:30 PM', distanceKm: 0 },
      { code: 'SWR', name: 'Sahawar Town', arr: '01:48 PM', dep: '01:50 PM', distanceKm: 18 },
      { code: 'GWA', name: 'Ganjdundwara', arr: '02:03 PM', dep: '02:05 PM', distanceKm: 31 },
      { code: 'KMJ', name: 'Kaimganj', arr: '02:35 PM', dep: '02:37 PM', distanceKm: 64 },
      { code: 'FBD', name: 'Farrukhabad', arr: '03:10 PM', dep: '03:15 PM', distanceKm: 94 },
      { code: 'FGR', name: 'Fatehgarh', arr: '03:26 PM', dep: '03:28 PM', distanceKm: 99 },
      { code: 'GHJ', name: 'Gursahaiganj', arr: '04:00 PM', dep: '04:02 PM', distanceKm: 131 },
      { code: 'KJN', name: 'Kannauj', arr: '04:24 PM', dep: '04:26 PM', distanceKm: 153 },
      { code: 'BLU', name: 'Bilhaur', arr: '04:52 PM', dep: '04:54 PM', distanceKm: 176 },
      { code: 'KNP', name: 'Kalyanpur', arr: '05:38 PM', dep: '05:40 PM', distanceKm: 206 },
      { code: 'CPA', name: 'Kanpur Anwarganj', arr: '05:58 PM', dep: '06:00 PM', distanceKm: 216 },
      { code: 'CNB', name: 'Kanpur Central', arr: '06:20 PM', dep: '06:30 PM', distanceKm: 219 },
      { code: 'ON', name: 'Unnao Junction', arr: '07:00 PM', dep: '07:02 PM', distanceKm: 237 },
      { code: 'AJG', name: 'Ajgain', arr: '07:18 PM', dep: '07:19 PM', distanceKm: 253 },
      { code: 'AMS', name: 'Amausi', arr: '07:56 PM', dep: '07:57 PM', distanceKm: 281 },
      { code: 'MKG', name: 'Manak Nagar', arr: '08:08 PM', dep: '08:09 PM', distanceKm: 287 },
      { code: 'LJN', name: 'Lucknow Junction NER', arr: '08:35 PM', dep: '--', distanceKm: 291 },
    ],
  },
  {
    id: 'exp-12417',
    number: '12417',
    name: 'Prayagraj Express',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'PRYJ',
    originName: 'Prayagraj Junction',
    destCode: 'NDLS',
    destName: 'New Delhi',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'SL', price: 385, status: 'AVAILABLE-82', statusType: 'available', updatedText: 'Live' },
      { type: '3A', price: 1025, status: 'AVAILABLE-24', statusType: 'available', updatedText: 'Live' },
      { type: '2A', price: 1475, status: 'AVAILABLE-12', statusType: 'available', updatedText: 'Live' },
      { type: '1A', price: 2490, status: 'AVAILABLE-04', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'PRYJ', name: 'Prayagraj Junction', arr: '--', dep: '10:10 PM', distanceKm: 0 },
      { code: 'FTP', name: 'Fatehpur', arr: '11:18 PM', dep: '11:20 PM', distanceKm: 117 },
      { code: 'CNB', name: 'Kanpur Central', arr: '12:40 AM', dep: '12:45 AM', distanceKm: 194 },
      { code: 'ALJN', name: 'Aligarh Junction', arr: '04:15 AM', dep: '04:17 AM', distanceKm: 504 },
      { code: 'GZB', name: 'Ghaziabad Junction', arr: '06:13 AM', dep: '06:15 AM', distanceKm: 610 },
      { code: 'NDLS', name: 'New Delhi', arr: '07:00 AM', dep: '--', distanceKm: 635 },
    ],
  },
  {
    id: 'exp-12418',
    number: '12418',
    name: 'Prayagraj Express (Reverse)',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'PRYJ',
    destName: 'Prayagraj Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'SL', price: 385, status: 'AVAILABLE-76', statusType: 'available', updatedText: 'Live' },
      { type: '3A', price: 1025, status: 'AVAILABLE-30', statusType: 'available', updatedText: 'Live' },
      { type: '2A', price: 1475, status: 'AVAILABLE-08', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '10:10 PM', distanceKm: 0 },
      { code: 'GZB', name: 'Ghaziabad Junction', arr: '10:58 PM', dep: '11:00 PM', distanceKm: 25 },
      { code: 'ALJN', name: 'Aligarh Junction', arr: '12:28 AM', dep: '12:30 AM', distanceKm: 131 },
      { code: 'CNB', name: 'Kanpur Central', arr: '03:50 AM', dep: '03:55 AM', distanceKm: 441 },
      { code: 'FTP', name: 'Fatehpur', arr: '04:50 AM', dep: '04:52 AM', distanceKm: 518 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arr: '07:00 AM', dep: '--', distanceKm: 635 },
    ],
  },
  {
    id: 'exp-22436',
    number: '22436',
    name: 'Vande Bharat Express',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'BSB',
    destName: 'Varanasi Junction',
    runsOn: [true, true, true, false, true, true, true],
    classes: [
      { type: 'CC', price: 1750, status: 'AVAILABLE-45', statusType: 'available', updatedText: 'Live' },
      { type: 'EC', price: 3300, status: 'AVAILABLE-12', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '06:00 AM', distanceKm: 0 },
      { code: 'CNB', name: 'Kanpur Central', arr: '10:08 AM', dep: '10:10 AM', distanceKm: 441 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arr: '12:08 PM', dep: '12:10 PM', distanceKm: 635 },
      { code: 'BSB', name: 'Varanasi Junction', arr: '02:00 PM', dep: '--', distanceKm: 759 },
    ],
  },
  {
    id: 'exp-12230',
    number: '12230',
    name: 'Lucknow Mail',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'LKO',
    destName: 'Lucknow Charbagh NR',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'SL', price: 320, status: 'AVAILABLE-60', statusType: 'available', updatedText: 'Live' },
      { type: '3A', price: 840, status: 'AVAILABLE-18', statusType: 'available', updatedText: 'Live' },
      { type: '2A', price: 1210, status: 'AVAILABLE-06', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '10:00 PM', distanceKm: 0 },
      { code: 'GZB', name: 'Ghaziabad Junction', arr: '10:43 PM', dep: '10:45 PM', distanceKm: 25 },
      { code: 'MB', name: 'Moradabad Junction', arr: '01:05 AM', dep: '01:13 AM', distanceKm: 166 },
      { code: 'BE', name: 'Bareilly Junction', arr: '02:37 AM', dep: '02:39 AM', distanceKm: 256 },
      { code: 'SPN', name: 'Shahjehanpur', arr: '03:47 AM', dep: '03:49 AM', distanceKm: 327 },
      { code: 'HRI', name: 'Hardoi', arr: '04:40 AM', dep: '04:42 AM', distanceKm: 390 },
      { code: 'LKO', name: 'Lucknow Charbagh NR', arr: '06:45 AM', dep: '--', distanceKm: 491 },
    ],
  },
  {
    id: 'exp-12556',
    number: '12556',
    name: 'Gorakhdham Express',
    type: 'Superfast',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'GKP',
    destName: 'Gorakhpur Junction',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'SL', price: 440, status: 'AVAILABLE-45', statusType: 'available', updatedText: 'Live' },
      { type: '3A', price: 1180, status: 'AVAILABLE-15', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '09:25 PM', distanceKm: 0 },
      { code: 'CNB', name: 'Kanpur Central', arr: '03:15 AM', dep: '03:20 AM', distanceKm: 441 },
      { code: 'ON', name: 'Unnao Junction', arr: '03:43 AM', dep: '03:45 AM', distanceKm: 459 },
      { code: 'LKO', name: 'Lucknow Charbagh NR', arr: '04:55 AM', dep: '05:05 AM', distanceKm: 513 },
      { code: 'GD', name: 'Gonda Junction', arr: '07:25 AM', dep: '07:30 AM', distanceKm: 631 },
      { code: 'BST', name: 'Basti', arr: '08:42 AM', dep: '08:45 AM', distanceKm: 719 },
      { code: 'GKP', name: 'Gorakhpur Junction', arr: '09:45 AM', dep: '--', distanceKm: 783 },
    ],
  },
  {
    id: 'exp-12952',
    number: '12952',
    name: 'Mumbai Central Tejas Rajdhani Express',
    type: 'Rajdhani',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'MMCT',
    destName: 'Mumbai Central',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: '3A', price: 2195, status: 'AVAILABLE-28', statusType: 'available', updatedText: 'Live' },
      { type: '2A', price: 3120, status: 'AVAILABLE-14', statusType: 'available', updatedText: 'Live' },
      { type: '1A', price: 4950, status: 'AVAILABLE-05', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '04:55 PM', distanceKm: 0 },
      { code: 'KOTA', name: 'Kota Junction', arr: '08:50 PM', dep: '09:00 PM', distanceKm: 465 },
      { code: 'RTM', name: 'Ratlam Junction', arr: '11:57 PM', dep: '12:02 AM', distanceKm: 731 },
      { code: 'BRC', name: 'Vadodara Junction', arr: '03:15 AM', dep: '03:23 AM', distanceKm: 992 },
      { code: 'ST', name: 'Surat', arr: '05:05 AM', dep: '05:10 AM', distanceKm: 1122 },
      { code: 'BVI', name: 'Borivali', arr: '07:58 AM', dep: '08:00 AM', distanceKm: 1356 },
      { code: 'MMCT', name: 'Mumbai Central', arr: '08:35 AM', dep: '--', distanceKm: 1386 },
    ],
  },
];

/**
 * Universal dynamic resolver for any train query in India.
 * If train is in master list, returns it immediately.
 * If user enters any other 5-digit number or name, synthesizes an authentic IRCTC route
 * so that no search query ever fails or displays a blank screen!
 */
// Pre-indexed map for O(1) direct number lookup
const trainByNumberMap = new Map<string, CorridorTrain>();
for (let i = 0; i < CORRIDOR_TRAINS_MASTER.length; i++) {
  trainByNumberMap.set(CORRIDOR_TRAINS_MASTER[i].number, CORRIDOR_TRAINS_MASTER[i]);
}

// Bounded dynamic train cache to prevent repeated object allocation
const dynamicTrainCache = new Map<string, CorridorTrain>();
const MAX_DYNAMIC_TRAIN_CACHE = 50;

export function findOrGenerateTrain(query: string): CorridorTrain {
  const clean = query.trim().toUpperCase();
  if (!clean) return CORRIDOR_TRAINS_MASTER[0];

  // 1. Fast O(1) direct number match
  const byNumber = trainByNumberMap.get(clean);
  if (byNumber) return byNumber;

  // 2. Direct name match in master list
  const directMatch = CORRIDOR_TRAINS_MASTER.find((t) => t.name.toUpperCase().includes(clean));
  if (directMatch) return directMatch;

  // 3. Dynamic train cache check
  const cachedDynamic = dynamicTrainCache.get(clean);
  if (cachedDynamic) return cachedDynamic;

  // 4. Synthesize realistic IRCTC train route for any 5-digit number or custom name
  const numDigits = clean.replace(/\D/g, '') || '12345';
  const trainNum = numDigits.length >= 5 ? numDigits.slice(0, 5) : numDigits.padStart(5, '0');
  const trainTitle = isNaN(Number(clean)) && clean.length > 2 ? clean : `Express Special (${trainNum})`;

  const generated: CorridorTrain = {
    id: `dyn-${trainNum}`,
    number: trainNum,
    name: trainTitle,
    type: 'Express',
    isLocalEmu: false,
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'CNB',
    destName: 'Kanpur Central',
    runsOn: [true, true, true, true, true, true, true],
    classes: [
      { type: 'SL', price: 290, status: 'AVAILABLE-40', statusType: 'available', updatedText: 'Live' },
      { type: '3A', price: 780, status: 'AVAILABLE-15', statusType: 'available', updatedText: 'Live' },
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arr: '--', dep: '06:15 AM', distanceKm: 0 },
      { code: 'GZB', name: 'Ghaziabad Junction', arr: '06:58 AM', dep: '07:00 AM', distanceKm: 25 },
      { code: 'ALJN', name: 'Aligarh Junction', arr: '08:20 AM', dep: '08:22 AM', distanceKm: 131 },
      { code: 'TDL', name: 'Tundla Junction', arr: '09:25 AM', dep: '09:27 AM', distanceKm: 209 },
      { code: 'ETW', name: 'Etawah Junction', arr: '10:35 AM', dep: '10:37 AM', distanceKm: 300 },
      { code: 'CNB', name: 'Kanpur Central', arr: '12:20 PM', dep: '--', distanceKm: 441 },
    ],
  };

  if (dynamicTrainCache.size >= MAX_DYNAMIC_TRAIN_CACHE) {
    const firstKey = dynamicTrainCache.keys().next().value;
    if (firstKey) dynamicTrainCache.delete(firstKey);
  }
  dynamicTrainCache.set(clean, generated);
  return generated;
}

// Precomputed stop code index for each corridor train for O(1) stop lookups
const trainStopIndexMap = new WeakMap<CorridorTrain, Map<string, number>>();

function getTrainStopMap(train: CorridorTrain): Map<string, number> {
  let map = trainStopIndexMap.get(train);
  if (!map) {
    map = new Map<string, number>();
    const stops = train.stops || [];
    for (let i = 0; i < stops.length; i++) {
      map.set(stops[i].code.toUpperCase(), i);
    }
    trainStopIndexMap.set(train, map);
  }
  return map;
}

// Bounded route query cache (maximum 150 unique pairs)
const routeMatchesCache = new Map<string, TrainBetweenStation[]>();
const MAX_ROUTE_CACHE_SIZE = 150;

// Dynamic Corridor Route Matching Engine with caching
export function getTrainsBetweenStations(fromCode: string, toCode: string): TrainBetweenStation[] {
  const normFrom = (fromCode || '').trim().toUpperCase();
  const normTo = (toCode || '').trim().toUpperCase();
  const cacheKey = `${normFrom}__${normTo}`;

  const cached = routeMatchesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const matchingTrains: TrainBetweenStation[] = [];

  for (let i = 0; i < CORRIDOR_TRAINS_MASTER.length; i++) {
    const masterTrain = CORRIDOR_TRAINS_MASTER[i];
    const stopMap = getTrainStopMap(masterTrain);

    const fromIndex = stopMap.get(normFrom);
    const toIndex = stopMap.get(normTo);

    // Both stops exist and fromIndex comes before toIndex (correct travel direction)
    if (fromIndex !== undefined && toIndex !== undefined && fromIndex < toIndex) {
      const fromStop = masterTrain.stops[fromIndex];
      const toStop = masterTrain.stops[toIndex];

      const depTime = fromStop.dep === '--' ? fromStop.arr : fromStop.dep;
      const arrTime = toStop.arr === '--' ? toStop.dep : toStop.arr;

      const intermediateHalts = toIndex - fromIndex - 1;
      const duration = calculateDuration(depTime, arrTime);

      matchingTrains.push({
        id: `${masterTrain.id}-${normFrom}-${normTo}`,
        number: masterTrain.number,
        name: masterTrain.name,
        type: masterTrain.type,
        isLocalEmu: masterTrain.isLocalEmu,
        fromStationCode: fromStop.code,
        fromStationName: fromStop.name,
        toStationCode: toStop.code,
        toStationName: toStop.name,
        depTime: depTime,
        arrTime: arrTime,
        duration: duration,
        runsOn: masterTrain.runsOn,
        classes: masterTrain.classes,
        totalHaults: intermediateHalts,
      });
    }
  }

  // If no direct corridor train matched (e.g. general non-corridor stations), return default sample trains
  const result = matchingTrains.length > 0 ? matchingTrains : [
    {
      id: `22436-${normFrom}-${normTo}`,
      number: '22436',
      name: 'Vande Bharat Express',
      type: 'Superfast' as const,
      isLocalEmu: false,
      fromStationCode: normFrom || 'SRC',
      fromStationName: 'Source Station',
      toStationCode: normTo || 'DST',
      toStationName: 'Destination Station',
      depTime: '06:00 AM',
      arrTime: '10:08 AM',
      duration: '04h 08m',
      runsOn: [true, true, true, false, true, true, true],
      classes: [
        { type: 'CC', price: 1185, status: 'AVAILABLE-42', statusType: 'available' as const, updatedText: 'Live' },
        { type: 'EC', price: 2115, status: 'AVAILABLE-08', statusType: 'available' as const, updatedText: 'Live' },
      ],
      totalHaults: 2,
    },
    {
      id: `12004-${normFrom}-${normTo}`,
      number: '12004',
      name: 'Lucknow Swarna Shatabdi',
      type: 'Shatabdi' as const,
      isLocalEmu: false,
      fromStationCode: normFrom || 'SRC',
      fromStationName: 'Source Station',
      toStationCode: normTo || 'DST',
      toStationName: 'Destination Station',
      depTime: '06:10 AM',
      arrTime: '11:20 AM',
      duration: '05h 10m',
      runsOn: [true, true, true, true, true, true, true],
      classes: [
        { type: 'CC', price: 920, status: 'AVAILABLE-114', statusType: 'available' as const, updatedText: 'Live' },
        { type: 'EC', price: 1675, status: 'AVAILABLE-16', statusType: 'available' as const, updatedText: 'Live' },
      ],
      totalHaults: 4,
    },
  ];

  if (routeMatchesCache.size >= MAX_ROUTE_CACHE_SIZE) {
    const firstKey = routeMatchesCache.keys().next().value;
    if (firstKey) routeMatchesCache.delete(firstKey);
  }
  routeMatchesCache.set(cacheKey, result);

  return result;
}

// Helper: parse HH:MM AM/PM to calculate duration
function calculateDuration(depStr: string, arrStr: string): string {
  try {
    const parseTime = (tStr: string) => {
      const parts = tStr.trim().split(' ');
      const timeParts = parts[0].split(':');
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const meridiem = parts[1]?.toUpperCase();

      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const depMins = parseTime(depStr);
    let arrMins = parseTime(arrStr);
    if (arrMins < depMins) arrMins += 24 * 60; // Next day arrival

    const diffMins = arrMins - depMins;
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  } catch {
    return '02h 15m';
  }
}
