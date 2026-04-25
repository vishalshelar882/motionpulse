/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import { motion } from 'motion/react';
import { LucideArrowRight } from 'lucide-react';
import * as THREE from 'three';

// --- Particle/Wireframe Wave Shader ---

const WaveShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uClick: { value: 0 },
    uIsTop: { value: 0 }, // 0 for floor, 1 for ceiling
  },
  vertexShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uClick;
    uniform float uIsTop;
    varying vec3 vPosition;
    varying float vDist;
    varying float vEdgeFade;

    void main() {
      vPosition = position;
      vec3 pos = position;
      
      // Basic wave animation
      float wave = sin(pos.x * 0.4 + uTime * 1.5) * 0.6;
      wave += cos(pos.z * 0.3 + uTime * 1.2) * 0.4;
      
      // Mouse interaction
      float gridHalfSize = 100.0; // Based on (count * sep) / 2
      float dist = distance(pos.xz, uMouse * gridHalfSize);
      vDist = dist;
      float mouseInfluence = smoothstep(12.0, 0.0, dist) * 2.5;
      
      // Mirror vertically if it's the top wave
      float verticalMultiplier = uIsTop > 0.5 ? -1.0 : 1.0;
      pos.y += (wave + mouseInfluence) * verticalMultiplier;
      
      // Edge fade calculation
      float radialDist = length(pos.xz) / gridHalfSize;
      vEdgeFade = smoothstep(1.0, 0.6, radialDist);
      
      // Click pulse
      float clickWave = sin(dist * 0.5 - uClick * 15.0) * smoothstep(2.5, 0.0, uClick * 0.4);
      pos.y += clickWave * 5.0 * verticalMultiplier;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Point size or line thickness
      gl_PointSize = (220.0 / -mvPosition.z) * (1.1 + mouseInfluence * 0.8);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uIsTop;
    varying vec3 vPosition;
    varying float vDist;
    varying float vEdgeFade;

    vec3 rainbow(float h) {
      return 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));
    }

    void main() {
      float strength;
      if (uIsTop > 0.5) {
        // Wireframe-like look for top: sharper points or different texture
        strength = 1.0 - distance(gl_PointCoord, vec2(0.5)) * 2.0;
        strength = clamp(strength, 0.0, 1.0);
      } else {
        strength = distance(gl_PointCoord, vec2(0.5));
        strength = 1.0 - strength;
        strength = pow(strength, 3.0);
      }

      // Rainbow color mapping
      float colorHue = vPosition.y * 0.1 + vDist * 0.02 + uTime * 0.1;
      vec3 color = rainbow(colorHue);
      
      // Top wave is pure white
      if (uIsTop > 0.5) {
        color = vec3(1.0);
      }
      
      gl_FragColor = vec4(color, strength * 0.8 * vEdgeFade);
    }
  `,
};

function WaveParticles({ isTop = false }: { isTop?: boolean }) {
  const meshRef = useRef<THREE.Points>(null!);
  const { mouse, clock } = useThree();
  const [clickTime, setClickTime] = useState(-10);

  const count = 250;
  const sep = 0.8;
  const positions = useMemo(() => {
    let positions = new Float32Array(count * count * 3);
    for (let x = 0; x < count; x++) {
      for (let z = 0; z < count; z++) {
        let i = (x * count + z) * 3;
        positions[i] = (x - count / 2) * sep;
        positions[i + 1] = 0;
        positions[i + 2] = (z - count / 2) * sep;
      }
    }
    return positions;
  }, [count, sep]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uClick: { value: 0 },
    uIsTop: { value: isTop ? 1.0 : 0.0 },
  }), [isTop]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = t;
      material.uniforms.uMouse.value.lerp(mouse, 0.1);
      material.uniforms.uClick.value = t - clickTime;
    }
  });

  return (
    <points 
      ref={meshRef} 
      position={[0, isTop ? 24 : 0, 0]}
      onClick={(e) => setClickTime(clock.getElapsedTime())}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={WaveShaderMaterial.vertexShader}
        fragmentShader={WaveShaderMaterial.fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  const group = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.mouse.x * 0.08, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.mouse.y * 0.05, 0.05);
  });

  return (
    <group ref={group}>
      <PerspectiveCamera makeDefault position={[0, 12, 25]} fov={50} />
      <fog attach="fog" args={['#000', 15, 60]} />
      <ambientLight intensity={0.2} />
      <WaveParticles />
      <WaveParticles isTop />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1.5} />
    </group>
  );
}

// --- UI Components ---

export default function App() {
  return (
    <div className="relative w-full h-screen font-sans selection:bg-indigo-500 selection:text-white bg-black">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 cursor-pointer">
        <Canvas dpr={[1, 2]}>
          <Scene />
        </Canvas>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-6 text-center pointer-events-none">
        <nav className="absolute top-10 flex items-center justify-center w-full h-24 px-8 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-2 rounded-full bg-black/20 border border-white/5 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div 
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                filter: [
                  'drop-shadow(0 0 5px rgba(22, 163, 74, 0.9)) drop-shadow(0 0 15px rgba(22, 163, 74, 0.6))',
                  'drop-shadow(0 0 8px rgba(22, 163, 74, 1.0)) drop-shadow(0 0 25px rgba(22, 163, 74, 0.8))',
                  'drop-shadow(0 0 5px rgba(22, 163, 74, 0.9)) drop-shadow(0 0 15px rgba(22, 163, 74, 0.6))'
                ]
              }}
              transition={{
                backgroundPosition: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                },
                filter: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              style={{ backgroundSize: '300% auto' }}
              className="text-2xl font-display font-bold tracking-widest transition-all cursor-default bg-clip-text text-transparent bg-gradient-to-r from-lime-400 via-yellow-300 to-emerald-500"
            >
              MOTIONPULSE<span className="text-white">.</span>
            </motion.div>
          </motion.div>
        </nav>

        <main className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <span className="inline-block px-5 py-1.5 mb-8 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full bg-white/5 border border-white/10 text-indigo-400 backdrop-blur-xl">
              Next-Gen 3D Graphics Studio
            </span>
            <h1 className="text-6xl md:text-9xl font-narrow leading-[0.85] mb-12 flex flex-col items-center tracking-wide">
              <span>BEYOND</span>
              <div className="flex gap-1 md:gap-1 relative group">
                {"DIMENSION".split('').map((char, i) => (
                  <motion.span 
                    key={i}
                    className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-cyan-400 to-indigo-600 inline-block"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      y: [0, -20, 0],
                      rotateX: [0, 15, 0],
                    }}
                    transition={{
                      backgroundPosition: {
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      },
                      y: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.1,
                      },
                      rotateX: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.1,
                      }
                    }}
                    style={{ backgroundSize: '300% auto' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            </h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1.5 }}
              className="text-neutral-500 text-sm tracking-[1em] font-narrow mb-8 uppercase"
            >
              Coming Soon
            </motion.p>
            <motion.p 
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ 
                opacity: [0, 1, 0.9, 1],
                filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                textShadow: [
                  '0 0 0px rgba(255, 255, 255, 0)',
                  '0 0 20px rgba(255, 255, 255, 0.4)',
                  '0 0 10px rgba(255, 255, 255, 0.2)',
                  '0 0 20px rgba(255, 255, 255, 0.4)'
                ]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                repeatType: "mirror"
              }}
              className="max-w-xl mx-auto text-xl md:text-3xl font-display font-medium leading-relaxed tracking-[0.3em] uppercase mb-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-100 to-white/50"
            >
              Motion That Moves Minds
            </motion.p>
          </motion.div>
        </main>

        <footer className="absolute bottom-12 flex flex-col items-center gap-6">
          <div className="flex gap-8 text-white/10 text-[9px] tracking-[0.3em] uppercase font-black">
            <span>© 2026 MOTIONPULSE</span>
          </div>
        </footer>
      </div>

      {/* Background radial gradient to smooth edge transitions */}
      <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.9)_90%)]" />
    </div>
  );
}

