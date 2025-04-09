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
import { Cylinder } from "@react-three/drei";
import FakeGlowMaterial from "./ShaderMaterials/FakeGlow/FakeGlowMaterial";
import { HitParticles } from "./Particles/hits/HitParticles";
import { CoinParticles } from "./Particles/coins/CoinParticles";
import { ItemParticles } from "./Particles/items/ItemParticles";
import { geometry } from "maath";
import { getVehicleStatsForCharacter } from "../config/vehicleStats";
extend(geometry);

const DEBUG = false; // Set to true to enable debug logging

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
  
  // Add Rapier world reference to access collision events
  const { world } = useRapier();
  
  // Get the selected character from the store
  const { actions, shouldSlowDown, item, bananas, coins, id, controls, selectedCharacter } = useStore();
  
  // Get the vehicle stats for the selected character
  const characterStats = getVehicleStatsForCharacter(selectedCharacter);
  
  // Base physics values
  const baseInitialSpeed = 0;
  const baseMaxSpeed = 30;
  const baseBoostSpeed = 50;
  const baseAcceleration = 0.1;
  const baseDecceleration = 0.2;
  const baseDamping = -0.1;
  const baseMaxSteeringSpeed = 0.01;
  const baseJumpForce = 10;
  
  // Apply character-specific multipliers to the physics values
  const initialSpeed = baseInitialSpeed;
  const maxSpeed = baseMaxSpeed * characterStats.maxSpeedMultiplier;
  const boostSpeed = baseBoostSpeed * characterStats.maxSpeedMultiplier;
  const acceleration = baseAcceleration * characterStats.accelerationMultiplier;
  const decceleration = baseDecceleration;
  const damping = baseDamping;
  const MaxSteeringSpeed = baseMaxSteeringSpeed * characterStats.handlingMultiplier;
  
  const [currentSteeringSpeed, setCurrentSteeringSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed);
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
  const boostDuration = useRef(0);
  const [isBoosting, setIsBoosting] = useState(false);
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
  const turboSound = useRef();
  const [scale, setScale] = useState(0);
  const raycaster = new THREE.Raycaster();
  const downDirection = new THREE.Vector3(0, -1, 0);
  const [shouldLaunch, setShouldLaunch] = useState(false);
  const effectiveBoost = useRef(0);
  const text = useRef();
  
  const slowDownDuration = useRef(1500);

  const rightWheel = useRef();
  const leftWheel = useRef();
  
  // Add recovery states for wall collision
  const [wallCollisionRecovery, setWallCollisionRecovery] = useState(0);
  const maxSpeedAfterCollision = useRef(maxSpeed);
  const [lastCollisionTime, setLastCollisionTime] = useState(0);
  const hasCollided = useRef(false);
  
  useEffect(() => {
    if (leftWheel.current && rightWheel.current && body.current) {
      actions.setLeftWheel(leftWheel.current);
      actions.setRightWheel(rightWheel.current);
    }
    
    // Apply weight multiplier to physics body when character changes
    if (body.current) {
      // Note: This is a simplified implementation - in a real game you'd 
      // adjust mass more directly, but we're adapting the existing code
      body.current.setMassProperties({
        mass: 1 * characterStats.weightMultiplier,
        centerOfMass: { x: 0, y: 0, z: 0 },
      });
    }
  }, [body.current, selectedCharacter]);
  
  useFrame(({ pointer, clock }, delta) => {
    if (player.id !== id) return;
    const time = clock.getElapsedTime();
    if (!body.current && !mario.current) return;
    
    // Continue playing engine sounds during countdown
    engineSound.current.setVolume(currentSpeed / 300 + 0.2);
    engineSound.current.setPlaybackRate(currentSpeed / 10 + 0.1);
    jumpSound.current.setPlaybackRate(1.5);
    jumpSound.current.setVolume(0.5);
    driftSound.current.setVolume(0.2);

    // Calculate the actual speed based on physical movement, not just wheel spin
    // Get the actual velocity of the kart from the physics body
    const actualVelocity = body.current.linvel();
    const actualSpeedVector = new THREE.Vector3(actualVelocity.x, 0, actualVelocity.z);
    // Calculate the magnitude of the velocity (actual speed)
    const actualSpeed = actualSpeedVector.length();
    
    // Handle wall collision recovery
    if (wallCollisionRecovery > 0) {
      // Decrease recovery timer
      setWallCollisionRecovery(wallCollisionRecovery - delta);
      
      // Gradually increase max speed back to normal
      const recoveryProgress = 1 - (wallCollisionRecovery / 2); // 2 seconds total recovery
      maxSpeedAfterCollision.current = maxSpeed * (0.5 + (0.5 * recoveryProgress));
    } else if (wallCollisionRecovery <= 0 && maxSpeedAfterCollision.current < maxSpeed) {
      // Reset when recovery is complete
      maxSpeedAfterCollision.current = maxSpeed;
      setWallCollisionRecovery(0);
    }
    
    // Update speed without debouncing - let the HUD handle display rate limiting
    // Convert to km/h and update display
    const displaySpeed = Math.round(actualSpeed * 3.6);
    actions.setCurrentSpeed(displaySpeed);

    driftBlueSound.current.setVolume(0.5);
    driftOrangeSound.current.setVolume(0.6);
    driftPurpleSound.current.setVolume(0.7);
    // HANDLING AND STEERING
    const kartRotation =
      kart.current.rotation.y - driftDirection.current * driftForce.current;
    const forwardDirection = new THREE.Vector3(
      -Math.sin(kartRotation),
      0,
      -Math.cos(kartRotation)
    );

    if (escPressed) {
      actions.setGameStarted(false);
    }
    if(kartRotation){
      leftWheel.current.kartRotation = kartRotation;
    }
    
    // Calculate steering input, but only apply rotation if not in countdown
    if (leftPressed && currentSpeed > 0) {
      steeringAngle = countdownFreeze ? 0 : currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
      // Still set wheel visuals even during countdown
      setSteeringAngleWheels(countdownFreeze ? currentSteeringSpeed * 25 : steeringAngle * 25);
    } else if (rightPressed && currentSpeed > 0) {
      steeringAngle = countdownFreeze ? 0 : -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
      // Still set wheel visuals even during countdown
      setSteeringAngleWheels(countdownFreeze ? -currentSteeringSpeed * 25 : steeringAngle * 25);
    } else if (rightPressed && currentSpeed < 0) {
      steeringAngle = countdownFreeze ? 0 : currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
      // Still set wheel visuals even during countdown
      setSteeringAngleWheels(countdownFreeze ? currentSteeringSpeed * 25 : steeringAngle * 25);
    } else if (leftPressed && currentSpeed < 0) {
      steeringAngle = countdownFreeze ? 0 : -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
      // Still set wheel visuals even during countdown
      setSteeringAngleWheels(countdownFreeze ? -currentSteeringSpeed * 25 : steeringAngle * 25);
    } else {
      steeringAngle = 0;
      targetXPosition = 0;
      setSteeringAngleWheels(0);
    }

    // mouse steering

    if (!driftLeft.current && !driftRight.current) {
      steeringAngle = currentSteeringSpeed * -pointer.x;
      targetXPosition = -camMaxOffset * -pointer.x;
    } else if (driftLeft.current && !driftRight.current) {
      steeringAngle = currentSteeringSpeed * -(pointer.x - 1);
      targetXPosition = -camMaxOffset * -pointer.x;
    } else if (driftRight.current && !driftLeft.current) {
      steeringAngle = currentSteeringSpeed * -(pointer.x + 1);
      targetXPosition = -camMaxOffset * -pointer.x;
    }
    // ACCELERATING
    const shouldSlow = actions.getShouldSlowDown();

    if (upPressed && currentSpeed < maxSpeedAfterCollision.current) {
      // Use the potentially reduced max speed if in recovery
      if (!countdownFreeze) {
        setCurrentSpeed(
          Math.min(currentSpeed + acceleration * delta * 144, maxSpeedAfterCollision.current)
        );
      }
    } else if (
      upPressed &&
      currentSpeed > maxSpeedAfterCollision.current &&
      effectiveBoost.current > 0
    ) {
      setCurrentSpeed(
        Math.max(currentSpeed - decceleration * delta * 144, maxSpeedAfterCollision.current)
      );
    }

    if (upPressed) {
      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(
          Math.min(
            currentSteeringSpeed + 0.0001 * delta * 144,
            MaxSteeringSpeed
          )
        );
      }
    }
    if (shouldSlow) {
      rightWheel.current.isSpinning = true;

      setCurrentSpeed(
        Math.max(currentSpeed - decceleration * 2 * delta * 144, 0)
      );
      setCurrentSteeringSpeed(0);
      slowDownDuration.current -= 1500 * delta;
      setShouldLaunch(true);
      if (slowDownDuration.current <= 1) {
        rightWheel.current.isSpinning = false;
        actions.setShouldSlowDown(false);
        slowDownDuration.current = 1500;
        setShouldLaunch(false);
      }
    }

    // REVERSING
    if (downPressed) {
      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(
          Math.min(
            currentSteeringSpeed + 0.0001 * delta * 144,
            MaxSteeringSpeed
          )
        );
      }
    }

    if (downPressed && currentSpeed <= 0) {
      setCurrentSpeed(
        Math.max(currentSpeed - acceleration * delta * 144, -maxSpeed)
      );
    }
    // DECELERATING
    else if (!upPressed) {
      if (currentSteeringSpeed > 0) {
        setCurrentSteeringSpeed(
          Math.max(currentSteeringSpeed - 0.00005 * delta * 144, 0)
        );
      } else if (currentSteeringSpeed < 0) {
        setCurrentSteeringSpeed(
          Math.min(currentSteeringSpeed + 0.00005 * delta * 144, 0)
        );
      }
      setCurrentSpeed(Math.max(currentSpeed - decceleration * delta * 144, 0));
    }

    // Update the kart's rotation based on the steering angle
    kart.current.rotation.y += steeringAngle * delta * 144;

    // Apply damping to simulate slowdown when no keys are pressed
    body.current.applyImpulse(
      {
        x: -body.current.linvel().x * (1 - damping) * delta * 144,
        y: 0,
        z: -body.current.linvel().z * (1 - damping) * delta * 144,
      },
      true
    );
    const bodyPosition = body.current.translation();
    kart.current.position.set(
      bodyPosition.x,
      bodyPosition.y - 0.5,
      bodyPosition.z
    );

    // JUMPING
    if (jumpPressed && isOnGround && !jumpIsHeld.current) {
      // Apply jump force with character's jump multiplier
      jumpForce.current += baseJumpForce * characterStats.jumpForceMultiplier;
      isOnFloor.current = false;
      jumpIsHeld.current = true;
      jumpSound.current.play();
      setIsOnGround(false);

      if (jumpSound.current.isPlaying) {
        jumpSound.current.stop();
        jumpSound.current.play();
      }
    }

    if (isOnFloor.current && jumpForce.current > 0) {
      landingSound.current.play();
    }
    if (!isOnGround && jumpForce.current > 0) {
      jumpForce.current -= 1 * delta * 144;
    }
    if (!jumpPressed) {
      jumpIsHeld.current = false;
    }
    
    // DRIFTING - Using classic Mario Kart style drift logic
    // Start drift when jumping and steering
    if (jumpIsHeld.current && upPressed && Math.abs(pointer.x) > 0.1) {
      if (pointer.x < -0.1 && !driftRight.current) {
        driftLeft.current = true;
        
        // Set initial scale for particles when drift starts
        const oscillation = Math.sin(time * 1000) * 0.1;
        const vibration = oscillation + 0.9;
        setScale(vibration * 0.8);
        
        // Start drift sound if needed
        if (!driftSound.current.isPlaying) {
          driftSound.current.play();
        }
      }
      if (pointer.x > 0.1 && !driftLeft.current) {
        driftRight.current = true;
        
        // Set initial scale for particles when drift starts
        const oscillation = Math.sin(time * 1000) * 0.1;
        const vibration = oscillation + 0.9;
        setScale(vibration * 0.8);
        
        // Start drift sound if needed
        if (!driftSound.current.isPlaying) {
          driftSound.current.play();
        }
      }
    }
    
    // End drift only when releasing the jump button
    if (!jumpIsHeld.current) {
      // When drift ends, if we've accumulated enough power, apply boost
      if ((driftLeft.current || driftRight.current) && accumulatedDriftPower.current > 1) {
        // Drift released - apply boost based on accumulated power
        setIsBoosting(true);
        effectiveBoost.current = boostDuration.current;
        boostDuration.current = 0;
      }
      
      // Reset drift state
      driftLeft.current = false;
      driftRight.current = false;
      driftDirection.current = 0;
      driftForce.current = 0;
    }

    if (!jumpIsHeld.current && !driftLeft.current && !driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        0,
        0.0001 * delta * 144
      );
      setFireColor(0xffffff);
      accumulatedDriftPower.current = 0;
      driftSound.current.stop();
      driftTwoSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
    }

    if (driftLeft.current) {
      driftDirection.current = 1;
      driftForce.current = 0.4;
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 25 + 0.4,
        0.05 * delta * 144
      );
      if (isOnFloor.current) {
        leftWheel.current.isSpinning = true;
        // Apply drift power multiplier based on character stats
        accumulatedDriftPower.current +=
          0.1 * (steeringAngle + 1) * delta * 144 * characterStats.driftPowerMultiplier;
      }
    }
    if (driftRight.current) {
      driftDirection.current = -1;
      driftForce.current = 0.4;
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        -(-steeringAngle * 25 + 0.4),
        0.05 * delta * 144
      );
      if(isOnFloor.current){
        leftWheel.current.isSpinning = true;
        // Apply drift power multiplier based on character stats
        accumulatedDriftPower.current += 0.1 * (-steeringAngle + 1) * delta * 144 * characterStats.driftPowerMultiplier;
      }
    }
    if (!driftLeft.current && !driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 30,
        0.05 * delta * 144
      );
      setScale(0);
      if((pointer.x > 0.8 || pointer.x < -0.8) && currentSpeed > 20 && isOnFloor.current){
        leftWheel.current.isSpinning = true;
      } else {
        leftWheel.current.isSpinning = false;
      }
    }
    if (accumulatedDriftPower.current > blueTurboThreshold) {
      setFireColor(0x00ffff);
      boostDuration.current = 50;
      driftBlueSound.current.play();
    }
    if (accumulatedDriftPower.current > orangeTurboThreshold) {
      setFireColor(0xffcf00);
      boostDuration.current = 100;
      driftBlueSound.current.stop();
      driftOrangeSound.current.play();
    }
    if (accumulatedDriftPower.current > purpleTurboThreshold) {
      setFireColor(0xff00ff);
      boostDuration.current = 250;
      driftOrangeSound.current.stop();
      driftPurpleSound.current.play();
    }

    if (driftLeft.current || driftRight.current) {
      const oscillation = Math.sin(time * 1000) * 0.1;
      const vibration = oscillation + 0.9;
      if (fireColor === 0xffffff) {
        setScale(vibration * 0.8);
      } else {
        setScale(vibration);
      }
      if (isOnFloor.current && !driftSound.current.isPlaying) {
        driftSound.current.play();
        driftTwoSound.current.play();
        landingSound.current.play();
      }
    }
    // RELEASING DRIFT

    if (boostDuration.current > 1 && !jumpIsHeld.current) {
      setIsBoosting(true);
      effectiveBoost.current = boostDuration.current;
      boostDuration.current = 0;
    } else if (effectiveBoost.current <= 1) {
      targetZPosition = 8;
      setIsBoosting(false);
    }

    if (isBoosting && effectiveBoost.current > 1) {
      setCurrentSpeed(boostSpeed);
      effectiveBoost.current -= 1 * delta * 144;
      targetZPosition = 10;
      if (!turboSound.current.isPlaying) turboSound.current.play();
      driftTwoSound.current.play();
      driftBlueSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
    } else if (effectiveBoost.current <= 1) {
      setIsBoosting(false);
      targetZPosition = 8;
      turboSound.current.stop();
    }

    // CAMERA WORK

    cam.current.updateMatrixWorld();

    cam.current.position.x = THREE.MathUtils.lerp(
      cam.current.position.x,
      targetXPosition,
      0.01 * delta * 144
    );

    cam.current.position.z = THREE.MathUtils.lerp(
      cam.current.position.z,
      targetZPosition,
      0.01 * delta * 144
    );

    // RESTORE VELOCITY-BASED WALL DETECTION alongside Rapier physics
    // This is a backup method in case the collision events don't work properly
    if (!hasCollided.current && wallCollisionRecovery <= 0) {
      const speedRatio = actualSpeed / (Math.abs(currentSpeed) + 0.01); // Avoid division by zero
      const isAgainstWall = (speedRatio < 0.6 && Math.abs(currentSpeed) > 5) || 
                           (Math.abs(actualSpeed) < 0.8 && Math.abs(currentSpeed) > 6);
      
      // Don't detect wall collisions during drift to avoid interfering with drift mechanics
      if (isAgainstWall && !(driftLeft.current || driftRight.current)) {
        if (DEBUG) console.log("Velocity-based wall collision detected!");
        const currentTime = Date.now();
        if (currentTime - lastCollisionTime > 400) { // Don't process if we collided recently
          setLastCollisionTime(currentTime);
          hasCollided.current = true;
          
          // Apply bounce-back force
          const bumpForce = 25 * characterStats.weightMultiplier;
          body.current.applyImpulse(
            {
              x: -forwardDirection.x * bumpForce,
              y: 0, // No vertical bounce
              z: -forwardDirection.z * bumpForce,
            },
            true
          );
          
          // Apply speed penalty
          setCurrentSpeed(Math.max(currentSpeed * 0.3, 0)); // Reduce to 30% of current speed
          maxSpeedAfterCollision.current = maxSpeed * 0.2; // Limit max speed to 20% during recovery
          setWallCollisionRecovery(3); // 3-second recovery period
          
          // Play collision sound
          if (landingSound.current) {
            if (landingSound.current.isPlaying) {
              landingSound.current.stop();
            }
            landingSound.current.play();
            landingSound.current.setVolume(1.0);
          }
          
          // Reset collision state after a delay
          setTimeout(() => {
            if (body.current) hasCollided.current = false;
          }, 400);
        }
      }
    }

    // Instead of the custom wall collision logic, we now rely on Rapier's collision events
    // The collision detection is handled in onCollisionEnter of the RigidBody
    
    // Apply movement impulse only if not in countdown
    if (!countdownFreeze) {
      body.current.applyImpulse(
        {
          x: forwardDirection.x * currentSpeed * delta * 144,
          y: 0 + jumpForce.current * delta * 144,
          z: forwardDirection.z * currentSpeed * delta * 144,
        },
        true
      );
    } else {
      // During countdown, only apply vertical force (for jumps)
      body.current.applyImpulse(
        {
          x: 0,
          y: 0 + jumpForce.current * delta * 144,
          z: 0,
        },
        true
      );
    }

    // Update the kart's rotation based on the steering angle
    setSteeringAngleWheels(steeringAngle * 25);

    // SOUND WORK

    // MISC

    if (resetPressed) {
      body.current.setTranslation({ x: 8, y: 2, z: -119 });
      body.current.setLinvel({ x: 0, y: 0, z: 0 });
      body.current.setAngvel({ x: 0, y: 0, z: 0 });
      setCurrentSpeed(0);
      setCurrentSteeringSpeed(0);
      setIsBoosting(false);
      effectiveBoost.current = 0;
      setIsOnGround(false);
      jumpForce.current = 0;
      driftDirection.current = 0;
      kart.current.rotation.y = Math.PI / 2;
    }

    // ITEMS

    if (shootPressed && item === "banana") {
      const distanceBehind = 2;
      const scaledBackwardDirection =
        forwardDirection.multiplyScalar(distanceBehind);

      const kartPosition = new THREE.Vector3(
        ...vec3(body.current.translation())
      );

      const bananaPosition = kartPosition.sub(scaledBackwardDirection);
      const newBanana = {
        id: Math.random() + "-" + +new Date(),
        position: bananaPosition,
        player: true,
      };
      setNetworkBananas([...networkBananas, newBanana]);

      actions.useItem();
    }

    if (shootPressed && item === "shell") {
      const distanceBehind = -2;
      const scaledBackwardDirection =
        forwardDirection.multiplyScalar(distanceBehind);

      const kartPosition = new THREE.Vector3(
        body.current.translation().x,
        body.current.translation().y,
        body.current.translation().z
      );

      const shellPosition = kartPosition.sub(scaledBackwardDirection);
      const newShell = {
        id: Math.random() + "-" + +new Date(),
        position: shellPosition,
        player: true,
        rotation: kartRotation,
      };
      setNetworkShells([...networkShells, newShell]);
      actions.useItem();
    }

    if (shootPressed && item === "mushroom") {
      setIsBoosting(true);
      effectiveBoost.current = 300;
      actions.useItem();
    }

    player.setState("position", body.current.translation());
    player.setState("rotation", kartRotation + mario.current.rotation.y);
    player.setState("isBoosting", isBoosting);
    player.setState("shouldLaunch", shouldLaunch);
    player.setState("fireColor", fireColor);
    player.setState("scale", scale);
    player.setState("bananas", bananas);
  });

  // Function to handle wall collisions
  const handleWallCollision = (collisionInfo) => {
    // Only process wall collisions if we're moving fast enough and haven't collided recently
    if (body.current && !hasCollided.current && player.id === id) {
      const currentTime = Date.now();
      if (currentTime - lastCollisionTime < 400) return; // Prevent multiple collisions within 400ms
      
      // Skip collision handling during drift to prevent interrupting drift mechanics
      if (driftLeft.current || driftRight.current) return;
      
      // Check if we have significant speed before applying collision effects
      const actualVelocity = body.current.linvel();
      const actualSpeedVector = new THREE.Vector3(actualVelocity.x, 0, actualVelocity.z);
      const actualSpeed = actualSpeedVector.length();
      
      // Only apply collision if we're moving at a decent speed
      if (actualSpeed < 3) return;
      
      if (DEBUG) console.log("Wall collision detected! Speed:", actualSpeed);
      
      setLastCollisionTime(currentTime);
      hasCollided.current = true;
      
      // Get the collision normal (direction of the impact)
      const normal = collisionInfo.manifold.normal();
      
      // Create a normalized vector from the collision normal
      const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
      
      // Get the forward direction of the kart
      const kartRotation = kart.current.rotation.y - driftDirection.current * driftForce.current;
      const forwardDirection = new THREE.Vector3(
        -Math.sin(kartRotation),
        0,
        -Math.cos(kartRotation)
      );
      
      // Calculate the bounce-back force (opposing the direction of movement)
      const bumpForce = 20 * characterStats.weightMultiplier;
      
      // Calculate the dot product to determine how head-on the collision is
      const dot = forwardDirection.dot(normalVec);
      
      // Apply bounce-back force based on the collision normal
      body.current.applyImpulse(
        {
          x: normalVec.x * bumpForce,
          y: 0, // No vertical bounce
          z: normalVec.z * bumpForce,
        },
        true
      );
      
      // Apply speed penalty
      setCurrentSpeed(Math.max(currentSpeed * 0.3, 0)); // Reduce to 30% of current speed
      maxSpeedAfterCollision.current = maxSpeed * 0.2; // Limit max speed to 20% during recovery
      setWallCollisionRecovery(4); // 4-second recovery period
      
      // Play collision sound
      if (landingSound.current) {
        if (landingSound.current.isPlaying) {
          landingSound.current.stop();
        }
        landingSound.current.play();
        landingSound.current.setVolume(1.0);
      }
      
      // Reset collision state after a delay
      setTimeout(() => {
        hasCollided.current = false;
      }, 400);
    }
  };

  return player.id === id ? (
    <group>
      <RigidBody
        ref={body}
        colliders={false}
        position={[8, 60, -119]}
        centerOfMass={[0, -1, 0]}
        mass={3}
        ccd
        name="player"
        type={player.id === id ? "dynamic" : "kinematic"}
        onCollisionEnter={(collisionInfo) => {
          // Ground detection
          if (collisionInfo.target.translation().y < body.current.translation().y - 0.3) {
            isOnFloor.current = true;
            setIsOnGround(true);
          } 
          // Wall detection - consider any collision that's not at the bottom to be a wall
          else {
            if (DEBUG) console.log("Potential wall collision detected");
            handleWallCollision(collisionInfo);
          }
        }}
        onCollisionExit={(collisionInfo) => {
          // Only change ground state if we're exiting what we consider to be ground
          if (collisionInfo.target.translation().y < body.current.translation().y - 0.3) {
            isOnFloor.current = false;
            setIsOnGround(false);
          }
        }}
      >
        <BallCollider
          args={[0.5]}
          mass={3}
        />
      </RigidBody>

      <group ref={kart} rotation={[0, Math.PI / 2, 0]}>
        <group ref={mario}>
          <Mario
            currentSpeed={currentSpeed}
            steeringAngleWheels={steeringAngleWheels}
            isBoosting={isBoosting}
            shouldLaunch={shouldLaunch}
          />
          <CoinParticles coins={coins} />
          <ItemParticles item={item} />
          <mesh position={[0.6, 0.05, 0.5]} scale={scale}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              emissive={fireColor}
              toneMapped={false}
              emissiveIntensity={100}
              transparent
              opacity={0.4}
            />
          </mesh>
          <mesh position={[0.6, 0.05, 0.5]} scale={scale * 10}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <FakeGlowMaterial
              falloff={3}
              glowInternalRadius={1}
              glowColor={fireColor}
              glowSharpness={1}
            />
          </mesh>
          <mesh position={[-0.6, 0.05, 0.5]} scale={scale}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              emissive={fireColor}
              toneMapped={false}
              emissiveIntensity={100}
              transparent
              opacity={0.4}
            />
          </mesh>
          <mesh position={[-0.46, 0.05, 0.3]} ref={leftWheel}></mesh>
          <mesh position={[0.46, 0.05, 0.3]} ref={rightWheel}></mesh>
          <mesh position={[-0.6, 0.05, 0.5]} scale={scale * 10}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <FakeGlowMaterial
              falloff={3}
              glowInternalRadius={1}
              glowColor={fireColor}
              glowSharpness={1}
            />
          </mesh>
          {/* <FlameParticles isBoosting={isBoosting} /> */}
          <DriftParticlesLeft fireColor={fireColor} scale={scale} />
          <DriftParticlesRight fireColor={fireColor} scale={scale} />
          <SmokeParticles
            driftRight={driftRight.current}
            driftLeft={driftLeft.current}
          />
          <PointParticle
            position={[-0.6, 0.05, 0.5]}
            png="./particles/circle.png"
            fireColor={fireColor}
          />
          <PointParticle
            position={[0.6, 0.05, 0.5]}
            png="./particles/circle.png"
            fireColor={fireColor}
          />
          <PointParticle
            position={[-0.6, 0.05, 0.5]}
            png="./particles/star.png"
            fireColor={fireColor}
          />
          <PointParticle
            position={[0.6, 0.05, 0.5]}
            png="./particles/star.png"
            fireColor={fireColor}
          />
          <HitParticles shouldLaunch={shouldLaunch} />
        </group>

        {/* <ContactShadows frames={1} /> */}
        <PerspectiveCamera
          makeDefault
          position={[0, 2, 8]}
          fov={50}
          ref={cam}
          far={5000}
        />
        <PositionalAudio
          ref={engineSound}
          url="./sounds/engine.wav"
          autoplay
          loop
          distance={1000}
        />
        <PositionalAudio
          ref={driftSound}
          url="./sounds/drifting.mp3"
          loop
          distance={1000}
        />
        <PositionalAudio
          ref={driftTwoSound}
          url="./sounds/driftingTwo.mp3"
          loop
          distance={1000}
        />
        <PositionalAudio
          ref={driftOrangeSound}
          url="./sounds/driftOrange.wav"
          loop={false}
          distance={1000}
        />
        <PositionalAudio
          ref={driftBlueSound}
          url="./sounds/driftBlue.wav"
          loop={false}
          distance={1000}
        />

        <PositionalAudio
          ref={driftPurpleSound}
          url="./sounds/driftPurple.wav"
          loop={false}
          distance={1000}
        />
        <PositionalAudio
          ref={jumpSound}
          url="./sounds/jump.mp3"
          loop={false}
          distance={1000}
        />
        <PositionalAudio
          ref={landingSound}
          url="./sounds/landing.wav"
          loop={false}
          distance={1000}
        />
        <PositionalAudio
          ref={turboSound}
          url="./sounds/turbo.wav"
          loop={false}
          distance={1000}
        />
      </group>
    </group>
  ) : null;
};
