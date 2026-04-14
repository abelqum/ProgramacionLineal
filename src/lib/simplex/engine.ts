import Fraction from "fraction.js";
import { Tableau, OptType, SimplexNumber } from "../types";
import {
  add,
  sub,
  mul,
  div,
  compare,
  getMostNegativeIndex,
  getMostPositiveIndex,
} from "./math";

// Helper local para evitar dependencias cruzadas
const makeZero = (): SimplexNumber => ({
  real: new Fraction(0),
  mCount: new Fraction(0),
});

// 1. EXTRAEMOS LA LÓGICA DE Zj PARA QUE SEA EXACTA EN CADA TABLA
export function calculateZjAndZjCj(
  matrix: SimplexNumber[][],
  headers: string[],
  basicVariables: string[],
  cj: SimplexNumber[],
) {
  const rows = matrix.length;
  const cols = headers.length;
  const rhsIndex = cols - 1;

  const cb = basicVariables.map((bv) => {
    const headerIndex = headers.indexOf(bv);
    return cj[headerIndex];
  });

  const zj = Array(cols)
    .fill(null)
    .map(() => makeZero());
  const zjCj = Array(cols)
    .fill(null)
    .map(() => makeZero());
  let solutionValue = makeZero();

  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
      const term = mul(cb[i], matrix[i][j].real);
      zj[j] = add(zj[j], term);
    }
    if (j < rhsIndex) {
      zjCj[j] = sub(zj[j], cj[j]);
    } else {
      solutionValue = zj[j];
    }
  }

  return { zj, zjCj, solutionValue };
}

export function calculateNextTableau(
  current: Tableau,
  optType: OptType,
): Tableau | "OPTIMAL" | "UNBOUNDED" {
  const rows = current.matrix.length;
  const cols = current.headers.length;
  const rhsIndex = cols - 1;

  // 2. AHORA EVALUAMOS USANDO LOS Zj-Cj CORRECTOS DE LA TABLA ACTUAL
  let pivotCol = -1;
  const zjCjVars = current.zjCj.slice(0, -1);

  if (optType === "MAX") {
    pivotCol = getMostNegativeIndex(zjCjVars);
  } else {
    pivotCol = getMostPositiveIndex(zjCjVars);
  }

  // Criterio de parada (Llegamos al Z = 1350)
  if (pivotCol === -1) {
    return "OPTIMAL";
  }

  // 3. Buscar Fila Pivote
  let pivotRow = -1;
  let minRatio = Infinity;

  for (let i = 0; i < rows; i++) {
    const element = current.matrix[i][pivotCol].real.valueOf();
    if (element > 0) {
      const rhs = current.matrix[i][rhsIndex].real.valueOf();
      const ratio = rhs / element;
      if (ratio < minRatio) {
        minRatio = ratio;
        pivotRow = i;
      }
    }
  }

  if (pivotRow === -1) {
    return "UNBOUNDED";
  }

  // Marcamos coordenadas para pintar en amarillo en la UI
  current.pivotRow = pivotRow;
  current.pivotCol = pivotCol;

  // 4. Gauss-Jordan
  const newMatrix = current.matrix.map((row) => [...row]);
  const pivotElement = current.matrix[pivotRow][pivotCol].real;

  for (let j = 0; j < cols; j++) {
    newMatrix[pivotRow][j] = div(current.matrix[pivotRow][j], pivotElement);
  }

  for (let i = 0; i < rows; i++) {
    if (i !== pivotRow) {
      const targetElement = current.matrix[i][pivotCol].real;
      for (let j = 0; j < cols; j++) {
        const valueToSubtract = mul(newMatrix[pivotRow][j], targetElement);
        newMatrix[i][j] = sub(current.matrix[i][j], valueToSubtract);
      }
    }
  }

  const newBasicVariables = [...current.basicVariables];
  newBasicVariables[pivotRow] = current.headers[pivotCol];

  // 5. CALCULAR LOS NUEVOS Zj PARA LA SIGUIENTE ITERACIÓN
  const { zj, zjCj, solutionValue } = calculateZjAndZjCj(
    newMatrix,
    current.headers,
    newBasicVariables,
    current.cj,
  );

  return {
    headers: current.headers,
    cj: current.cj,
    matrix: newMatrix,
    basicVariables: newBasicVariables,
    zj,
    zjCj,
    solutionValue,
  };
}
