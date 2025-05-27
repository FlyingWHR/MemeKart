import { Controls } from "../App";
import { BallCollider, RigidBody, useRapier, vec3 } from "@react-three/rapier";
import {
  useKeyboardControls,
  PerspectiveCamera,
  PositionalAudio,
} from "@react-three/drei";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";

import { Mario } from "./models/characters/Mario_kart";
import { DriftParticlesLeft } from "./Particles/drifts/DriftParticlesLeft";
import { DriftParticlesRight } from "./Particles/drifts/DriftParticlesRight";
import { PointParticle } from "./Particles/drifts/PointParticle";
import { SmokeParticles } from "./Particles/smoke/SmokeParticles";
import { useStore } from "./store";
import FakeGlowMaterial from "./ShaderMaterials/FakeGlow/FakeGlowMaterial";
import { HitParticles } from "./Particles/hits/HitParticles";
import { CoinParticles } from "./Particles/coins/CoinParticles";
import { ItemParticles } from "./Particles/items/ItemParticles";
import { MushroomBoostParticles } from "./Particles/boosts/MushroomBoostParticles";
import { UpvoteBoostParticles } from "./Particles/boosts/UpvoteBoostParticles";
import { geometry } from "maath";
import { getVehicleStatsForCharacter } from "../config/vehicleStats";

extend(geometry);

const DEBUG = false;

