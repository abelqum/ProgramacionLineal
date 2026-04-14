import Fraction from "fraction.js";
import { SimplexNumber } from "../types";

export const add = (a: SimplexNumber, b: SimplexNumber): SimplexNumber => ({
  real: a.real.add(b.real),
  mCount: a.mCount.add(b.mCount),
});

export const sub = (a: SimplexNumber, b: SimplexNumber): SimplexNumber => ({
  real: a.real.sub(b.real),
  mCount: a.mCount.sub(b.mCount),
});

export const mul = (a: SimplexNumber, b: Fraction): SimplexNumber => ({
  real: a.real.mul(b),
  mCount: a.mCount.mul(b),
});

export const div = (a: SimplexNumber, b: Fraction): SimplexNumber => ({
  real: a.real.div(b),
  mCount: a.mCount.div(b),
});

// Compara dos números Simplex. Devuelve un valor positivo si a > b, negativo si a < b.
export const compare = (a: SimplexNumber, b: SimplexNumber): number => {
  const mDiff = a.mCount.valueOf() - b.mCount.valueOf();
  // La M es "infinita", así que manda sobre los números reales
  if (mDiff !== 0) return mDiff;
  return a.real.valueOf() - b.real.valueOf();
};

// Helpers para encontrar el más grande / más pequeño en arreglos
export const getMostNegativeIndex = (arr: SimplexNumber[]): number => {
  let minIdx = -1;
  let minVal = { real: new Fraction(0), mCount: new Fraction(0) };

  arr.forEach((val, i) => {
    if (compare(val, minVal) < 0) {
      minVal = val;
      minIdx = i;
    }
  });
  return minIdx;
};

export const getMostPositiveIndex = (arr: SimplexNumber[]): number => {
  let maxIdx = -1;
  let maxVal = { real: new Fraction(0), mCount: new Fraction(0) };

  arr.forEach((val, i) => {
    if (compare(val, maxVal) > 0) {
      maxVal = val;
      maxIdx = i;
    }
  });
  return maxIdx;
};
