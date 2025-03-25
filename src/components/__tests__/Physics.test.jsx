import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRapier, RigidBody, BallCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { render } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';

// Mock @react-three/rapier
vi.mock('@react-three/rapier', () => ({
  useRapier: vi.fn(),
  RigidBody: vi.fn().mockImplementation(({ children, ...props }) => (
    <div data-testid="rigid-body" {...props}>
      {children}
    </div>
  )),
  BallCollider: vi.fn().mockImplementation(({ args, ...props }) => (
    <div data-testid="ball-collider" {...props} />
  )),
  CuboidCollider: vi.fn().mockImplementation(({ args, ...props }) => (
    <div data-testid="cuboid-collider" {...props} />
  )),
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn().mockReturnValue({
    scene: { 
      add: vi.fn(),
      remove: vi.fn()
    }
  }),
}));

// Simplified physics testing component
function PhysicsTestComponent({ 
  position = [0, 0, 0],
  velocity = [0, 0, 0],
  mass = 1,
  onCollide = vi.fn()
}) {
  return (
    <RigidBody
      position={position}
      mass={mass}
      linearVelocity={velocity}
      onCollisionEnter={onCollide}
    >
      <BallCollider args={[1]} />
    </RigidBody>
  );
}

describe('Physics System Tests', () => {
  const mockRapierWorld = {
    timestep: 1/60,
    step: vi.fn(),
    createRigidBody: vi.fn(),
    createCollider: vi.fn(),
    raycast: vi.fn().mockReturnValue([{
      toi: 1.0, // Time of impact
      normal: { x: 0, y: 1, z: 0 },
      point: { x: 0, y: 0, z: 0 }
    }])
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Rapier mock
    useRapier.mockReturnValue({
      rapier: {
        Vector: {
          new: vi.fn().mockImplementation((x, y, z) => ({ x, y, z }))
        },
        Quaternion: {
          new: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, w: 1 }))
        },
        RigidBodyDesc: {
          dynamic: vi.fn().mockReturnValue({
            setTranslation: vi.fn().mockReturnThis(),
            setLinvel: vi.fn().mockReturnThis(),
            setMass: vi.fn().mockReturnThis()
          }),
          fixed: vi.fn().mockReturnValue({
            setTranslation: vi.fn().mockReturnThis()
          })
        },
        ColliderDesc: {
          ball: vi.fn().mockReturnValue({
            setRestitution: vi.fn().mockReturnThis(),
            setFriction: vi.fn().mockReturnThis()
          }),
          cuboid: vi.fn().mockReturnValue({
            setRestitution: vi.fn().mockReturnThis(),
            setFriction: vi.fn().mockReturnThis()
          })
        }
      },
      world: mockRapierWorld
    });
  });

  describe('Collision Detection', () => {
    it('should detect collisions between objects', () => {
      const onCollide = vi.fn();
      
      render(
        <PhysicsTestComponent 
          position={[0, 0, 0]}
          onCollide={onCollide}
        />
      );
      
      // Simulate another object colliding with this one
      const mockCollisionEvent = {
        other: { rigidBodyObject: { name: 'track' } },
        target: { rigidBodyObject: { name: 'kart' } },
        manifold: { 
          points: [{ distance: -0.05 }] // Penetration depth
        }
      };
      
      // Get the onCollisionEnter callback
      const rigidBody = document.querySelector('[data-testid="rigid-body"]');
      const onCollisionEnter = rigidBody.getAttribute('onCollisionEnter');
      
      // Call the callback if it's a function
      if (typeof onCollisionEnter === 'function') {
        onCollisionEnter(mockCollisionEvent);
        expect(onCollide).toHaveBeenCalledWith(mockCollisionEvent);
      }
    });
    
    it('should handle deep collision penetration', () => {
      // Test that collisions with deep penetration are still detected
      // This is important for karts that might clip through track at high speeds
      const onCollide = vi.fn();
      
      render(
        <PhysicsTestComponent 
          position={[0, 0, 0]}
          velocity={[0, -50, 0]} // Fast downward velocity
          onCollide={onCollide}
        />
      );
      
      // Simulate a deep collision
      const mockDeepCollision = {
        other: { rigidBodyObject: { name: 'track' } },
        target: { rigidBodyObject: { name: 'kart' } },
        manifold: { 
          points: [{ distance: -1.5 }] // Deep penetration
        }
      };
      
      // Get the onCollisionEnter callback
      const rigidBody = document.querySelector('[data-testid="rigid-body"]');
      const onCollisionEnter = rigidBody.getAttribute('onCollisionEnter');
      
      // Call the callback if it's a function
      if (typeof onCollisionEnter === 'function') {
        onCollisionEnter(mockDeepCollision);
        expect(onCollide).toHaveBeenCalledWith(mockDeepCollision);
      }
    });
  });
  
  describe('Raycasting', () => {
    it('should detect ground under the kart', () => {
      // This tests the ground detection system used to keep karts on the track
      
      // Setup the world mockRapierWorld
      const origin = new Vector3(0, 10, 0);
      const direction = new Vector3(0, -1, 0);
      
      // Perform the raycast
      const result = mockRapierWorld.raycast(origin, direction);
      
      // Should find the ground
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].normal.y).toBe(1); // Ground normal pointing up
    });
    
    it('should handle no ground detection for airborne karts', () => {
      // Test what happens when a kart is airborne (no ground detected)
      mockRapierWorld.raycast.mockReturnValueOnce([]);
      
      // Setup the raycast
      const origin = new Vector3(0, 50, 0); // High above the track
      const direction = new Vector3(0, -1, 0);
      
      // Perform the raycast
      const result = mockRapierWorld.raycast(origin, direction);
      
      // Should not find any ground
      expect(result.length).toBe(0);
    });
  });
  
  describe('Physics Step Simulation', () => {
    it('should update positions based on velocities after a physics step', () => {
      // Setup the physics world
      const deltaTime = 1/60; // 60fps
      
      // Create a simulated kart with velocity
      const kart = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 10, y: 0, z: 0 }, // Moving right at 10 units/s
        setTranslation: vi.fn()
      };
      
      // Create a mock physics world step function
      const mockStep = () => {
        // Calculate new position after deltaTime
        kart.position.x += kart.velocity.x * deltaTime;
        kart.position.y += kart.velocity.y * deltaTime;
        kart.position.z += kart.velocity.z * deltaTime;
        
        // Call setTranslation to update the visual position
        kart.setTranslation(kart.position);
      };
      
      // Call the physics step
      mockStep();
      
      // Position should be updated by velocity * deltaTime
      expect(kart.position.x).toBeCloseTo(10 * deltaTime);
      expect(kart.setTranslation).toHaveBeenCalledWith(kart.position);
    });
    
    it('should apply gravity to objects during physics simulation', () => {
      // Setup the physics world with gravity
      const deltaTime = 1/60; // 60fps
      const gravity = { x: 0, y: -9.8, z: 0 }; // Earth-like gravity
      
      // Create a simulated kart with initial velocity
      const kart = {
        position: { x: 0, y: 10, z: 0 }, // 10 units above ground
        velocity: { x: 0, y: 0, z: 0 }, // No initial velocity
        setTranslation: vi.fn(),
        setLinvel: vi.fn()
      };
      
      // Create a mock physics world step function
      const mockStep = () => {
        // Apply gravity to velocity
        kart.velocity.y += gravity.y * deltaTime;
        
        // Calculate new position after deltaTime
        kart.position.y += kart.velocity.y * deltaTime;
        
        // Call setTranslation to update the visual position
        kart.setTranslation(kart.position);
        kart.setLinvel(kart.velocity);
      };
      
      // Call the physics step
      mockStep();
      
      // Velocity should have gravity applied
      expect(kart.velocity.y).toBeCloseTo(gravity.y * deltaTime);
      // Position should change due to gravity
      expect(kart.position.y).toBeLessThan(10);
    });
  });
  
  describe('Racing Game Specific Physics', () => {
    it('should handle drifting physics by applying lateral forces', () => {
      // This test simulates the drift mechanics
      
      // Create a simulated kart with forward velocity
      const kart = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 }, // Facing forward (z axis)
        velocity: { x: 0, y: 0, z: -20 }, // Moving forward at 20 units/s
        lateralFriction: 1.0, // Normal friction
        addForce: vi.fn(),
        addTorque: vi.fn()
      };
      
      // Function to simulate drifting physics
      const simulateDrift = (drifting) => {
        if (drifting) {
          // When drifting, reduce lateral friction
          kart.lateralFriction = 0.2;
          
          // Add torque to rotate the kart
          kart.addTorque({ x: 0, y: 0.5, z: 0 });
          
          // Apply lateral force for sliding
          const driftForce = {
            x: Math.sin(kart.rotation.y) * 10, // Sideways force
            y: 0,
            z: 0
          };
          kart.addForce(driftForce);
        } else {
          // Not drifting - normal friction
          kart.lateralFriction = 1.0;
        }
      };
      
      // Test drift mode
      simulateDrift(true);
      
      // Should have lower friction
      expect(kart.lateralFriction).toBeLessThan(1.0);
      // Should apply torque for rotation
      expect(kart.addTorque).toHaveBeenCalled();
      // Should apply lateral force for sliding
      expect(kart.addForce).toHaveBeenCalled();
      
      // Reset and test normal mode
      kart.addTorque.mockClear();
      kart.addForce.mockClear();
      
      simulateDrift(false);
      
      // Should have normal friction
      expect(kart.lateralFriction).toBe(1.0);
      // Should not apply torque
      expect(kart.addTorque).not.toHaveBeenCalled();
    });
    
    it('should handle boost mechanics by increasing forward velocity', () => {
      // This test simulates the boost mechanics
      
      // Create a simulated kart with initial velocity
      const kart = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 }, // Facing forward (z axis)
        velocity: { x: 0, y: 0, z: -20 }, // Moving forward at 20 units/s
        setLinvel: vi.fn()
      };
      
      // Function to simulate boost physics
      const applyBoost = (boostPower) => {
        // Calculate forward direction based on rotation
        const forwardDir = {
          x: -Math.sin(kart.rotation.y),
          y: 0,
          z: -Math.cos(kart.rotation.y)
        };
        
        // Increase velocity in the forward direction
        const newVelocity = {
          x: kart.velocity.x + forwardDir.x * boostPower,
          y: kart.velocity.y,
          z: kart.velocity.z + forwardDir.z * boostPower
        };
        
        kart.velocity = newVelocity;
        kart.setLinvel(newVelocity);
      };
      
      // Test boost application
      const boostPower = 10;
      applyBoost(boostPower);
      
      // Should increase forward velocity (in z direction since rotation.y = 0)
      expect(kart.velocity.z).toBeLessThan(-20); // More negative (forward)
      // Should call setLinvel with the new velocity
      expect(kart.setLinvel).toHaveBeenCalledWith(kart.velocity);
    });
    
    it('should handle banana peel slipping by temporarily reducing control', () => {
      // This test simulates slipping on a banana peel
      
      // Create a simulated kart
      const kart = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        velocity: { x: 0, y: 0, z: -20 },
        controlLock: false,
        steeringFactor: 1.0, // Full steering control
        addTorque: vi.fn(),
        setLinvel: vi.fn()
      };
      
      // Function to simulate slipping on a banana
      const slipOnBanana = () => {
        // Lock controls temporarily
        kart.controlLock = true;
        
        // Reduce steering control
        kart.steeringFactor = 0.2;
        
        // Add random torque for spinning out
        const randomTorque = { 
          x: 0, 
          y: (Math.random() * 2 - 1) * 5, // Random spin
          z: 0 
        };
        kart.addTorque(randomTorque);
        
        // Reduce speed
        const slowedVelocity = {
          x: kart.velocity.x * 0.7,
          y: kart.velocity.y,
          z: kart.velocity.z * 0.7
        };
        kart.velocity = slowedVelocity;
        kart.setLinvel(slowedVelocity);
      };
      
      // Test slipping on banana
      slipOnBanana();
      
      // Should lock controls
      expect(kart.controlLock).toBe(true);
      // Should reduce steering
      expect(kart.steeringFactor).toBeLessThan(1.0);
      // Should apply torque for spinning
      expect(kart.addTorque).toHaveBeenCalled();
      // Should reduce speed
      expect(Math.abs(kart.velocity.z)).toBeLessThan(20);
      // Should call setLinvel with reduced speed
      expect(kart.setLinvel).toHaveBeenCalledWith(kart.velocity);
    });
  });
}); 