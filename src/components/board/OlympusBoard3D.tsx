// src/components/board/OlympusBoard3D.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Text, Line } from '@react-three/drei';
import { HexTile, TerrainType } from '@/core/types/game.types';
import { KAYKIT_TERRAIN_MAP, KayKitPlayerColor } from '@/core/data/kaykit.mapper';
import { computePlayerFiefsLiveSummary } from '@/core/map/FiefAnalyzer';

const HEX_RADIUS = 1.05;

export const TERRAIN_ELEVATION: Record<TerrainType, number> = {
  SEA: 0.15,
  RIVER: 0.3,
  PLAINS: 0.45,
  FOREST: 0.65,
  SANCTUARY: 0.9,
  MOUNTAIN_BRONZE: 1.3,
  MOUNTAIN_MARBLE: 1.65,
};

function axialToWorld3D(q: number, r: number): [number, number] {
  const x = HEX_RADIUS * Math.sqrt(3) * (q + r / 2);
  const z = HEX_RADIUS * (3 / 2) * r;
  return [x, z];
}

export function Pawn3D({
  colorHex,
  isOptimistic = false,
}: {
  colorHex: string;
  isOptimistic?: boolean;
}) {
  return (
    <group scale={isOptimistic ? 0.85 : 0.75}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.12, 16]} />
        <meshStandardMaterial
          color={colorHex}
          roughness={0.3}
          metalness={0.2}
          emissive={isOptimistic ? colorHex : '#000000'}
          emissiveIntensity={isOptimistic ? 0.45 : 0}
        />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 0.36, 16]} />
        <meshStandardMaterial color={colorHex} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={colorHex} roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  );
}

