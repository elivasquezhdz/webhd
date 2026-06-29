
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Faction, GameState, MissionData, Position, Entity, Particle, Projectile, Stratagem, StratagemType } from './types';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    WORLD_SIZE_X,
    WORLD_SIZE_Y,
    GROUND_Y_START,
    CAMERA_LERP,
    TROOPER_SPEED_X,
    TROOPER_SPEED_Y,
    JUMP_FORCE,
    GRAVITY,
    STRATAGEMS,
    COLORS,
    FACTION_CONFIGS
} from './constants';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';

type EnemyEntity = Entity & { depth: number; lastShot?: number };

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('FACTION_SELECT');
    const [faction, setFaction] = useState<Faction | null>(null);
    const [mission, setMission] = useState<MissionData | null>(null);
    const [stratagems, setStratagems] = useState<Stratagem[]>(STRATAGEMS);
    const [score, setScore] = useState(0);
    const scoreRef = useRef(0);

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

    const player = useRef<Entity & { depth: number; vy: number; isJumping: boolean }>({
        id: 'player',
        pos: { x: 400, y: 0 },
        depth: 120,
        vy: 0,
        isJumping: false,
        type: 'TROOPER',
        health: 100,
        maxHealth: 100,
        angle: 0
    });

    const enemies = useRef<EnemyEntity[]>([]);
    const projectiles = useRef<Projectile[]>([]);
    const particles = useRef<(Particle & { depth: number; vy?: number })[]>([]);
    const cameraX = useRef<number>(0);
    const factionRef = useRef<Faction | null>(null);

    const [stratagemInput, setStratagemInput] = useState<string[]>([]);
    const [currentMatchedStratagem, setCurrentMatchedStratagem] = useState<Stratagem | null>(null);
    const [activeStratagemToThrow, setActiveStratagemToThrow] = useState<Stratagem | null>(null);
    const [isStratagemMenuOpen, setIsStratagemMenuOpen] = useState(false);

    const dropPodAltitude = useRef<number>(1000);

    const selectFaction = (f: Faction) => {
        const cfg = FACTION_CONFIGS[f];
        setFaction(f);
        factionRef.current = f;
        setMission({
            planetName: cfg.planetName,
            sector: cfg.sector,
            description: cfg.missionDesc,
            objective: cfg.objective,
            hazardLevel: cfg.hazardLevel,
        });
        setGameState('BRIEFING');
    };

    const resetGame = () => {
        scoreRef.current = 0;
        setScore(0);
        bulletsRef.current = 150;
        grenadesRef.current = 4;
        setAmmo({ bullets: 150, grenades: 4 });
        enemies.current = [];
        projectiles.current = [];
        particles.current = [];
        player.current.health = 100;
        player.current.pos.x = 400;
        player.current.depth = 120;
        player.current.pos.y = 0;
        player.current.vy = 0;
        player.current.isJumping = false;
        cameraX.current = 0;
        setStratagems(STRATAGEMS.map(s => ({ ...s, lastUsed: 0 })));
        setFaction(null);
        factionRef.current = null;
        setMission(null);
        setActiveStratagemToThrow(null);
        setGameState('FACTION_SELECT');
    };

    const startDeployment = () => {
        const f = factionRef.current;
        if (!f) return;
        const cfg = FACTION_CONFIGS[f];

        scoreRef.current = 0;
        setScore(0);
        bulletsRef.current = 150;
        grenadesRef.current = 4;
        setAmmo({ bullets: 150, grenades: 4 });
        player.current.health = 100;
        player.current.pos.x = 400;
        player.current.depth = 120;
        player.current.pos.y = 0;
        player.current.vy = 0;
        player.current.isJumping = false;
        cameraX.current = 0;
        setStratagems(STRATAGEMS.map(s => ({ ...s, lastUsed: 0 })));
        setActiveStratagemToThrow(null);

        setGameState('DROPPING');
        dropPodAltitude.current = 1000;

        const entityType = f === 'BUGS' ? 'BUG' : f === 'BOTS' ? 'BOT' : 'ZOMBIE';
        enemies.current = Array.from({ length: cfg.enemyCount }, (_, i) => ({
            id: `enemy-${i}`,
            pos: { x: 800 + Math.random() * 3500, y: 0 },
            depth: Math.random() * WORLD_SIZE_Y,
            type: entityType as Entity['type'],
            health: cfg.enemyHealth,
            maxHealth: cfg.enemyHealth,
            angle: 0,
            lastShot: 0,
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

    const getCanvasScale = () => {
        const canvas = canvasRef.current;
        if (!canvas) return { sx: 1, sy: 1 };
        const rect = canvas.getBoundingClientRect();
        return {
            sx: CANVAS_WIDTH / rect.width,
            sy: CANVAS_HEIGHT / rect.height,
        };
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
        const { sx, sy } = getCanvasScale();
        const targetX = (e.clientX - rect.left) * sx;
        const targetY = (e.clientY - rect.top) * sy;
        const muzzleX = player.current.pos.x - cameraX.current;
        const muzzleY = GROUND_Y_START + player.current.depth + player.current.pos.y - 35;
        const dx = targetX - muzzleX;
        const dy = targetY - muzzleY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        if (e.button === 0) {
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
        } else if (e.button === 2 && grenadesRef.current > 0) {
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
            const { sx, sy } = getCanvasScale();
            mousePos.current = {
                x: (e.clientX - rect.left) * sx,
                y: (e.clientY - rect.top) * sy
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
            const f = factionRef.current;
            const cfg = f ? FACTION_CONFIGS[f] : null;

            if (!isStratagemMenuOpen) {
                if (keys.current.has('W')) player.current.depth = Math.max(0, player.current.depth - TROOPER_SPEED_Y);
                if (keys.current.has('S')) player.current.depth = Math.min(WORLD_SIZE_Y, player.current.depth + TROOPER_SPEED_Y);
                if (keys.current.has('A')) player.current.pos.x = Math.max(0, player.current.pos.x - TROOPER_SPEED_X);
                if (keys.current.has('D')) player.current.pos.x = Math.min(WORLD_SIZE_X, player.current.pos.x + TROOPER_SPEED_X);
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

            // Enemy AI movement
            if (cfg) {
                const now = Date.now();
                enemies.current.forEach(enemy => {
                    const edx = player.current.pos.x - enemy.pos.x;
                    const edd = player.current.depth - enemy.depth;
                    const dist = Math.sqrt(edx * edx + edd * edd);
                    if (dist > 40) {
                        enemy.pos.x += Math.sign(edx) * cfg.enemySpeedX;
                        enemy.depth += Math.sign(edd) * cfg.enemySpeedY;
                        enemy.depth = Math.max(0, Math.min(WORLD_SIZE_Y, enemy.depth));
                    }

                    // Bot shooting
                    if (f === 'BOTS' && cfg.canShoot && dist < 700) {
                        if (!enemy.lastShot || now - enemy.lastShot > cfg.shootInterval) {
                            enemy.lastShot = now;
                            const speed = 8;
                            const nd = Math.sqrt(edx * edx + edd * edd) || 1;
                            projectiles.current.push({
                                pos: { x: enemy.pos.x, y: 0 },
                                depth: enemy.depth,
                                velocity: { x: (edx / nd) * speed, y: 0 },
                                owner: 'ENEMY',
                                type: 'ENEMY_BULLET',
                                damage: 15,
                                life: 100
                            });
                        }
                    }
                });
            }

            // Projectile physics
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
                            const sname = p.stratagemType.name;
                            if (sname === 'Airstrike') {
                                for (let i = 0; i < 8; i++) {
                                    setTimeout(() => triggerExplosion(p.pos.x + (i - 3) * 100, p.depth, 1.2), i * 100);
                                    enemies.current.forEach(e => {
                                        if (Math.abs(p.pos.x + (i - 3) * 100 - e.pos.x) < 60) e.health -= 100;
                                    });
                                }
                            } else if (sname === 'Precision Strike') {
                                triggerExplosion(p.pos.x, p.depth, 4.0, COLORS.PRIMARY_BLUE);
                                enemies.current.forEach(e => {
                                    if (Math.abs(p.pos.x - e.pos.x) < 200) e.health -= 400;
                                });
                            } else {
                                triggerExplosion(p.pos.x, p.depth, 2.5, COLORS.PRIMARY_BLUE);
                                player.current.health = Math.min(player.current.maxHealth, player.current.health + 50);
                            }
                        } else if (p.type === 'GRENADE') {
                            triggerExplosion(p.pos.x, p.depth, 2.0);
                            enemies.current.forEach(e => {
                                if (Math.abs(p.pos.x - e.pos.x) < 120) e.health -= 150;
                            });
                        }
                    }
                } else {
                    p.pos.x += p.velocity.x;
                    p.pos.y += p.velocity.y;
                }
                p.life--;

                // Player bullets hit enemies
                if (p.type === 'BULLET' && p.owner === 'PLAYER') {
                    enemies.current.forEach(enemy => {
                        const hitX = Math.abs(p.pos.x - enemy.pos.x) < 30;
                        const screenP = GROUND_Y_START + p.depth + p.pos.y;
                        const screenB = GROUND_Y_START + enemy.depth - 15;
                        const hitY = Math.abs(screenP - screenB) < 30;
                        if (hitX && hitY) {
                            enemy.health -= p.damage;
                            p.life = 0;
                            triggerExplosion(enemy.pos.x, enemy.depth, 0.2);
                        }
                    });
                }

                // Enemy bullets hit player
                if (p.type === 'ENEMY_BULLET' && p.owner === 'ENEMY') {
                    const hitX = Math.abs(p.pos.x - player.current.pos.x) < 25;
                    const screenP = GROUND_Y_START + p.depth + p.pos.y;
                    const screenPl = GROUND_Y_START + player.current.depth;
                    const hitY = Math.abs(screenP - screenPl) < 25;
                    if (hitX && hitY) {
                        player.current.health -= p.damage;
                        p.life = 0;
                        screenShake.current = Math.max(screenShake.current, 5);
                    }
                }
            });

            projectiles.current = projectiles.current.filter(p => p.life > 0);

            // Count kills for score
            const before = enemies.current.length;
            enemies.current = enemies.current.filter(e => e.health > 0);
            const killed = before - enemies.current.length;
            if (killed > 0 && factionRef.current) {
                scoreRef.current += killed * FACTION_CONFIGS[factionRef.current].killPoints;
                setScore(scoreRef.current);
            }

            // Melee contact damage
            enemies.current.forEach(enemy => {
                const dX = Math.abs(player.current.pos.x - enemy.pos.x);
                const dDepth = Math.abs(player.current.depth - enemy.depth);
                if (dX < 40 && dDepth < 30) {
                    const dmg = cfg ? cfg.contactDamage : 0.3;
                    player.current.health -= dmg;
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
            ctx.translate((Math.random() - 0.5) * screenShake.current, (Math.random() - 0.5) * screenShake.current);
        }

        if (activeStratagemToThrow && gameState === 'PLAYING') {
            const startX = player.current.pos.x - cameraX.current;
            const startY = GROUND_Y_START + player.current.depth + player.current.pos.y - 35;
            const sdx = mousePos.current.x - startX;
            const sdy = mousePos.current.y - startY;
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            const force = Math.min(sdist * 0.05, 12);
            const angle = Math.atan2(sdy, sdx);

            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = `rgba(0, 204, 255, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            let tx = 0, ty = 0, tvy = force * Math.sin(angle);
            const tvx = force * Math.cos(angle);
            for (let i = 0; i < 40; i++) {
                ctx.lineTo(startX + tx, startY + ty);
                tx += tvx * 1.5;
                tvy += GRAVITY * 1.5;
                ty += tvy * 1.5;
                if (startY + ty > GROUND_Y_START + player.current.depth) break;
            }
            ctx.stroke();
            ctx.setLineDash([]);
            const pulse = 10 + Math.sin(Date.now() / 200) * 5;
            ctx.strokeStyle = COLORS.PRIMARY_BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(startX + tx, GROUND_Y_START + player.current.depth, pulse, pulse / 2.5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(startX + tx, GROUND_Y_START + player.current.depth, pulse + 5, (pulse + 5) / 2.5, 0, 0, Math.PI * 2); ctx.stroke();
        }

        const renderQueue: any[] = [];
        if (gameState !== 'BRIEFING' && gameState !== 'FACTION_SELECT') {
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
                ctx.beginPath(); ctx.ellipse(px, py, 20, 8, 0, 0, Math.PI * 2); ctx.fill();

                ctx.save();
                ctx.translate(px, py + item.data.pos.y - (item.altitude || 0));

                if (item.altitude > 0) {
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.lineTo(10, -60); ctx.lineTo(-10, -60); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = COLORS.PRIMARY_YELLOW;
                    ctx.fillRect(-2, -55, 4, 15);
                } else {
                    ctx.scale(playerFacing.current, 1);
                    const capePulse = Math.sin(Date.now() / 200) * 4;
                    ctx.fillStyle = '#0a0a0a';
                    ctx.beginPath(); ctx.moveTo(-5, -35); ctx.quadraticCurveTo(-22 - Math.abs(capePulse), -22, -8 + capePulse, 0); ctx.lineTo(0, 0); ctx.fill();
                    ctx.strokeStyle = COLORS.PRIMARY_YELLOW; ctx.lineWidth = 1; ctx.stroke();
                    ctx.fillStyle = '#111'; ctx.fillRect(-10, -42, 18, 42);
                    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-8, -40, 14, 16);
                    ctx.save();
                    ctx.translate(4, -48);
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = COLORS.PRIMARY_YELLOW; ctx.fillRect(4, -2, 4, 3);
                    ctx.restore();
                    ctx.save();
                    ctx.translate(0, -32);
                    let rAngle = aimAngle.current;
                    if (playerFacing.current === -1) rAngle = Math.PI - rAngle;
                    ctx.rotate(rAngle);
                    if (activeStratagemToThrow) {
                        ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -15); ctx.stroke();
                        const glow = 5 + Math.sin(Date.now() / 100) * 3;
                        ctx.fillStyle = COLORS.PRIMARY_BLUE;
                        ctx.shadowBlur = glow; ctx.shadowColor = COLORS.PRIMARY_BLUE;
                        ctx.beginPath(); ctx.arc(18, -18, 6, 0, Math.PI * 2); ctx.fill();
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
                const etype = item.data.type;
                ctx.save();
                ctx.translate(screenX, screenY);

                if (etype === 'BUG') {
                    ctx.fillStyle = '#1e2d24';
                    ctx.beginPath(); ctx.ellipse(0, -15, 22, 13, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = COLORS.BUG_GREEN; ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-24 + i * 16, 5); ctx.stroke(); }
                    // eyes
                    ctx.fillStyle = COLORS.BUG_GREEN;
                    ctx.beginPath(); ctx.arc(-8, -20, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(8, -20, 3, 0, Math.PI * 2); ctx.fill();
                } else if (etype === 'BOT') {
                    ctx.fillStyle = '#2d0a0a';
                    ctx.fillRect(-14, -38, 28, 38);
                    ctx.fillStyle = COLORS.BOT_RED;
                    ctx.fillRect(-12, -36, 24, 12);
                    ctx.fillStyle = '#ff8888';
                    ctx.fillRect(-6, -31, 12, 4);
                    ctx.fillStyle = '#3d0a0a';
                    ctx.fillRect(-22, -28, 8, 18);
                    ctx.fillRect(14, -28, 8, 18);
                    ctx.fillStyle = '#666';
                    ctx.fillRect(18, -22, 14, 4);
                } else if (etype === 'ZOMBIE') {
                    const sway = Math.sin(Date.now() / 400 + item.data.id.charCodeAt(6)) * 0.15;
                    ctx.rotate(sway);
                    ctx.fillStyle = '#1a0d24';
                    ctx.fillRect(-11, -38, 22, 38);
                    ctx.fillStyle = COLORS.ZOMBIE_PURPLE;
                    ctx.beginPath(); ctx.arc(0, -40, 10, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#4a1f6a';
                    ctx.beginPath(); ctx.arc(-3, -41, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(3, -41, 2, 0, Math.PI * 2); ctx.fill();
                    const armSway = Math.sin(Date.now() / 300) * 0.1;
                    ctx.fillStyle = '#2d1a3d';
                    ctx.save(); ctx.translate(-11, -30); ctx.rotate(-0.4 + armSway);
                    ctx.fillRect(-22, -3, 22, 7); ctx.restore();
                    ctx.save(); ctx.translate(11, -30); ctx.rotate(0.4 - armSway);
                    ctx.fillRect(0, -3, 22, 7); ctx.restore();
                }

                // Health bar
                const hpct = item.data.health / item.data.maxHealth;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(-18, -52, 36, 4);
                ctx.fillStyle = hpct > 0.5 ? '#2ecc71' : hpct > 0.25 ? '#f39c12' : '#e74c3c';
                ctx.fillRect(-18, -52, 36 * hpct, 4);

                ctx.restore();
            }

            if (item.type === 'PROJECTILE') {
                ctx.save();
                ctx.translate(screenX, screenY + item.data.pos.y);
                if (item.data.type === 'BEACON') {
                    const bPulse = Math.sin(Date.now() / 50) * 10;
                    ctx.fillStyle = COLORS.PRIMARY_BLUE;
                    ctx.shadowBlur = 10 + bPulse; ctx.shadowColor = COLORS.PRIMARY_BLUE;
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (item.data.owner === 'ENEMY') {
                    ctx.fillStyle = '#ff6644';
                    ctx.fillRect(-6, -1.5, 12, 3);
                } else if (item.data.type === 'BULLET') {
                    ctx.fillStyle = COLORS.PRIMARY_YELLOW;
                    ctx.fillRect(0, -1.5, 12, 3);
                } else {
                    ctx.fillStyle = COLORS.GRENADE_GREEN;
                    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }

            if (item.type === 'PARTICLE') {
                ctx.globalAlpha = item.data.life;
                ctx.fillStyle = item.data.color;
                ctx.fillRect(screenX, screenY + item.data.y, item.data.size, item.data.size);
            }
        });

        ctx.globalAlpha = 1;

        projectiles.current.forEach(p => {
            if (p.type === 'BEACON' && p.life < 10 && p.stratagemType?.name === 'Precision Strike') {
                ctx.fillStyle = `rgba(0, 204, 255, ${1 - p.life / 10})`;
                ctx.fillRect(p.pos.x - cameraX.current - 5, 0, 10, CANVAS_HEIGHT);
            }
        });

        ctx.restore();

        if (gameState === 'PLAYING') {
            const cx = mousePos.current.x;
            const cy = mousePos.current.y;
            ctx.strokeStyle = activeStratagemToThrow ? COLORS.PRIMARY_BLUE : COLORS.PRIMARY_YELLOW;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
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

    const factionColor = faction ? FACTION_CONFIGS[faction].color : COLORS.PRIMARY_YELLOW;

    return (
        <div className="relative w-screen h-screen bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center cursor-none">

            {/* ── Faction Selection Screen ── */}
            {gameState === 'FACTION_SELECT' && (
                <div className="absolute inset-0 z-20 bg-[#0a0a0a] overflow-y-auto flex flex-col items-center justify-center py-8 px-4">
                <div className="w-full max-w-5xl flex flex-col items-center gap-8">
                    <div className="text-center">
                        <h1 className="text-5xl font-black italic tracking-[0.1em] text-[#ffee00] font-orbitron uppercase mb-2">
                            Galactic Vanguard Corps
                        </h1>
                        <p className="text-white/40 text-sm uppercase tracking-widest font-orbitron">
                            Select Enemy Faction · Tactical Deployment Ready
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        {(['BUGS', 'BOTS', 'ZOMBIES'] as Faction[]).map(f => {
                            const cfg = FACTION_CONFIGS[f];
                            return (
                                <button
                                    key={f}
                                    onClick={() => selectFaction(f)}
                                    className="group relative bg-black/80 border-2 p-6 text-left transition-all duration-200 hover:scale-105 cursor-pointer"
                                    style={{ borderColor: cfg.color + '55' }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color)}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = cfg.color + '55')}
                                >
                                    <div className="text-[10px] uppercase tracking-[0.3em] mb-1 font-orbitron" style={{ color: cfg.color + 'aa' }}>
                                        ENEMY FACTION
                                    </div>
                                    <h2 className="text-2xl font-black uppercase tracking-wider mb-1 font-orbitron" style={{ color: cfg.color }}>
                                        {cfg.label}
                                    </h2>
                                    <div className="text-[#ffee00]/50 text-xs italic mb-4 font-orbitron">{cfg.tagline}</div>
                                    <p className="text-white/50 text-xs leading-relaxed mb-4">{cfg.description}</p>
                                    <ul className="space-y-1">
                                        {cfg.traits.map((t, i) => (
                                            <li key={i} className="text-[10px] uppercase tracking-wider flex items-center gap-2" style={{ color: cfg.color + 'bb' }}>
                                                <span style={{ color: cfg.color }}>▸</span> {t}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-6 border-t pt-4 text-center" style={{ borderColor: cfg.color + '33' }}>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] font-orbitron" style={{ color: cfg.color }}>
                                            DEPLOY AGAINST ›
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                </div>
            )}

            {/* ── Briefing Screen ── */}
            {gameState === 'BRIEFING' && mission && faction && (
                <div className="absolute inset-0 z-20 bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-black/95 border-2 p-8 font-orbitron shadow-[0_0_80px_rgba(255,238,0,0.1)]"
                    style={{ borderColor: factionColor }}>
                    <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: factionColor + 'aa' }}>
                        Mission Briefing · {FACTION_CONFIGS[faction].sector}
                    </div>
                    <h1 className="text-4xl font-black mb-1 italic uppercase tracking-[0.1em]" style={{ color: factionColor }}>
                        {mission.planetName}
                    </h1>
                    <div className="text-[#ffee00]/40 text-xs uppercase tracking-widest mb-6">
                        Objective: {mission.objective} · Hazard Level {mission.hazardLevel}
                    </div>
                    <p className="mb-8 text-gray-300 leading-relaxed text-sm italic">{mission.description}</p>
                    <div className="flex gap-4">
                        <button onClick={startDeployment}
                            className="flex-1 py-4 font-black text-xl text-black hover:opacity-90 transition-all skew-x-[-12deg] uppercase tracking-wider"
                            style={{ backgroundColor: factionColor }}>
                            INITIATE DROP SEQUENCE
                        </button>
                        <button onClick={resetGame}
                            className="px-6 py-4 font-black text-sm border text-white/50 hover:text-white transition-all skew-x-[-12deg] uppercase tracking-wider"
                            style={{ borderColor: factionColor + '55' }}>
                            BACK
                        </button>
                    </div>
                </div>
                </div>
            )}

            {/* ── End Screen ── */}
            {(gameState === 'FAILED' || gameState === 'SUCCESS') && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center font-orbitron">
                    <h2 className={`text-6xl font-black mb-4 italic uppercase tracking-[0.2em] ${gameState === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
                        {gameState === 'FAILED' ? 'TROOPER DOWN' : 'MISSION COMPLETE'}
                    </h2>
                    <div className="text-white/40 text-sm uppercase tracking-widest mb-2">Final Score</div>
                    <div className="text-7xl font-black mb-2" style={{ color: factionColor }}>
                        {score.toLocaleString()}
                    </div>
                    {faction && (
                        <div className="text-white/30 text-xs uppercase tracking-widest mb-12">
                            vs {FACTION_CONFIGS[faction].label} · {FACTION_CONFIGS[faction].killPoints} pts/kill
                        </div>
                    )}
                    <div className="flex gap-4">
                        <button onClick={resetGame}
                            className="bg-[#ffee00] text-black px-12 py-4 font-black text-xl skew-x-[-10deg] uppercase tracking-wider">
                            NEW MISSION
                        </button>
                        {faction && (
                            <button onClick={startDeployment}
                                className="border-2 border-[#ffee00]/50 text-[#ffee00] px-8 py-4 font-black text-xl skew-x-[-10deg] uppercase tracking-wider hover:border-[#ffee00]">
                                RETRY
                            </button>
                        )}
                    </div>
                </div>
            )}

            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ maxWidth: '100vw', maxHeight: '100vh', width: 'auto', height: 'auto' }}
                className="border-y-4 border-[#222]"
            />

            <div className="absolute bottom-4 left-4 text-[#ffee00]/40 text-[10px] font-orbitron uppercase pointer-events-none tracking-widest">
                {gameState === 'PLAYING' && (
                    activeStratagemToThrow
                        ? `[READY: ${activeStratagemToThrow.name.toUpperCase()}] CLICK TO DEPLOY`
                        : 'WASD: MOVE | SPACE: JUMP | CTRL+ARROWS: STRATAGEM | L-CLICK: FIRE | R-CLICK: GRENADE'
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
                score={score}
                faction={faction}
            />
            {isMobile && gameState === 'PLAYING' && (
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
