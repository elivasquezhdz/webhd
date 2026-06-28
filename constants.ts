
import { Stratagem, StratagemType } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const WORLD_SIZE_X = 5000;
export const WORLD_SIZE_Y = 240; 
export const GROUND_Y_START = 520; 
export const CAMERA_LERP = 0.08;

export const HELLDIVER_SPEED_X = 1.5; 
export const HELLDIVER_SPEED_Y = 0.8; 
export const JUMP_FORCE = -8;
export const GRAVITY = 0.4;

export const BUG_SPEED_X = 2.5;
export const BUG_SPEED_Y = 1.2;

export const STRATAGEMS: Stratagem[] = [
    {
        name: 'Reinforce',
        code: ['UP', 'DOWN', 'RIGHT', 'LEFT', 'UP'],
        type: StratagemType.REINFORCE,
        cooldown: 0,
        lastUsed: 0
    },
    {
        name: 'Eagle Strafing Run',
        code: ['UP', 'LEFT', 'LEFT'],
        type: StratagemType.ORBITAL_STRIKE,
        cooldown: 8000,
        lastUsed: 0
    },
    {
        name: 'Orbital Precision Strike',
        code: ['RIGHT', 'RIGHT', 'UP'],
        type: StratagemType.ORBITAL_STRIKE,
        cooldown: 10000,
        lastUsed: 0
    },
    {
        name: 'Supply Pack',
        code: ['DOWN', 'LEFT', 'DOWN', 'UP', 'UP', 'RIGHT'],
        type: StratagemType.SUPPLY_DROP,
        cooldown: 30000,
        lastUsed: 0
    }
];

export const COLORS = {
    SUPER_EARTH_BLUE: '#00ccff',
    SUPER_EARTH_YELLOW: '#ffee00',
    DANGER_RED: '#ff4444',
    TERMINID_GREEN: '#2ecc71',
    AUTOMATON_RED: '#e74c3c',
    SKY_DARK: '#050a14',
    GROUND_DIRT: '#1a140f',
    GROUND_LIT: '#2d251e',
    GRENADE_GREEN: '#4a5d23'
};
