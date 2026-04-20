"use client";
import Image from "next/image";
import { useState } from "react";
import {
  OptType,
  Operator,
  ConstraintInput,
  Tableau,
  LinearProblemInput,
} from "@/lib/types";
import { convertToStandardForm } from "@/lib/simplex/parser";
import { calculateNextTableau } from "@/lib/simplex/engine";
import { getDualProblem } from "@/lib/simplex/dual";
import TableauRenderer from "@/components/TableauRenderer";
import SolutionGraph from "@/components/SolutionGraph";

export default function SimplexSolver() {
  const [numVars, setNumVars] = useState<number>(2);
  const [optType, setOptType] = useState<OptType>("MAX");
  const [objective, setObjective] = useState<number[]>(Array(2).fill(0));
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, coefficients: Array(2).fill(0), operator: "<=", rhs: 0 },
  ]);

  const [tableaus, setTableaus] = useState<Tableau[]>([]);
  const [status, setStatus] = useState<string>("");

  // ESTADOS DEL DUAL
  const [isDual, setIsDual] = useState<boolean>(false);
  const [primalBackup, setPrimalBackup] = useState<LinearProblemInput | null>(
    null,
  );

  // ESTADOS DEL CONTEXTO
  const [useContext, setUseContext] = useState<boolean>(false);
  const [varNames, setVarNames] = useState<string[]>(["X1", "X2"]);
  const [constraintNames, setConstraintNames] = useState<string[]>([
    "Restricción 1",
  ]);

  // ESTADOS DEL ASISTENTE IA
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  const addVariable = () => {
    setNumVars((prev) => prev + 1);
    setObjective((prev) => [...prev, 0]);
    setVarNames((prev) => [...prev, `X${prev.length + 1}`]);
    setConstraints((prev) =>
      prev.map((c) => ({ ...c, coefficients: [...c.coefficients, 0] })),
    );
  };

  const removeVariable = (indexToRemove: number) => {
    if (numVars <= 1) return;
    setNumVars((prev) => prev - 1);
    setObjective((prev) => prev.filter((_, i) => i !== indexToRemove));
    setVarNames((prev) => prev.filter((_, i) => i !== indexToRemove));
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
    setConstraintNames((prev) => [...prev, `Restricción ${prev.length + 1}`]);
  };

  const removeConstraint = (idToRemove: number) => {
    const index = constraints.findIndex((c) => c.id === idToRemove);
    if (index > -1) {
      setConstraintNames((prev) => prev.filter((_, i) => i !== index));
    }
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

  const getLabelsDict = () => {
    const dict: Record<string, string> = {};
    if (!useContext || isDual) return dict;

    varNames.forEach((n, i) => (dict[`X${i + 1}`] = n || `X${i + 1}`));

    let sCount = 0;
    let aCount = 0;
    constraints.forEach((c, i) => {
      const cName = constraintNames[i] || `Restricción ${i + 1}`;
      if (c.operator === "<=") {
        sCount++;
        dict[`S${sCount}`] = cName;
      } else if (c.operator === ">=") {
        sCount++;
        aCount++;
        dict[`S${sCount}`] = cName;
        dict[`A${aCount}`] = `Art. ${cName}`;
      } else if (c.operator === "=") {
        aCount++;
        dict[`A${aCount}`] = `Art. ${cName}`;
      }
    });
    return dict;
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

  const handleToggleDual = () => {
    if (!isDual) {
      const currentProblem: LinearProblemInput = {
        numVars,
        optType,
        objective,
        constraints,
      };
      setPrimalBackup(currentProblem);

      const dualProblem = getDualProblem(currentProblem);
      setNumVars(dualProblem.numVars);
      setOptType(dualProblem.optType);
      setObjective(dualProblem.objective);
      setConstraints(dualProblem.constraints);

      setTableaus([]);
      setStatus("Convertido a Modelo Dual. (Variables convertidas a Y)");
      setIsDual(true);
    } else {
      if (primalBackup) {
        setNumVars(primalBackup.numVars);
        setOptType(primalBackup.optType);
        setObjective(primalBackup.objective);
        setConstraints(primalBackup.constraints);
      }

      setTableaus([]);
      setStatus("Regresado al Modelo Primal original.");
      setIsDual(false);
    }
  };

  // === LÓGICA DE INTELIGENCIA ARTIFICIAL ESTRICTAMENTE TIPADA ===
  const handleAiSubmit = async () => {
    if (!apiKey || !aiPrompt) {
      setAiError("Por favor ingresa tu API Key y el problema.");
      return;
    }
    setIsAiLoading(true);
    setAiError("");

    const systemInstruction = `Eres un experto en Investigación de Operaciones. Lee el problema de programación lineal del usuario y extrae el modelo matemático.
    Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin formato markdown \`\`\`json, solo las llaves):
    {
      "numVars": 2,
      "optType": "MAX",
      "objective": [50, 30],
      "varNames": ["Mesas", "Sillas"],
      "constraints": [
        { "coefficients": [2, 1], "operator": "<=", "rhs": 40 },
        { "coefficients": [1, 1], "operator": "<=", "rhs": 30 }
      ],
      "constraintNames": ["Horas Carpintería", "Horas Pintura"]
    }`;

    try {
      // Cambiamos 'gemini-1.5-flash' por 'gemini-1.5-flash-latest'
      // Plan B (Solo si el anterior falla):
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemInstruction}\n\nProblema del usuario: ${aiPrompt}`,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Error desconocido en la API de Google.",
        );
      }

      const data = await response.json();
      let textResponse = data.candidates[0].content.parts[0].text;

      textResponse = textResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(textResponse);

      setNumVars(parsed.numVars);
      setOptType(parsed.optType);
      setObjective(parsed.objective);
      setVarNames(parsed.varNames);
      setConstraintNames(parsed.constraintNames);

      // Usamos Omit para evitar el error de "any"
      const mappedConstraints = parsed.constraints.map(
        (c: Omit<ConstraintInput, "id">, i: number) => ({
          ...c,
          id: Date.now() + i,
        }),
      );
      setConstraints(mappedConstraints);

      setUseContext(true);
      setTableaus([]);
      setShowAiModal(false);
      setStatus("Modelo cargado con éxito por la IA.");
    } catch (error: unknown) {
      // <-- Se reemplaza el 'any' por 'unknown'
      const errMsg =
        error instanceof Error ? error.message : "Error de red desconocido";
      setAiError(`Error: ${errMsg}`);
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleReset = () => {
    setTableaus([]);
    setStatus("");
  };

  const currentLabelsDict = getLabelsDict();

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans relative">
      {/* MODAL DE IA */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-blue-700 flex items-center gap-2">
                ✨ Asistente IA{" "}
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  Gemini Powered
                </span>
              </h3>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Pega tu problema en texto y la IA estructurará todo el modelo
              matemático por ti.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  API Key de Gemini
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Pega tu API Key aquí..."
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Problema de Programación Lineal
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ej: Una empresa fabrica mesas y sillas..."
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm min-h-[120px] resize-y"
                />
              </div>
              {aiError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {aiError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAiSubmit}
                disabled={isAiLoading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? "Analizando..." : "Extraer Modelo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8">
            <Image
              src="/logo.png" // debe estar en /public
              alt="Logo Generex"
              width={200}
              height={100}
              className="h-full"
            />

            <div className="flex flex-col justify-center items-center gap-3 ">
              {/* BOTÓN ASISTENTE IA */}
              {!isDual && (
                <button
                  onClick={() => setShowAiModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 text-sm shadow-md"
                >
                  ✨ Asistente IA
                </button>
              )}
              {/* SWITCH: MODO CONTEXTO */}
              {!isDual && (
                <label className="flex items-center gap-3 cursor-pointer bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={useContext}
                      onChange={(e) => setUseContext(e.target.checked)}
                    />
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors ${useContext ? "bg-blue-600" : "bg-slate-300"}`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useContext ? "transform translate-x-4" : ""}`}
                    ></div>
                  </div>
                  <div className="font-bold text-sm text-blue-900">
                    Añadir Contexto
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-10">
            <button
              onClick={addVariable}
              disabled={isDual}
              className={`px-5 py-2.5 rounded-lg font-bold transition shadow-lg flex items-center gap-2 ${
                isDual
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              <span className="text-xl">+</span> Variable
            </button>
            <button
              onClick={addConstraint}
              disabled={isDual}
              className={`px-5 py-2.5 rounded-lg font-bold transition shadow-lg flex items-center gap-2 ${
                isDual
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
              }`}
            >
              <span className="text-xl">+</span> Restricción
            </button>
          </div>

          <section className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400">
                Función Objetivo{" "}
                {isDual && (
                  <span className="text-indigo-500 font-black ml-2">
                    (DUAL)
                  </span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-200">
              <select
                value={optType}
                onChange={(e) => setOptType(e.target.value as OptType)}
                disabled={isDual}
                className="bg-white border-2 border-slate-200 p-3 rounded-lg font-bold text-blue-700 focus:border-blue-500 outline-none"
              >
                <option value="MAX">MAX Z</option>
                <option value="MIN">MIN W</option>
              </select>
              <span className="text-2xl font-light">=</span>
              {objective.map((coef, index) => (
                <div
                  key={`obj-${index}`}
                  className="group relative flex flex-col items-center gap-2 bg-white p-3 border border-slate-200 rounded-xl shadow-sm"
                >
                  {useContext && !isDual && (
                    <input
                      type="text"
                      value={varNames[index] || ""}
                      onChange={(e) => {
                        const n = [...varNames];
                        n[index] = e.target.value;
                        setVarNames(n);
                      }}
                      className="text-xs text-center border-b border-dashed border-slate-300 focus:border-blue-500 outline-none w-24 text-blue-700 font-bold bg-transparent"
                      placeholder={`X${index + 1}`}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={coef === 0 ? "" : coef}
                      onChange={(e) =>
                        handleObjectiveChange(index, e.target.value)
                      }
                      disabled={isDual}
                      className="w-20 p-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-center font-bold focus:border-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                    <span className="text-lg font-bold text-slate-700">
                      {isDual ? "Y" : "X"}
                      <sub className="text-xs">{index + 1}</sub>
                    </span>
                  </div>
                  {numVars > 1 && !isDual && (
                    <button
                      onClick={() => removeVariable(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
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
                  className="flex flex-col gap-3 bg-white p-5 rounded-xl border-2 border-slate-100 shadow-sm hover:border-emerald-200 transition-all"
                >
                  {useContext && !isDual && (
                    <input
                      type="text"
                      value={constraintNames[cIndex] || ""}
                      onChange={(e) => {
                        const n = [...constraintNames];
                        n[cIndex] = e.target.value;
                        setConstraintNames(n);
                      }}
                      className="text-xs border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none w-1/3 text-emerald-700 font-bold bg-transparent"
                      placeholder={`Recurso ${cIndex + 1}`}
                    />
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
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
                          disabled={isDual}
                          className="w-16 p-2 border-2 border-slate-100 rounded-lg text-center font-semibold focus:border-emerald-500 outline-none"
                          placeholder="0"
                        />
                        <span className="text-sm font-bold text-slate-500">
                          {isDual ? "Y" : "X"}
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
                      disabled={isDual}
                      className="border-2 border-slate-100 p-2 rounded-lg font-black text-slate-700"
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
                      disabled={isDual}
                      className="w-24 p-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-center font-bold text-emerald-700"
                      placeholder="RHS"
                    />
                    {!isDual && (
                      <button
                        onClick={() => removeConstraint(constraint.id)}
                        className="ml-auto bg-slate-100 text-slate-400 w-8 h-8 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
              onClick={handleToggleDual}
              className={`flex-1 text-white px-6 py-4 rounded-xl font-bold transition shadow-lg ${
                isDual
                  ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                  : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200"
              }`}
            >
              {isDual ? "REGRESAR A PRIMAL" : "PASAR A DUAL"}
            </button>

            <button
              onClick={handleReset}
              className="px-6 py-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
            >
              LIMPIAR RESULTADOS
            </button>
          </div>
        </div>

        {/* INYECCIÓN DEL GRÁFICO */}
        {tableaus.length > 0 && numVars === 2 && constraints.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SolutionGraph
              constraints={constraints}
              objective={objective}
              optType={optType}
            />
          </div>
        )}

        {/* SECCIÓN DE TABLAS */}
        {tableaus.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">
                PROCEDIMIENTO{" "}
                {isDual && <span className="text-purple-600">(DUAL)</span>}
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
                    optType={optType}
                    useContext={useContext && !isDual}
                    labelsDict={currentLabelsDict}
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
