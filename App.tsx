
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, MissionData, Position, Entity, Particle, Projectile, Stratagem, StratagemType } from './types';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    WORLD_SIZE_X,
    WORLD_SIZE_Y,
    GROUND_Y_START,
    CAMERA_LERP, 
    HELLDIVER_SPEED_X,
    HELLDIVER_SPEED_Y,
    JUMP_FORCE,
    GRAVITY,
    STRATAGEMS,
    COLORS
} from './constants';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('BRIEFING');
    const [mission] = useState<MissionData>({
        planetName: "Malevelon Creek",
        sector: "Severin Sector",
        description: "The automatons have established deep-range surveillance outposts. Wipe them out to preserve Democracy.",
        objective: "Destroy Research Station",
        hazardLevel: 7
    });
    const [isLoading] = useState(false);
    
    // State-based stratagems for cooldown tracking
    const [stratagems, setStratagems] = useState<Stratagem[]>(STRATAGEMS);

    const bulletsRef = useRef(150);
    const grenadesRef = useRef(4);
    const [ammo, setAmmo] = useState({ bullets: 150, grenades: 4 });
    const [isMobile] = useState(() => navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(null);
    const keys = useRef<Set<string>>(new Set());
    const mousePos = useRef<Position>({ x: 0, y: 0 });
    const playerFacing = useRef<number>(1);
    const aimAngle = useRef<number>(0);
    const screenShake = useRef<number>(0);
    
    // Engine State
    const player = useRef<Entity & { depth: number, vy: number, isJumping: boolean }>({
        id: 'player',
        pos: { x: 400, y: 0 }, 
        depth: 120,
        vy: 0,
        isJumping: false,
        type: 'HELLDIVER',
        health: 100,
        maxHealth: 100,
        angle: 0
    });

    const enemies = useRef<(Entity & { depth: number })[]>([]);
    const projectiles = useRef<Projectile[]>([]);
    const particles = useRef<(Particle & { depth: number, vy?: number })[]>([]);
    const cameraX = useRef<number>(0);
    
    const [stratagemInput, setStratagemInput] = useState<string[]>([]);
    const [currentMatchedStratagem, setCurrentMatchedStratagem] = useState<Stratagem | null>(null);
    const [activeStratagemToThrow, setActiveStratagemToThrow] = useState<Stratagem | null>(null);
    const [isStratagemMenuOpen, setIsStratagemMenuOpen] = useState(false);

    const dropPodAltitude = useRef<number>(1000);


    const startDeployment = () => {
        setGameState('DROPPING');
        dropPodAltitude.current = 1000;
        player.current.pos.x = 400;
        player.current.depth = 120;
        player.current.pos.y = 0;
        player.current.vy = 0;
        player.current.isJumping = false;
        setActiveStratagemToThrow(null);
        
        enemies.current = Array.from({ length: 15 }, (_, i) => ({
            id: `bug-${i}`,
            pos: { x: 1000 + Math.random() * 3000, y: 0 },
            depth: Math.random() * WORLD_SIZE_Y,
            type: 'BUG',
            health: 50,
            maxHealth: 50,
            angle: 0
        }));
    };

    const triggerExplosion = (x: number, depth: number, power: number = 1.0, colorOverride?: string) => {
        screenShake.current = Math.max(screenShake.current, 10 * power);
        for (let i = 0; i < 40 * power; i++) {
            particles.current.push({
                x, y: 0, depth: depth + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 15 * power,
                vy: (Math.random() - 1) * 12 * power, 
                life: 1, maxLife: Math.random() * 40 + 20,
                color: colorOverride || (Math.random() > 0.4 ? '#ff6600' : '#ffff00'),
                size: Math.random() * 6 + 2
            });
        }
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        keys.current.add(key);
        
        if (key === 'CONTROL') {
            e.preventDefault();
            setIsStratagemMenuOpen(true);
            setStratagemInput([]);
        }

        if (key === ' ' && !player.current.isJumping && gameState === 'PLAYING') {
            player.current.vy = JUMP_FORCE;
            player.current.isJumping = true;
        }

        if (isStratagemMenuOpen || e.ctrlKey) {
            e.preventDefault();
            let input = '';
            if (key === 'ARROWUP') input = 'UP';
            if (key === 'ARROWDOWN') input = 'DOWN';
            if (key === 'ARROWLEFT') input = 'LEFT';
            if (key === 'ARROWRIGHT') input = 'RIGHT';

            if (input) {
                setStratagemInput(prev => {
                    const nextInput = [...prev, input];
                    const matched = stratagems.find(s => s.code.join(',') === nextInput.join(','));
                    
                    if (matched) {
                        const now = Date.now();
                        if (now - matched.lastUsed < matched.cooldown) return [];

                        setCurrentMatchedStratagem(matched);
                        setTimeout(() => {
                            setStratagemInput([]);
                            setCurrentMatchedStratagem(null);
                            setIsStratagemMenuOpen(false);
                            setActiveStratagemToThrow(matched);
                        }, 400);
                        return nextInput;
                    } 
                    const isValidPrefix = stratagems.some(s => s.code.slice(0, nextInput.length).join(',') === nextInput.join(','));
                    return isValidPrefix ? nextInput : [];
                });
            }
        }
    }, [isStratagemMenuOpen, gameState, stratagems]);

    const mobileStratagemDir = useCallback((dir: string) => {
        setStratagemInput(prev => {
            const nextInput = [...prev, dir];
            const matched = stratagems.find(s => s.code.join(',') === nextInput.join(','));
            if (matched) {
                const now = Date.now();
                if (now - matched.lastUsed < matched.cooldown) return [];
                setCurrentMatchedStratagem(matched);
                setTimeout(() => {
                    setStratagemInput([]);
                    setCurrentMatchedStratagem(null);
                    setIsStratagemMenuOpen(false);
                    setActiveStratagemToThrow(matched);
                }, 400);
                return nextInput;
            }
            const isValidPrefix = stratagems.some(s => s.code.slice(0, nextInput.length).join(',') === nextInput.join(','));
            return isValidPrefix ? nextInput : [];
        });
    }, [stratagems]);

    const toggleStratagemMenu = useCallback(() => {
        setIsStratagemMenuOpen(prev => {
            if (!prev) setStratagemInput([]);
            return !prev;
        });
    }, []);

    const fireMobile = useCallback(() => {
        if (gameState !== 'PLAYING' || isStratagemMenuOpen) return;
        if (bulletsRef.current <= 0) return;
        bulletsRef.current--;
        setAmmo(prev => ({ ...prev, bullets: bulletsRef.current }));
        projectiles.current.push({
            pos: { x: player.current.pos.x, y: player.current.pos.y - 35 },
            depth: player.current.depth,
            velocity: { x: 20 * playerFacing.current, y: 0 },
            type: 'BULLET',
            owner: 'PLAYER',
            damage: 20,
            life: 60
        });
    }, [gameState, isStratagemMenuOpen]);

    const grenadeMobile = useCallback(() => {
        if (gameState !== 'PLAYING' || isStratagemMenuOpen) return;
        if (grenadesRef.current <= 0) return;
        grenadesRef.current--;
        setAmmo(prev => ({ ...prev, grenades: grenadesRef.current }));
        projectiles.current.push({
            pos: { x: player.current.pos.x, y: player.current.pos.y - 35 },
            depth: player.current.depth,
            velocity: { x: 12 * playerFacing.current, y: -6 },
            vy: -6,
            type: 'GRENADE',
            owner: 'PLAYER',
            damage: 100,
            life: 120
        });
    }, [gameState, isStratagemMenuOpen]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        keys.current.delete(key);
        if (key === 'CONTROL') {
            setIsStratagemMenuOpen(false);
            setStratagemInput([]);
        }
    }, []);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (gameState !== 'PLAYING' || isStratagemMenuOpen) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        const muzzleX = player.current.pos.x - cameraX.current;
        const muzzleY = GROUND_Y_START + player.current.depth + player.current.pos.y - 35;
        
        const dx = targetX - muzzleX;
        const dy = targetY - muzzleY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);

        if (e.button === 0) { // Left Click
            if (activeStratagemToThrow) {
                const force = Math.min(dist * 0.05, 12);
                projectiles.current.push({
                    pos: { x: player.current.pos.x, y: player.current.pos.y - 35 },
                    depth: player.current.depth,
                    velocity: { x: force * Math.cos(angle), y: force * Math.sin(angle) },
                    vy: force * Math.sin(angle),
                    type: 'BEACON',
                    owner: 'PLAYER',
                    damage: 0,
                    life: 120,
                    stratagemType: activeStratagemToThrow
                });
                setStratagems(prev => prev.map(s => 
                    s.name === activeStratagemToThrow.name ? { ...s, lastUsed: Date.now() } : s
                ));
                setActiveStratagemToThrow(null);
            } else if (bulletsRef.current > 0) {
                bulletsRef.current--;
                setAmmo(prev => ({ ...prev, bullets: bulletsRef.current }));
                projectiles.current.push({
                    pos: { x: player.current.pos.x, y: player.current.pos.y - 35 },
                    depth: player.current.depth,
                    velocity: { x: 20 * Math.cos(angle), y: 20 * Math.sin(angle) },
                    type: 'BULLET',
                    owner: 'PLAYER',
                    damage: 20,
                    life: 60
                });
            }
        } else if (e.button === 2 && grenadesRef.current > 0) { // Right Click
            grenadesRef.current--;
            setAmmo(prev => ({ ...prev, grenades: grenadesRef.current }));
            const force = Math.min(dist * 0.05, 15);
            projectiles.current.push({
                pos: { x: player.current.pos.x, y: player.current.pos.y - 35 },
                depth: player.current.depth,
                velocity: { x: force * Math.cos(angle), y: force * Math.sin(angle) },
                vy: force * Math.sin(angle),
                type: 'GRENADE',
                owner: 'PLAYER',
                damage: 100,
                life: 120
            });
        }
    }, [gameState, isStratagemMenuOpen, activeStratagemToThrow]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }, []);

    const update = useCallback(() => {
        if (gameState === 'DROPPING') {
            dropPodAltitude.current -= 25;
            if (dropPodAltitude.current <= 0) {
                dropPodAltitude.current = 0;
                setGameState('PLAYING');
                triggerExplosion(player.current.pos.x, player.current.depth, 1.5);
            }
        }

        if (gameState === 'PLAYING') {
            if (!isStratagemMenuOpen) {
                if (keys.current.has('W')) player.current.depth = Math.max(0, player.current.depth - HELLDIVER_SPEED_Y);
                if (keys.current.has('S')) player.current.depth = Math.min(WORLD_SIZE_Y, player.current.depth + HELLDIVER_SPEED_Y);
                if (keys.current.has('A')) player.current.pos.x = Math.max(0, player.current.pos.x - HELLDIVER_SPEED_X);
                if (keys.current.has('D')) player.current.pos.x = Math.min(WORLD_SIZE_X, player.current.pos.x + HELLDIVER_SPEED_X);
            }

            const playerScreenX = player.current.pos.x - cameraX.current;
            const playerScreenY = GROUND_Y_START + player.current.depth + player.current.pos.y - 35;
            const dx = mousePos.current.x - playerScreenX;
            const dy = mousePos.current.y - playerScreenY;
            aimAngle.current = Math.atan2(dy, dx);
            playerFacing.current = dx >= 0 ? 1 : -1;

            if (player.current.isJumping) {
                player.current.vy += GRAVITY;
                player.current.pos.y += player.current.vy;
                if (player.current.pos.y >= 0) {
                    player.current.pos.y = 0;
                    player.current.vy = 0;
                    player.current.isJumping = false;
                }
            }

            cameraX.current += (player.current.pos.x - cameraX.current - 400) * CAMERA_LERP;

            projectiles.current.forEach(p => {
                if (p.type === 'GRENADE' || p.type === 'BEACON') {
                    p.pos.x += p.velocity.x;
                    p.vy = (p.vy || 0) + GRAVITY;
                    p.pos.y += p.vy;
                    if (p.pos.y >= 0) {
                        p.pos.y = 0;
                        p.vy = -(p.vy * (p.type === 'BEACON' ? 0.2 : 0.4));
                        p.velocity.x *= 0.8;
                    }

                    if (p.life === 1) {
                        if (p.type === 'BEACON' && p.stratagemType) {
                            const stype = p.stratagemType.name;
                            if (stype === 'Eagle Strafing Run') {
                                for(let i=0; i<8; i++) {
                                    setTimeout(() => triggerExplosion(p.pos.x + (i-3)*100, p.depth, 1.2), i * 100);
                                    enemies.current.forEach(bug => {
                                        const dX = Math.abs(p.pos.x + (i-3)*100 - bug.pos.x);
                                        if (dX < 60) bug.health -= 100;
                                    });
                                }
                            } else if (stype === 'Orbital Precision Strike') {
                                triggerExplosion(p.pos.x, p.depth, 4.0, COLORS.SUPER_EARTH_BLUE);
                                enemies.current.forEach(bug => {
                                    const dX = Math.abs(p.pos.x - bug.pos.x);
                                    if (dX < 200) bug.health -= 400;
                                });
                            } else {
                                triggerExplosion(p.pos.x, p.depth, 2.5, COLORS.SUPER_EARTH_BLUE);
                            }
                        } else if (p.type === 'GRENADE') {
                            triggerExplosion(p.pos.x, p.depth, 2.0);
                            enemies.current.forEach(bug => {
                                const dX = Math.abs(p.pos.x - bug.pos.x);
                                if (dX < 120) bug.health -= 150;
                            });
                        }
                    }
                } else {
                    p.pos.x += p.velocity.x;
                    p.pos.y += p.velocity.y;
                }
                p.life--;
                
                if (p.type === 'BULLET') {
                    enemies.current.forEach(bug => {
                        const hitX = Math.abs(p.pos.x - bug.pos.x) < 30;
                        const screenP = GROUND_Y_START + p.depth + p.pos.y;
                        const screenB = GROUND_Y_START + bug.depth - 15;
                        const hitY = Math.abs(screenP - screenB) < 30;
                        if (hitX && hitY) {
                            bug.health -= p.damage;
                            p.life = 0;
                            triggerExplosion(bug.pos.x, bug.depth, 0.2);
                        }
                    });
                }
            });

            projectiles.current = projectiles.current.filter(p => p.life > 0);
            enemies.current = enemies.current.filter(e => e.health > 0);
            
            // AI MOVEMENT PAUSED PER USER REQUEST
            /*
            enemies.current.forEach(bug => {
                const dx = player.current.pos.x - bug.pos.x;
                const dd = player.current.depth - bug.depth;
                const dist = Math.sqrt(dx*dx + dd*dd);
                if (dist > 50) {
                    bug.pos.x += Math.sign(dx) * 1.5;
                    bug.depth += Math.sign(dd) * 0.5;
                }
            });
            */

            enemies.current.forEach(bug => {
                const dX = Math.abs(player.current.pos.x - bug.pos.x);
                const dDepth = Math.abs(player.current.depth - bug.depth);
                if (dX < 40 && dDepth < 30) {
                    player.current.health -= 0.3;
                    screenShake.current = Math.max(screenShake.current, 3);
                }
            });

            if (player.current.health <= 0) setGameState('FAILED');
            if (enemies.current.length === 0 && gameState === 'PLAYING') setGameState('SUCCESS');
        }

        particles.current.forEach(p => {
            p.x += p.vx;
            p.y += (p.vy || 0);
            if (p.vy !== undefined) p.vy += 0.4;
            p.life -= 0.025;
        });
        particles.current = particles.current.filter(p => p.life > 0);

        if (screenShake.current > 0) screenShake.current *= 0.9;

        render();
        requestRef.current = requestAnimationFrame(update);
    }, [gameState, isStratagemMenuOpen, activeStratagemToThrow, stratagems]);

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = COLORS.SKY_DARK;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const groundGradient = ctx.createLinearGradient(0, GROUND_Y_START, 0, CANVAS_HEIGHT);
        groundGradient.addColorStop(0, COLORS.GROUND_DIRT);
        groundGradient.addColorStop(1, '#000');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, GROUND_Y_START, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y_START);

        ctx.save();
        if (screenShake.current > 0.5) {
            ctx.translate((Math.random()-0.5) * screenShake.current, (Math.random()-0.5) * screenShake.current);
        }

        if (activeStratagemToThrow && gameState === 'PLAYING') {
            const startX = player.current.pos.x - cameraX.current;
            const startY = GROUND_Y_START + player.current.depth + player.current.pos.y - 35;
            const dx = mousePos.current.x - startX;
            const dy = mousePos.current.y - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = Math.min(dist * 0.05, 12);
            const angle = Math.atan2(dy, dx);
            
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = `rgba(0, 204, 255, ${0.3 + Math.sin(Date.now()/100)*0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            let tx = 0, ty = 0, tvy = force * Math.sin(angle);
            const tvx = force * Math.cos(angle);
            for(let i=0; i<40; i++) {
                ctx.lineTo(startX + tx, startY + ty);
                tx += tvx * 1.5;
                tvy += GRAVITY * 1.5;
                ty += tvy * 1.5;
                if (startY + ty > GROUND_Y_START + player.current.depth) break;
            }
            ctx.stroke();
            ctx.setLineDash([]);
            const pulse = 10 + Math.sin(Date.now()/200)*5;
            ctx.strokeStyle = COLORS.SUPER_EARTH_BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(startX + tx, GROUND_Y_START + player.current.depth, pulse, pulse/2.5, 0, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(startX + tx, GROUND_Y_START + player.current.depth, pulse+5, (pulse+5)/2.5, 0, 0, Math.PI*2); ctx.stroke();
        }

        const renderQueue: any[] = [];
        if (gameState !== 'BRIEFING') {
            renderQueue.push({ 
                depth: player.current.depth, 
                type: 'PLAYER', 
                data: player.current,
                altitude: gameState === 'DROPPING' ? dropPodAltitude.current : 0
            });
        }
        enemies.current.forEach(e => renderQueue.push({ depth: e.depth, type: 'ENEMY', data: e }));
        particles.current.forEach(p => renderQueue.push({ depth: p.depth, type: 'PARTICLE', data: p }));
        projectiles.current.forEach(p => renderQueue.push({ depth: p.depth, type: 'PROJECTILE', data: p }));

        renderQueue.sort((a, b) => a.depth - b.depth);

        renderQueue.forEach(item => {
            const screenX = item.data.pos?.x - cameraX.current || item.data.x - cameraX.current;
            const screenY = GROUND_Y_START + item.depth + (item.data.pos?.y || item.data.y || 0);

            if (item.type === 'PLAYER') {
                const px = screenX;
                const py = GROUND_Y_START + item.depth; 
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath(); ctx.ellipse(px, py, 20, 8, 0, 0, Math.PI*2); ctx.fill();

                ctx.save();
                ctx.translate(px, py + item.data.pos.y - (item.altitude || 0));
                
                if (item.altitude > 0) {
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.lineTo(10, -60); ctx.lineTo(-10, -60); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = COLORS.SUPER_EARTH_YELLOW;
                    ctx.fillRect(-2, -55, 4, 15);
                } else {
                    ctx.scale(playerFacing.current, 1);
                    const capePulse = Math.sin(Date.now() / 200) * 4;
                    ctx.fillStyle = '#0a0a0a';
                    ctx.beginPath(); ctx.moveTo(-5, -35); ctx.quadraticCurveTo(-22 - Math.abs(capePulse), -22, -8 + capePulse, 0); ctx.lineTo(0, 0); ctx.fill();
                    ctx.strokeStyle = COLORS.SUPER_EARTH_YELLOW; ctx.lineWidth = 1; ctx.stroke();
                    ctx.fillStyle = '#111'; ctx.fillRect(-10, -42, 18, 42); 
                    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-8, -40, 14, 16); 
                    if (activeStratagemToThrow) {
                        ctx.fillStyle = '#333';
                        ctx.save(); ctx.rotate(Math.PI/4); ctx.fillRect(-15, -30, 25, 6); ctx.restore();
                    }
                    ctx.save();
                    ctx.translate(4, -48);
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = COLORS.SUPER_EARTH_YELLOW; ctx.fillRect(4, -2, 4, 3); 
                    ctx.restore();
                    ctx.save();
                    ctx.translate(0, -32); 
                    let rAngle = aimAngle.current;
                    if (playerFacing.current === -1) rAngle = Math.PI - rAngle;
                    ctx.rotate(rAngle);
                    if (activeStratagemToThrow) {
                        ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -15); ctx.stroke();
                        const glow = 5 + Math.sin(Date.now()/100)*3;
                        ctx.fillStyle = COLORS.SUPER_EARTH_BLUE;
                        ctx.shadowBlur = glow; ctx.shadowColor = COLORS.SUPER_EARTH_BLUE;
                        ctx.beginPath(); ctx.arc(18, -18, 6, 0, Math.PI*2); ctx.fill();
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = '#333'; ctx.fillRect(0, -3, 35, 7); 
                        ctx.fillStyle = '#111'; ctx.fillRect(30, -1, 8, 3); 
                        ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke();
                    }
                    ctx.restore();
                }
                ctx.restore();
            }

            if (item.type === 'ENEMY') {
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.fillStyle = '#1e2d24';
                ctx.beginPath(); ctx.ellipse(0, -15, 22, 13, 0, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = COLORS.TERMINID_GREEN; ctx.lineWidth = 2;
                for(let i=0; i<3; i++) { ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-24 + i*16, 5); ctx.stroke(); }
                ctx.restore();
            }

            if (item.type === 'PROJECTILE') {
                ctx.save();
                ctx.translate(screenX, screenY + item.data.pos.y);
                if (item.data.type === 'BEACON') {
                    const bPulse = Math.sin(Date.now()/50)*10;
                    ctx.fillStyle = COLORS.SUPER_EARTH_BLUE;
                    ctx.shadowBlur = 10 + bPulse; ctx.shadowColor = COLORS.SUPER_EARTH_BLUE;
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (item.data.type === 'BULLET') {
                    ctx.fillStyle = COLORS.SUPER_EARTH_YELLOW;
                    ctx.fillRect(0, -1.5, 12, 3);
                } else {
                    ctx.fillStyle = COLORS.GRENADE_GREEN;
                    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                }
                ctx.restore();
            }

            if (item.type === 'PARTICLE') {
                ctx.globalAlpha = item.data.life;
                ctx.fillStyle = item.data.color;
                ctx.fillRect(screenX, screenY + item.data.y, item.data.size, item.data.size);
            }
        });

        projectiles.current.forEach(p => {
            if (p.type === 'BEACON' && p.life < 10 && p.stratagemType?.name === 'Orbital Precision Strike') {
                ctx.fillStyle = `rgba(0, 204, 255, ${1 - p.life/10})`;
                ctx.fillRect(p.pos.x - cameraX.current - 5, 0, 10, CANVAS_HEIGHT);
            }
        });

        ctx.restore();

        if (gameState === 'PLAYING') {
            const cx = mousePos.current.x;
            const cy = mousePos.current.y;
            ctx.strokeStyle = activeStratagemToThrow ? COLORS.SUPER_EARTH_BLUE : COLORS.SUPER_EARTH_YELLOW;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        const preventCtx = (e: MouseEvent) => e.preventDefault();
        window.addEventListener('contextmenu', preventCtx);

        requestRef.current = requestAnimationFrame(update);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('contextmenu', preventCtx);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [update, handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown]);

    return (
        <div className="relative w-screen h-screen bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center cursor-none">
            {gameState === 'BRIEFING' && mission && (
                <div className="z-20 max-w-2xl bg-black/95 border-2 border-[#ffee00] p-8 text-[#ffee00] font-orbitron shadow-[0_0_80px_rgba(255,238,0,0.15)]">
                    <h1 className="text-4xl font-black mb-6 italic tracking-tighter uppercase tracking-[0.1em]">PLANET: {mission.planetName}</h1>
                    <p className="mb-8 text-gray-300 leading-relaxed text-sm italic">{mission.description}</p>
                    <button onClick={startDeployment} className="bg-[#ffee00] text-black px-10 py-4 font-black text-xl hover:bg-white transition-all skew-x-[-12deg]">
                        INITIATE DROP SEQUENCE
                    </button>
                </div>
            )}

            {(gameState === 'FAILED' || gameState === 'SUCCESS') && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-[#ff4444] font-orbitron">
                    <h2 className={`text-6xl font-black mb-12 italic tracking-tighter uppercase tracking-[0.2em] ${gameState === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
                        {gameState === 'FAILED' ? 'REINFORCEMENTS DEPLETED' : 'MISSION ACCOMPLISHED'}
                    </h2>
                    <button onClick={() => window.location.reload()} className="bg-[#ffee00] text-black px-12 py-4 font-black text-2xl skew-x-[-10deg]">REDEPLOY TO ORBIT</button>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center text-[#ffee00] font-orbitron">
                    <div className="text-xl font-bold tracking-[0.3em] animate-pulse italic">ESTABLISHING ENCRYPTED UPLINK...</div>
                </div>
            )}

            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border-y-4 border-[#222]" />

            <div className="absolute bottom-4 left-4 text-[#ffee00]/40 text-[10px] font-orbitron uppercase pointer-events-none tracking-widest">
                {gameState === 'PLAYING' && (
                    activeStratagemToThrow 
                    ? `[HOLDING ${activeStratagemToThrow.name.toUpperCase()}] DEPLOY ASSET AT TARGET LOCATION`
                    : 'WASD: MOVE | CTRL (HOLD): STRATAGEM MENU | L-CLICK: WEAPON | R-CLICK: GRENADE'
                )}
            </div>

            <HUD
                health={player.current.health}
                maxHealth={player.current.maxHealth}
                activeStratagemInput={stratagemInput}
                currentStratagem={currentMatchedStratagem}
                gameState={gameState}
                missionName={mission?.planetName || ''}
                isMenuOpen={isStratagemMenuOpen}
                stratagems={stratagems}
                bullets={{ current: ammo.bullets, max: 150 }}
                grenades={{ current: ammo.grenades, max: 4 }}
            />
            {isMobile && (
                <MobileControls
                    keysRef={keys}
                    isStratagemMode={isStratagemMenuOpen}
                    onStratagemToggle={toggleStratagemMenu}
                    onStratagemDir={mobileStratagemDir}
                    onFire={fireMobile}
                    onGrenade={grenadeMobile}
                />
            )}
        </div>
    );
};

export default App;
