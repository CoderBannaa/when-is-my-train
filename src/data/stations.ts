export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
  isPopular?: boolean;
}

export const STATIONS_DATABASE: Station[] = [
  // Delhi - Mathura - Agra Corridor Stations
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi', isPopular: true },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', state: 'Delhi', isPopular: true },
  { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi', state: 'Delhi', isPopular: false },
  { code: 'ANVT', name: 'Anand Vihar Terminal', city: 'Delhi', state: 'Delhi', isPopular: true },
  { code: 'OKA', name: 'Okhla', city: 'Delhi', state: 'Delhi', isPopular: false },
  { code: 'TKD', name: 'Tuglakabad', city: 'Delhi', state: 'Delhi', isPopular: false },
  { code: 'FDB', name: 'Faridabad', city: 'Faridabad', state: 'Haryana', isPopular: true },
  { code: 'FDN', name: 'Faridabad New Town', city: 'Faridabad', state: 'Haryana', isPopular: false },
  { code: 'BVH', name: 'Ballabhgarh', city: 'Ballabhgarh', state: 'Haryana', isPopular: true },
  { code: 'AST', name: 'Asaoti', city: 'Palwal', state: 'Haryana', isPopular: false },
  { code: 'PWL', name: 'Palwal', city: 'Palwal', state: 'Haryana', isPopular: true },
  { code: 'RDE', name: 'Rundhi', city: 'Palwal', state: 'Haryana', isPopular: false },
  { code: 'SHLK', name: 'Sholaka', city: 'Hodal', state: 'Haryana', isPopular: false },
  { code: 'HDL', name: 'Hodal', city: 'Hodal', state: 'Haryana', isPopular: false },
  { code: 'KSV', name: 'Kosi Kalan', city: 'Mathura', state: 'Uttar Pradesh', isPopular: true },
  { code: 'CHJ', name: 'Chhata', city: 'Mathura', state: 'Uttar Pradesh', isPopular: false },
  { code: 'AJH', name: 'Ajhai', city: 'Mathura', state: 'Uttar Pradesh', isPopular: false },
  { code: 'VRBD', name: 'Vrindavan Road', city: 'Mathura', state: 'Uttar Pradesh', isPopular: false },
  { code: 'BTSR', name: 'Bhuteshwar', city: 'Mathura', state: 'Uttar Pradesh', isPopular: false },
  { code: 'MTJ', name: 'Mathura Junction', city: 'Mathura', state: 'Uttar Pradesh', isPopular: true },
  { code: 'FAR', name: 'Farah', city: 'Mathura', state: 'Uttar Pradesh', isPopular: false },
  { code: 'RKM', name: 'Raja Ki Mandi', city: 'Agra', state: 'Uttar Pradesh', isPopular: true },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh', isPopular: true },
  { code: 'AF', name: 'Agra Fort', city: 'Agra', state: 'Uttar Pradesh', isPopular: true },

  // Other Major National Stations
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh', isPopular: true },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh', isPopular: true },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh', isPopular: true },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', state: 'Uttar Pradesh', isPopular: true },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh', isPopular: true },
  { code: 'AY', name: 'Ayodhya Dham Junction', city: 'Ayodhya', state: 'Uttar Pradesh', isPopular: true },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', isPopular: true },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai', state: 'Maharashtra', isPopular: true },
  { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai', state: 'Maharashtra', isPopular: true },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', isPopular: true },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', isPopular: true },
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal', isPopular: true },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar', isPopular: true },
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', state: 'Karnataka', isPopular: true },
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', state: 'Tamil Nadu', isPopular: true },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana', isPopular: true },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', isPopular: true },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', isPopular: true },
  { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh', isPopular: true },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab', isPopular: true },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', city: 'Katra', state: 'Jammu and Kashmir', isPopular: true },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam', isPopular: true },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', isPopular: true },
];

export const POPULAR_STATIONS = STATIONS_DATABASE.filter((s) => s.isPopular);
