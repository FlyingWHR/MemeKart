import { Particles2 } from "./Particles2";
import { Particles4 } from "./Particles4";

export const DriftParticlesRight = ({
  fireColor = 0xffffff,
  scale = 0,
  ...props
}) => {

  // if(scale < 0.8) {
  //   return null;
  // }

  return (
    <group {...props}>
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />

      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
      <Particles2 fireColor={fireColor} scale={scale} />
    </group>
  )
}
