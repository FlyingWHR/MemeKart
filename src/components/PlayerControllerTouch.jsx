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
import { useGamepad } from "./useGamepad";
extend(geometry);

const DEBUG = false; // Set to true to enable debug logging

const WHEEL_ROTATION_SPEED = 0.1; // Base rotation speed
const MAX_WHEEL_ANGLE = 30; // Maximum steering angle in degrees
const WHEEL_SMOOTHNESS = 0.2; // Smoothness factor for steering

// Camera improvements
const CAMERA_SMOOTHNESS = 0.02;
const CAMERA_MOMENTUM = 0.05;
const BASE_FOV = 50;
const TURN_FOV = 52;
const BOOST_FOV = 55;
const CAMERA_TILT = 0.05;

export const PlayerControllerTouch = ({
  player,
  userPlayer,
  setNetworkBananas,
  setNetworkShells,
  networkBananas,
  networkShells,
}) => {

  const [isOnGround, setIsOnGround] = useState(false);
  const body = useRef();
  const kart = useRef();
  const cam = useRef();
  const initialSpeed = 0;
  const maxSpeed = 30;
  const boostSpeed = 50;
  const acceleration = 0.1;
  const decceleration = 0.2;
  const damping = -0.1;
  const MaxSteeringSpeed = 0.01;
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
  
  const { actions, shouldSlowDown, item, bananas, coins, id, controls, joystickX, driftButton, itemButton, menuButton } = useStore();
  const slowDownDuration = useRef(1500);
  const rightWheel = useRef();
  const leftWheel = useRef();
  const isDrifting = useRef(false);
  
  // Add recovery states for wall collision
  const [wallCollisionRecovery, setWallCollisionRecovery] = useState(0);
  const maxSpeedAfterCollision = useRef(maxSpeed);
  const [lastCollisionTime, setLastCollisionTime] = useState(0);
  const hasCollided = useRef(false);
  
  // Add Rapier world reference to access collision events
  const { world } = useRapier();
  
  // Initialize variables for the new physics-based boost system
  const boostForce = useRef(0);
  const maxBoostForce = 300; // Maximum force applied during boost (standardized with other controllers)
  const boostRampUpRate = 1000; // How quickly boost reaches max force (standardized with other controllers)
  const boostDecayRate = 200; // How quickly boost fades when complete (standardized with other controllers)
  
  // Vector to store the forward direction of the kart
  const forwardDirection = useRef(new THREE.Vector3(0, 0, 1));
  
  // Add camera velocity ref
  const cameraVelocity = useRef(new THREE.Vector3());
  
  useEffect(() => {
    if (leftWheel.current && rightWheel.current && body.current) {
      actions.setLeftWheel(leftWheel.current);
      actions.setRightWheel(rightWheel.current);
    }
  }, [body.current]);

  useFrame(({ pointer, clock }, delta) => {
    if (player.id !== id) return;
    const time = clock.getElapsedTime();
    if (!body.current && !mario.current) return;
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
    leftWheel.current.kartRotation = kartRotation;
    if (menuButton) {
      actions.setGameStarted(false);
    }

    // Wheel rotation based on speed
    const wheelRotation = currentSpeed * WHEEL_ROTATION_SPEED * delta;
    if (leftWheel.current && rightWheel.current && body.current) {
      leftWheel.current.rotation.x += wheelRotation;
      rightWheel.current.rotation.x += wheelRotation;
    }

    // mouse steering
    if (!driftLeft.current && !driftRight.current) {
      steeringAngle = currentSteeringSpeed * -joystickX;
      targetXPosition = -camMaxOffset * -joystickX;
      // Set wheel angle directly based on joystick input
      setSteeringAngleWheels(joystickX * MAX_WHEEL_ANGLE);
    } else if (driftLeft.current && !driftRight.current) {
      steeringAngle = currentSteeringSpeed * -(joystickX - 1);
      targetXPosition = -camMaxOffset * -joystickX;
      setSteeringAngleWheels(joystickX * MAX_WHEEL_ANGLE);
    } else if (driftRight.current && !driftLeft.current) {
      steeringAngle = currentSteeringSpeed * -(joystickX + 1);
      targetXPosition = -camMaxOffset * -joystickX;
      setSteeringAngleWheels(joystickX * MAX_WHEEL_ANGLE);
    }
    // ACCELERATING
    const shouldSlow = actions.getShouldSlowDown();

    if (!driftButton && currentSpeed < maxSpeedAfterCollision.current) {
      // Use the potentially reduced max speed if in recovery
      setCurrentSpeed(
        Math.min(currentSpeed + acceleration * delta * 144, maxSpeedAfterCollision.current)
      );
    } else if (
      !driftButton &&
      currentSpeed > maxSpeedAfterCollision.current &&
      effectiveBoost.current > 0
    ) {
      setCurrentSpeed(
        Math.max(currentSpeed - decceleration * delta * 144, maxSpeedAfterCollision.current)
      );
    }


      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(
          Math.min(
            currentSteeringSpeed + 0.0001 * delta * 144,
            MaxSteeringSpeed
          )
        );
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

    // Ground detection - ensure we're using the right flags for ground state
    const onGroundNow = isOnFloor.current;
    
    // JUMPING - Separate from drift logic
    // Only initiate a jump when first pressing the drift button on the ground
    if (driftButton && onGroundNow && !jumpIsHeld.current) {
      if (DEBUG) console.log("Jump initiated");
      jumpForce.current = 10;
      isOnFloor.current = false;
      jumpIsHeld.current = true;
      setIsOnGround(false);
      
      // Play jump sound
      if (jumpSound.current) {
        jumpSound.current.stop(); // Stop any existing sound before playing
        jumpSound.current.play();
      }
    }
    
    // Apply gravity to jump force when in air
    if (!onGroundNow && jumpForce.current > 0) {
      jumpForce.current = Math.max(0, jumpForce.current - 1 * delta * 144);
    }
    
    // DRIFTING - Pure Mario Kart style
    // Start drift when jump button is held and steering while on ground or just after jumping
    if (driftButton && Math.abs(joystickX) > 0.1 && !isDrifting.current) {
      // If we just started the jump or we're on the ground
      if (Math.abs(joystickX) > 0.1) {
        if (joystickX < -0.1) {
          if (DEBUG) console.log("Starting left drift");
          driftLeft.current = true;
          driftRight.current = false;
          driftDirection.current = 1;
          driftForce.current = 0.4;
          isDrifting.current = true;
          
          // Set initial scale for particles when drift starts
          const oscillation = Math.sin(time * 1000) * 0.1;
          const vibration = oscillation + 0.9;
          setScale(vibration);
          
        } else if (joystickX > 0.1) {
          if (DEBUG) console.log("Starting right drift");
          driftRight.current = true;
          driftLeft.current = false;
          driftDirection.current = -1;
          driftForce.current = 0.4;
          isDrifting.current = true;
          
          // Set initial scale for particles when drift starts
          const oscillation = Math.sin(time * 1000) * 0.1;
          const vibration = oscillation + 0.9;
          setScale(vibration);
        }
        
        // Play drift initiation sound
        if (!driftSound.current.isPlaying) {
          driftSound.current.play();
        }
      }
    }
    
    // Continue drift as long as jump button is held
    if (driftButton && isDrifting.current) {
      // Accumulate drift power when on ground
      if (onGroundNow) {
        // Accumulate more power when steering harder in the drift direction
        if (driftLeft.current && joystickX < 0) {
          accumulatedDriftPower.current += 0.2 * Math.abs(joystickX) * delta * 144;
        } else if (driftRight.current && joystickX > 0) {
          accumulatedDriftPower.current += 0.2 * Math.abs(joystickX) * delta * 144;
        } else {
          // Still accumulate some power even if not steering hard
          accumulatedDriftPower.current += 0.05 * delta * 144;
        }
      }
      
      // Handle the visual effects and turbo color changes
      if (accumulatedDriftPower.current > blueTurboThreshold) {
        setFireColor(0x00ffff);
        boostDuration.current = 50;
        if (!driftBlueSound.current.isPlaying) {
          driftBlueSound.current.play();
        }
      }
      if (accumulatedDriftPower.current > orangeTurboThreshold) {
        setFireColor(0xffcf00);
        boostDuration.current = 100;
        driftBlueSound.current.stop();
        if (!driftOrangeSound.current.isPlaying) {
          driftOrangeSound.current.play();
        }
      }
      if (accumulatedDriftPower.current > purpleTurboThreshold) {
        setFireColor(0xff00ff);
        boostDuration.current = 250;
        driftOrangeSound.current.stop();
        if (!driftPurpleSound.current.isPlaying) {
          driftPurpleSound.current.play();
        }
      }
      
      // Visual effects for active drifting
      const oscillation = Math.sin(time * 1000) * 0.1;
      const vibration = oscillation + 0.9;
      if (fireColor === 0xffffff) {
        setScale(vibration * 0.8); 
      } else {
        setScale(vibration);
      }
      
      // Sound effects for active drifting
      if (onGroundNow && (!driftSound.current.isPlaying || !driftTwoSound.current.isPlaying)) {
        driftSound.current.play();
        driftTwoSound.current.play();
      }
    }
    
    // End drift when jump button is released
    if (!driftButton && isDrifting.current) {
      // When drift ends, if we've accumulated enough power, apply boost
      if (accumulatedDriftPower.current > 1) {
        // Apply boost based on accumulated power
        setIsBoosting(true);
        effectiveBoost.current = boostDuration.current;
        
        // Play the appropriate boost sound
        if (fireColor === 0x00ffff) {
          driftBlueSound.current.play();
        } else if (fireColor === 0xffcf00) {
          driftOrangeSound.current.play(); 
        } else if (fireColor === 0xff00ff) {
          driftPurpleSound.current.play();
        }
      }
      
      // Reset drift state
      driftLeft.current = false;
      driftRight.current = false;
      driftDirection.current = 0;
      driftForce.current = 0;
      isDrifting.current = false;
      accumulatedDriftPower.current = 0;
      setFireColor(0xffffff);
      setScale(0);
      
      // Stop drift sounds
      driftSound.current.stop();
      driftTwoSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
      driftBlueSound.current.stop();
    }
    
    // Reset jump state when button is released
    if (!driftButton) {
      jumpIsHeld.current = false;
    }
    
    // Play landing sound when touching ground after being in air
    if (onGroundNow && !isOnGround) {
      setIsOnGround(true);
      if (landingSound.current && !landingSound.current.isPlaying) {
        landingSound.current.play();
      }
    }

    // Make sure to update Mario's rotation correctly based on drift state
    if (driftLeft.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 25 + 0.4,
        0.1 * delta * 144  // Increased lerp speed
      );
      if(onGroundNow){
        leftWheel.current.isSpinning = true;
      }
    }
    else if (driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        -(-steeringAngle * 25 + 0.4),
        0.1 * delta * 144  // Increased lerp speed
      );
      if(onGroundNow){
        leftWheel.current.isSpinning = true;
      }
    }
    else {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 30,
        0.1 * delta * 144  // Increased lerp speed
      );
      setScale(0);

      if((joystickX > 0.8 || joystickX < -0.8) && currentSpeed > 20 && onGroundNow){
        leftWheel.current.isSpinning = true;
      } else {
        leftWheel.current.isSpinning = false;
      }
    }

    // BOOST MECHANICS
    // Apply boost if we have one stored after drift
    if (boostDuration.current > 1 && !jumpIsHeld.current && !isDrifting.current) {
      setIsBoosting(true);
      effectiveBoost.current = boostDuration.current;
      boostDuration.current = 0;
      
      // Play turbo sound when boost activates
      if (!turboSound.current.isPlaying) {
        turboSound.current.play();
      }
    }
    
    // Apply boost effect when active
    if (isBoosting && effectiveBoost.current > 1) {
      // Boost is active - ramp up the boost force
      boostForce.current = Math.min(boostForce.current + boostRampUpRate * delta, maxBoostForce);
      
      // Calculate the forward direction based on the kart's rotation
      forwardDirection.current.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), body.current.rotation().y);
      
      // Apply boost force in the forward direction
      body.current.applyImpulse(
        {
          x: forwardDirection.current.x * boostForce.current * delta,
          y: 0,
          z: forwardDirection.current.z * boostForce.current * delta,
        },
        true
      );
      
      // Decrease remaining boost time
      effectiveBoost.current -= 1 * delta * 144;
      
      // Push camera back during boost
      targetZPosition = 10;
      
      // Play boost sounds
      if (!turboSound.current.isPlaying) {
        turboSound.current.play();
      }
      
      // Stop drift sounds during boost
      driftBlueSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
    } 
    // End boost effect when time is up
    else if (isBoosting && effectiveBoost.current <= 1) {
      setIsBoosting(false);
      targetZPosition = 8;
      turboSound.current.stop();
    }
    // Gradually decay the boost force when boost is over
    else if (boostForce.current > 0) {
      // Boost has ended - gradually decay the boost force
      boostForce.current = Math.max(boostForce.current - boostDecayRate * delta, 0);
      
      // Apply the remaining boost force
      if (boostForce.current > 0) {
        // Calculate the forward direction based on the kart's rotation
        forwardDirection.current.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), body.current.rotation().y);
        
        body.current.applyImpulse(
          {
            x: forwardDirection.current.x * boostForce.current * delta,
            y: 0,
            z: forwardDirection.current.z * boostForce.current * delta,
          },
          true
        );
      }
    }

    // CAMERA WORK

    cam.current.updateMatrixWorld();

    // Calculate target position with momentum
    const targetPosition = new THREE.Vector3(
      targetXPosition * 0.5,
      2,
      targetZPosition
    );

    // Add momentum to camera movement
    cameraVelocity.current.lerp(
      targetPosition.sub(cam.current.position).multiplyScalar(CAMERA_SMOOTHNESS),
      CAMERA_MOMENTUM
    );

    // Apply velocity to camera position
    cam.current.position.add(cameraVelocity.current);

    // Dynamic FOV with more gradual changes
    const targetFOV = isBoosting ? BOOST_FOV : 
                     Math.abs(steeringAngle) > 0.1 ? TURN_FOV : 
                     BASE_FOV;
    cam.current.fov += (targetFOV - cam.current.fov) * 0.05;
    cam.current.updateProjectionMatrix();

    // Camera tilt during turns
    const tiltAmount = steeringAngle * CAMERA_TILT;
    cam.current.rotation.z = -tiltAmount;

    // RESTORE VELOCITY-BASED WALL DETECTION alongside Rapier physics
    // This is a backup method in case the collision events don't work properly
    if (!hasCollided.current && wallCollisionRecovery <= 0) {
      const speedRatio = actualSpeed / (Math.abs(currentSpeed) + 0.01); // Avoid division by zero
      const isAgainstWall = (speedRatio < 0.6 && Math.abs(currentSpeed) > 5) || 
                           (Math.abs(actualSpeed) < 0.8 && Math.abs(currentSpeed) > 6);
      
      // IMPORTANT: Never detect wall collisions during drift to avoid breaking drift mechanics
      if (isAgainstWall && !isDrifting.current) {
        if (DEBUG) console.log("Velocity-based wall collision detected! Speed ratio:", speedRatio);
        const currentTime = Date.now();
        if (currentTime - lastCollisionTime > 400) { // Don't process if we collided recently
          setLastCollisionTime(currentTime);
          hasCollided.current = true;
          
          // Apply bounce-back force
          const bumpForce = 25;
          body.current.applyImpulse(
            {
              x: -forwardDirection.current.x * bumpForce,
              y: 0, // No vertical bounce
              z: -forwardDirection.current.z * bumpForce,
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
    
    // Apply movement impulse
    body.current.applyImpulse(
      {
        x: forwardDirection.current.x * currentSpeed * delta * 144,
        y: 0 + jumpForce.current * delta * 144,
        z: forwardDirection.current.z * currentSpeed * delta * 144,
      },
      true
    );

    // Update the kart's rotation based on the steering angle
    setSteeringAngleWheels(steeringAngle * 25);

    // SOUND WORK


    // ITEMS

    if (itemButton && item === "banana") {
      const distanceBehind = 2;
      const scaledBackwardDirection =
        forwardDirection.current.multiplyScalar(distanceBehind);

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

    if (itemButton && item === "shell") {
      const distanceBehind = -2;
      const scaledBackwardDirection =
        forwardDirection.current.multiplyScalar(distanceBehind);

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

    if (itemButton && item === "mushroom") {
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
      
      // IMPORTANT: Skip collision handling during drift to prevent interfering with drift mechanics
      if (isDrifting.current) {
        if (DEBUG) console.log("Skipping wall collision during drift");
        return;
      }
      
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
      const bumpForce = 20;
      
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
            boostDuration={effectiveBoost.current}
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
          <mesh position={[-0.46, 0.05, 0.3]} ref={leftWheel}></mesh>
          <mesh position={[0.46, 0.05, 0.3]} ref={rightWheel}></mesh>
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
          <SmokeParticles driftRight={driftRight.current} driftLeft={driftLeft.current} />
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
