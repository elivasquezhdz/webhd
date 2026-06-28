
export type GameState = 'BRIEFING' | 'DROPPING' | 'PLAYING' | 'SUCCESS' | 'FAILED';

export interface Position {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    pos: Position;
    type: 'HELLDIVER' | 'BUG' | 'BOT' | 'STRATAGEM_BEACON';
    health: number;
    maxHealth: number;
    angle: number;
}

export interface MissionData {
    planetName: string;
    sector: string;
    description: string;
    objective: string;
    hazardLevel: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface Projectile {
    pos: Position;
    velocity: Position;
    owner: 'PLAYER' | 'ENEMY';
    damage: number;
    life: number;
    type?: 'BULLET' | 'GRENADE' | 'BEACON';
    depth: number;
    vy?: number;
    stratagemType?: Stratagem;
}

export enum StratagemType {
    ORBITAL_STRIKE = 'ORBITAL_STRIKE',
    REINFORCE = 'REINFORCE',
    SUPPLY_DROP = 'SUPPLY_DROP'
}

export interface Stratagem {
    name: string;
    code: string[]; 
    type: StratagemType;
    cooldown: number;
    lastUsed: number;
}
