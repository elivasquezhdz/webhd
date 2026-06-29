
import { Stratagem, StratagemType } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const WORLD_SIZE_X = 5000;
export const WORLD_SIZE_Y = 240;
export const GROUND_Y_START = 520;
export const CAMERA_LERP = 0.08;

export const TROOPER_SPEED_X = 1.5;
export const TROOPER_SPEED_Y = 0.8;
export const JUMP_FORCE = -8;
export const GRAVITY = 0.4;

export const FACTION_CONFIGS = {
    BUGS: {
        label: 'Bugs',
        tagline: 'The Swarm Awakens',
        description: 'Insectoid swarms. Fast, numerous, and lethal at close range. They overwhelm through sheer numbers.',
        traits: ['Fast movement', 'High count (18)', 'Melee only', '100 pts/kill'],
        enemyHealth: 50,
        enemyCount: 18,
        enemySpeedX: 2.5,
        enemySpeedY: 1.2,
        contactDamage: 0.3,
        canShoot: false,
        shootInterval: 0,
        color: '#2ecc71',
        killPoints: 100,
        planetName: 'Khartos Prime',
        sector: 'Outer Rim Cluster',
        missionDesc: 'Bug swarms have overrun the colonial outpost. Eradicate the hive before they reach civilian zones.',
        objective: 'Eradicate the Swarm',
        hazardLevel: 6,
    },
    BOTS: {
        label: 'Bots',
        tagline: 'Steel and Fire',
        description: 'Robotic soldiers. Tactical, armored, and they shoot back. Each unit is a precision killing machine.',
        traits: ['Shoots back', 'Armored (80 HP)', 'Medium speed', '150 pts/kill'],
        enemyHealth: 80,
        enemyCount: 12,
        enemySpeedX: 1.5,
        enemySpeedY: 0.7,
        contactDamage: 0.2,
        canShoot: true,
        shootInterval: 2500,
        color: '#e74c3c',
        killPoints: 150,
        planetName: 'Ferro Station',
        sector: 'Iron Nebula',
        missionDesc: 'Bot battalions have seized the installation. Dismantle their forces before they establish a forward base.',
        objective: 'Destroy Bot Battalion',
        hazardLevel: 7,
    },
    ZOMBIES: {
        label: 'Space Zombies',
        tagline: 'The Dead Do Not Stop',
        description: 'Undead plague carriers. Slow but nearly unkillable. Each one that reaches you is devastating.',
        traits: ['Very tanky (150 HP)', 'High damage (×2)', 'Slow but relentless', '200 pts/kill'],
        enemyHealth: 150,
        enemyCount: 20,
        enemySpeedX: 0.8,
        enemySpeedY: 0.4,
        contactDamage: 0.6,
        canShoot: false,
        shootInterval: 0,
        color: '#9b59b6',
        killPoints: 200,
        planetName: 'Necrova VII',
        sector: 'Dead Zone',
        missionDesc: 'A bio-plague has reanimated the colony\'s population. Contain the infection before it spreads to the core worlds.',
        objective: 'Purge the Infected Zone',
        hazardLevel: 9,
    },
} as const;

export const STRATAGEMS: Stratagem[] = [
    {
        name: 'Reinforce',
        code: ['UP', 'DOWN', 'RIGHT', 'LEFT', 'UP'],
        type: StratagemType.REINFORCE,
        cooldown: 0,
        lastUsed: 0
    },
    {
        name: 'Airstrike',
        code: ['UP', 'LEFT', 'LEFT'],
        type: StratagemType.ORBITAL_STRIKE,
        cooldown: 8000,
        lastUsed: 0
    },
    {
        name: 'Precision Strike',
        code: ['RIGHT', 'RIGHT', 'UP'],
        type: StratagemType.ORBITAL_STRIKE,
        cooldown: 10000,
        lastUsed: 0
    },
    {
        name: 'Supply Drop',
        code: ['DOWN', 'LEFT', 'DOWN', 'UP', 'UP', 'RIGHT'],
        type: StratagemType.SUPPLY_DROP,
        cooldown: 30000,
        lastUsed: 0
    }
];

export const COLORS = {
    PRIMARY_BLUE: '#00ccff',
    PRIMARY_YELLOW: '#ffee00',
    DANGER_RED: '#ff4444',
    BUG_GREEN: '#2ecc71',
    BOT_RED: '#e74c3c',
    ZOMBIE_PURPLE: '#9b59b6',
    SKY_DARK: '#050a14',
    GROUND_DIRT: '#1a140f',
    GROUND_LIT: '#2d251e',
    GRENADE_GREEN: '#4a5d23'
};