export const PlayerController = ({
  player,
  userPlayer,
  setNetworkBananas,
  setNetworkShells,
  networkBananas,
  networkShells,
  countdownFreeze
}) => {
  const upPressed = useKeyboardControls((state) => state[Controls.up]);
  const downPressed = useKeyboardControls((state) => state[Controls.down]);
  const leftPressed = useKeyboardControls((state) => state[Controls.left]);
  const rightPressed = useKeyboardControls((state) => state[Controls.right]);
  const jumpPressed = useKeyboardControls((state) => state[Controls.jump]);
  const shootPressed = useKeyboardControls((state) => state[Controls.shoot]);
  const resetPressed = useKeyboardControls((state) => state[Controls.reset]);
  const escPressed = useKeyboardControls((state) => state[Controls.escape]);

  const [isOnGround, setIsOnGround] = useState(false);
  const body = useRef();
  const kart = useRef();
  const cam = useRef();
  
  const { world } = useRapier();
  
  const { actions, item, id, controls, selectedCharacter, playerEffects, activeBoost, boostEndTime } = useStore();
  const setStoreItem = useStore(state => state.actions.setItem); 

  const characterStats = getVehicleStatsForCharacter(selectedCharacter);
  
  const baseInitialSpeed = 0;
  const baseMaxSpeed = 30;
  const baseBoostSpeed = 50; // For drift boosts
  const baseAcceleration = 0.1;
  const baseDecceleration = 0.2;
  const baseDamping = -0.1;
  const baseMaxSteeringSpeed = 0.01;
  const baseJumpForce = 10;
  
  const initialSpeed = baseInitialSpeed;
  const maxSpeed = baseMaxSpeed * characterStats.maxSpeedMultiplier;
  const driftBoostValue = baseBoostSpeed * characterStats.maxSpeedMultiplier; // Renamed from boostSpeed to avoid confusion
  const acceleration = baseAcceleration * characterStats.accelerationMultiplier;
  const decceleration = baseDecceleration;
  const damping = baseDamping;
  const MaxSteeringSpeed = baseMaxSteeringSpeed * characterStats.handlingMultiplier;
  
  const [currentSteeringSpeed, setCurrentSteeringSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed);
  const [visualItemBoostActive, setVisualItemBoostActive] = useState(false);
  const camMaxOffset = 1;
  let steeringAngle = 0;
  const isOnFloor = useRef(false);
  const jumpForce = useRef(0);
  const jumpIsHeld = useRef(false);
  const driftDirection = useRef(0);
  const driftLeft = useRef(false);
  const driftRight = useRef(false);
  const driftForce = useRef(0);
  const mario = useRef();
  const accumulatedDriftPower = useRef(0);
  const blueTurboThreshold = 10;
  const orangeTurboThreshold = 30;
  const purpleTurboThreshold = 60;
  const [fireColor, setFireColor] = useState(0xffffff);
  const driftBoostDuration = useRef(0); // Renamed from boostDuration
  const [isDriftBoosting, setIsDriftBoosting] = useState(false); // Renamed from isBoosting
  let targetXPosition = 0;
  let targetZPosition = 8;
  const [steeringAngleWheels, setSteeringAngleWheels] = useState(0);
  
  const engineSound = useRef();
  const driftSound = useRef();
  const driftTwoSound = useRef();
  const driftOrangeSound = useRef();
  const driftPurpleSound = useRef();
  const driftBlueSound = useRef();
  const jumpSound = useRef();
  const landingSound = useRef();
  const turboSound = useRef(); // For drift boost sounds
  
  const [scale, setScale] = useState(0);
  const [shouldLaunch, setShouldLaunch] = useState(false); // Generic flag for particle effects
  const effectiveDriftBoost = useRef(0); // Renamed from effectiveBoost

  const bananaSlowDownDuration = useRef(1500); // Specific for banana

  const rightWheel = useRef();
  const leftWheel = useRef();
  
  const [wallCollisionRecovery, setWallCollisionRecovery] = useState(0);
  const maxSpeedAfterCollision = useRef(maxSpeed);
  const [lastCollisionTime, setLastCollisionTime] = useState(0);
  const hasCollided = useRef(false);
  
  useEffect(() => {
    if (leftWheel.current && rightWheel.current && body.current) {
      actions.setLeftWheel(leftWheel.current);
      actions.setRightWheel(rightWheel.current);
    }
    if (body.current) {
      body.current.setMassProperties({
        mass: 1 * characterStats.weightMultiplier,
        centerOfMass: { x: 0, y: 0, z: 0 },
      });
       // Set RigidBody name for item collision detection (e.g., by TrollTrap)
       if (id && body.current.name !== id) { // `id` is the PlayroomKit player ID
        body.current.name = id;
        if (DEBUG) console.log(`PlayerController: Set RigidBody name to ${id}`);
      }
    }
  }, [body.current, selectedCharacter, actions, id]); // Added id to dependencies
  
  useFrame(({ pointer, clock }, delta) => {
    if (player.id !== id || !body.current || !kart.current || !mario.current) return;
    const time = clock.getElapsedTime();
    const now = Date.now();

    // --- Sound Management ---
    engineSound.current.setVolume(currentSpeed / 300 + 0.2);
    engineSound.current.setPlaybackRate(currentSpeed / 10 + 0.1);
    jumpSound.current.setPlaybackRate(1.5);
    jumpSound.current.setVolume(0.5);
    driftSound.current.setVolume(0.2);
    driftBlueSound.current.setVolume(0.5);
    driftOrangeSound.current.setVolume(0.6);
    driftPurpleSound.current.setVolume(0.7);

    // --- Speed Display & Stats ---
    const actualVelocity = body.current.linvel();
    const actualSpeed = new THREE.Vector3(actualVelocity.x, 0, actualVelocity.z).length();
    actions.setCurrentSpeed(Math.round(actualSpeed * 3.6));

    // --- Wall Collision Recovery ---
    if (wallCollisionRecovery > 0) {
      setWallCollisionRecovery(wallCollisionRecovery - delta);
      const recoveryProgress = 1 - (wallCollisionRecovery / 2); 
      maxSpeedAfterCollision.current = maxSpeed * (0.5 + (0.5 * recoveryProgress));
    } else if (wallCollisionRecovery <= 0 && maxSpeedAfterCollision.current < maxSpeed) {
      maxSpeedAfterCollision.current = maxSpeed;
      setWallCollisionRecovery(0);
    }

    // --- Player Effects Evaluation ---
    const currentPlayerEffect = playerEffects?.[id] || {};
    
    // Downvote Effect
    const isPlayerDownvoted = currentPlayerEffect.isSlowed && now < currentPlayerEffect.slowEndTime;
    if (currentPlayerEffect.isSlowed && now >= currentPlayerEffect.slowEndTime) {
        actions.removeSlowdown(id); 
    }

    // Item Boost Effect (Mushroom, UpvoteBoost)
    let isItemBoosting = false; 
    if (activeBoost && now < boostEndTime) {
        isItemBoosting = true;
    } else if (activeBoost && now >= boostEndTime) {
        actions.removeBoost(); 
    }
    useEffect(() => { // Manage visualItemBoostActive based on isItemBoosting
        setVisualItemBoostActive(isItemBoosting);
    }, [isItemBoosting]);

    // Disorientation Effect (Troll Trap)
    const isPlayerDisoriented = currentPlayerEffect.isDisoriented && now < currentPlayerEffect.disorientationEndTime;
    const playerDisorientationType = currentPlayerEffect.disorientationType;
    if (currentPlayerEffect.isDisoriented && now >= currentPlayerEffect.disorientationEndTime) {
        actions.removeDisorientation(id); // Fallback removal
        if (cam.current && cam.current.userData.originalFov) { // Reset FOV if changed by screenShake
            cam.current.fov = cam.current.userData.originalFov;
            cam.current.updateProjectionMatrix();
            delete cam.current.userData.originalFov;
        }
    }

    // --- Steering Input Processing (with potential disorientation) ---
    let actualLeftPressed = leftPressed;
    let actualRightPressed = rightPressed;
    let actualPointerX = pointer.x;

    if (isPlayerDisoriented && playerDisorientationType === "invertedControls") {
        actualLeftPressed = rightPressed; 
        actualRightPressed = leftPressed;
        actualPointerX = -pointer.x;    
    }
    // (Screen Shake camera effect will be applied below, before camera position lerping)
    
    // --- Speed & Acceleration Modification Order ---
    let calculatedAcceleration = acceleration; 
    let calculatedMaxSpeed = maxSpeed; 
    calculatedMaxSpeed = Math.min(calculatedMaxSpeed, maxSpeedAfterCollision.current); // Apply wall recovery

    if (isPlayerDownvoted) { // Apply Downvote
      calculatedAcceleration *= 0.6; 
      calculatedMaxSpeed *= 0.6;     
    }
    if (isItemBoosting) { // Apply Item Boosts
        if (activeBoost === "mushroom") {
            calculatedMaxSpeed *= 1.5;       
            calculatedAcceleration *= 1.7; 
        } else if (activeBoost === "upvoteBoost") {
            calculatedMaxSpeed *= 1.7;
            calculatedAcceleration *= 2.0;
        }
    }
    
    // Final speed variables for this frame
    const finalUsableMaxSpeed = calculatedMaxSpeed;
    const finalUsableAcceleration = calculatedAcceleration;

    // --- Visual Cues (shouldLaunch, wheelSpinning) ---
    const globalShouldSlow = actions.getShouldSlowDown(); // For banana
    let launchNow = false;
    let spinWheelsNow = false; // This will determine if skid marks are generated

    if (globalShouldSlow) { // Banana effect - implies loss of control, skids likely
        launchNow = true;
        spinWheelsNow = true; 
    } else if (isPlayerDownvoted) { // Downvote effect
        launchNow = true; // Show some effect like smoke
        // For downvote, only spin wheels if also turning sharply, similar to hard turn logic.
        // This prevents skid marks when slowing down in a straight line.
        if (Math.abs(steeringAngle) > MaxSteeringSpeed * 0.6 && currentSpeed > 10) {
             spinWheelsNow = true;
        }
    } else if (isItemBoosting) { // Item boosts
        launchNow = true; // For flame particles, etc.
        // Item boosts typically don't cause skids unless also turning/drifting.
    }
    
    // Drifting always causes skid marks
    if (driftLeft.current || driftRight.current) {
        if (isOnGround) { // Only leave marks if on ground
            spinWheelsNow = true;
            // launchNow = true; // Drifting already has its own particle effects (fireColor, scale)
        }
    }
    // Hard turns (non-drifting)
    else if (!driftLeft.current && !driftRight.current && Math.abs(steeringAngle) > MaxSteeringSpeed * 0.7 && currentSpeed > 15 && isOnFloor.current) {
        spinWheelsNow = true;
        // launchNow = true; // Optionally add smoke for hard turns too
    }


    if (shouldLaunch !== launchNow) setShouldLaunch(launchNow);
    
    // Update wheel spinning state for Skid.jsx
    if (leftWheel.current && leftWheel.current.isSpinning !== spinWheelsNow && !driftRight.current) { // Avoid conflicting with drift-specific logic if any
        leftWheel.current.isSpinning = spinWheelsNow;
    }
    if (rightWheel.current && rightWheel.current.isSpinning !== spinWheelsNow && !driftLeft.current) {
        rightWheel.current.isSpinning = spinWheelsNow;
    }
    // Ensure wheels stop spinning if no condition is met (and not drifting)
    if (!spinWheelsNow && !driftLeft.current && !driftRight.current) {
        if (leftWheel.current && leftWheel.current.isSpinning) leftWheel.current.isSpinning = false;
        if (rightWheel.current && rightWheel.current.isSpinning) rightWheel.current.isSpinning = false;
    }

    // --- Steering Logic ---
    // Uses actualLeftPressed, actualRightPressed, actualPointerX which may be inverted by disorientation
    if (actualLeftPressed && currentSpeed > 0) {
      steeringAngle = countdownFreeze ? 0 : currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
    } else if (actualRightPressed && currentSpeed > 0) {
      steeringAngle = countdownFreeze ? 0 : -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
    } else if (actualRightPressed && currentSpeed < 0) { 
      steeringAngle = countdownFreeze ? 0 : currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
    } else if (actualLeftPressed && currentSpeed < 0) { 
      steeringAngle = countdownFreeze ? 0 : -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
    } else {
      steeringAngle = 0;
      targetXPosition = 0;
    }
    if (controls !== 'keyboard' || (!actualLeftPressed && !actualRightPressed)) { 
        if (!driftLeft.current && !driftRight.current) {
          steeringAngle = currentSteeringSpeed * -actualPointerX;
          targetXPosition = -camMaxOffset * -actualPointerX;
        } else if (driftLeft.current && !driftRight.current) { 
          steeringAngle = currentSteeringSpeed * -(actualPointerX - 1); 
          targetXPosition = -camMaxOffset * -actualPointerX;
        } else if (driftRight.current && !driftLeft.current) {
          steeringAngle = currentSteeringSpeed * -(actualPointerX + 1);
          targetXPosition = -camMaxOffset * -actualPointerX;
        }
    }
    if(countdownFreeze) { 
        steeringAngle = 0;
        targetXPosition = 0;
    }
    setSteeringAngleWheels(steeringAngle * 25); // Visual wheel steering

    // --- Acceleration / Deceleration ---
    if (upPressed && currentSpeed < finalUsableMaxSpeed) {
      if (!countdownFreeze) {
        setCurrentSpeed(
          Math.min(currentSpeed + finalUsableAcceleration * delta * 144, finalUsableMaxSpeed)
        );
      }
    } else if (upPressed && currentSpeed > finalUsableMaxSpeed && effectiveDriftBoost.current > 0) { // Slowing down from drift boost if over limit
      setCurrentSpeed(
        Math.max(currentSpeed - decceleration * delta * 144, finalUsableMaxSpeed)
      );
    }

    if (upPressed) { // Steering speed buildup
      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(Math.min(currentSteeringSpeed + 0.0001 * delta * 144, MaxSteeringSpeed));
      }
    }
    
    // Banana Slowdown Logic (distinct from item slowdown)
    if (globalShouldSlow) {
      setCurrentSpeed(Math.max(currentSpeed - decceleration * 2 * delta * 144, 0));
      setCurrentSteeringSpeed(0); 
      bananaSlowDownDuration.current -= 1500 * delta; 
      if (bananaSlowDownDuration.current <= 1) {
        actions.setShouldSlowDown(false); 
        bananaSlowDownDuration.current = 1500;
        // Visuals reset by the main visual cue logic if no other effects are active
      }
    }

    // --- Reversing / Natural Deceleration ---
    if (downPressed) { // Reversing
      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(Math.min(currentSteeringSpeed + 0.0001 * delta * 144, MaxSteeringSpeed));
      }
      if (currentSpeed <= 0) { // Allow reversing up to -maxSpeed (or a fraction of it)
         setCurrentSpeed(Math.max(currentSpeed - finalUsableAcceleration * delta * 144, -maxSpeed * 0.5));
      } else { // Braking if moving forward
         setCurrentSpeed(Math.max(currentSpeed - decceleration * 2 * delta * 144, 0));
      }
    } else if (!upPressed) { // Natural deceleration
      if (currentSteeringSpeed > 0) {
        setCurrentSteeringSpeed(Math.max(currentSteeringSpeed - 0.00005 * delta * 144, 0));
      } else if (currentSteeringSpeed < 0) {
        setCurrentSteeringSpeed(Math.min(currentSteeringSpeed + 0.00005 * delta * 144, 0));
      }
      setCurrentSpeed(Math.max(currentSpeed - decceleration * delta * 144, 0));
    }

    // --- Kart Physics Update ---
    kart.current.rotation.y += steeringAngle * delta * 144;
    body.current.applyImpulse(
      {
        x: -body.current.linvel().x * (1 - damping) * delta * 144,
        y: 0,
        z: -body.current.linvel().z * (1 - damping) * delta * 144,
      },
      true
    );
    const bodyPosition = body.current.translation();
    kart.current.position.set(bodyPosition.x, bodyPosition.y - 0.5, bodyPosition.z);

    if (!countdownFreeze) { // Apply forward/backward impulse
      body.current.applyImpulse(
        {
          x: forwardDirection.x * currentSpeed * delta * 144,
          y: 0 + jumpForce.current * delta * 144,
          z: forwardDirection.z * currentSpeed * delta * 144,
        },
        true
      );
    } else { // Only vertical impulse during countdown (for jumps)
       body.current.applyImpulse({ x: 0, y: jumpForce.current * delta * 144, z: 0}, true);
    }
    jumpForce.current = Math.max(0, jumpForce.current - 1 * delta * 144);


    // --- Jumping ---
    if (jumpPressed && isOnGround && !jumpIsHeld.current) {
      jumpForce.current = baseJumpForce * characterStats.jumpForceMultiplier;
      setIsOnGround(false); // Changed from isOnFloor.current = false
      jumpIsHeld.current = true;
      jumpSound.current.play();
    }
    if (!jumpPressed) {
      jumpIsHeld.current = false;
    }
    if (isOnGround && jumpForce.current <=0) { // Simplified condition for landing sound
       // landingSound.current.play(); // This might play too often, consider condition
    }
    
    // --- Drifting ---
    if (jumpIsHeld.current && upPressed && Math.abs(actualPointerX) > 0.1 && currentSpeed > 5) { // Use actualPointerX for drift initiation with inverted controls
      if (actualPointerX < -0.1 && !driftRight.current) driftLeft.current = true;
      if (actualPointerX > 0.1 && !driftLeft.current) driftRight.current = true;
      if ((driftLeft.current || driftRight.current) && !driftSound.current.isPlaying) driftSound.current.play();
    }
    if (!jumpIsHeld.current) { // End drift
      if ((driftLeft.current || driftRight.current) && accumulatedDriftPower.current > 1) {
        setIsDriftBoosting(true);
        effectiveDriftBoost.current = driftBoostDuration.current;
        driftBoostDuration.current = 0;
      }
      driftLeft.current = false;
      driftRight.current = false;
      driftDirection.current = 0;
      driftForce.current = 0;
    }
    // ... (rest of drift logic: accumulation, sounds, mario rotation, fireColor, particle scale)
     if (!jumpIsHeld.current && !driftLeft.current && !driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(mario.current.rotation.y, 0, 0.05 * delta * 144 );
      setFireColor(0xffffff);
      accumulatedDriftPower.current = 0;
      if(driftSound.current.isPlaying) driftSound.current.stop();
      if(driftTwoSound.current.isPlaying) driftTwoSound.current.stop();
      if(driftOrangeSound.current.isPlaying) driftOrangeSound.current.stop();
      if(driftPurpleSound.current.isPlaying) driftPurpleSound.current.stop();
      setScale(0);
    }
    if (driftLeft.current || driftRight.current) {
        const baseDriftAngle = 0.4;
        driftDirection.current = driftLeft.current ? 1 : -1;
        driftForce.current = 0.4; // This seems to be related to kart rotation offset, not a physics force
        mario.current.rotation.y = THREE.MathUtils.lerp(mario.current.rotation.y, steeringAngle * 25 + (baseDriftAngle * driftDirection.current), 0.05 * delta * 144);
        if (isOnGround) {
            if(leftWheel.current) leftWheel.current.isSpinning = true; // Both wheels for drift particles
            if(rightWheel.current) rightWheel.current.isSpinning = true;
            accumulatedDriftPower.current += 0.1 * (Math.abs(steeringAngle) + 1) * delta * 144 * characterStats.driftPowerMultiplier;
        }
        const oscillation = Math.sin(time * 20) * 0.05; // Adjusted speed for oscillation
        const vibration = oscillation + 0.95;
        if (fireColor === 0xffffff) setScale(vibration * 0.6); else setScale(vibration * 0.8);
        if (isOnGround && !driftSound.current.isPlaying) driftSound.current.play();
        if (isOnGround && !driftTwoSound.current.isPlaying && accumulatedDriftPower.current > blueTurboThreshold / 2) driftTwoSound.current.play();
    }

    if (accumulatedDriftPower.current > blueTurboThreshold && accumulatedDriftPower.current < orangeTurboThreshold) {
      setFireColor(0x00ccff); driftBoostDuration.current = 50;
      if(!driftBlueSound.current.isPlaying && !driftOrangeSound.current.isPlaying && !driftPurpleSound.current.isPlaying) driftBlueSound.current.play();
    } else if (accumulatedDriftPower.current >= orangeTurboThreshold && accumulatedDriftPower.current < purpleTurboThreshold) {
      setFireColor(0xffa500); driftBoostDuration.current = 100;
      if(driftBlueSound.current.isPlaying) driftBlueSound.current.stop();
      if(!driftOrangeSound.current.isPlaying && !driftPurpleSound.current.isPlaying) driftOrangeSound.current.play();
    } else if (accumulatedDriftPower.current >= purpleTurboThreshold) {
      setFireColor(0xcc00ff); driftBoostDuration.current = 150; // Slightly shorter purple for balance
      if(driftOrangeSound.current.isPlaying) driftOrangeSound.current.stop();
      if(!driftPurpleSound.current.isPlaying) driftPurpleSound.current.play();
    }


    // Drift Boost Activation
    if (isDriftBoosting && effectiveDriftBoost.current > 1) {
      setCurrentSpeed(driftBoostValue); // Use specific drift boost value
      effectiveDriftBoost.current -= 1 * delta * 144;
      targetZPosition = 10; // Camera effect for drift boost
      if (!turboSound.current.isPlaying) turboSound.current.play();
      // Stop colored drift sounds when main turbo sound plays
      if(driftBlueSound.current.isPlaying) driftBlueSound.current.stop();
      if(driftOrangeSound.current.isPlaying) driftOrangeSound.current.stop();
      if(driftPurpleSound.current.isPlaying) driftPurpleSound.current.stop();
      if(!driftTwoSound.current.isPlaying) driftTwoSound.current.play(); // Keep general drift sound
    } else if (effectiveDriftBoost.current <= 1 && isDriftBoosting) {
      setIsDriftBoosting(false); // End drift boost state
      targetZPosition = 8;
      if(turboSound.current.isPlaying) turboSound.current.stop();
    }
    

    // --- Camera ---
    // Apply screen shake before lerping to target
    if (isPlayerDisoriented && playerDisorientationType === "screenShake" && cam.current) {
        // Calculate shake progress (1 to 0) for fading out effect
        let shakeDurationMs = 3000; // Default shake duration
        if (currentPlayerEffect.disorientationEndTime && currentPlayerEffect.disorientationEndTime > now) {
            shakeDurationMs = Math.min(3000, currentPlayerEffect.disorientationEndTime - now);
        }
        const shakeProgress = shakeDurationMs > 0 ? Math.max(0, shakeDurationMs / 3000) : 0; 
        
        const shakeIntensity = 0.015 * shakeProgress * shakeProgress; // Reduced intensity

        // Apply shake relative to camera's current local axes
        const randomLocalShake = new THREE.Vector3(
            (Math.random() - 0.5) * shakeIntensity * 1.5, 
            (Math.random() - 0.5) * shakeIntensity * 1.0,
            0 
        );
        const worldShake = randomLocalShake.applyQuaternion(cam.current.quaternion.clone());
        cam.current.position.add(worldShake);
        
        if (!cam.current.userData.originalFov) { 
            cam.current.userData.originalFov = cam.current.fov;
        }
        let fovChange = (Math.random() - 0.5) * shakeIntensity * 4; // Reduced FOV shake
        const newFov = THREE.MathUtils.clamp((cam.current.userData.originalFov || 50) + fovChange, 48, 55); // Clamp FOV tighter
        if (Math.abs(cam.current.fov - newFov) > 0.05) { 
            cam.current.fov = newFov;
            cam.current.updateProjectionMatrix();
        }
    }

    cam.current.position.x = THREE.MathUtils.lerp(cam.current.position.x, targetXPosition, 0.05 * delta * 144);
    cam.current.position.z = THREE.MathUtils.lerp(cam.current.position.z, targetZPosition, 0.05 * delta * 144);
    cam.current.updateMatrixWorld();


    // --- Item Usage ---
    if (shootPressed && item) { // Check if item is not null
        if (item === "banana") {
            const distanceBehind = 2;
            const scaledBackwardDirection = forwardDirection.clone().multiplyScalar(distanceBehind);
            const kartPosition = vec3(body.current.translation());
            const bananaPosition = new THREE.Vector3().subVectors(kartPosition, scaledBackwardDirection);
            const newBanana = { id: `${id}-${Date.now()}`, position: [bananaPosition.x, bananaPosition.y, bananaPosition.z], player: true };
            if (setNetworkBananas && networkBananas) setNetworkBananas([...networkBananas, newBanana]); else actions.addBanana(newBanana); // Fallback to local
            actions.useItem(); // Consumes item from store
        } else if (item === "shell") {
            const distanceForward = 2; // Shells shoot forward
            const scaledForwardDirection = forwardDirection.clone().multiplyScalar(distanceForward);
            const kartPosition = vec3(body.current.translation());
            const shellPosition = new THREE.Vector3().addVectors(kartPosition, scaledForwardDirection);
            const newShell = { id: `${id}-${Date.now()}`, position: [shellPosition.x, shellPosition.y + 0.2, shellPosition.z], rotation: kartRotation, player: true };
            if (setNetworkShells && networkShells) setNetworkShells([...networkShells, newShell]); else actions.addShell(newShell); // Fallback to local
            actions.useItem();
        } else if (item === "trollTrap") {
            const distanceBehind = 2.0; 
            const currentPositionVec = vec3(body.current.translation());
            const normalizedForward = forwardDirection.clone().normalize();
            const trapPosition = new THREE.Vector3(currentPositionVec.x, currentPositionVec.y, currentPositionVec.z)
              .addScaledVector(normalizedForward, -distanceBehind); 
            const newTrap = { id: `${id}-${Date.now()}`, position: [trapPosition.x, trapPosition.y - 0.45, trapPosition.z], rotation: [0, kart.current.rotation.y, 0], playerId: id };
            actions.addTrollTrap(newTrap); 
            setStoreItem(null); // Use the aliased setItem from store to consume
        } else {
            // For items like mushroom, upvoteBoost, downvote, memeSticker,
            // actions.useItem() in store.jsx handles their effects.
            // We still need to call it here if shootPressed and item exists.
            actions.useItem();
        }
    }
    
    // --- Reset ---
    if (resetPressed) {
      body.current.setTranslation({ x: 8, y: 2, z: -119 }); // Reset to a default position
      body.current.setLinvel({ x: 0, y: 0, z: 0 });
      body.current.setAngvel({ x: 0, y: 0, z: 0 });
      kart.current.rotation.y = Math.PI / 2; // Reset rotation
      setCurrentSpeed(0);
      setCurrentSteeringSpeed(0);
      setIsDriftBoosting(false); effectiveDriftBoost.current = 0;
      jumpForce.current = 0; setIsOnGround(false);
      // Reset item related states in the store if needed, e.g. actions.resetPlayerEffects(id);
    }

    // --- Update Player State for Network ---
    if (player) { // Check if player object from PlayroomKit is available
        player.setState("position", body.current.translation());
        player.setState("rotation", kart.current.rotation.y + (mario.current?.rotation.y || 0) ); // Include mario's visual rotation
        player.setState("isDriftBoosting", isDriftBoosting); // Drift boost state
        player.setState("isItemBoosting", isItemBoosting); // Item boost state (Mushroom, Upvote)
        player.setState("isDownvoted", isPlayerDownvoted); // Downvoted state
        // player.setState("isDisoriented", isPlayerDisoriented); // (To be added)
        player.setState("shouldLaunch", shouldLaunch); // For general effects like smoke/sparks
        player.setState("fireColor", fireColor); // Drift particle color
        player.setState("driftScale", scale); // Drift particle scale
    }
  });

  const handleWallCollision = (collisionInfo) => {
    if (body.current && !hasCollided.current && player.id === id) {
      const currentTime = Date.now();
      if (currentTime - lastCollisionTime < 400) return; 
      if (driftLeft.current || driftRight.current) return;
      
      const actualVelocity = body.current.linvel();
      const actualSpeed = new THREE.Vector3(actualVelocity.x, 0, actualVelocity.z).length();
      if (actualSpeed < 3) return;
      
      if (DEBUG) console.log("Wall collision! Speed:", actualSpeed, "Collider:", collisionInfo.colliderObject.name);
      
      setLastCollisionTime(currentTime);
      hasCollided.current = true;
      
      const normal = collisionInfo.manifold.normal();
      const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
      const kartRotationVal = kart.current.rotation.y - driftDirection.current * driftForce.current; // Get current kart rotation
      const currentForwardDir = new THREE.Vector3(-Math.sin(kartRotationVal),0,-Math.cos(kartRotationVal));


      // Simplified bounce: reflect velocity and reduce speed
      const currentLinvel = body.current.linvel();
      const reflectedVel = new THREE.Vector3(currentLinvel.x, currentLinvel.y, currentLinvel.z).reflect(normalVec);
      
      // Reduce speed significantly upon collision
      const speedReductionFactor = 0.3; 
      body.current.setLinvel({ 
          x: reflectedVel.x * speedReductionFactor, 
          y: reflectedVel.y * speedReductionFactor, // Allow some vertical bounce if desired
          z: reflectedVel.z * speedReductionFactor 
      }, true);
      
      setCurrentSpeed(currentSpeed * speedReductionFactor);
      maxSpeedAfterCollision.current = maxSpeed * 0.2; 
      setWallCollisionRecovery(2); // 2-second recovery period
      
      if (landingSound.current) {
        if (landingSound.current.isPlaying) landingSound.current.stop();
        landingSound.current.play();
        landingSound.current.setVolume(1.0);
      }
      
      setTimeout(() => {
        if (body.current) hasCollided.current = false;
      }, 400);
    }
  };

  return player.id === id ? (
    <group>
      <RigidBody
        ref={body}
        colliders={false}
        position={[8, 2, -119]} // Start on the ground
        centerOfMass={[0, -0.5, 0]} // Lowered center of mass
        mass={1 * characterStats.weightMultiplier} // Use actual weight multiplier
        ccd
        name={id} // Set RigidBody name to player's ID
        type={"dynamic"} // Always dynamic for the controlled player
        onCollisionEnter={(collisionInfo) => {
          const otherColliderName = collisionInfo.colliderObject?.name;
          if (DEBUG && otherColliderName !== "ground") console.log("Collision with:", otherColliderName);

          // Ground detection more robustly
          const contactNormal = collisionInfo.manifold.normal();
          if (contactNormal.y > 0.5) { // If contact normal is mostly upward
            setIsOnGround(true);
            if(jumpForce.current > 0 && landingSound.current && !landingSound.current.isPlaying) { // Landing sound
                landingSound.current.play();
            }
            jumpForce.current = 0; // Reset jump force on landing
          } 
          // Wall detection - consider any collision that's not primarily ground
          else if (Math.abs(contactNormal.y) < 0.5) {
             handleWallCollision(collisionInfo);
          }
        }}
        onCollisionExit={(collisionInfo) => {
            // Check if we are really leaving the ground
            // This might need raycasting downwards to be truly robust
            // For now, a simple exit means not on ground.
            // setIsOnGround(false); 
        }}
      >
        <BallCollider args={[0.5]} mass={1 * characterStats.weightMultiplier}/>
      </RigidBody>

      <group ref={kart} rotation={[0, Math.PI / 2, 0]}>
        <group ref={mario}>
          <Mario
            currentSpeed={currentSpeed}
            steeringAngleWheels={steeringAngleWheels}
            isBoosting={isDriftBoosting || visualItemBoostActive} 
            shouldLaunch={shouldLaunch} 
          />
          <CoinParticles coins={useStore(state => state.coins)} /> {/* Directly use store coins */}
          <ItemParticles item={item} /> 
          {visualItemBoostActive && activeBoost === "mushroom" && <MushroomBoostParticles />}
          {visualItemBoostActive && activeBoost === "upvoteBoost" && <UpvoteBoostParticles />}
          
          {/* Drift Particles */}
          <mesh position={[0.6, 0.05, 0.5]} scale={scale}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial emissive={fireColor} toneMapped={false} emissiveIntensity={100} transparent opacity={0.4}/>
          </mesh>
          <mesh position={[0.6, 0.05, 0.5]} scale={scale * 10}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <FakeGlowMaterial falloff={3} glowInternalRadius={1} glowColor={fireColor} glowSharpness={1}/>
          </mesh>
          <mesh position={[-0.6, 0.05, 0.5]} scale={scale}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial emissive={fireColor} toneMapped={false} emissiveIntensity={100} transparent opacity={0.4}/>
          </mesh>
          <mesh position={[-0.46, 0.05, 0.3]} ref={leftWheel}></mesh>
          <mesh position={[0.46, 0.05, 0.3]} ref={rightWheel}></mesh>
          <mesh position={[-0.6, 0.05, 0.5]} scale={scale * 10}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <FakeGlowMaterial falloff={3} glowInternalRadius={1} glowColor={fireColor} glowSharpness={1}/>
          </mesh>
          
          <DriftParticlesLeft fireColor={fireColor} scale={scale} />
          <DriftParticlesRight fireColor={fireColor} scale={scale} />
          <SmokeParticles driftRight={driftRight.current} driftLeft={driftLeft.current}/>
          <PointParticle position={[-0.6, 0.05, 0.5]} png="./particles/circle.png" fireColor={fireColor}/>
          <PointParticle position={[0.6, 0.05, 0.5]} png="./particles/circle.png" fireColor={fireColor}/>
          <PointParticle position={[-0.6, 0.05, 0.5]} png="./particles/star.png" fireColor={fireColor}/>
          <PointParticle position={[0.6, 0.05, 0.5]} png="./particles/star.png" fireColor={fireColor}/>
          <HitParticles shouldLaunch={shouldLaunch} />
        </group>

        <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} ref={cam} far={5000}/>
        <PositionalAudio ref={engineSound} url="./sounds/engine.wav" autoplay loop distance={1000}/>
        <PositionalAudio ref={driftSound} url="./sounds/drifting.mp3" loop distance={1000}/>
        <PositionalAudio ref={driftTwoSound} url="./sounds/driftingTwo.mp3" loop distance={1000}/>
        <PositionalAudio ref={driftOrangeSound} url="./sounds/driftOrange.wav" loop={false} distance={1000}/>
        <PositionalAudio ref={driftBlueSound} url="./sounds/driftBlue.wav" loop={false} distance={1000}/>
        <PositionalAudio ref={driftPurpleSound} url="./sounds/driftPurple.wav" loop={false} distance={1000}/>
        <PositionalAudio ref={jumpSound} url="./sounds/jump.mp3" loop={false} distance={1000}/>
        <PositionalAudio ref={landingSound} url="./sounds/landing.wav" loop={false} distance={1000}/>
        <PositionalAudio ref={turboSound} url="./sounds/turbo.wav" loop={false} distance={1000}/>
      </group>
    </group>
  ) : null;
};
