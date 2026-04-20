import React from "react";
import { Tableau, SimplexNumber, OptType } from "@/lib/types";

interface Props {
  tableau: Tableau;
  title: string;
  isOptimal?: boolean;
  iterationIndex: number;
  optType: OptType;
  useContext: boolean;
  labelsDict: Record<string, string>;
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
  optType,
  useContext,
  labelsDict,
}: Props) {
  const rhsIndex = tableau.headers.length - 1;

  // Extraer valores con soporte para etiquetas de contexto
  const getSolutionValues = () => {
    const values: {
      name: string;
      label: string;
      value: string;
      isZero: boolean;
      isBase: boolean;
    }[] = [];
    tableau.headers.slice(0, -1).forEach((header) => {
      if (
        header.startsWith("X") ||
        header.startsWith("S") ||
        header.startsWith("A")
      ) {
        const basicIndex = tableau.basicVariables.indexOf(header);
        const label =
          useContext && labelsDict[header] ? labelsDict[header] : header;

        if (basicIndex !== -1) {
          const valNum = tableau.matrix[basicIndex][rhsIndex];
          values.push({
            name: header,
            label,
            value: formatNumber(valNum),
            isZero:
              valNum.real.valueOf() === 0 && valNum.mCount.valueOf() === 0,
            isBase: true,
          });
        } else {
          values.push({
            name: header,
            label,
            value: "0",
            isZero: true,
            isBase: false,
          });
        }
      }
    });
    return values;
  };

  // Extraer Precios Sombra con etiquetas
  const getShadowPrices = () => {
    const prices: {
      name: string;
      label: string;
      value: string;
      isZero: boolean;
    }[] = [];
    tableau.headers.forEach((header, index) => {
      if (header.startsWith("S")) {
        const label =
          useContext && labelsDict[header] ? labelsDict[header] : header;
        const pVal = tableau.zj[index];
        prices.push({
          name: header,
          label: `Precio Sombra (${label})`,
          value: formatNumber(pVal),
          isZero: pVal.real.valueOf() === 0 && pVal.mCount.valueOf() === 0,
        });
      }
    });
    return prices;
  };

  const solutionValues = getSolutionValues();
  const shadowPrices = getShadowPrices();
  const solutionTitle = isOptimal
    ? "SOLUCIÓN ÓPTIMA"
    : `${iterationIndex + 1}ª SOLUCIÓN FACTIBLE`;

  // === GENERADOR DE TEXTO DE INTERPRETACIÓN ===
  const generateInterpretation = () => {
    const xVars = solutionValues.filter((v) => v.name.startsWith("X"));
    const sVars = solutionValues.filter((v) => v.name.startsWith("S"));
    const aVars = solutionValues.filter((v) => v.name.startsWith("A"));

    const isMax = optType === "MAX";
    const statusText = isOptimal
      ? "La estrategia óptima para"
      : "En esta fase del algoritmo, para";
    const goalText = isMax ? "maximizar el beneficio" : "minimizar el costo";

    return (
      <div className="space-y-4 text-sm text-slate-700 mt-4 border-t border-slate-200 pt-5">
        <p>
          <strong>Estrategia Principal:</strong> {statusText} {goalText} (con un
          resultado de{" "}
          <span className="font-bold text-blue-600 border-b border-blue-200 pb-0.5">
            {formatNumber(tableau.solutionValue)}
          </span>
          ), se recomienda:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {xVars.map((v, i) => (
            <li key={`x-${i}`}>
              {v.isZero ? "No producir " : "Producir "}
              <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                {v.value}
              </span>{" "}
              unidades de{" "}
              <span className="italic text-slate-800 font-medium">
                {v.label}
              </span>
              .
            </li>
          ))}
        </ul>

        <p className="pt-2">
          <strong>Análisis de Recursos y Precios Sombra:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          {sVars.map((v, i) => {
            const shadow = shadowPrices.find((p) => p.name === v.name);
            const shadowVal = shadow?.value || "0";
            return (
              <li key={`s-${i}`}>
                {v.isZero ? (
                  <span>
                    El recurso{" "}
                    <span className="font-bold italic text-slate-800">
                      {v.label}
                    </span>{" "}
                    se ha <strong>agotado por completo</strong>. Su{" "}
                    <strong>Precio Sombra es de {shadowVal}</strong>, lo que
                    significa que por cada unidad extra que consigamos de este
                    recurso, la función objetivo (Z){" "}
                    {isMax ? "aumentará" : "mejorará"} en {shadowVal}.
                  </span>
                ) : (
                  <span>
                    Quedan{" "}
                    <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      {v.value}
                    </span>{" "}
                    unidades sobrantes de{" "}
                    <span className="italic text-slate-800 font-medium">
                      {v.label}
                    </span>
                    . Al no haberse agotado, su Precio Sombra es 0 (conseguir
                    más no aportaría ningún valor adicional).
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {aVars.some((v) => !v.isZero) && isOptimal && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mt-4 shadow-sm">
            <strong>⚠️ Alerta de Inviabilidad:</strong> Las variables
            artificiales (
            {aVars
              .filter((v) => !v.isZero)
              .map((v) => v.label)
              .join(", ")}
            ) tienen un valor distinto de cero. Esto significa matemáticamente
            que el problema original <strong>no tiene una solución real</strong>{" "}
            que cumpla todas las restricciones dadas (uso de la Gran M).
          </div>
        )}
      </div>
    );
  };

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
                  {useContext && labelsDict[h] ? labelsDict[h] : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableau.matrix.map((row, rowIndex) => {
              const bVar = tableau.basicVariables[rowIndex];
              const bLabel =
                useContext && labelsDict[bVar] ? labelsDict[bVar] : bVar;
              return (
                <tr
                  key={rowIndex}
                  className="group hover:bg-blue-50/50 transition-colors"
                >
                  <td className="p-3 border border-slate-200 font-bold text-blue-600 bg-slate-50">
                    {tableau.pivotRow === rowIndex && (
                      <span className="text-red-500 mr-2 animate-pulse">←</span>
                    )}
                    {bLabel}
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
              );
            })}
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
          className={`text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${isOptimal ? "text-green-700" : "text-slate-500"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isOptimal ? "bg-green-500 animate-pulse" : "bg-blue-500"}`}
          ></div>
          {solutionTitle}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase">
              Variables de Decisión, Holgura y Artificiales
            </p>
            <div className="flex flex-wrap gap-2">
              {solutionValues.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                  title={v.name}
                >
                  <span
                    className={`font-bold text-sm ${v.name.startsWith("A") ? "text-red-500" : "text-slate-700"}`}
                  >
                    {v.label}
                  </span>
                  <span className="font-mono font-bold text-blue-600">
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase italic">
              Análisis de Sensibilidad (Precios Sombra)
            </p>
            <div className="flex flex-wrap gap-2">
              {shadowPrices.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm"
                  title={p.name}
                >
                  <span className="font-bold text-amber-800 text-sm">
                    {p.label}
                  </span>
                  <span className="font-mono font-bold text-amber-600">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* INYECCIÓN DEL REPORTE TEXTUAL */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-6">
          <h5 className="font-black text-slate-800 flex items-center gap-2 text-lg">
            📄 Interpretación del Resultado {isOptimal && "Final"}
          </h5>
          {generateInterpretation()}
        </div>
      </div>
    </div>
  );
}
