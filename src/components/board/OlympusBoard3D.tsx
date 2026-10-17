// src/components/board/OlympusBoard3D.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Text } from '@react-three/drei';
import { HexTile, TerrainType } from '@/core/types/game.types';
import { KAYKIT_TERRAIN_MAP, KayKitPlayerColor } from '@/core/data/kaykit.mapper';

const HEX_RADIUS = 1.08;

// Hauteur 3D par type de case (Montagnes surélevées)
export const TERRAIN_ELEVATION: Record<TerrainType, number> = {
  SEA: 0.15,
  RIVER: 0.32,
  PLAINS: 0.42,
  FOREST: 0.62,
  SANCTUARY: 0.88,
  MOUNTAIN_BRONZE: 1.28,
  MOUNTAIN_MARBLE: 1.58,
};

function axialToWorld3D(q: number, r: number): [number, number] {
  const x = HEX_RADIUS * Math.sqrt(3) * (q + r / 2);
  const z = HEX_RADIUS * (3 / 2) * r;
  return [x, z];
}

/**
 * Pion 3D de jeu de société
 */
export function Pawn3D({
  colorHex,
  position = [0, 0, 0],
  scale = 1,
}: {
  colorHex: string;
  position?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.12, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.22, 0.36, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color={colorHex} roughness={0.25} metalness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * Rendu 3D d'une Tuile Hexagonale procédurale
 */
function HexTile3D({
  tile,
  ownerColor,
  isPrimary,
  isSecondary,
  isHoveredTarget,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tile: HexTile;
  ownerColor?: { name: KayKitPlayerColor; hex: string };
  isPrimary: boolean;
  isSecondary: boolean;
  isHoveredTarget?: boolean;
  onSelectPrimary: (coord: string) => void;
  onSelectSecondary: (coord: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [x, z] = useMemo(() => axialToWorld3D(tile.q, tile.r), [tile.q, tile.r]);
  const info = KAYKIT_TERRAIN_MAP[tile.terrain];
  const height = TERRAIN_ELEVATION[tile.terrain] || 0.4;

  const borderColor = isPrimary
    ? '#F59E0B' // Or vif Case 1
    : isSecondary
    ? '#A855F7' // Pourpre Case 2 (Temple)
    : isHoveredTarget || hovered
    ? '#FFFFFF' // Blanc survol
    : ownerColor
    ? ownerColor.hex
    : '#7E6139';

  const showTooltip = isPrimary || isSecondary || isHoveredTarget || hovered;

  return (
    <group
      position={[x, 0, z]}
      scale={hovered ? [1.03, 1.03, 1.03] : [1, 1, 1]}
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
      {/* Corps 3D de la tuile hexagonale */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[HEX_RADIUS * 0.96, HEX_RADIUS * 0.98, height, 6]} />
        <meshStandardMaterial
          color={info.fillColor}
          roughness={0.65}
          emissive={hovered ? '#443311' : '#000000'}
        />
      </mesh>

      {/* Relief de Montagne */}
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
            <mesh position={[0.22, 0.22, 0.15]} castShadow>
              <coneGeometry args={[0.32, 0.5, 5]} />
              <meshStandardMaterial
                color={tile.terrain === 'MOUNTAIN_MARBLE' ? '#CBD5E1' : '#8D6E63'}
                roughness={0.8}
              />
            </mesh>
          </group>
        )}

      {/* Arbres si Forêt */}
      {tile.terrain === 'FOREST' && !tile.building && (
        <group position={[-0.22, height, -0.15]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <coneGeometry args={[0.24, 0.45, 7]} />
            <meshStandardMaterial color="#15803D" />
          </mesh>
          <mesh position={[0.35, 0.18, 0.1]} castShadow>
            <coneGeometry args={[0.2, 0.38, 7]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      )}

      {/* Bâtiment ou Temple */}
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

      {/* Anneau de sélection / bordure au sommet */}
      <mesh position={[0, height + 0.015, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry
          args={[
            HEX_RADIUS * (isPrimary || isSecondary || isHoveredTarget || hovered ? 0.8 : 0.89),
            HEX_RADIUS * 0.97,
            6,
          ]}
        />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Coordonnée 3D WebGL native */}
      <Text
        position={[0, height + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color={ownerColor ? '#FFFFFF' : '#3E2A12'}
        anchorX="center"
        anchorY="middle"
      >
        {tile.coord}
      </Text>

      {/* Pion 3D du joueur propriétaire */}
      {ownerColor && (
        <Pawn3D
          colorHex={ownerColor.hex}
          position={[tile.building ? 0.38 : 0, height, tile.building ? 0.28 : 0]}
          scale={0.75}
        />
      )}

      {/* Étiquette flottante conditionnelle */}
      {showTooltip && (
        <Html position={[0, height + 0.6, 0]} center distanceFactor={12}>
          <div className="pointer-events-none flex flex-col items-center bg-[#463217]/95 border-2 border-amber-400 text-[#F6F5DF] rounded-xl px-2.5 py-1 shadow-2xl backdrop-blur-sm whitespace-nowrap z-50">
            <span className="text-[11px] font-black">
              {tile.coord} • {info.label} {info.icon}
            </span>
            {tile.building && (
              <span className="text-[10px] font-bold text-amber-300">
                🏛️ {tile.building.name} (+{tile.building.power}P)
              </span>
            )}
            {ownerColor && (
              <span className="text-[9px] font-medium text-emerald-300">
                Cité de {ownerColor.name}
              </span>
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
  onSelectPrimary,
  onSelectSecondary,
}: {
  tiles: HexTile[];
  playerColorMap: Record<string, { name: KayKitPlayerColor; hex: string }>;
  primaryCoord: string;
  secondaryCoord: string;
  hoveredCoord?: string;
  onSelectPrimary: (c: string) => void;
  onSelectSecondary: (c: string) => void;
}) {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 13, 11], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight
          castShadow
          position={[12, 22, 10]}
          intensity={1.4}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <group position={[0, -0.4, 0]}>
          {tiles.map((tile) => (
            <HexTile3D
              key={tile.coord}
              tile={tile}
              ownerColor={tile.ownerId ? playerColorMap[tile.ownerId] : undefined}
              isPrimary={tile.coord === primaryCoord}
              isSecondary={tile.coord === secondaryCoord}
              isHoveredTarget={tile.coord === hoveredCoord}
              onSelectPrimary={onSelectPrimary}
              onSelectSecondary={onSelectSecondary}
            />
          ))}
        </group>

        <ContactShadows position={[0, -0.42, 0]} opacity={0.35} scale={32} blur={2.5} far={12} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.3}
          minDistance={4}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}