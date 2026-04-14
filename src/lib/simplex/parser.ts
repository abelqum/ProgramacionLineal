import Fraction from "fraction.js";
import { LinearProblemInput, Operator, SimplexNumber } from "../types";
import { calculateZjAndZjCj } from "./engine"; // IMPORTAMOS LA NUEVA FUNCIÓN

export const makeZero = (): SimplexNumber => ({
  real: new Fraction(0),
  mCount: new Fraction(0),
});
export const makeNum = (num: number): SimplexNumber => ({
  real: new Fraction(num),
  mCount: new Fraction(0),
});

export function convertToStandardForm(problem: LinearProblemInput) {
  let slackCount = 0;
  let artificialCount = 0;

  const headers = Array.from(
    { length: problem.numVars },
    (_, i) => `X${i + 1}`,
  );
  const basicVariables: string[] = [];

  problem.constraints.forEach((c) => {
    if (c.operator === "<=") {
      slackCount++;
      headers.push(`S${slackCount}`);
      basicVariables.push(`S${slackCount}`);
    } else if (c.operator === ">=") {
      slackCount++;
      artificialCount++;
      headers.push(`S${slackCount}`);
      headers.push(`A${artificialCount}`);
      basicVariables.push(`A${artificialCount}`);
    } else if (c.operator === "=") {
      artificialCount++;
      headers.push(`A${artificialCount}`);
      basicVariables.push(`A${artificialCount}`);
    }
  });

  headers.push("RHS");

  const rows = problem.constraints.length;
  const cols = headers.length;
  const matrix: SimplexNumber[][] = Array.from({ length: rows }, () =>
    Array(cols)
      .fill(null)
      .map(() => makeZero()),
  );

  let currentSlack = 0;
  let currentArtificial = 0;

  problem.constraints.forEach((c, rowIndex) => {
    c.coefficients.forEach((coef, colIndex) => {
      matrix[rowIndex][colIndex] = makeNum(coef);
    });

    const op = c.operator;

    if (op === "<=") {
      currentSlack++;
      const sIndex = headers.indexOf(`S${currentSlack}`);
      matrix[rowIndex][sIndex] = makeNum(1);
    } else if (op === ">=") {
      currentSlack++;
      currentArtificial++;
      const sIndex = headers.indexOf(`S${currentSlack}`);
      const aIndex = headers.indexOf(`A${currentArtificial}`);
      matrix[rowIndex][sIndex] = makeNum(-1);
      matrix[rowIndex][aIndex] = makeNum(1);
    } else if (op === "=") {
      currentArtificial++;
      const aIndex = headers.indexOf(`A${currentArtificial}`);
      matrix[rowIndex][aIndex] = makeNum(1);
    }

    matrix[rowIndex][cols - 1] = makeNum(c.rhs);
  });

  const cj: SimplexNumber[] = headers.slice(0, -1).map(() => makeZero());

  problem.objective.forEach((coef, i) => {
    cj[i] = makeNum(coef);
  });

  headers.slice(0, -1).forEach((header, i) => {
    if (header.startsWith("A")) {
      cj[i] = {
        real: new Fraction(0),
        mCount: problem.optType === "MAX" ? new Fraction(-1) : new Fraction(1),
      };
    }
  });

  // NUEVO: Calculamos la fila Zj desde el inicio en lugar de dejarla en 0
  const { zj, zjCj, solutionValue } = calculateZjAndZjCj(
    matrix,
    headers,
    basicVariables,
    cj,
  );

  return {
    headers,
    matrix,
    basicVariables,
    cj,
    zj,
    zjCj,
    solutionValue,
  };
}
