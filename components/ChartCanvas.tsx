import React, { useEffect, useRef } from 'react';
import { CONFIG, INITIAL_DAY_DATA } from '../constants';
import { IDayData } from '../types';
import { formatTime, getEffectiveStartTime } from '../utils/calculations';

interface ChartCanvasProps {
  data: IDayData;
  mode: 'area' | 'lines';
  config: typeof CONFIG;
  isAggregated?: boolean;
  visibleLines?: Record<string, boolean>;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ data, mode, config, isAggregated, visibleLines }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safe data access
  const safeData = data || INITIAL_DAY_DATA;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Use ResizeObserver for more robust width detection in mobile split views
    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) return;

      // Set canvas dimensions considering DPI
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Normalize coordinate system
      ctx.scale(dpr, dpr);
      renderChart(ctx, rect.width, rect.height);
    });

    resizeObserver.observe(container);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Initial Render
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      renderChart(ctx, rect.width, rect.height);
    }

    return () => resizeObserver.disconnect();

    // --- RENDER LOGIC MOVED INSIDE EFFECT TO BE CALLABLE BY OBSERVER ---
    function renderChart(ctx: CanvasRenderingContext2D, W: number, H: number) {
      // Config values with fallbacks
      const { startTime, endTime, chartPaddingLeft: paddingLeft } = config;
      const graphHeight = config.graphHeight || 300;
      const GRAPH_BOTTOM = graphHeight; // The floor of the chart area

      // USE DEDUCED START TIME
      const arranque = getEffectiveStartTime(safeData);

      // Helper functions
      const timeToX = (t: number) => {
        const usable = W - paddingLeft;
        const range = endTime - startTime;
        return paddingLeft + ((t - startTime) / range) * usable;
      };

      const valToY = (v: number) => GRAPH_BOTTOM - (v / 100 * GRAPH_BOTTOM);

      const sortedStates = [...(safeData.estados || [])]
        .filter(s => s.t >= startTime && s.t <= endTime)
        .sort((a, b) => a.t - b.t);

      const getColor = (v: number) => {
        if (v < 30) return config.colors.low;
        if (v < 50) return config.colors.med;
        if (v < 75) return config.colors.good;
        return config.colors.high;
      };

      // --- DRAWING FUNCTIONS ---

      const drawGrid = () => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;

        // Horizontal lines (0, 25, 50, 75, 100) - Only inside graph area
        for (let i = 0; i <= 100; i += 25) {
          const y = Math.floor(valToY(i)) + 0.5; // Pixel perfect alignment
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(W, y);
        }
        ctx.stroke();

        // Vertical dashed lines (Time) - Extended to FULL HEIGHT (H)
        ctx.beginPath();
        ctx.strokeStyle = '#e5e7eb';
        ctx.setLineDash([4, 4]);
        for (let i = startTime; i <= endTime; i++) {
          const x = Math.floor(timeToX(i)) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H); // Extends past GRAPH_BOTTOM to label area/overlays
        }
        ctx.stroke();
        ctx.restore();
      };

      const drawVoidPattern = () => {
        if (isAggregated) return;

        const startX = timeToX(startTime);
        const endX = timeToX(arranque);

        // Only draw if there is a gap > 1px
        if (endX <= startX + 1) return;

        ctx.save();

        // Define clip area for the void
        ctx.beginPath();
        ctx.rect(startX, 0, endX - startX, GRAPH_BOTTOM);
        ctx.clip();

        // Draw diagonal hatched lines
        ctx.beginPath();
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        const diagSpacing = 10;
        // Ensure we cover the whole clipped area
        for (let x = startX - GRAPH_BOTTOM; x < endX + GRAPH_BOTTOM; x += diagSpacing) {
          ctx.moveTo(x, GRAPH_BOTTOM);
          ctx.lineTo(x + GRAPH_BOTTOM, 0);
        }
        ctx.stroke();
        ctx.restore();
      };

      const drawAreaMode = () => {
        if (sortedStates.length < 1) return; // Allow single state

        const mainPoints = sortedStates.map(st => ({
          x: timeToX(st.t),
          y: valToY(st.v)
        }));

        // ADDED: Append a final point based on the last state's end time
        // This ensures the shape has width even with a single state
        const lastSt = sortedStates[sortedStates.length - 1];
        const endTimeForShape = lastSt.fin || (lastSt.t + 1);
        mainPoints.push({
          x: timeToX(endTimeForShape),
          y: valToY(lastSt.v)
        });

        ctx.save();

        // 1. Define Clipping Shape (Smooth Curve + Graph Bottom)
        ctx.beginPath();
        ctx.moveTo(mainPoints[0].x, mainPoints[0].y);

        // Quadratic Bezier for organic top edge
        for (let i = 0; i < mainPoints.length - 1; i++) {
          const p0 = mainPoints[i];
          const p1 = mainPoints[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          if (i === 0) {
            ctx.lineTo(midX, midY);
          } else {
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          }
        }
        const last = mainPoints[mainPoints.length - 1];
        ctx.lineTo(last.x, last.y);

        // Close loop strictly at GRAPH_BOTTOM (300px)
        ctx.lineTo(last.x, GRAPH_BOTTOM);
        ctx.lineTo(mainPoints[0].x, GRAPH_BOTTOM);
        ctx.closePath();

        ctx.clip(); // Apply Clip

        // 2. Draw Vertical Color Strips (Solid)
        sortedStates.forEach((st, i) => {
          const nextSt = sortedStates[i + 1];
          // Determine end time for this strip
          const tEnd = st.fin || (nextSt ? nextSt.t : (safeData.config?.finDia || endTime));

          const xStart = Math.floor(timeToX(st.t));
          const xEnd = Math.ceil(timeToX(tEnd));
          const width = Math.max(1, xEnd - xStart);

          ctx.fillStyle = getColor(st.v);
          // Fill from top (0) to bottom (GRAPH_BOTTOM) inside the clipped area
          ctx.fillRect(xStart, 0, width, GRAPH_BOTTOM);
        });

        ctx.restore(); // Remove Clip

        // 3. Draw White Separators
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255, 0.5)';
        ctx.lineWidth = 1;
        sortedStates.forEach((st, i) => {
          if (i < sortedStates.length - 1) {
            const nextSt = sortedStates[i + 1];
            const xBoundary = Math.floor(timeToX(nextSt.t)) + 0.5;
            ctx.moveTo(xBoundary, 0);
            ctx.lineTo(xBoundary, GRAPH_BOTTOM);
          }
        });
        ctx.stroke();
        ctx.restore();

        // 4. Stroke Top Edge (White/Clean)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(mainPoints[0].x, mainPoints[0].y);
        for (let i = 0; i < mainPoints.length - 1; i++) {
          const p0 = mainPoints[i];
          const p1 = mainPoints[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          if (i === 0) ctx.lineTo(midX, midY);
          else ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        ctx.lineTo(last.x, last.y);

        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.stroke();
        ctx.restore();
      };

      const drawLinesMode = () => {
        if (sortedStates.length < 1) return;

        const drawLine = (key: string, color: string, dataKey: string) => {
          if (visibleLines && !visibleLines[key]) return;

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          let hasStarted = false;

          // Draw path
          sortedStates.forEach((st) => {
            let val = dataKey === 'v' ? st.v : st[dataKey];
            if (val === undefined || val === null) val = 0;

            const x = timeToX(st.t);
            const y = valToY(val);

            if (!hasStarted) {
              ctx.moveTo(x, y);
              hasStarted = true;
            } else {
              ctx.lineTo(x, y);
            }
          });

          // Extend to end of last state
          const lastSt = sortedStates[sortedStates.length - 1];
          if (lastSt) {
            let val = dataKey === 'v' ? lastSt.v : lastSt[dataKey];
            if (val === undefined || val === null) val = 0;

            const endTimeForShape = lastSt.fin || (lastSt.t + 1);
            const x = timeToX(endTimeForShape);
            const y = valToY(val);
            ctx.lineTo(x, y);
          }

          ctx.stroke();

          // Draw dots
          ctx.fillStyle = "#fff";
          sortedStates.forEach((st) => {
            let val = dataKey === 'v' ? st.v : st[dataKey];
            if (val === undefined || val === null) val = 0;

            const x = timeToX(st.t);
            const y = valToY(val);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.stroke();
          });

          ctx.restore();
        };

        drawLine('promedio', config.lineColors.promedio, 'v');
        drawLine('ri', config.lineColors.ri, 'Ri');
        drawLine('distraccion', config.lineColors.distraccion, 'Distracción');
        drawLine('voluntad', config.lineColors.voluntad, 'Voluntad');
        drawLine('horus', config.lineColors.horus, 'Horus');
        drawLine('energia', config.lineColors.energia, 'Energía');
        drawLine('afectacion', config.lineColors.afectacion, 'Afectacion');
        drawLine('nc', config.lineColors.nc, 'NC');
        drawLine('di', config.lineColors.di, 'DI');
        drawLine('vision', config.lineColors.vision, 'Vision');
      };

      const drawStartLine = () => {
        // Draw deduced start line always if not aggregated
        if (!isAggregated) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const startX = Math.floor(timeToX(arranque)) + 0.5;
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, H); // Full height for start line
          ctx.stroke();
          ctx.restore();
        }
      };

      // --- RENDER EXECUTION ---
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      drawVoidPattern();

      if (sortedStates.length > 0) {
        if (mode === 'area') drawAreaMode();
        else drawLinesMode();
      }
      drawStartLine();
    }

  }, [safeData, mode, config, isAggregated, visibleLines]);

  // --- HTML OVERLAYS (Labels, Icons) ---

  const renderTimeLabels = () => {
    const labels = [];
    for (let i = config.startTime; i <= config.endTime; i++) {
      const leftPct = ((i - config.startTime) / config.totalHours) * 100;
      const style = {
        left: `calc(${config.chartPaddingLeft}px + ((100% - ${config.chartPaddingLeft}px) * ${leftPct / 100}))`
      };
      // Added font-bold here
      labels.push(<div key={i} className="absolute transform -translate-x-1/2 font-bold" style={style}>{i}</div>);
    }
    return labels;
  };

  const renderOverlays = () => {
    const range = config.endTime - config.startTime;
    const arranque = getEffectiveStartTime(safeData);
    const voidDuration = arranque - config.startTime;

    const items: React.ReactNode[] = [];

    // Events & Void only for non-aggregated (single day)
    if (!isAggregated) {
      // Icons on top
      if (safeData.eventos) {
        safeData.eventos.forEach(ev => {
          if (ev.t < arranque) return;
          const leftPct = ((ev.t - config.startTime) / config.totalHours) * 100;

          items.push(
            <div key={`evt-${ev.id}`}
              className="absolute top-0 text-xl cursor-help hover:scale-125 transition-transform z-30"
              style={{
                left: `calc(${config.chartPaddingLeft}px + (100% - ${config.chartPaddingLeft}px) * ${leftPct / 100})`,
                transform: 'translateX(-50%) translateY(-50%)'
              }}
              title={`${ev.label} - ${formatTime(ev.t)}`}>
              {ev.icon}
            </div>
          );
        });
      }

      // Void Text Label
      if (voidDuration > 0.1) {
        const widthPct = (voidDuration / range) * 100;
        items.push(
          <div key="void" className="absolute top-[340px] h-[140px] border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center pointer-events-none"
            style={{
              left: `${config.chartPaddingLeft}px`,
              width: `calc((100% - ${config.chartPaddingLeft}px) * ${widthPct / 100})`
            }}>
            <span className="text-[10px] text-gray-400 [writing-mode:vertical-lr] rotate-180">Vacío ({voidDuration.toFixed(1)}h)</span>
          </div>
        );
      }
    }

    // Activity Blocks (shown for BOTH single day and aggregated)
    if (safeData.actividades) {
      const effectiveArranque = isAggregated ? config.startTime : arranque;

      safeData.actividades.forEach(act => {
        if (act.fin <= effectiveArranque || act.tipo === 'flujo' || act.tipo === 'sesion_flujo') return;

        const start = Math.max(act.inicio, effectiveArranque);
        const duration = act.fin - start;
        const startPct = (start - config.startTime) / range;
        const durPct = duration / range;

        items.push(
          <div key={`act-${act.id}`}
            className={`absolute top-[340px] h-[140px] rounded-md border p-0.5 flex flex-col justify-center items-center shadow-sm hover:shadow-md transition-all cursor-pointer ${act.color}`}
            style={{
              left: `calc(${config.chartPaddingLeft}px + (100% - ${config.chartPaddingLeft}px) * ${startPct})`,
              width: `calc((100% - ${config.chartPaddingLeft}px) * ${durPct})`
            }}>

            {/* Duration Label Above */}
            <div className="absolute -top-5 left-0 w-full flex justify-center">
              <span className="text-[10px] text-gray-500">
                {duration.toFixed(1)}
              </span>
            </div>

            {/* Vertical Text */}
            <div className="flex flex-col items-center justify-center h-full w-full opacity-90 overflow-hidden">
              <div className="font-bold text-[10px] leading-tight [writing-mode:vertical-lr] rotate-180 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {act.nombre}
              </div>
            </div>
          </div>
        );
      });

      // Flujo Blocks (only single day)
      if (!isAggregated) {
        safeData.actividades.filter(a => a.tipo === 'flujo' || a.tipo === 'sesion_flujo').forEach(act => {
          if (act.fin <= arranque) return;

          const start = Math.max(act.inicio, arranque);
          const duration = act.fin - start;
          const startPct = (start - config.startTime) / range;
          const durPct = duration / range;

          items.push(
            <div key={`flujo-${act.id}`}
              className="absolute top-[490px] h-6 bg-[#19e66f] text-[#0e1b13] rounded-md flex items-center justify-center shadow-sm border border-green-400"
              style={{
                left: `calc(${config.chartPaddingLeft}px + (100% - ${config.chartPaddingLeft}px) * ${startPct})`,
                width: `calc((100% - ${config.chartPaddingLeft}px) * ${durPct})`
              }}>
              <span className="text-[9px] font-bold truncate">Flujo {duration.toFixed(1)}h</span>
            </div>
          );
        });
      }
    }

    return items;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
      <div style={{ width: config.chartPaddingLeft }} className="absolute top-0 left-0 h-[300px] flex flex-col justify-between items-end pr-0.5 text-[9px] text-gray-400 font-mono z-20 pointer-events-none select-none">
        <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
      </div>
      <div className="absolute top-[300px] left-0 w-full h-[30px] flex text-xs text-gray-500 font-mono pt-1 z-20 border-t border-gray-300 pointer-events-none select-none">
        {renderTimeLabels()}
      </div>
      {renderOverlays()}
    </div>
  );
};

export default ChartCanvas;