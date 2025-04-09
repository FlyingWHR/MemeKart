import { Particles1 } from "./Particles1";
import { Particles3 } from "./Particles3";

export const DriftParticlesLeft = ({
  fireColor = 0xffffff,
  scale = 0,
  ...props
}) => {

  // if(scale < 0.8) {
  //   return null;
  // }

  return (
    <group {...props}>
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      <Particles1 fireColor={fireColor} scale={scale} />
      {/* <Particles3 fireColor={fireColor} scale={scale} /> */}

    </group>
  )
}
