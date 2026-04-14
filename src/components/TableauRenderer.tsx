import React from "react";
import { Tableau, SimplexNumber } from "@/lib/types";

interface Props {
  tableau: Tableau;
  title: string;
  isOptimal?: boolean;
  iterationIndex: number;
}

const formatNumber = (num: SimplexNumber): string => {
  const realVal = num.real.valueOf();
  const mVal = num.mCount.valueOf();
  const realStr = realVal === 0 ? "" : num.real.toFraction();

  let mStr = "";
  if (mVal !== 0) {
    if (mVal === 1) mStr = "M";
    else if (mVal === -1) mStr = "-M";
    else mStr = `${num.mCount.toFraction()}M`;
  }

  if (!realStr && !mStr) return "0";
  if (!realStr) return mStr;
  if (!mStr) return realStr;

  return `${realStr} ${mVal > 0 ? "+" : ""} ${mStr}`;
};

export default function TableauRenderer({
  tableau,
  title,
  isOptimal,
  iterationIndex,
}: Props) {
  const rhsIndex = tableau.headers.length - 1;

  // Extraer valores de las variables de decisión (X) y holgura (S)
  const getSolutionValues = () => {
    const values: { name: string; value: string }[] = [];
    tableau.headers.slice(0, -1).forEach((header) => {
      // Solo mostramos X y S en el resumen principal
      if (header.startsWith("X") || header.startsWith("S")) {
        const basicIndex = tableau.basicVariables.indexOf(header);

        if (basicIndex !== -1) {
          // Si está en la base, formateamos su valor real extraído de la matriz
          values.push({
            name: header,
            value: formatNumber(tableau.matrix[basicIndex][rhsIndex]),
          });
        } else {
          // Si no está en la base, su valor es automáticamente 0 (texto directo)
          values.push({ name: header, value: "0" });
        }
      }
    });
    return values;
  };

  // Extraer Precios Sombra (Valores de Zj bajo las columnas de S)
  const getShadowPrices = () => {
    const prices: { name: string; value: string }[] = [];
    tableau.headers.forEach((header, index) => {
      if (header.startsWith("S")) {
        prices.push({
          name: `Precio ${header}`,
          value: formatNumber(tableau.zj[index]),
        });
      }
    });
    return prices;
  };

  const solutionValues = getSolutionValues();
  const shadowPrices = getShadowPrices();

  // Nombres: Empieza en la 1ª Solución Factible
  const solutionTitle = isOptimal
    ? "SOLUCIÓN ÓPTIMA"
    : `${iterationIndex + 1}ª SOLUCIÓN FACTIBLE`;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-100 mb-10 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-700 uppercase tracking-tight">
          {title}
        </h3>
        <span
          className={`${isOptimal ? "bg-green-600 text-white" : "bg-blue-600 text-white"} px-4 py-1.5 rounded-full font-black shadow-md transition-all`}
        >
          Z = {formatNumber(tableau.solutionValue)}
        </span>
      </div>

      <div className="overflow-x-auto mb-6 border rounded-lg">
        <table className="min-w-full text-center border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs">
              <th className="p-2 border border-slate-700">Cj</th>
              {tableau.cj.map((coef, i) => (
                <th
                  key={`cj-${i}`}
                  className="p-2 border border-slate-700 font-medium"
                >
                  {formatNumber(coef)}
                </th>
              ))}
              <th className="p-2 border border-slate-700"></th>
            </tr>
            <tr className="bg-slate-100 text-slate-800 font-bold">
              <th className="p-3 border border-slate-200">BASE</th>
              {tableau.headers.map((h, i) => (
                <th key={i} className="p-3 border border-slate-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableau.matrix.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="group hover:bg-blue-50/50 transition-colors"
              >
                <td className="p-3 border border-slate-200 font-bold text-blue-600 bg-slate-50">
                  {tableau.pivotRow === rowIndex && (
                    <span className="text-red-500 mr-2 animate-pulse">←</span>
                  )}
                  {tableau.basicVariables[rowIndex]}
                </td>
                {row.map((col, colIndex) => {
                  const isPivot =
                    rowIndex === tableau.pivotRow &&
                    colIndex === tableau.pivotCol;
                  const isEntering = colIndex === tableau.pivotCol;
                  return (
                    <td
                      key={colIndex}
                      className={`p-3 border border-slate-200 ${
                        isPivot
                          ? "bg-yellow-400 font-bold ring-2 ring-yellow-600 ring-inset"
                          : isEntering
                            ? "bg-yellow-50"
                            : ""
                      }`}
                    >
                      {formatNumber(col)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-slate-600 italic">
              <td className="p-3 border border-slate-200">Zj</td>
              {tableau.zj.map((val, i) => (
                <td key={`zj-${i}`} className="p-3 border border-slate-200">
                  {formatNumber(val)}
                </td>
              ))}
            </tr>
            <tr className="bg-blue-600 text-white font-bold">
              <td className="p-3 border border-blue-700">Zj - Cj</td>
              {tableau.zjCj.map((val, i) => (
                <td key={`zjcj-${i}`} className="p-3 border border-blue-700">
                  {i === rhsIndex ? "---" : formatNumber(val)}
                  {tableau.pivotCol === i && (
                    <div className="text-[10px] mt-1 opacity-80 animate-bounce">
                      ↑ ENTRA
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={`p-5 rounded-xl border-2 ${isOptimal ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200 shadow-inner"}`}
      >
        <h4
          className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isOptimal ? "text-green-700" : "text-slate-500"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isOptimal ? "bg-green-500" : "bg-blue-500"}`}
          ></div>
          {solutionTitle}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Valores de las variables */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">
              Variables de Decisión y Holgura
            </p>
            <div className="flex flex-wrap gap-2">
              {solutionValues.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <span className="font-bold text-slate-700 text-sm">
                    {v.name}
                  </span>
                  <span className="font-mono font-bold text-blue-600">
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Precios Sombra */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase italic">
              Análisis de Sensibilidad (Precios Sombra)
            </p>
            <div className="flex flex-wrap gap-2">
              {shadowPrices.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm"
                >
                  <span className="font-bold text-amber-800 text-sm">
                    {p.name}
                  </span>
                  <span className="font-mono font-bold text-amber-600">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
