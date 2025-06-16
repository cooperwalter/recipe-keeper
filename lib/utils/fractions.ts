/**
 * Convert fraction strings to decimal numbers
 * Examples:
 * "1/2" → 0.5
 * "3/4" → 0.75
 * "2 1/3" → 2.333...
 * "1.5" → 1.5
 * "2" → 2
 */
export function fractionToDecimal(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // Clean the string
  const cleanValue = value.toString().trim();
  
  // If it's already a decimal number string, parse and return
  if (/^-?\d*\.?\d+$/.test(cleanValue)) {
    return parseFloat(cleanValue);
  }
  
  // Handle mixed numbers (e.g., "2 1/3")
  const mixedMatch = cleanValue.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const numerator = parseInt(mixedMatch[2]);
    const denominator = parseInt(mixedMatch[3]);
    return whole + (numerator / denominator);
  }
  
  // Handle simple fractions (e.g., "3/4")
  const fractionMatch = cleanValue.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    return numerator / denominator;
  }
  
  // Handle ranges by taking the first value (e.g., "1-2" → 1)
  const rangeMatch = cleanValue.match(/^(\d*\.?\d+)-\d*\.?\d+$/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[1]);
  }
  
  // If we can't parse it, return undefined
  return undefined;
}

/**
 * Convert decimal back to fraction string for display
 * Examples:
 * 0.5 → "1/2"
 * 0.75 → "3/4"
 * 2.333... → "2 1/3"
 * 1.5 → "1 1/2"
 * 2 → "2"
 */
export function decimalToFraction(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  
  // Handle whole numbers
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  const tolerance = 1.0E-6;
  let h1 = 1, h2 = 0;
  let k1 = 0, k2 = 1;
  let b = value;
  
  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(value - h1 / k1) > value * tolerance);
  
  // If the denominator is 1, just return the numerator
  if (k1 === 1) {
    return h1.toString();
  }
  
  // Check for mixed numbers
  if (h1 > k1) {
    const whole = Math.floor(h1 / k1);
    const remainder = h1 % k1;
    if (remainder === 0) {
      return whole.toString();
    }
    return `${whole} ${remainder}/${k1}`;
  }
  
  return `${h1}/${k1}`;
}