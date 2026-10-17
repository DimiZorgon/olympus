'use client';

import React from 'react';
import { HexTile, PlayerPublicState } from '@/core/types/game.types';
import { axialToPixel, computeFiefSvgBoundaries, getHexCorners } from '@/core/map/FiefAnalyzer';

interface GameBoardProps {
  tiles: HexTile[];
  players: Record<string, PlayerPublicState>;
  currentPlayerId: string;
  selectedCoord: string;
  secondaryCoord: string;
  onSelectCoord: (coord: string) => void;
  onSelectSecondaryCoord: (coord: string) => void;
}

const PLAYER_COLORS: Record<number, { border: string; bg: string; text: string }> = {
  0: { border: '#2563eb', bg: '#dbeafe', text: '#1e40af' }, // Bleu
  1: { border: '#dc2626', bg: '#fee2e2', text: '#991b1b' }, // Rouge
  2: { border: '#16a34a', bg: '#dcfce7', text: '#166534' }, // Vert
  3: { border: '#d97706', bg: '#fef3c7', text: '#92400e' }, // Ambre
};

const TERRAIN_STYLES: Record<string, { fill: string; stroke: string; label: string; icon: string }> = {
  PLAINS: { fill: '#fef9c3', stroke: '#eab308', label: 'Plaine', icon: '🌾' },
  FOREST: { fill: '#dcfce7', stroke: '#22c55e', label: 'Forêt', icon: '🌲' },
  RIVER: { fill: '#cffafe', stroke: '#06b6d4', label: 'Rivière', icon: '💧' },
  MOUNTAIN_MARBLE: { fill: '#f1f5f9', stroke: '#94a3b8', label: 'Paros (Marbre)', icon: '🏛️' },
  MOUNTAIN_BRONZE: { fill: '#ffedd5', stroke: '#f97316', label: 'Métallifère (Bronze)', icon: '⛏️' },
  SEA: { fill: '#e0f2fe', stroke: '#0284c7', label: 'Côte Égéenne', icon: '🐟' },
  SANCTUARY: { fill: '#f3e8ff', stroke: '#a855f7', label: 'Sanctuaire', icon: '⚡' },
};

export const GameBoard: React.FC<GameBoardProps> = ({
  tiles,
  players,
  currentPlayerId,
  selectedCoord,
  secondaryCoord,
  onSelectCoord,
  onSelectSecondaryCoord,
}) => {
  const hexSize = 34;

  // Déterminer la bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  tiles.forEach((t) => {
    const p = axialToPixel(t.q, t.r, hexSize);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const padding = 60;
  const width = Math.max(700, maxX - minX + padding * 2);
  const height = Math.max(500, maxY - minY + padding * 2);
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  const playerKeys = Object.keys(players);

  return (
    <div className="relative border rounded-xl overflow-hidden bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 shadow-sm p-2">
      <div className="flex justify-between items-center mb-2 px-2 text-xs">
        <div className="font-semibold text-slate-700 flex items-center gap-2">
          <span>Île de l&apos;Olympe ({tiles.length} Hexagones)</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Clic gauche : Case Cible 1 | Clic droit : Case Cible 2</span>
        </div>
        <div className="flex gap-4">
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
            Case 1 : <strong>{selectedCoord || '—'}</strong>
          </span>
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-300">
            Case 2 (Temple) : <strong>{secondaryCoord || '—'}</strong>
          </span>
        </div>
      </div>

      <div className="overflow-auto max-h-[620px] flex justify-center">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none"
        >
          <g transform={`translate(${offsetX}, ${offsetY})`}>
            {/* 1. Rendu des tuiles hexagonales */}
            {tiles.map((tile) => {
              const center = axialToPixel(tile.q, tile.r, hexSize);
              const corners = getHexCorners(center, hexSize);
              const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(' ');

              const terrainInfo = TERRAIN_STYLES[tile.terrain] || TERRAIN_STYLES.PLAINS;
              const isSelected1 = tile.coord === selectedCoord;
              const isSelected2 = tile.coord === secondaryCoord;

              const ownerIndex = tile.ownerId ? playerKeys.indexOf(tile.ownerId) : -1;
              const ownerColor = ownerIndex >= 0 ? PLAYER_COLORS[ownerIndex % 4] : null;

              return (
                <g
                  key={tile.coord}
                  onClick={() => onSelectCoord(tile.coord)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectSecondaryCoord(tile.coord);
                  }}
                  className="cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <polygon
                    points={pointsStr}
                    fill={ownerColor ? ownerColor.bg : terrainInfo.fill}
                    stroke={
                      isSelected1
                        ? '#eab308'
                        : isSelected2
                        ? '#a855f7'
                        : ownerColor
                        ? ownerColor.border
                        : terrainInfo.stroke
                    }
                    strokeWidth={isSelected1 || isSelected2 ? 3 : 1.2}
                    className="transition-colors duration-150"
                  />

                  {/* Coordonnée & Icône Biome */}
                  <text
                    x={center.x}
                    y={center.y - 12}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-700 pointer-events-none"
                  >
                    {tile.coord}
                  </text>
                  <text
                    x={center.x}
                    y={center.y + 1}
                    textAnchor="middle"
                    className="text-xs pointer-events-none"
                  >
                    {terrainInfo.icon}
                  </text>

                  {/* Propriétaire / Statut */}
                  {tile.ownerId && (
                    <text
                      x={center.x}
                      y={center.y + 14}
                      textAnchor="middle"
                      className="text-[9px] font-medium fill-slate-800 pointer-events-none"
                    >
                      {players[tile.ownerId]?.name.slice(0, 7)}
                    </text>
                  )}

                  {/* Bâtiment */}
                  {tile.building && (
                    <g transform={`translate(${center.x - 14}, ${center.y + 16})`}>
                      <rect
                        width={28}
                        height={12}
                        rx={3}
                        fill="#1e293b"
                        className="opacity-90"
                      />
                      <text
                        x={14}
                        y={9}
                        textAnchor="middle"
                        className="text-[8px] font-bold fill-amber-300 pointer-events-none"
                      >
                        +{tile.building.power}P
                      </text>
                    </g>
                  )}

                  {/* Buff Marron actif */}
                  {tile.activeBrownBuffs.length > 0 && (
                    <circle
                      cx={center.x + 16}
                      cy={center.y - 14}
                      r={6}
                      fill="#854d0e"
                      stroke="#fef08a"
                      strokeWidth={1}
                    />
                  )}
                </g>
              );
            })}

            {/* 2. Rendu des contours SVG de frontières de Fiefs fusionnés */}
            {playerKeys.map((pid, pIdx) => {
              const boundaries = computeFiefSvgBoundaries(tiles, pid, hexSize);
              const color = PLAYER_COLORS[pIdx % 4];
              return (
                <g key={`boundaries-${pid}`}>
                  {boundaries.map((b) => (
                    <path
                      key={`path-${pid}-${b.fiefIndex}`}
                      d={b.pathData}
                      fill="none"
                      stroke={color.border}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none drop-shadow-sm opacity-90"
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

