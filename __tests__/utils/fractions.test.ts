import { describe, it, expect } from 'vitest';
import { fractionToDecimal, decimalToFraction } from '@/lib/utils/fractions';

describe('fractionToDecimal', () => {
  it('converts simple fractions', () => {
    expect(fractionToDecimal('1/2')).toBe(0.5);
    expect(fractionToDecimal('3/4')).toBe(0.75);
    expect(fractionToDecimal('1/3')).toBeCloseTo(0.333, 3);
    expect(fractionToDecimal('2/3')).toBeCloseTo(0.667, 3);
  });

  it('converts mixed numbers', () => {
    expect(fractionToDecimal('2 1/2')).toBe(2.5);
    expect(fractionToDecimal('1 3/4')).toBe(1.75);
    expect(fractionToDecimal('2 1/3')).toBeCloseTo(2.333, 3);
  });

  it('handles whole numbers', () => {
    expect(fractionToDecimal('2')).toBe(2);
    expect(fractionToDecimal('10')).toBe(10);
  });

  it('handles decimals', () => {
    expect(fractionToDecimal('1.5')).toBe(1.5);
    expect(fractionToDecimal('2.75')).toBe(2.75);
  });

  it('handles ranges by taking first value', () => {
    expect(fractionToDecimal('1-2')).toBe(1);
    expect(fractionToDecimal('1.5-2.5')).toBe(1.5);
  });

  it('handles undefined/null/empty', () => {
    expect(fractionToDecimal(undefined)).toBeUndefined();
    expect(fractionToDecimal(null)).toBeUndefined();
    expect(fractionToDecimal('')).toBeUndefined();
  });

  it('returns undefined for invalid input', () => {
    expect(fractionToDecimal('abc')).toBeUndefined();
    expect(fractionToDecimal('1/2/3')).toBeUndefined();
  });
});

describe('decimalToFraction', () => {
  it('converts decimals to fractions', () => {
    expect(decimalToFraction(0.5)).toBe('1/2');
    expect(decimalToFraction(0.75)).toBe('3/4');
    expect(decimalToFraction(0.25)).toBe('1/4');
  });

  it('converts to mixed numbers', () => {
    expect(decimalToFraction(2.5)).toBe('2 1/2');
    expect(decimalToFraction(1.75)).toBe('1 3/4');
  });

  it('handles whole numbers', () => {
    expect(decimalToFraction(2)).toBe('2');
    expect(decimalToFraction(10)).toBe('10');
  });

  it('handles undefined/null', () => {
    expect(decimalToFraction(undefined)).toBe('');
    expect(decimalToFraction(null)).toBe('');
  });
});