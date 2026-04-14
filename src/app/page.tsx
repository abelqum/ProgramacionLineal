"use client";

import { useState } from "react";
import { OptType, Operator, ConstraintInput, Tableau } from "@/lib/types";
import { convertToStandardForm } from "@/lib/simplex/parser";
import { calculateNextTableau } from "@/lib/simplex/engine";
import { getDualProblem } from "@/lib/simplex/dual"; // IMPORTAMOS LA LÓGICA DUAL
import TableauRenderer from "@/components/TableauRenderer";

export default function SimplexSolver() {
  const [numVars, setNumVars] = useState<number>(2);
  const [optType, setOptType] = useState<OptType>("MAX");
  const [objective, setObjective] = useState<number[]>(Array(2).fill(0));
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, coefficients: Array(2).fill(0), operator: "<=", rhs: 0 },
  ]);

  const [tableaus, setTableaus] = useState<Tableau[]>([]);
  const [status, setStatus] = useState<string>("");

  const addVariable = () => {
    setNumVars((prev) => prev + 1);
    setObjective((prev) => [...prev, 0]);
    setConstraints((prev) =>
      prev.map((c) => ({ ...c, coefficients: [...c.coefficients, 0] })),
    );
  };

  const removeVariable = (indexToRemove: number) => {
    if (numVars <= 1) return;
    setNumVars((prev) => prev - 1);
    setObjective((prev) => prev.filter((_, i) => i !== indexToRemove));
    setConstraints((prev) =>
      prev.map((c) => ({
        ...c,
        coefficients: c.coefficients.filter((_, i) => i !== indexToRemove),
      })),
    );
  };

  const addConstraint = () => {
    setConstraints((prev) => [
      ...prev,
      {
        id: Date.now(),
        coefficients: Array(numVars).fill(0),
        operator: "<=",
        rhs: 0,
      },
    ]);
  };

  const removeConstraint = (idToRemove: number) => {
    setConstraints((prev) => prev.filter((c) => c.id !== idToRemove));
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObj = [...objective];
    newObj[index] = parseFloat(value) || 0;
    setObjective(newObj);
  };

  const handleConstraintCoefChange = (
    cIndex: number,
    vIndex: number,
    value: string,
  ) => {
    const newConstraints = [...constraints];
    newConstraints[cIndex].coefficients[vIndex] = parseFloat(value) || 0;
    setConstraints(newConstraints);
  };

  const handleStandardModel = () => {
    const problem = { numVars, optType, objective, constraints };
    const initialTableau = convertToStandardForm(problem);
    setTableaus([initialTableau]);
    setStatus("Modelo Estándar Generado.");
  };

  const handleSolveSimplex = () => {
    let localTableaus = [...tableaus];
    if (localTableaus.length === 0) {
      const problem = { numVars, optType, objective, constraints };
      localTableaus = [convertToStandardForm(problem)];
    }

    let current = localTableaus[localTableaus.length - 1];
    let safeBreaker = 0;

    while (safeBreaker < 25) {
      const next = calculateNextTableau(current, optType);
      if (next === "OPTIMAL") {
        setStatus("¡Solución Óptima encontrada!");
        break;
      } else if (next === "UNBOUNDED") {
        setStatus("Solución no acotada.");
        break;
      } else {
        localTableaus.push(next);
        current = next;
      }
      safeBreaker++;
    }
    setTableaus(localTableaus);
  };

  // NUEVA FUNCIÓN: Transformar a Dual y actualizar la vista
  const handleConvertToDual = () => {
    const currentProblem = { numVars, optType, objective, constraints };
    const dualProblem = getDualProblem(currentProblem);

    setNumVars(dualProblem.numVars);
    setOptType(dualProblem.optType);
    setObjective(dualProblem.objective);
    setConstraints(dualProblem.constraints);

    setTableaus([]); // Limpiamos las tablas porque cambió el problema
    setStatus("Convertido a Modelo Dual. (Las variables ahora representan Y)");
  };

  const handleReset = () => {
    setTableaus([]);
    setStatus("");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8">
          <h1 className="text-4xl font-black mb-2 text-blue-700 tracking-tighter italic">
            Calculadora método simplex
          </h1>
          <p className="text-slate-500 mb-8 font-medium">
            Herramienta de programacion lineal
          </p>

          <div className="flex gap-4 mb-10">
            <button
              onClick={addVariable}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span> Variable
            </button>
            <button
              onClick={addConstraint}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span> Restricción
            </button>
          </div>

          <section className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400">
                Función Objetivo
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-200">
              <select
                value={optType}
                onChange={(e) => setOptType(e.target.value as OptType)}
                className="bg-white border-2 border-slate-200 p-3 rounded-lg font-bold text-blue-700 focus:border-blue-500 outline-none"
              >
                <option value="MAX">MAX Z</option>
                <option value="MIN">MIN W</option>
              </select>
              <span className="text-2xl font-light">=</span>
              {objective.map((coef, index) => (
                <div
                  key={`obj-${index}`}
                  className="group relative flex items-center gap-2"
                >
                  <input
                    type="number"
                    value={coef === 0 ? "" : coef}
                    onChange={(e) =>
                      handleObjectiveChange(index, e.target.value)
                    }
                    className="w-24 p-3 bg-white border-2 border-slate-200 rounded-lg text-center font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
                  <span className="text-lg font-bold">
                    {/* Mostramos Y si es problema de minimización por estética, o dejamos X */}
                    {optType === "MIN" ? "Y" : "X"}
                    <sub className="text-xs">{index + 1}</sub>
                  </span>
                  {index < numVars - 1 && (
                    <span className="text-slate-300 font-bold text-xl">+</span>
                  )}
                  {numVars > 1 && (
                    <button
                      onClick={() => removeVariable(index)}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-8 w-1 bg-emerald-600 rounded-full"></div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400">
                Restricciones
              </h2>
            </div>
            <div className="space-y-4">
              {constraints.map((constraint, cIndex) => (
                <div
                  key={constraint.id}
                  className="flex items-center gap-4 flex-wrap bg-white p-5 rounded-xl border-2 border-slate-100 shadow-sm hover:border-emerald-200 transition-all"
                >
                  {constraint.coefficients.map((coef, vIndex) => (
                    <div
                      key={`c-${constraint.id}-v-${vIndex}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        value={coef === 0 ? "" : coef}
                        onChange={(e) =>
                          handleConstraintCoefChange(
                            cIndex,
                            vIndex,
                            e.target.value,
                          )
                        }
                        className="w-20 p-2.5 border-2 border-slate-100 rounded-lg text-center font-semibold focus:border-emerald-500 outline-none"
                        placeholder="0"
                      />
                      <span className="text-sm font-bold text-slate-500">
                        {optType === "MIN" ? "Y" : "X"}
                        <sub>{vIndex + 1}</sub>
                      </span>
                      {vIndex < numVars - 1 && (
                        <span className="text-slate-200 font-bold">+</span>
                      )}
                    </div>
                  ))}
                  <select
                    value={constraint.operator}
                    onChange={(e) => {
                      const newConstraints = [...constraints];
                      newConstraints[cIndex].operator = e.target
                        .value as Operator;
                      setConstraints(newConstraints);
                    }}
                    className="border-2 border-slate-100 p-2.5 rounded-lg font-black text-slate-700"
                  >
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    type="number"
                    value={constraint.rhs === 0 ? "" : constraint.rhs}
                    onChange={(e) => {
                      const newConstraints = [...constraints];
                      newConstraints[cIndex].rhs =
                        parseFloat(e.target.value) || 0;
                      setConstraints(newConstraints);
                    }}
                    className="w-28 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-center font-bold text-emerald-700"
                    placeholder="RHS"
                  />
                  <button
                    onClick={() => removeConstraint(constraint.id)}
                    className="ml-auto bg-slate-100 text-slate-400 w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-100">
            <button
              onClick={handleStandardModel}
              className="flex-1 bg-slate-800 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-900 transition shadow-lg"
            >
              MODELO ESTÁNDAR
            </button>
            <button
              onClick={handleSolveSimplex}
              className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
            >
              RESOLVER SIMPLEX
            </button>
            <button
              onClick={handleConvertToDual}
              className="flex-1 bg-indigo-500 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-600 transition shadow-lg shadow-indigo-200"
            >
              PASAR A DUAL
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
            >
              LIMPIAR
            </button>
          </div>
        </div>

        {tableaus.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">
                PROCEDIMIENTO
              </h2>
              <div
                className={`px-4 py-2 rounded-full font-bold text-sm ${status.includes("Óptima") ? "bg-green-500 text-white" : "bg-blue-500 text-white"}`}
              >
                {status}
              </div>
            </div>

            <div className="py-4">
              {tableaus.map((tab, index) => {
                const isOptimal =
                  index === tableaus.length - 1 && status.includes("Óptima");
                return (
                  <TableauRenderer
                    key={index}
                    tableau={tab}
                    title={
                      index === 0
                        ? "MODELO ESTÁNDAR (TABLA INICIAL)"
                        : `ITERACIÓN ${index}`
                    }
                    iterationIndex={index}
                    isOptimal={isOptimal}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