function HexTile3D({
  tile,
  ownerColor,
  isPrimary,
  isSecondary,
  isHoveredTarget,
  isValidTarget,
  isDimmed,
  isOptimistic,
  fiefBanner,
  showFiefBanners,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tile: HexTile;
  ownerColor?: { name: KayKitPlayerColor; hex: string };
  isPrimary: boolean;
  isSecondary: boolean;
  isHoveredTarget?: boolean;
  isValidTarget?: boolean;
  isDimmed?: boolean;
  isOptimistic?: boolean;
  fiefBanner?: { resCount: number; power: number; score: number };
  showFiefBanners?: boolean;
  onSelectPrimary: (coord: string) => void;
  onSelectSecondary: (coord: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [x, z] = useMemo(() => axialToWorld3D(tile.q, tile.r), [tile.q, tile.r]);
  const info = KAYKIT_TERRAIN_MAP[tile.terrain];
  const height = TERRAIN_ELEVATION[tile.terrain] || 0.45;

  const borderColor = isOptimistic
    ? '#F59E0B'
    : isPrimary
    ? '#F59E0B'
    : isSecondary
    ? '#A855F7'
    : isValidTarget
    ? '#10B981'
    : isHoveredTarget || hovered
    ? '#FFFFFF'
    : ownerColor
    ? ownerColor.hex
    : '#7E6139';

  return (
    <group
      position={[x, 0, z]}
      scale={isValidTarget || isHoveredTarget || hovered ? [1.05, 1.06, 1.05] : [1, 1, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectPrimary(tile.coord);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        onSelectSecondary(tile.coord);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Cylindre de l'hexagone */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[HEX_RADIUS * 0.96, HEX_RADIUS * 0.98, height, 6]} />
        <meshStandardMaterial
          color={info.fillColor}
          roughness={0.65}
          opacity={isDimmed ? 0.3 : 1}
          transparent={isDimmed}
          emissive={
            isValidTarget
              ? '#059669'
              : isHoveredTarget
              ? '#D97706'
              : hovered
              ? '#443311'
              : '#000000'
          }
          emissiveIntensity={isValidTarget || isHoveredTarget ? 0.4 : 0.15}
        />
      </mesh>

      {/* Relief Montagne */}
      {(tile.terrain === 'MOUNTAIN_MARBLE' || tile.terrain === 'MOUNTAIN_BRONZE') &&
        !tile.building && (
          <group position={[0, height, 0]}>
            <mesh position={[-0.15, 0.35, -0.1]} castShadow>
              <coneGeometry args={[0.45, 0.75, 6]} />
              <meshStandardMaterial
                color={tile.terrain === 'MOUNTAIN_MARBLE' ? '#E2E8F0' : '#A1887F'}
                roughness={0.8}
              />
            </mesh>
          </group>
        )}

      {/* Arbres Forêt */}
      {tile.terrain === 'FOREST' && !tile.building && (
        <group position={[-0.2, height, -0.1]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <coneGeometry args={[0.24, 0.45, 7]} />
            <meshStandardMaterial color="#15803D" />
          </mesh>
        </group>
      )}

      {/* Bâtiment 3D */}
      {tile.building && (
        <group position={[0, height, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.55, 0.5, 0.55]} />
            <meshStandardMaterial
              color={tile.building.category === 'MAJOR_GOD' ? '#F59E0B' : '#F6F5DF'}
            />
          </mesh>
          <mesh position={[0, 0.6, 0]} castShadow>
            <coneGeometry args={[0.48, 0.3, 4]} />
            <meshStandardMaterial color={ownerColor?.hex || '#684C26'} />
          </mesh>
        </group>
      )}

      {/* Anneau de bordure */}
      <mesh position={[0, height + 0.015, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry
          args={[
            HEX_RADIUS *
              (isOptimistic || isValidTarget || isHoveredTarget || hovered ? 0.78 : 0.89),
            HEX_RADIUS * 0.97,
            6,
          ]}
        />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Coordonnée */}
      <Text
        position={[0, height + 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color={ownerColor ? '#FFFFFF' : '#3E2A12'}
        anchorX="center"
        anchorY="middle"
      >
        {tile.coord}
      </Text>

      {/* Pion 3D */}
      {ownerColor && (
        <group position={[tile.building ? 0.35 : 0, height, tile.building ? 0.25 : 0]}>
          <Pawn3D colorHex={ownerColor.hex} isOptimistic={isOptimistic} />
        </group>
      )}

      {/* Badge coup préparé ce tour */}
      {isOptimistic && (
        <Html position={[0, height + 0.95, 0]} center distanceFactor={14}>
          <div className="pointer-events-none animate-bounce bg-amber-500 text-slate-950 border-2 border-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg whitespace-nowrap">
            ✨ Coup du tour
          </div>
        </Html>
      )}

      {/* Bannière de score de Cité façon Bunny Kingdom */}
      {showFiefBanners && fiefBanner && !isOptimistic && (
        <Html position={[0, height + 0.85, 0]} center distanceFactor={15}>
          <div className="pointer-events-none bg-[#463217]/95 border border-amber-400 text-[#F6F5DF] px-2 py-0.5 rounded-md text-[9px] font-extrabold shadow-md whitespace-nowrap">
            🏛️ {fiefBanner.resCount} Ress. × {fiefBanner.power}P ={' '}
            <span className="text-amber-300">{fiefBanner.score} PV</span>
          </div>
        </Html>
      )}

      {/* Tooltip au survol */}
      {(hovered || isValidTarget || isHoveredTarget) && (
        <Html position={[0, height + 0.55, 0]} center distanceFactor={14}>
          <div className="pointer-events-none bg-[#463217] border-2 border-amber-400 text-[#F6F5DF] rounded-lg px-2 py-0.5 text-[10px] font-bold shadow-xl whitespace-nowrap z-40">
            {tile.coord} • {info.label} {info.icon}
            {tile.building && ` | 🏛️ ${tile.building.name} (+${tile.building.power}P)`}
            {isValidTarget && (
              <span className="text-emerald-300 ml-1 font-black">● Cliquez pour poser ici !</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function OlympusBoard3D({
  tiles,
  playerColorMap,
  primaryCoord,
  secondaryCoord,
  hoveredCoord,
  validTargetCoords = [],
  optimisticCoords = [],
  isTargetingMode = false,
  topDownView = false,
  showFiefBanners = true,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tiles: HexTile[];
  playerColorMap: Record<string, { name: KayKitPlayerColor; hex: string }>;
  primaryCoord: string;
  secondaryCoord: string;
  hoveredCoord?: string;
  validTargetCoords?: string[];
  optimisticCoords?: string[];
  isTargetingMode?: boolean;
  topDownView?: boolean;
  showFiefBanners?: boolean;
  onSelectPrimary: (c: string) => void;
  onSelectSecondary: (c: string) => void;
}) {
  // Calcul des Cités (Fiefs) connectées pour tracer les frontières fusionnées et les bannières de score
  const allFiefsByPlayer = useMemo(() => {
    const playerIds = Object.keys(playerColorMap);
    return playerIds.map((pid) => ({
      playerId: pid,
      colorHex: playerColorMap[pid].hex,
      fiefs: computePlayerFiefsLiveSummary(tiles, pid, HEX_RADIUS),
    }));
  }, [tiles, playerColorMap]);

  const fiefBannerByCenterCoord = useMemo(() => {
    const map: Record<string, { resCount: number; power: number; score: number }> = {};
    for (const p of allFiefsByPlayer) {
      for (const f of p.fiefs) {
        map[f.centerTileCoord] = {
          resCount: f.uniqueResources.length,
          power: f.totalPower,
          score: f.harvestScore,
        };
      }
    }
    return map;
  }, [allFiefsByPlayer]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{
          position: topDownView ? [0, 24, 0.01] : [0, 15.5, 13.5],
          fov: 42,
        }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight
          castShadow
          position={[15, 25, 12]}
          intensity={1.35}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <group position={[0, -0.4, 0]}>
          {tiles.map((tile) => {
            const isValid = validTargetCoords.includes(tile.coord);
            const isDimmed = isTargetingMode && !isValid;
            return (
              <HexTile3D
                key={tile.coord}
                tile={tile}
                ownerColor={tile.ownerId ? playerColorMap[tile.ownerId] : undefined}
                isPrimary={tile.coord === primaryCoord}
                isSecondary={tile.coord === secondaryCoord}
                isHoveredTarget={tile.coord === hoveredCoord}
                isValidTarget={isValid}
                isDimmed={isDimmed}
                isOptimistic={optimisticCoords.includes(tile.coord)}
                fiefBanner={fiefBannerByCenterCoord[tile.coord]}
                showFiefBanners={showFiefBanners}
                onSelectPrimary={onSelectPrimary}
                onSelectSecondary={onSelectSecondary}
              />
            );
          })}

          {/* Frontières fusionnées 3D autour des Cités connectées (Style Civilization / Bunny Kingdom) */}
          {allFiefsByPlayer.map((p) =>
            p.fiefs.map((fief) =>
              fief.edges3D.map((edge, idx) => (
                <Line
                  key={`${p.playerId}-${fief.fiefIndex}-${idx}`}
                  points={[
                    [edge.x1, 1.72, edge.z1],
                    [edge.x2, 1.72, edge.z2],
                  ]}
                  color={p.colorHex}
                  lineWidth={3.5}
                />
              ))
            )
          )}
        </group>

        <ContactShadows position={[0, -0.42, 0]} opacity={0.35} scale={42} blur={2.5} far={15} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate={!topDownView}
          maxPolarAngle={topDownView ? 0.05 : Math.PI / 2.25}
          minDistance={5}
          maxDistance={32}
        />
      </Canvas>
    </div>
  );
}