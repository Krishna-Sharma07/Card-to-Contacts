module.exports = {
  getCountry: jest.fn(() => 'US'),
  getLocales: jest.fn(() => [
    { countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false },
  ]),
  getNumberFormatSettings: jest.fn(() => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  })),
  getCalendar: jest.fn(() => 'gregorian'),
  getTemperatureUnit: jest.fn(() => 'fahrenheit'),
  getTimeZone: jest.fn(() => 'America/New_York'),
  uses24HourClock: jest.fn(() => false),
  usesMetricSystem: jest.fn(() => false),
  findBestLanguageTag: jest.fn(() => ({ languageTag: 'en-US', isRTL: false })),
};
