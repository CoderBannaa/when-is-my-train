import { Platform, TextStyle } from 'react-native';

export const Typography = {
  // Screen & Section Titles (e.g. Find Trains, Spot Your Train, PNR Status)
  h1: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  } as TextStyle,

  h2: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  } as TextStyle,

  // Station Codes (e.g. NDLS, BSB, MMCT)
  stationCode: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  } as TextStyle,

  stationCodeBig: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  } as TextStyle,

  // Micro Labels (UPPERCASE section tags e.g. "FROM STATION", "LIVE GPS STATUS")
  microLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  } as TextStyle,

  // Body & Subtext
  body: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  } as TextStyle,

  bodyBold: {
    fontSize: 13,
    fontWeight: '700',
  } as TextStyle,

  caption: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 15,
  } as TextStyle,

  // Badges & Pills (PF 1, 2m halt, ON TIME)
  badge: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  } as TextStyle,

  // Action Buttons
  button: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  } as TextStyle,
};
