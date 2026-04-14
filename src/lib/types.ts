import Fraction from "fraction.js";

export type OptType = "MAX" | "MIN";
export type Operator = "<=" | ">=" | "=";

// Representa un número de la forma: (real + mCount * M)
// Ideal para el método de la M Grande.
export interface SimplexNumber {
  real: Fraction;
  mCount: Fraction; // Cuántas 'M' tiene. Ej: si es -M, mCount = -1.
}

export interface ConstraintInput {
  id: number;
  coefficients: number[];
  operator: Operator;
  rhs: number;
}

export interface LinearProblemInput {
  numVars: number;
  optType: OptType;
  objective: number[];
  constraints: ConstraintInput[];
}

// Estructura de la tabla para renderizarla fácilmente en la UI
export interface Tableau {
  headers: string[]; // ["X1", "X2", "S1", "A1", "RHS"]
  matrix: SimplexNumber[][]; // La matriz principal de coeficientes
  basicVariables: string[]; // Variables en la base actual ["S1", "A1"]
  cj: SimplexNumber[]; // Coeficientes de la función objetivo original
  zj: SimplexNumber[]; // Fila Zj
  zjCj: SimplexNumber[]; // Fila Zj - Cj (Criterio Simplex)
  solutionValue: SimplexNumber; // Valor actual de Z/W
  pivotRow?: number; // Fila pivote (Sale)
  pivotCol?: number; // Columna pivote (Entra)
}
