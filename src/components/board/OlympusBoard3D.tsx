// src/components/board/OlympusBoard3D.tsx
'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF, ContactShadows } from '@react-three/drei';
import { HexTile, TerrainType } from '@/core/types/game.types';
import { KAYKIT_TERRAIN_MAP, KayKitPlayerColor } from '@/core/data/kaykit.mapper';

const HEX_RADIUS = 1.05;

// Hauteur 3D par type de case (Montagnes très surélevées comme dans le guide PDF p.8)
export const TERRAIN_ELEVATION: Record<TerrainType, number> = {
  SEA: 0.12,
  RIVER: 0.28,
  PLAINS: 0.38,
  FOREST: 0.58,
  SANCTUARY: 0.85,
  MOUNTAIN_BRONZE: 1.25,
  MOUNTAIN_MARBLE: 1.55,
};

function axialToWorld3D(q: number, r: number): [number, number] {
  const x = HEX_RADIUS * Math.sqrt(3) * (q + r / 2);
  const z = HEX_RADIUS * (3 / 2) * r;
  return [x, z];
}

/**
 * Pion 3D de jeu de société (Socle + Corps + Collerette + Tête sphérique)
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
      {/* Socle */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.12, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Colonne centrale */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.22, 0.36, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Collerette */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 20]} />
        <meshStandardMaterial color={colorHex} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Tête sphérique */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color={colorHex} roughness={0.25} metalness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * Chargeur optionnel de modèle .gltf KayKit (si présent dans /public/assets/gltf/...)
 */
