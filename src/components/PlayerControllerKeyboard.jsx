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
import { FlameParticle } from "./Particles/flames/FlameParticle";
import { useStore } from "./store";
import { Cylinder } from "@react-three/drei";
import FakeGlowMaterial from "./ShaderMaterials/FakeGlow/FakeGlowMaterial";
import { HitParticles } from "./Particles/hits/HitParticles";
import { CoinParticles } from "./Particles/coins/CoinParticles";
import { ItemParticles } from "./Particles/items/ItemParticles";
import { geometry } from "maath";
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

export const PlayerControllerKeyboard = ({
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
  const smallFireThreshold = 3; // Lowered to be achievable quickly
  const mediumFireThreshold = 16; // Lowered for more natural progression
  const hotFireThreshold = 35; // Lowered to be challenging but achievable
  const [fireColor, setFireColor] = useState(0xffffff);
  const boostDuration = useRef(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isPostBoost, setIsPostBoost] = useState(false); // New state for post-boost phase
  const postBoostSpeedLimit = useRef(maxSpeed); // Track current post-boost speed limit
  const postBoostDecayRate = 10; // Doubled from 5 to make deceleration faster
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
  
  const { actions, shouldSlowDown, item, bananas, coins, id, controls } =
    useStore();
  const slowDownDuration = useRef(1500);

  const rightWheel = useRef();
  const leftWheel = useRef();
  const isDrifting = useRef(false);
  
  // Add Rapier world reference to access collision events
  const { world } = useRapier();
  
  // Add recovery states for wall collision
  const [wallCollisionRecovery, setWallCollisionRecovery] = useState(0);
  const maxSpeedAfterCollision = useRef(maxSpeed);
  const [lastCollisionTime, setLastCollisionTime] = useState(0);
  const hasCollided = useRef(false);
  
  // Boost system variables
  const boostForce = useRef(0);        // Current force being applied for boost
  const maxBoostForce = 300;           // Maximum boost force to apply (increased from 200)
  const boostRampUpRate = 1000;        // How quickly boost increases (increased from 500)
  const boostDecayRate = 200;          // How quickly boost decreases
  
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
    
    // Still play engine sounds during countdown
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
    if (escPressed) {
      actions.setGameStarted(false);
    }

    // Wheel rotation based on speed
    const wheelRotation = currentSpeed * WHEEL_ROTATION_SPEED * delta;
    if (leftWheel.current && rightWheel.current && body.current) {
      leftWheel.current.rotation.x += wheelRotation;
      rightWheel.current.rotation.x += wheelRotation;
    }

    // Steering angle directly tied to input
    if (leftPressed) {
      steeringAngle = countdownFreeze ? 0 : currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
      // Set wheel angle directly based on input
      setSteeringAngleWheels(MAX_WHEEL_ANGLE);
    } else if (rightPressed) {
      steeringAngle = countdownFreeze ? 0 : -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
      // Set wheel angle directly based on input
      setSteeringAngleWheels(-MAX_WHEEL_ANGLE);
    } else {
      steeringAngle = 0;
      targetXPosition = 0;
      // Reset wheel angle when no input
      setSteeringAngleWheels(0);
    }

    // ACCELERATING
    const shouldSlow = actions.getShouldSlowDown();

    if (upPressed) {
      // Determine the effective max speed based on different states
      const effectiveMaxSpeed = isBoosting 
        ? boostSpeed 
        : isPostBoost 
          ? postBoostSpeedLimit.current 
          : maxSpeedAfterCollision.current;
      
      // Allow acceleration up to the current effective max speed
      if (currentSpeed < effectiveMaxSpeed) {
        if (!countdownFreeze) {
          setCurrentSpeed(
            Math.min(currentSpeed + acceleration * delta * 144, effectiveMaxSpeed)
          );
        }
      }
      
      if (currentSteeringSpeed < MaxSteeringSpeed) {
        setCurrentSteeringSpeed(
          Math.min(
            currentSteeringSpeed + 0.0001 * delta * 144,
            MaxSteeringSpeed
          )
        );
      }
    } else if (!upPressed) {
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

    // Handle post-boost deceleration
    if (isPostBoost) {
      // Gradually reduce the speed limit
      postBoostSpeedLimit.current = Math.max(
        postBoostSpeedLimit.current - postBoostDecayRate * delta,
        maxSpeedAfterCollision.current
      );
      
      // If we've reached normal max speed, exit post-boost state
      if (postBoostSpeedLimit.current <= maxSpeedAfterCollision.current) {
        setIsPostBoost(false);
        postBoostSpeedLimit.current = maxSpeed;
      }
      
      // If current speed exceeds our decaying speed limit, slow down
      if (currentSpeed > postBoostSpeedLimit.current) {
        setCurrentSpeed(Math.max(
          currentSpeed - (decceleration * 0.8) * delta * 144, 
          postBoostSpeedLimit.current
        ));
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
      if (DEBUG) console.log("Jump initiated with space bar");
      jumpForce.current += 10; // Increment instead of setting directly, as in original
      isOnFloor.current = false;
      jumpIsHeld.current = true;
      jumpSound.current.play();
      setIsOnGround(false);

      if (jumpSound.current.isPlaying) {
        jumpSound.current.stop();
        jumpSound.current.play();
      }
    }

    // Reset jump force on landing but don't affect speed
    if (isOnFloor.current && jumpForce.current > 0) {
      // Landing sound is now handled in the collision handler
      jumpForce.current = 0; // Just reset jump force
    }
    
    // Apply gravity to jump force when in air
    if (!isOnGround && jumpForce.current > 0) {
      jumpForce.current -= 1 * delta * 144;
    }
    
    // Reset jump state when space is released
    if (!jumpPressed) {
      jumpIsHeld.current = false;
    }
    
    // DRIFTING
    if (jumpPressed && upPressed && (leftPressed || rightPressed) && !isDrifting.current) {
      if (DEBUG) console.log("Checking drift conditions:", { jumpPressed, leftPressed, rightPressed });
      
      if (leftPressed) {
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
        
        if (!driftSound.current.isPlaying) {
          driftSound.current.play();
        }
      } else if (rightPressed) {
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
        
        if (!driftSound.current.isPlaying) {
          driftSound.current.play();
        }
      }
    }
    
    // End drift when jump button is released
    if (!jumpPressed && isDrifting.current) {
      if (DEBUG) console.log("Ending drift");
      isDrifting.current = false;
      
      // Apply boost if accumulated enough power
      // Only apply boost if we've reached at least the small fire threshold
      if (accumulatedDriftPower.current >= smallFireThreshold) {
        if (DEBUG) console.log("Applying boost with power:", accumulatedDriftPower.current);
        setIsBoosting(true);
        
        // Set boost duration based on drift power
        if (accumulatedDriftPower.current > hotFireThreshold) {
          boostDuration.current = 250;
        } else if (accumulatedDriftPower.current > mediumFireThreshold) {
          boostDuration.current = 100;
        } else if (accumulatedDriftPower.current > smallFireThreshold) {
          boostDuration.current = 50;
        } else {
          boostDuration.current = 20;
        }

        // Play the appropriate boost sound
        if (fireColor === 0x80c7ff) {
          driftBlueSound.current.play();
        } else if (fireColor === 0xff9500) {
          driftOrangeSound.current.play(); 
        } else if (fireColor === 0xff3300) {
          driftPurpleSound.current.play();
        }
      }
      
      // Reset drift state
      driftLeft.current = false;
      driftRight.current = false;
      driftDirection.current = 0;
      driftForce.current = 0;
      accumulatedDriftPower.current = 0;
      
      // Make sure to stop all drift sounds
      driftSound.current.stop();
      driftTwoSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
      driftBlueSound.current.stop();
      
      // Reset fire color and scale
      setFireColor(0xffffff);
    }

    if (driftLeft.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 25 + 0.4,
        0.05 * delta * 144
      );
      
      // Accumulate drift power while on the ground
      if (isOnFloor.current) {
        leftWheel.current.isSpinning = true;
        accumulatedDriftPower.current += 0.1 * (steeringAngle + 1) * delta * 144;
      }
    }
    
    if (driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        -(-steeringAngle * 25 + 0.4),
        0.05 * delta * 144
      );
      
      // Accumulate drift power while on the ground
      if (isOnFloor.current) {
        leftWheel.current.isSpinning = true;
        accumulatedDriftPower.current += 0.1 * (-steeringAngle + 1) * delta * 144;
      }
    }
    if (!driftLeft.current && !driftRight.current) {
      mario.current.rotation.y = THREE.MathUtils.lerp(
        mario.current.rotation.y,
        steeringAngle * 30,
        0.05 * delta * 144
      );
      setScale(0);
      if((leftPressed || rightPressed) && currentSpeed > 20 && isOnFloor.current){
        leftWheel.current.isSpinning = true;
      } else {
        leftWheel.current.isSpinning = false;
      }
    }
    if (accumulatedDriftPower.current > smallFireThreshold) {
      setFireColor(0x80c7ff); // Light blue-white (cooler flame)
      boostDuration.current = 50;
      if (!driftBlueSound.current.isPlaying && driftLeft.current || driftRight.current) {
        driftBlueSound.current.play();
      }
    }
    if (accumulatedDriftPower.current > mediumFireThreshold) {
      setFireColor(0xff9500); // Warm orange-yellow (medium heat)
      boostDuration.current = 100;
      if (driftBlueSound.current.isPlaying) {
        driftBlueSound.current.stop();
      }
      if (!driftOrangeSound.current.isPlaying && (driftLeft.current || driftRight.current)) {
        driftOrangeSound.current.play();
      }
    }
    if (accumulatedDriftPower.current > hotFireThreshold) {
      setFireColor(0xff3300); // Intense red (hottest flame)
      boostDuration.current = 250;
      if (driftOrangeSound.current.isPlaying) {
        driftOrangeSound.current.stop();
      }
      if (!driftPurpleSound.current.isPlaying && (driftLeft.current || driftRight.current)) {
        driftPurpleSound.current.play();
      }
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
      }
      
      // Apply gradual speed reduction during drifting
      // The reduction is small to maintain gameplay fun while adding realism
      if (isOnFloor.current && currentSpeed > 5) {
        // Calculate steering intensity based on steeringAngle (max reduction at full turn)
        const steeringIntensity = Math.abs(steeringAngle) / MaxSteeringSpeed; // 0 to 1 value
        
        // Base reduction plus additional based on steering intensity
        // 0.999 (0.1% loss) at minimum steering, up to 0.998 (0.2% loss) at maximum steering
        const driftSpeedReductionFactor = 1 - (0.001 + (0.001 * steeringIntensity));
        
        // Apply the calculated reduction
        setCurrentSpeed(currentSpeed * driftSpeedReductionFactor);
      }
    } else {
      // When not drifting, ensure all drift sounds are stopped
      driftSound.current.stop();
      driftTwoSound.current.stop();
      
      // Reset visual effects when not drifting
      setScale(0);
    }

    // RELEASING DRIFT - Natural boost system
    if (boostDuration.current > 1 && !jumpIsHeld.current) {
      setIsBoosting(true);
      effectiveBoost.current = boostDuration.current;
      boostDuration.current = 0;
    } else if (effectiveBoost.current <= 1 && isBoosting) {
      targetZPosition = 8;
      setIsBoosting(false);
    }

    // Apply boost effects with natural physics
    if (isBoosting && effectiveBoost.current > 1) {
      // Boost is active - ramp up the boost force
      boostForce.current = Math.min(boostForce.current + boostRampUpRate * delta, maxBoostForce);
      
      // Apply boost force in the forward direction
      body.current.applyImpulse(
        {
          x: forwardDirection.x * boostForce.current * delta,
          y: 0,
          z: forwardDirection.z * boostForce.current * delta,
        },
        true
      );
      
      // Reduce the boost duration
      effectiveBoost.current -= 1 * delta * 144;
      targetZPosition = 10;
      
      // Ensure turbo sound is playing
      if (!turboSound.current.isPlaying) {
        turboSound.current.play();
      }
      
      // Stop drift sounds while boosting
      driftSound.current.stop();
      driftTwoSound.current.stop();
      driftBlueSound.current.stop();
      driftOrangeSound.current.stop();
      driftPurpleSound.current.stop();
    } else if (isBoosting && effectiveBoost.current <= 1) {
      // Boost is ending - transition to post-boost state
      setIsBoosting(false);
      setIsPostBoost(true);
      postBoostSpeedLimit.current = boostSpeed; // Start deceleration from boost speed
      targetZPosition = 9; // Slight camera adjustment
      
      // Stop turbo sound when boost ends
      if (turboSound.current.isPlaying) {
        turboSound.current.stop();
      }
    } else if (boostForce.current > 0) {
      // Boost has ended - gradually decay the boost force
      boostForce.current = Math.max(boostForce.current - boostDecayRate * delta, 0);
      
      // Apply the remaining boost force
      if (boostForce.current > 0) {
        body.current.applyImpulse(
          {
            x: forwardDirection.x * boostForce.current * delta,
            y: 0,
            z: forwardDirection.z * boostForce.current * delta,
          },
          true
        );
      }
      
      // If boost force is completely gone, clean up
      if (boostForce.current === 0) {
        // Only reset camera if not in post-boost phase
        if (!isPostBoost) {
          targetZPosition = 8;
        }
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

    // Dynamic FOV - more gradual changes
    const targetFOV = isBoosting ? BOOST_FOV : 
                     Math.abs(steeringAngle) > 0.2 ? TURN_FOV :
                     BASE_FOV;
    cam.current.fov += (targetFOV - cam.current.fov) * 0.05;
    cam.current.updateProjectionMatrix();

    // Camera tilt during turns - more subtle
    const tiltAmount = steeringAngle * CAMERA_TILT;
    cam.current.rotation.z = -tiltAmount;

    // RESTORE VELOCITY-BASED WALL DETECTION as the main method
    // This is used now that we've reverted to simpler collision detection for ground
    if (!hasCollided.current && wallCollisionRecovery <= 0) {
      const speedRatio = actualSpeed / (Math.abs(currentSpeed) + 0.01); // Avoid division by zero
      const isAgainstWall = (speedRatio < 0.6 && Math.abs(currentSpeed) > 5) || 
                           (Math.abs(actualSpeed) < 0.8 && Math.abs(currentSpeed) > 6);
      
      if (isAgainstWall) {
        if (DEBUG) console.log("Wall collision detected!");
        const currentTime = Date.now();
        if (currentTime - lastCollisionTime > 400) { // Don't process if we collided recently
          setLastCollisionTime(currentTime);
          hasCollided.current = true;
          
          // Apply bounce-back force
          const bumpForce = 25;
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
        player: true
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
    player.setState("turboColor", fireColor);
    player.setState("scale", scale);
    player.setState("bananas", bananas);
  });

  // Function to handle wall collisions - now only used for reference
  const handleWallCollision = () => {
    // Wall collision is now handled by the velocity-based detection
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
      >
        <BallCollider
          args={[0.5]}
          mass={3}
          onCollisionEnter={({ other }) => {
            if (DEBUG) console.log("Ground collision detected");
            isOnFloor.current = true;
            setIsOnGround(true);
            
            // Don't affect speed when colliding with the ground
            // Only play landing sound if we were jumping
            if (jumpForce.current > 0) {
              landingSound.current.play();
            }
          }}
          onCollisionExit={({ other }) => {
            if (DEBUG) console.log("Leaving ground");
            isOnFloor.current = false;
            setIsOnGround(false);
          }}
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
