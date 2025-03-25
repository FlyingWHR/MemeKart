import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Noise, Vignette, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export const Postprocessing = () => {
  return (
    <EffectComposer>
      <SMAA />
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
      />
      <ChromaticAberration
        offset={[0.0005, 0.0005]}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        opacity={0.02}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        darkness={0.5}
        offset={0.5}
      />
    </EffectComposer>
  );
}; 