function KayKitModel({
  url,
  position = [0, 0, 0],
  scale = [1, 1, 1],
}: {
  url: string;
  position?: [number, number, number];
  scale?: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return <primitive object={cloned} position={position} scale={scale} />;
}

/**
 * Rendu 3D d'une Tuile Hexagonale avec son élévation, son relief de montagne et son bâtiment
 */
function HexTile3D({
  tile,
  ownerColor,
  isPrimary,
  isSecondary,
  isHoveredTarget,
  useGltfAssets,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tile: HexTile;
  ownerColor?: { name: KayKitPlayerColor; hex: string };
  isPrimary: boolean;
  isSecondary: boolean;
  isHoveredTarget: boolean;
  useGltfAssets: boolean;
  onSelectPrimary: (coord: string) => void;
  onSelectSecondary: (coord: string) => void;
}) {
  const [x, z] = axialToWorld3D(tile.q, tile.r);
  const height = TERRAIN_ELEVATION[tile.terrain] || 0.4;
  const info = KAYKIT_TERRAIN_MAP[tile.terrain];

  const borderColor = isPrimary || isHoveredTarget
    ? '#F59E0B'
    : isSecondary
    ? '#06B6D4'
    : ownerColor
    ? ownerColor.hex
    : info.strokeColor;

  // Chemins exacts vers tes fichiers Assets/gltf du tree.txt
  const baseTileUrl =
    tile.terrain === 'SEA'
      ? '/assets/gltf/tiles/base/hex_water.gltf'
      : tile.terrain === 'RIVER'
      ? '/assets/gltf/tiles/rivers/hex_river_A.gltf'
      : '/assets/gltf/tiles/base/hex_grass.gltf';

  const natureDecorUrl =
    tile.terrain === 'MOUNTAIN_MARBLE'
      ? '/assets/gltf/decoration/nature/hills_B.gltf'
      : tile.terrain === 'MOUNTAIN_BRONZE'
      ? '/assets/gltf/decoration/nature/hill_single_C.gltf'
      : tile.terrain === 'FOREST'
      ? '/assets/gltf/decoration/nature/hills_A_trees.gltf'
      : null;

  const colorFolder = ownerColor?.name || 'blue';
  const buildingUrl = tile.building
    ? `/assets/gltf/buildings/${colorFolder}/building_castle_${colorFolder}.gltf`
    : null;

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectPrimary(tile.coord);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        onSelectSecondary(tile.coord);
      }}
    >
      {/* 1. Socle d'élévation (hex_grass_bottom étiré en Y pour les montagnes ou cylindre hexagonal) */}
      {useGltfAssets ? (
        <Suspense fallback={null}>
          {height > 0.45 && (
            <KayKitModel
              url="/assets/gltf/tiles/base/hex_grass_bottom.gltf"
              position={[0, 0, 0]}
              scale={[1, height * 2.2, 1]}
            />
          )}
          <KayKitModel url={baseTileUrl} position={[0, height, 0]} scale={[1, 1, 1]} />
          {natureDecorUrl && !tile.building && (
            <KayKitModel url={natureDecorUrl} position={[0, height + 0.1, 0]} scale={[1, 1, 1]} />
          )}
          {buildingUrl && (
            <KayKitModel url={buildingUrl} position={[0, height + 0.12, 0]} scale={[0.9, 0.9, 0.9]} />
          )}
        </Suspense>
      ) : (
        <>
          {/* Corps 3D de la tuile avec hauteur réelle (Montagnes hautes, Plaines basses, Mer creuse) */}
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[HEX_RADIUS * 0.96, HEX_RADIUS * 0.98, height, 6]} />
            <meshStandardMaterial color={info.fillColor} roughness={0.65} />
          </mesh>

          {/* Relief 3D de Montagne si case Montagne sans bâtiment */}
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

          {/* Arbres 3D si case Forêt sans bâtiment */}
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

          {/* Bâtiment ou Temple 3D */}
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
        </>
      )}

      {/* Anneau de frontière / sélection au sommet de l'hexagone */}
      <mesh position={[0, height + 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry
          args={[
            HEX_RADIUS * (isPrimary || isSecondary || isHoveredTarget ? 0.82 : 0.88),
            HEX_RADIUS * 0.97,
            6,
          ]}
        />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Pion 3D du joueur propriétaire */}
      {ownerColor && (
        <Pawn3D
          colorHex={ownerColor.hex}
          position={[tile.building ? 0.38 : 0, height, tile.building ? 0.28 : 0]}
          scale={0.75}
        />
      )}

      {/* Étiquette flottante (Coordonnée + Ressource / Bâtiment) */}
      <Html position={[0, height + 0.45, 0]} center distanceFactor={14}>
        <div className="pointer-events-none flex flex-col items-center">
          <span className="px-1.5 py-0.5 rounded bg-[#463217]/85 text-[#F6F5DF] text-[10px] font-bold whitespace-nowrap shadow">
            {tile.coord} {info.icon}
          </span>
          {tile.building && (
            <span className="mt-0.5 px-1.5 py-0.5 rounded bg-amber-600 text-white text-[9px] font-extrabold whitespace-nowrap shadow">
              🏛️ +{tile.building.power}P
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export default function OlympusBoard3D({
  tiles,
  playerColorMap,
  primaryCoord,
  secondaryCoord,
  hoveredCoord,
  useGltfAssets,
  onSelectPrimary,
  onSelectSecondary,
}: {
  tiles: HexTile[];
  playerColorMap: Record<string, { name: KayKitPlayerColor; hex: string }>;
  primaryCoord: string;
  secondaryCoord: string;
  hoveredCoord?: string;
  useGltfAssets: boolean;
  onSelectPrimary: (c: string) => void;
  onSelectSecondary: (c: string) => void;
}) {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 12.5, 11.5], fov: 42 }}>
        <ambientLight intensity={0.75} />
        <directionalLight
          castShadow
          position={[10, 18, 8]}
          intensity={1.35}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <group position={[0, -0.5, 0]}>
          {tiles.map((tile) => (
            <HexTile3D
              key={tile.coord}
              tile={tile}
              ownerColor={tile.ownerId ? playerColorMap[tile.ownerId] : undefined}
              isPrimary={tile.coord === primaryCoord}
              isSecondary={tile.coord === secondaryCoord}
              isHoveredTarget={tile.coord === hoveredCoord}
              useGltfAssets={useGltfAssets}
              onSelectPrimary={onSelectPrimary}
              onSelectSecondary={onSelectSecondary}
            />
          ))}
        </group>

        <ContactShadows position={[0, -0.52, 0]} opacity={0.4} scale={30} blur={2} far={10} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.25}
          minDistance={5}
          maxDistance={24}
        />
      </Canvas>
    </div>
  );
}