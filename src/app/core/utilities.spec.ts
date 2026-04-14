import { getIcon, getPosNegColor, parseMoney } from './utilities';

describe('utilities', () => {
  describe('parseMoney', () => {
    it('parses numeric and formatted string values', () => {
      expect(parseMoney(12.5)).toBe(12.5);
      expect(parseMoney('$1,234.56')).toBe(1234.56);
      expect(parseMoney('-$99.01')).toBe(-99.01);
    });

    it('returns null for unsupported or empty values', () => {
      expect(parseMoney(null)).toBeNull();
      expect(parseMoney(undefined)).toBeNull();
      expect(parseMoney('')).toBeNull();
      expect(parseMoney('abc')).toBeNull();
      expect(parseMoney(NaN)).toBeNull();
      expect(parseMoney({})).toBeNull();
    });
  });

  describe('getPosNegColor', () => {
    it('returns red when difference is negative', () => {
      expect(getPosNegColor(5, 10)).toBe('red');
    });

    it('returns green when difference is zero or positive', () => {
      expect(getPosNegColor(10, 5)).toBe('green');
      expect(getPosNegColor(10, 10)).toBe('green');
    });
  });

  describe('getIcon', () => {
    it('returns expected icon for known vendor patterns', () => {
      expect(getIcon('TARGET T-1234')).toBe('assets/images/target-logo.png');
      expect(getIcon('Venmo Cashout')).toBe('assets/images/venmo-logo.png');
      expect(getIcon('Google One')).toBe('assets/images/google-logo.png');
    });

    it('returns undefined for unmatched descriptions', () => {
      expect(getIcon('Unknown Merchant')).toBeUndefined();
    });
  });
});
