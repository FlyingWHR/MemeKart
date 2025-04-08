import React, { useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const PointParticle = ({
  position = [0, 0, 0],
  png = "./particles/circle.png",
  fireColor = 0xffffff,
}) => {
  const texture = useLoader(THREE.TextureLoader, png);
  const pointsRef = useRef();
  const materialRef = useRef();
  const [size, setSize] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastScale = useRef(0);

  const points = React.useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(position, 3)
    );
    return geom;
  }, [position]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const parent = pointsRef.current.parent;
    if (!parent) return;

    const currentScale = parent.scale.x;

    // For all particles (including white), only show when drifting
    if (currentScale > 0) {
      setVisible(true);
      if (lastScale.current === 0) {
        setSize(0.02);
        setOpacity(0.5);
      }
      setSize(size => Math.min(size + delta * 0.2, 0.1));
      setOpacity(opacity => Math.min(opacity + delta * 2.5, 1));
    } else {
      setSize(0);
      setOpacity(0);
      setVisible(false);
    }

    lastScale.current = currentScale;

    if (materialRef.current) {
      materialRef.current.size = size;
      materialRef.current.opacity = opacity;
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} geometry={points} visible={visible}>
      <pointsMaterial
        ref={materialRef}
        size={size}
        alphaMap={texture}
        transparent={true}
        depthWrite={false}
        color={fireColor}
        opacity={opacity}
        toneMapped={false}
      />
    </points>
  );
};
