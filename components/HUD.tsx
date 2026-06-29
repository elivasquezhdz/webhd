
import React, { useState, useEffect } from 'react';
import { Faction, Stratagem, GameState } from '../types';
import { FACTION_CONFIGS } from '../constants';

interface HUDProps {
    health: number;
    maxHealth: number;
    activeStratagemInput: string[];
    currentStratagem: Stratagem | null;
    gameState: GameState;
    missionName: string;
    isMenuOpen: boolean;
    stratagems: Stratagem[];
    bullets: { current: number; max: number };
    grenades: { current: number; max: number };
    score: number;
    faction: Faction | null;
}

const DIR = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' } as const;
const dirIcon = (d: string) => DIR[d as keyof typeof DIR] ?? '·';

const HUD: React.FC<HUDProps> = ({
    health, maxHealth, activeStratagemInput, currentStratagem,
    gameState, missionName, isMenuOpen, stratagems, bullets, grenades,
    score, faction
}) => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(n => n + 1), 200);
        return () => clearInterval(id);
    }, []);

    if (gameState === 'BRIEFING' || gameState === 'DROPPING' || gameState === 'FACTION_SELECT') return null;

    const healthPct = (health / maxHealth) * 100;
    const now = Date.now();
    const factionColor = faction ? FACTION_CONFIGS[faction].color : '#ffee00';
    const factionLabel = faction ? FACTION_CONFIGS[faction].label : '';

    return (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 font-orbitron select-none">

            {/* ── Top bar ── */}
            <div className="flex justify-between items-start">
                <div className="bg-black/70 border-l-4 px-4 py-2" style={{ borderColor: factionColor }}>
                    <div className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: factionColor + '80' }}>Planet</div>
                    <div className="text-base font-black tracking-wider" style={{ color: factionColor }}>
                        {missionName.toUpperCase()}
                    </div>
                    {faction && (
                        <div className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: factionColor + '60' }}>
                            vs {factionLabel}
                        </div>
                    )}
                </div>

                {/* Score */}
                <div className="bg-black/70 border border-[#ffee00]/20 px-5 py-2 text-center">
                    <div className="text-[9px] text-[#ffee00]/40 uppercase tracking-[0.2em]">Score</div>
                    <div className="text-2xl font-black tabular-nums text-[#ffee00]">
                        {score.toLocaleString()}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[#ffee00] text-xl font-black italic tracking-tight">GALACTIC VANGUARD CORPS</div>
                    <div className="text-white/30 text-[9px] uppercase tracking-widest">Tactical Uplink · Online</div>
                </div>
            </div>

            {/* ── Stratagem full-detail popup (Ctrl held) ── */}
            {isMenuOpen && (
                <div className="flex justify-center">
                    <div className="bg-black/90 border-2 border-[#ffee00] p-4 backdrop-blur-md">
                        <div className="text-[9px] text-[#ffee00]/50 uppercase tracking-[0.2em] pb-2 mb-2 border-b border-[#ffee00]/20">
                            Orbital Asset Inventory · Arrow Keys
                        </div>
                        {stratagems.map((s, i) => {
                            const onCD = now - s.lastUsed < s.cooldown;
                            const cdSec = Math.max(0, Math.ceil((s.cooldown - (now - s.lastUsed)) / 1000));
                            const matching = activeStratagemInput.length > 0 &&
                                s.code.slice(0, activeStratagemInput.length).every((v, j) => v === activeStratagemInput[j]);
                            return (
                                <div key={i} className={`flex items-center justify-between gap-10 px-2 py-1 ${matching ? 'bg-[#ffee00]/10' : ''} ${onCD ? 'opacity-40' : ''}`}>
                                    <span className={`text-xs font-bold ${matching ? 'text-[#ffee00]' : 'text-white/60'}`}>
                                        {s.name.toUpperCase()}
                                    </span>
                                    <div className="flex gap-1">
                                        {s.code.map((d, j) => {
                                            const active = activeStratagemInput[j] === d &&
                                                activeStratagemInput.slice(0, j).every((v, k) => v === s.code[k]);
                                            return (
                                                <span key={j} className={`w-5 h-5 flex items-center justify-center text-xs border font-bold
                                                    ${active ? 'bg-[#ffee00] text-black border-[#ffee00]' : 'border-[#ffee00]/30 text-[#ffee00]'}`}>
                                                    {dirIcon(d)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {onCD
                                        ? <span className="text-red-400 text-[10px] font-bold w-8 text-right">{cdSec}s</span>
                                        : <span className="text-[#ffee00]/50 text-[10px] w-8 text-right">RDY</span>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Active sequence indicator ── */}
            {activeStratagemInput.length > 0 && (
                <div className="flex justify-center items-center gap-3">
                    <div className="flex gap-1">
                        {activeStratagemInput.map((d, i) => (
                            <span key={i} className="w-8 h-8 flex items-center justify-center text-base bg-[#ffee00] text-black font-black">
                                {dirIcon(d)}
                            </span>
                        ))}
                    </div>
                    {currentStratagem && (
                        <span className="bg-[#ffee00] text-black text-xs font-black px-3 py-1 uppercase animate-pulse">
                            Uplink Established
                        </span>
                    )}
                </div>
            )}

            {/* ── Bottom bar ── */}
            <div className="flex items-end justify-between gap-4">

                {/* Health */}
                <div className="flex flex-col gap-1 w-52">
                    <div className="flex justify-between text-[9px] uppercase tracking-widest mb-0.5">
                        <span className="text-[#00ccff]/60">Trooper Vitals</span>
                        <span className={healthPct < 30 ? 'text-red-400 animate-pulse font-bold' : 'text-[#00ccff]/80'}>
                            {Math.ceil(health)} / {maxHealth}
                        </span>
                    </div>
                    <div className="w-full h-4 bg-gray-900 border border-gray-700 overflow-hidden relative">
                        <div
                            className="h-full transition-all duration-150"
                            style={{
                                width: `${healthPct}%`,
                                backgroundColor: healthPct > 50 ? '#00ccff' : healthPct > 25 ? '#ffaa00' : '#ff4444'
                            }}
                        />
                        {[25, 50, 75].map(pct => (
                            <div key={pct} className="absolute top-0 bottom-0 w-px bg-black/40" style={{ left: `${pct}%` }} />
                        ))}
                    </div>
                    <div className="text-[8px] text-[#00ccff]/30 uppercase tracking-widest">Armor Status: Active</div>
                </div>

                {/* Stratagems always-on bar */}
                <div className="flex gap-2">
                    {stratagems.map((s, i) => {
                        const elapsed = now - s.lastUsed;
                        const onCD = elapsed < s.cooldown;
                        const fillPct = onCD ? (elapsed / s.cooldown) * 100 : 100;
                        const cdSec = Math.max(0, Math.ceil((s.cooldown - elapsed) / 1000));
                        const matching = isMenuOpen && activeStratagemInput.length > 0 &&
                            s.code.slice(0, activeStratagemInput.length).every((v, j) => v === activeStratagemInput[j]);

                        return (
                            <div key={i} className={`flex flex-col items-center bg-black/80 border transition-colors px-2 pt-2 pb-1 w-16
                                ${matching ? 'border-[#ffee00] shadow-[0_0_10px_#ffee00]'
                                    : onCD ? 'border-gray-700' : 'border-[#ffee00]/40'}`}>
                                <div className={`text-[8px] font-bold text-center leading-tight mb-1 ${onCD ? 'text-gray-500' : 'text-[#ffee00]'}`}>
                                    {s.name.split(' ').map(w => w[0]).join('')}
                                </div>
                                <div className="flex flex-wrap gap-px justify-center mb-1.5">
                                    {s.code.slice(0, 5).map((d, j) => (
                                        <span key={j} className={`text-[10px] leading-none ${onCD ? 'text-gray-600' : 'text-[#ffee00]/70'}`}>
                                            {dirIcon(d)}
                                        </span>
                                    ))}
                                </div>
                                <div className="w-full h-0.5 bg-gray-800 mb-0.5">
                                    <div className="h-full transition-all duration-200"
                                        style={{ width: `${fillPct}%`, backgroundColor: onCD ? '#ff4444' : '#ffee00' }} />
                                </div>
                                <div className={`text-[8px] font-bold ${onCD ? 'text-red-400' : 'text-[#ffee00]/60'}`}>
                                    {onCD ? `${cdSec}s` : 'RDY'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Ammo */}
                <div className="flex flex-col gap-1.5 w-36">
                    <div className="flex items-center justify-between bg-black/70 border border-[#ffee00]/20 px-3 py-1.5">
                        <span className="text-[9px] text-[#ffee00]/40 uppercase tracking-widest">Rifle</span>
                        <span className={`text-xl font-black tabular-nums ${bullets.current === 0 ? 'text-red-500 animate-pulse' : 'text-[#ffee00]'}`}>
                            {String(bullets.current).padStart(3, '0')}
                            <span className="text-[9px] text-[#ffee00]/30 font-normal ml-1">/{bullets.max}</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between bg-black/70 border border-[#ffee00]/20 px-3 py-1.5">
                        <span className="text-[9px] text-[#ffee00]/40 uppercase tracking-widest">Grenades</span>
                        <div className="flex gap-1 items-center">
                            {Array.from({ length: grenades.max }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 rotate-45 border ${i < grenades.current ? 'bg-[#ffee00] border-[#ffee00]' : 'bg-transparent border-[#ffee00]/20'}`} />
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HUD;
