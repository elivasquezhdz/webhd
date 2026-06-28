
import React from 'react';

interface Props {
    keysRef: React.MutableRefObject<Set<string>>;
    isStratagemMode: boolean;
    onStratagemToggle: () => void;
    onStratagemDir: (dir: string) => void;
    onFire: () => void;
    onGrenade: () => void;
}

const prevent = (e: React.TouchEvent) => e.preventDefault();

const DPAD = [
    { label: '↑', key: 'W', dir: 'UP',    col: 2, row: 1 },
    { label: '←', key: 'A', dir: 'LEFT',   col: 1, row: 2 },
    { label: '→', key: 'D', dir: 'RIGHT',  col: 3, row: 2 },
    { label: '↓', key: 'S', dir: 'DOWN',   col: 2, row: 3 },
] as const;

const MobileControls: React.FC<Props> = ({
    keysRef, isStratagemMode, onStratagemToggle, onStratagemDir, onFire, onGrenade
}) => {
    const btnBase = 'w-14 h-14 flex items-center justify-center text-xl font-black rounded active:scale-90 transition-transform select-none';
    const stratColor = isStratagemMode
        ? 'bg-[#ffee00]/20 border-2 border-[#ffee00] text-[#ffee00] shadow-[0_0_10px_#ffee00]'
        : 'bg-black/50 border-2 border-white/25 text-white/60';

    return (
        <div className="fixed inset-0 pointer-events-none z-40 select-none">

            {/* ── Left side: D-pad + stratagem button ── */}
            <div className="absolute bottom-10 left-6 pointer-events-auto flex flex-col items-center gap-3">

                {/* D-pad cross */}
                <div className="grid grid-cols-3 grid-rows-3 gap-1">
                    {DPAD.map(({ label, key, dir, col, row }) => (
                        <button
                            key={key}
                            style={{ gridColumn: col, gridRow: row }}
                            className={`${btnBase} ${stratColor}`}
                            onTouchStart={e => {
                                e.preventDefault();
                                if (isStratagemMode) {
                                    onStratagemDir(dir);
                                } else {
                                    keysRef.current.add(key);
                                }
                            }}
                            onTouchEnd={e => {
                                e.preventDefault();
                                keysRef.current.delete(key);
                            }}
                            onTouchCancel={e => {
                                e.preventDefault();
                                keysRef.current.delete(key);
                            }}
                        >
                            {label}
                        </button>
                    ))}
                    {/* centre pip */}
                    <div style={{ gridColumn: 2, gridRow: 2 }} className="w-14 h-14 flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full transition-colors ${isStratagemMode ? 'bg-[#ffee00]' : 'bg-white/15'}`} />
                    </div>
                </div>

                {/* Stratagem toggle */}
                <button
                    className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest border-2 rounded transition-all
                        ${isStratagemMode
                            ? 'bg-[#ffee00] text-black border-[#ffee00] shadow-[0_0_12px_#ffee00]'
                            : 'bg-black/60 text-[#ffee00]/70 border-[#ffee00]/40'}`}
                    onTouchStart={e => { e.preventDefault(); onStratagemToggle(); }}
                    onTouchEnd={prevent}
                >
                    {isStratagemMode ? '◉ STRATAGEM' : '○ STRATAGEM'}
                </button>
            </div>

            {/* ── Right side: Fire + Grenade ── */}
            <div className="absolute bottom-10 right-6 pointer-events-auto flex flex-col items-end gap-4">
                {/* Fire — big yellow circle */}
                <button
                    className="w-20 h-20 rounded-full bg-[#ffee00] border-4 border-yellow-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,238,0,0.5)] active:scale-90 transition-transform"
                    onTouchStart={e => { e.preventDefault(); onFire(); }}
                    onTouchEnd={prevent}
                >
                    FIRE
                </button>
                {/* Grenade — smaller olive circle */}
                <button
                    className="w-14 h-14 rounded-full bg-[#4a5d23] border-2 border-[#6a7d43] text-white/80 font-black text-xs uppercase tracking-wider active:scale-90 transition-transform"
                    onTouchStart={e => { e.preventDefault(); onGrenade(); }}
                    onTouchEnd={prevent}
                >
                    GRN
                </button>
            </div>
        </div>
    );
};

export default MobileControls;
