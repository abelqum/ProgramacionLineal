import {
  LinearProblemInput,
  OptType,
  Operator,
  ConstraintInput,
} from "../types";

export function getDualProblem(
  problem: LinearProblemInput,
): LinearProblemInput {
  // 1. Invertir Optimización (MAX <-> MIN)
  const dualOptType: OptType = problem.optType === "MAX" ? "MIN" : "MAX";

  // 2. El número de variables Duales (Y) es igual al número de restricciones Primales
  const dualNumVars = problem.constraints.length;

  // 3. La nueva Función Objetivo usa los RHS de las restricciones originales
  const dualObjective = problem.constraints.map((c) => c.rhs);

  // 4. Construir las nuevas restricciones (Transponiendo la matriz)
  const dualConstraints: ConstraintInput[] = [];

  for (let j = 0; j < problem.numVars; j++) {
    // Transponer: Tomamos el coeficiente 'j' de cada restricción original
    const coefficients = problem.constraints.map((c) => c.coefficients[j] || 0);

    // CORRECCIÓN AQUÍ: Usamos const en lugar de let
    const operator: Operator = dualOptType === "MIN" ? ">=" : "<=";

    // El RHS de la nueva restricción es el coeficiente 'j' de la Función Objetivo original
    const rhs = problem.objective[j] || 0;

    dualConstraints.push({
      id: Date.now() + j,
      coefficients,
      operator,
      rhs,
    });
  }

  return {
    numVars: dualNumVars,
    optType: dualOptType,
    objective: dualObjective,
    constraints: dualConstraints,
  };
}
