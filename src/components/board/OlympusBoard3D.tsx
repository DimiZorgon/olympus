// src/components/board/OlympusBoard3D.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Text } from '@react-three/drei';
import { HexTile, TerrainType } from '@/core/types/game.types';
import { KAYKIT_TERRAIN_MAP, KayKitPlayerColor } from '@/core/data/kaykit.mapper';

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

export function Pawn3D({ colorHex }: { colorHex: string }) {
  return (
    <group scale={0.75}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.12, 16]} />
        <meshStandardMaterial color={colorHex} roughness={0.3} metalness={0.2} />
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
  onSelectPrimary: (coord: string) => void;
  onSelectSecondary: (coord: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [x, z] = useMemo(() => axialToWorld3D(tile.q, tile.r), [tile.q, tile.r]);
  const info = KAYKIT_TERRAIN_MAP[tile.terrain];
  const height = TERRAIN_ELEVATION[tile.terrain] || 0.45;

  const borderColor = isPrimary
    ? '#F59E0B'
    : isSecondary
    ? '#A855F7'
    : isValidTarget
    ? '#10B981' // Vert vif si case valide de construction
    : isHoveredTarget || hovered
    ? '#FFFFFF'
    : ownerColor
    ? ownerColor.hex
    : '#7E6139';

  return (
    <group
      position={[x, 0, z]}
      scale={isValidTarget || hovered ? [1.04, 1.04, 1.04] : [1, 1, 1]}
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
      {/* Cylindre hexagonal 3D avec relief */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[HEX_RADIUS * 0.96, HEX_RADIUS * 0.98, height, 6]} />
        <meshStandardMaterial
          color={info.fillColor}
          roughness={0.65}
          opacity={isDimmed ? 0.35 : 1}
          transparent={isDimmed}
          emissive={isValidTarget ? '#064E3B' : hovered ? '#443311' : '#000000'}
        />
      </mesh>

      {/* Montagnes */}
      {(tile.terrain === 'MOUNTAIN_MARBLE' || tile.terrain === 'MOUNTAIN_BRONZE') && !tile.building && (
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

      {/* Forêt */}
      {tile.terrain === 'FOREST' && !tile.building && (
        <group position={[-0.2, height, -0.1]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <coneGeometry args={[0.24, 0.45, 7]} />
            <meshStandardMaterial color="#15803D" />
          </mesh>
        </group>
      )}

      {/* Bâtiment */}
      {tile.building && (
        <group position={[0, height, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.55, 0.5, 0.55]} />
            <meshStandardMaterial color={tile.building.category === 'MAJOR_GOD' ? '#F59E0B' : '#F6F5DF'} />
          </mesh>
          <mesh position={[0, 0.6, 0]} castShadow>
            <coneGeometry args={[0.48, 0.3, 4]} />
            <meshStandardMaterial color={ownerColor?.hex || '#684C26'} />
          </mesh>
        </group>
      )}

      {/* Bordure de sélection */}
      <mesh position={[0, height + 0.015, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry
          args={[HEX_RADIUS * (isPrimary || isSecondary || isValidTarget || hovered ? 0.8 : 0.89), HEX_RADIUS * 0.97, 6]}
        />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Coordonnée native 3D */}
      <Text
        position={[0, height + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.24}
        color={ownerColor ? '#FFFFFF' : '#3E2A12'}
        anchorX="center"
        anchorY="middle"
      >
        {tile.coord}
      </Text>

      {/* Pion 3D */}
      {ownerColor && (
        <group position={[tile.building ? 0.35 : 0, height, tile.building ? 0.25 : 0]}>
          <Pawn3D colorHex={ownerColor.hex} />
        </group>
      )}

      {/* Tooltip HTML au survol */}
      {(hovered || isPrimary || isValidTarget) && (
        <Html position={[0, height + 0.5, 0]} center distanceFactor={14}>
          <div className="pointer-events-none bg-[#463217]/95 border border-amber-400 text-[#F6F5DF] rounded-lg px-2 py-0.5 text-[10px] font-bold shadow-xl whitespace-nowrap">
            {tile.coord} • {info.label} {info.icon}
            {tile.building && ` | 🏛️ +${tile.building.power}P`}
            {isValidTarget && <span className="text-emerald-400 ml-1">● Cliquez pour bâtir</span>}
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
  isTargetingMode = false,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tiles: HexTile[];
  playerColorMap: Record<string, { name: KayKitPlayerColor; hex: string }>;
  primaryCoord: string;
  secondaryCoord: string;
  hoveredCoord?: string;
  validTargetCoords?: string[];
  isTargetingMode?: boolean;
  onSelectPrimary: (c: string) => void;
  onSelectSecondary: (c: string) => void;
}) {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 16, 14], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <directionalLight
          castShadow
          position={[15, 25, 12]}
          intensity={1.4}
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
                onSelectPrimary={onSelectPrimary}
                onSelectSecondary={onSelectSecondary}
              />
            );
          })}
        </group>

        <ContactShadows position={[0, -0.42, 0]} opacity={0.35} scale={40} blur={2.5} far={15} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.3}
          minDistance={5}
          maxDistance={30}
        />
      </Canvas>
    </div>
  );
}