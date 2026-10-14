export interface PassengerRecord {
  id: number;
  name?: string;
  bookingStatus: string; // 'CNF' | 'WL-12' | 'RAC-8'
  currentStatus: string; // 'CNF' | 'WL-4' | 'RAC-2'
  coach?: string; // 'B4' | 'S3' | '--'
  berth?: string; // '23' | '--'
  berthType: string; // 'Lower Berth (LB)' | 'Middle Berth (MB)' | 'Upper Berth (UB)' | 'Side Lower (SL)' | 'Side Upper (SU)' | 'Window Seat (WS)'
  isWindow?: boolean;
}

export interface PnrRecord {
  pnr: string;
  trainNumber: string;
  trainName: string;
  originCode: string;
  originName: string;
  destCode: string;
  destName: string;
  journeyDate: string;
  travelClass: string;
  quota?: string;
  boardingStation?: string;
  isConfirmed?: boolean;
  chartStatus: 'Chart Prepared' | 'Chart Not Prepared';
  confirmationProbability?: number; // 0 - 100%
  probabilityText?: string;
  passengers: PassengerRecord[];
}

export const PNR_PRESET_DATABASE: { [pnrNumber: string]: PnrRecord } = {
  // 1. Confirmed PNR
  '2456891023': {
    pnr: '2456891023',
    trainNumber: '12002',
    trainName: 'Bhopal Shatabdi Express',
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    journeyDate: 'Tomorrow, 14 Sep',
    travelClass: 'AC Chair Car (CC)',
    quota: 'General (GN)',
    chartStatus: 'Chart Prepared',
    confirmationProbability: 100,
    probabilityText: 'Confirmed (CNF)',
    passengers: [
      {
        id: 1,
        bookingStatus: 'CNF',
        currentStatus: 'CNF',
        coach: 'C3',
        berth: '42',
        berthType: 'Window Seat (WS)',
        isWindow: true,
      },
      {
        id: 2,
        bookingStatus: 'CNF',
        currentStatus: 'CNF',
        coach: 'C3',
        berth: '43',
        berthType: 'Aisle Seat (AS)',
        isWindow: false,
      },
    ],
  },

  // 2. Waiting List PNR with High Confirmation Chance
  '4821950371': {
    pnr: '4821950371',
    trainNumber: '14212',
    trainName: 'New Delhi - Agra Cantt Intercity',
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'MTJ',
    destName: 'Mathura Junction',
    journeyDate: '15 Sep 2026',
    travelClass: 'Second Sitting (2S)',
    quota: 'General (GN)',
    chartStatus: 'Chart Not Prepared',
    confirmationProbability: 88,
    probabilityText: '88% High Chance to Confirm',
    passengers: [
      {
        id: 1,
        bookingStatus: 'WL-24',
        currentStatus: 'WL-06',
        coach: '--',
        berth: '--',
        berthType: 'Waiting List (WL)',
        isWindow: false,
      },
      {
        id: 2,
        bookingStatus: 'WL-25',
        currentStatus: 'WL-07',
        coach: '--',
        berth: '--',
        berthType: 'Waiting List (WL)',
        isWindow: false,
      },
    ],
  },

  // 3. RAC PNR
  '8192304918': {
    pnr: '8192304918',
    trainNumber: '12280',
    trainName: 'Taj Express Superfast',
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'AGC',
    destName: 'Agra Cantt',
    journeyDate: '16 Sep 2026',
    travelClass: 'AC Chair Car (CC)',
    quota: 'General (GN)',
    chartStatus: 'Chart Not Prepared',
    confirmationProbability: 95,
    probabilityText: '95% Very High Chance (RAC)',
    passengers: [
      {
        id: 1,
        bookingStatus: 'RAC-14',
        currentStatus: 'RAC-04',
        coach: 'C1',
        berth: '32',
        berthType: 'Side Lower Seat (RAC)',
        isWindow: true,
      },
    ],
  },
};

// Compute berth type based on berth number in Indian Railways Sleeper / 3A layout (1-72)
export function getBerthTypeFromNumber(berthNum: number): { type: string; isWindow: boolean } {
  if (!berthNum || isNaN(berthNum)) {
    return { type: 'Unassigned', isWindow: false };
  }
  const mod = berthNum % 8;
  switch (mod) {
    case 1:
    case 4:
      return { type: 'Lower Berth (LB)', isWindow: true };
    case 2:
    case 5:
      return { type: 'Middle Berth (MB)', isWindow: false };
    case 3:
    case 6:
      return { type: 'Upper Berth (UB)', isWindow: false };
    case 7:
      return { type: 'Side Lower (SL)', isWindow: true };
    case 0:
      return { type: 'Side Upper (SU)', isWindow: false };
    default:
      return { type: 'Window Seat (WS)', isWindow: true };
  }
}

// Generate dynamic realistic record for any 10-digit number
export function getPnrStatusRecord(pnr: string): PnrRecord {
  const clean = pnr.trim().replace(/[-\s]/g, '');
  if (PNR_PRESET_DATABASE[clean]) {
    return PNR_PRESET_DATABASE[clean];
  }

  // Generate dynamic deterministic record for any entered 10 digit number
  const lastDigit = parseInt(clean.slice(-1), 10) || 3;
  const isConfirmed = lastDigit % 2 === 0;

  if (isConfirmed) {
    return {
      pnr: clean,
      trainNumber: '12002',
      trainName: 'Bhopal Shatabdi Express',
      originCode: 'NDLS',
      originName: 'New Delhi',
      destCode: 'AGC',
      destName: 'Agra Cantt',
      journeyDate: 'Tomorrow, 14 Sep',
      travelClass: 'AC Chair Car (CC)',
      quota: 'General (GN)',
      chartStatus: 'Chart Prepared',
      confirmationProbability: 100,
      probabilityText: 'Confirmed (CNF)',
      passengers: [
        {
          id: 1,
          bookingStatus: 'CNF',
          currentStatus: 'CNF',
          coach: 'B2',
          berth: '27',
          berthType: 'Lower Berth (LB)',
          isWindow: true,
        },
      ],
    };
  }

  return {
    pnr: clean,
    trainNumber: '14212',
    trainName: 'New Delhi - Agra Intercity',
    originCode: 'NDLS',
    originName: 'New Delhi',
    destCode: 'MTJ',
    destName: 'Mathura Junction',
    journeyDate: '15 Sep 2026',
    travelClass: 'Second Sitting (2S)',
    quota: 'General (GN)',
    chartStatus: 'Chart Not Prepared',
    confirmationProbability: 84,
    probabilityText: '84% High Chance to Confirm',
    passengers: [
      {
        id: 1,
        bookingStatus: 'WL-18',
        currentStatus: 'WL-05',
        coach: '--',
        berth: '--',
        berthType: 'Waiting List (WL)',
        isWindow: false,
      },
    ],
  };
}
