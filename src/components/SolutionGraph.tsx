import React, { useMemo } from "react";
import { ConstraintInput } from "@/lib/types";

interface Props {
  constraints: ConstraintInput[];
  objective: number[];
  optType: "MAX" | "MIN";
}

// Interfaz estrictamente definida
interface Point {
  x: number;
  y: number;
}

interface ComputedLine {
  p1: Point | null;
  p2: Point | null;
  operator: string;
  a: number;
  b: number;
  rhs: number;
}

export default function SolutionGraph({
  constraints,
  objective,
  optType,
}: Props) {
  // CORRECCIÓN: Le decimos a useMemo EXACTAMENTE qué devuelve
  const { lines, feasiblePolygon, optimalPoint, maxValue } = useMemo<{
    lines: ComputedLine[];
    feasiblePolygon: Point[];
    optimalPoint: Point | null;
    maxValue: number;
  }>(() => {
    const computedLines: ComputedLine[] = constraints.map((c) => {
      const a = c.coefficients[0] || 0;
      const b = c.coefficients[1] || 0;
      const rhs = c.rhs;

      const p1: Point | null = a !== 0 ? { x: rhs / a, y: 0 } : null;
      const p2: Point | null = b !== 0 ? { x: 0, y: rhs / b } : null;

      return { p1, p2, operator: c.operator, a, b, rhs };
    });

    const allBoundaryLines = [
      ...computedLines.map((l) => ({
        a: l.a,
        b: l.b,
        c: l.rhs,
        op: l.operator,
      })),
      { a: 1, b: 0, c: 0, op: ">=" },
      { a: 0, b: 1, c: 0, op: ">=" },
    ];

    const intersections: Point[] = [];
    for (let i = 0; i < allBoundaryLines.length; i++) {
      for (let j = i + 1; j < allBoundaryLines.length; j++) {
        const l1 = allBoundaryLines[i];
        const l2 = allBoundaryLines[j];
        const det = l1.a * l2.b - l2.a * l1.b;

        if (Math.abs(det) > 1e-9) {
          const x = (l1.c * l2.b - l2.c * l1.b) / det;
          const y = (l1.a * l2.c - l2.a * l1.c) / det;
          intersections.push({ x, y });
        }
      }
    }

    const validPoints: Point[] = [];
    intersections.forEach((p: Point) => {
      if (p.x < -1e-7 || p.y < -1e-7) return;

      let isValid = true;
      for (const line of computedLines) {
        const val = line.a * p.x + line.b * p.y;
        if (line.operator === "<=" && val > line.rhs + 1e-7) isValid = false;
        if (line.operator === ">=" && val < line.rhs - 1e-7) isValid = false;
        if (line.operator === "=" && Math.abs(val - line.rhs) > 1e-7)
          isValid = false;
      }

      if (
        isValid &&
        !validPoints.some(
          (vp: Point) =>
            Math.abs(vp.x - p.x) < 1e-5 && Math.abs(vp.y - p.y) < 1e-5,
        )
      ) {
        validPoints.push(p);
      }
    });

    const cx =
      validPoints.reduce((sum: number, p: Point) => sum + p.x, 0) /
      (validPoints.length || 1);
    const cy =
      validPoints.reduce((sum: number, p: Point) => sum + p.y, 0) /
      (validPoints.length || 1);
    validPoints.sort(
      (a: Point, b: Point) =>
        Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
    );

    let bestPoint: Point | null = null;
    let bestZ = optType === "MAX" ? -Infinity : Infinity;

    validPoints.forEach((p: Point) => {
      const z = (objective[0] || 0) * p.x + (objective[1] || 0) * p.y;
      if (optType === "MAX" && z > bestZ) {
        bestZ = z;
        bestPoint = p;
      }
      if (optType === "MIN" && z < bestZ) {
        bestZ = z;
        bestPoint = p;
      }
    });

    const globalMax = computedLines.reduce(
      (max: number, line: ComputedLine) => {
        const p1x = line.p1 ? line.p1.x : 0;
        const p2y = line.p2 ? line.p2.y : 0;
        return Math.max(max, p1x, p2y);
      },
      10,
    );

    const absoluteMax = validPoints.reduce(
      (max: number, p: Point) => Math.max(max, p.x, p.y),
      globalMax,
    );

    return {
      lines: computedLines,
      feasiblePolygon: validPoints,
      optimalPoint: bestPoint,
      maxValue: absoluteMax * 1.2,
    };
  }, [constraints, objective, optType]);

  const size = 400;
  const padding = 50;
  const scale = (size - padding * 2) / (maxValue === 0 ? 1 : maxValue);

  const toCoord = (val: number, isY = false) => {
    return isY ? size - padding - val * scale : padding + val * scale;
  };

  const polygonPoints = feasiblePolygon
    .map((p: Point) => `${toCoord(p.x)},${toCoord(p.y, true)}`)
    .join(" ");

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-700 uppercase italic">
          Visualización Gráfica (X₁ vs X₂)
        </h3>
        {feasiblePolygon.length === 0 && (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold text-sm">
            Problema Inviable
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        <div className="relative flex justify-center border border-slate-100 rounded-xl bg-slate-50/50 shadow-inner overflow-hidden">
          <svg width={size} height={size} className="overflow-visible">
            {[0.25, 0.5, 0.75, 1].map((step) => {
              const val = maxValue * step;
              return (
                <g key={`grid-${step}`} className="text-slate-300">
                  <line
                    x1={padding}
                    y1={toCoord(val, true)}
                    x2={size - padding}
                    y2={toCoord(val, true)}
                    stroke="currentColor"
                    strokeDasharray="2"
                  />
                  <text
                    x={padding - 10}
                    y={toCoord(val, true) + 4}
                    className="text-[10px] font-medium fill-slate-400"
                    textAnchor="end"
                  >
                    {val.toFixed(1)}
                  </text>
                  <line
                    x1={toCoord(val)}
                    y1={padding}
                    x2={toCoord(val)}
                    y2={size - padding}
                    stroke="currentColor"
                    strokeDasharray="2"
                  />
                  <text
                    x={toCoord(val)}
                    y={size - padding + 15}
                    className="text-[10px] font-medium fill-slate-400"
                    textAnchor="middle"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {feasiblePolygon.length > 0 && (
              <polygon
                points={polygonPoints}
                fill="rgba(16, 185, 129, 0.25)"
                stroke="#10b981"
                strokeWidth="2"
              />
            )}

            <line
              x1={padding}
              y1={size - padding}
              x2={size}
              y2={size - padding}
              stroke="#64748b"
              strokeWidth="2"
            />
            <line
              x1={padding}
              y1={0}
              x2={padding}
              y2={size - padding}
              stroke="#64748b"
              strokeWidth="2"
            />

            <text
              x={size - 10}
              y={size - padding + 20}
              className="text-xs font-bold fill-slate-500"
            >
              X₁
            </text>
            <text
              x={padding - 20}
              y={15}
              className="text-xs font-bold fill-slate-500"
            >
              X₂
            </text>

            {lines.map((line, i) => {
              let p1, p2;
              if (line.a === 0) {
                p1 = { x: 0, y: line.rhs / line.b };
                p2 = { x: maxValue, y: line.rhs / line.b };
              } else if (line.b === 0) {
                p1 = { x: line.rhs / line.a, y: 0 };
                p2 = { x: line.rhs / line.a, y: maxValue };
              } else {
                p1 = { x: 0, y: line.rhs / line.b };
                p2 = { x: line.rhs / line.a, y: 0 };
              }

              return (
                <g key={i}>
                  <line
                    x1={toCoord(p1.x)}
                    y1={toCoord(p1.y, true)}
                    x2={toCoord(p2.x)}
                    y2={toCoord(p2.y, true)}
                    stroke={i % 2 === 0 ? "#3b82f6" : "#f59e0b"}
                    strokeWidth="2"
                    strokeDasharray="5"
                  />
                </g>
              );
            })}

            {feasiblePolygon.map((p: Point, i) => {
              const isOptimal =
                optimalPoint &&
                Math.abs(p.x - optimalPoint.x) < 1e-5 &&
                Math.abs(p.y - optimalPoint.y) < 1e-5;
              const zVal =
                (objective[0] || 0) * p.x + (objective[1] || 0) * p.y;

              return (
                <g key={`vertex-${i}`}>
                  <circle
                    cx={toCoord(p.x)}
                    cy={toCoord(p.y, true)}
                    r={isOptimal ? "6" : "4"}
                    fill={isOptimal ? "#ef4444" : "#1e293b"}
                    className={isOptimal ? "animate-pulse" : ""}
                  />

                  <g
                    transform={`translate(${toCoord(p.x) + 8}, ${toCoord(p.y, true) - (isOptimal ? 15 : 5)})`}
                  >
                    <rect
                      x="-2"
                      y="-10"
                      width="55"
                      height={isOptimal ? "24" : "14"}
                      fill="rgba(255,255,255,0.9)"
                      rx="3"
                    />
                    <text
                      fontSize="10"
                      fontWeight="bold"
                      fill={isOptimal ? "#ef4444" : "#475569"}
                    >
                      ({Number(p.x.toFixed(1))}, {Number(p.y.toFixed(1))})
                    </text>
                    {isOptimal && (
                      <text
                        y="10"
                        fontSize="9"
                        fontWeight="black"
                        fill="#ef4444"
                      >
                        Z = {Number(zVal.toFixed(1))}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}

            <circle cx={padding} cy={size - padding} r="5" fill="#1e293b" />
          </svg>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-64">
          <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl shadow-sm">
            <h4 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              SOLUCIÓN GRÁFICA
            </h4>
            {optimalPoint ? (
              <div className="space-y-1 text-sm font-mono text-emerald-900">
                <p>
                  X₁ ={" "}
                  <span className="font-bold text-lg">
                    {Number(optimalPoint.x.toFixed(2))}
                  </span>
                </p>
                <p>
                  X₂ ={" "}
                  <span className="font-bold text-lg">
                    {Number(optimalPoint.y.toFixed(2))}
                  </span>
                </p>
                <div className="h-px bg-emerald-200 my-2"></div>
                <p className="font-black text-xl">
                  Z ={" "}
                  {Number(
                    (
                      (objective[0] || 0) * optimalPoint.x +
                      (objective[1] || 0) * optimalPoint.y
                    ).toFixed(2),
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-emerald-700 italic">
                Área no factible.
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
            <p className="font-bold text-slate-500 mb-3 uppercase tracking-wider">
              Leyenda
            </p>
            {constraints.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div
                  className={`w-4 h-1 rounded-full ${
                    i % 2 === 0 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                ></div>
                <span className="font-mono font-medium text-slate-700">
                  R{i + 1}: {c.coefficients[0]}X₁ + {c.coefficients[1]}X₂{" "}
                  {c.operator} {c.rhs}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
              <div className="w-3 h-3 bg-emerald-400/40 border border-emerald-500 rounded-sm"></div>
              <span className="font-medium text-slate-600">
                Región Factible
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
