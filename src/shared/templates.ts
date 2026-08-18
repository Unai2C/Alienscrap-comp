import { PartType, SCENE_CENTER, TEMPLATE_BASE_Y } from './constants'

export interface SlotDefinition {
  slotId:       string
  requiredPart: PartType
  position:     { x: number; y: number; z: number }
  scale:        { x: number; y: number; z: number }
  label:        string
}

export type TemplateId =
  | 'CASTLE' | 'PYRAMID' | 'TOWER' | 'ARCH' | 'KEEP'
  | 'FORTRESS' | 'SPACESHIP' | 'ROVER' | 'ROBOT' | 'ELEPHANT' | 'DRAGON'
  | 'OFFROAD_4X4' | 'FLYING_SAUCER' | 'CASTLE_KEEP' | 'ROCKET_CARRIER' | 'SEA_FORTRESS'

// Source template center before scene translation.
const TEMPLATE_SOURCE_CENTER = { x: 8, z: 8 }

const RAW_TEMPLATES: Record<TemplateId, SlotDefinition[]> = {
  CASTLE: [
    { slotId: 'c0', requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Left' },
    { slotId: 'c1', requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Right' },
    { slotId: 'c2', requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall Left' },
    { slotId: 'c3', requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall Right' },
    { slotId: 'c4', requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Tower Left' },
    { slotId: 'c5', requiredPart: 'CYLINDER', position: { x: 8.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Tower Right' }
  ],
  PYRAMID: [
    { slotId: 'p0', requiredPart: 'CUBE', position: { x: 7,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Left' },
    { slotId: 'p1', requiredPart: 'CUBE', position: { x: 8,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Centre' },
    { slotId: 'p2', requiredPart: 'CUBE', position: { x: 9,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Right' },
    { slotId: 'p3', requiredPart: 'CUBE', position: { x: 7.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Mid Left' },
    { slotId: 'p4', requiredPart: 'CUBE', position: { x: 8.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Mid Right' },
    { slotId: 'p5', requiredPart: 'CONE', position: { x: 8,   y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Top' }
  ],
  TOWER: [
    { slotId: 't0', requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base' },
    { slotId: 't1', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Body 1' },
    { slotId: 't2', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Body 2' },
    { slotId: 't3', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Body 3' },
    { slotId: 't4', requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Battlements' },
    { slotId: 't5', requiredPart: 'CONE',     position: { x: 8, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Spire' }
  ],
  ARCH: [
    { slotId: 'a0', requiredPart: 'CUBE',     position: { x: 6,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Far Left' },
    { slotId: 'a1', requiredPart: 'CUBE',     position: { x: 7,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Left' },
    { slotId: 'a2', requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Centre' },
    { slotId: 'a3', requiredPart: 'CUBE',     position: { x: 9,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Right' },
    { slotId: 'a4', requiredPart: 'CUBE',     position: { x: 10,  y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Far Right' },
    { slotId: 'a5', requiredPart: 'CYLINDER', position: { x: 6.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Pillar Left' },
    { slotId: 'a6', requiredPart: 'CYLINDER', position: { x: 9.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Pillar Right' },
    { slotId: 'a7', requiredPart: 'CUBE',     position: { x: 6.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Arch Cap Left' },
    { slotId: 'a8', requiredPart: 'CUBE',     position: { x: 9.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Arch Cap Right' },
    { slotId: 'a9', requiredPart: 'CONE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Keystone' }
  ],
  KEEP: [
    { slotId: 'k0',  requiredPart: 'CUBE',     position: { x: 6,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base 1' },
    { slotId: 'k1',  requiredPart: 'CUBE',     position: { x: 7,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base 2' },
    { slotId: 'k2',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base 3' },
    { slotId: 'k3',  requiredPart: 'CUBE',     position: { x: 9,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base 4' },
    { slotId: 'k4',  requiredPart: 'CUBE',     position: { x: 10,  y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base 5' },
    { slotId: 'k5',  requiredPart: 'CYLINDER', position: { x: 6.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Column Left' },
    { slotId: 'k6',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall Left' },
    { slotId: 'k7',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall Right' },
    { slotId: 'k8',  requiredPart: 'CYLINDER', position: { x: 9.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Column Right' },
    { slotId: 'k9',  requiredPart: 'CUBE',     position: { x: 7,   y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Battlement Left' },
    { slotId: 'k10', requiredPart: 'CYLINDER', position: { x: 8,   y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Tower Body' },
    { slotId: 'k11', requiredPart: 'CUBE',     position: { x: 9,   y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Battlement Right' },
    { slotId: 'k12', requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Parapet Left' },
    { slotId: 'k13', requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Parapet Right' },
    { slotId: 'k14', requiredPart: 'CONE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Spire' }
  ],
  FORTRESS: [
    { slotId: 'f0',  requiredPart: 'CUBE',     position: { x: 5.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 1' },
    { slotId: 'f1',  requiredPart: 'CUBE',     position: { x: 6.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 2' },
    { slotId: 'f2',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 3' },
    { slotId: 'f3',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 4' },
    { slotId: 'f4',  requiredPart: 'CUBE',     position: { x: 9.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 5' },
    { slotId: 'f5',  requiredPart: 'CUBE',     position: { x: 10.5,y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wall 6' },
    { slotId: 'f6',  requiredPart: 'CYLINDER', position: { x: 6,   y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Column 1' },
    { slotId: 'f7',  requiredPart: 'CUBE',     position: { x: 7,   y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Inner Wall 1' },
    { slotId: 'f8',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Inner Wall 2' },
    { slotId: 'f9',  requiredPart: 'CUBE',     position: { x: 9,   y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Inner Wall 3' },
    { slotId: 'f10', requiredPart: 'CYLINDER', position: { x: 10,  y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Column 2' },
    { slotId: 'f11', requiredPart: 'CUBE',     position: { x: 6.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Rampart 1' },
    { slotId: 'f12', requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Turret Left' },
    { slotId: 'f13', requiredPart: 'CYLINDER', position: { x: 8.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Turret Right' },
    { slotId: 'f14', requiredPart: 'CUBE',     position: { x: 9.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Rampart 2' },
    { slotId: 'f15', requiredPart: 'CUBE',     position: { x: 7,   y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Upper Wall 1' },
    { slotId: 'f16', requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Upper Wall 2' },
    { slotId: 'f17', requiredPart: 'CUBE',     position: { x: 9,   y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Upper Wall 3' },
    { slotId: 'f18', requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Keep Left' },
    { slotId: 'f19', requiredPart: 'CONE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Keep Right' }
  ],
  SPACESHIP: [
    { slotId: 's0',  requiredPart: 'CUBE',     position: { x: 6.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Base Left' },
    { slotId: 's1',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Base Center' },
    { slotId: 's2',  requiredPart: 'CUBE',     position: { x: 9.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Base Right' },
    { slotId: 's3',  requiredPart: 'CYLINDER', position: { x: 6.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Engine Left' },
    { slotId: 's4',  requiredPart: 'CYLINDER', position: { x: 9.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Engine Right' },
    { slotId: 's5',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Mid Left' },
    { slotId: 's6',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Mid Right' },
    { slotId: 's7',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Upper Section' },
    { slotId: 's8',  requiredPart: 'CONE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 0.9, y: 1.3, z: 0.9 }, label: 'Prow' },
    { slotId: 's9',  requiredPart: 'CYLINDER', position: { x: 8,   y: TEMPLATE_BASE_Y + 2, z: 7 }, scale: { x: 0.8, y: 2,   z: 0.8 }, label: 'Central Mast' }
  ],
  ROVER: [
    { slotId: 'r0',  requiredPart: 'CYLINDER', position: { x: 5.5,  y: TEMPLATE_BASE_Y + 0,   z: 8   }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Wheel FL' },
    { slotId: 'r1',  requiredPart: 'CYLINDER', position: { x: 10.5, y: TEMPLATE_BASE_Y + 0,   z: 8   }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Wheel FR' },
    { slotId: 'r2',  requiredPart: 'CYLINDER', position: { x: 5.5,  y: TEMPLATE_BASE_Y + 0,   z: 9   }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Wheel RL' },
    { slotId: 'r3',  requiredPart: 'CYLINDER', position: { x: 10.5, y: TEMPLATE_BASE_Y + 0,   z: 9   }, scale: { x: 1.2, y: 0.6, z: 1.2 }, label: 'Wheel RR' },
    { slotId: 'r4',  requiredPart: 'CUBE',     position: { x: 6.5,  y: TEMPLATE_BASE_Y + 0.5, z: 8.5 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Chassis Left' },
    { slotId: 'r5',  requiredPart: 'CUBE',     position: { x: 9.5,  y: TEMPLATE_BASE_Y + 0.5, z: 8.5 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Chassis Right' },
    { slotId: 'r6',  requiredPart: 'CUBE',     position: { x: 8,    y: TEMPLATE_BASE_Y + 0.5, z: 8.5 }, scale: { x: 1.2, y: 0.8, z: 1.2 }, label: 'Chassis Center' },
    { slotId: 'r7',  requiredPart: 'CUBE',     position: { x: 7,    y: TEMPLATE_BASE_Y + 1.5, z: 8   }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Cabin Left' },
    { slotId: 'r8',  requiredPart: 'CUBE',     position: { x: 9,    y: TEMPLATE_BASE_Y + 1.5, z: 8   }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Cabin Right' },
    { slotId: 'r9',  requiredPart: 'CONE',     position: { x: 8,    y: TEMPLATE_BASE_Y + 2.5, z: 8.5 }, scale: { x: 0.9, y: 1.3, z: 0.9 }, label: 'Cabin Top' },
    { slotId: 'r10', requiredPart: 'CYLINDER', position: { x: 8,    y: TEMPLATE_BASE_Y + 1,   z: 7.5 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Turret' },
    { slotId: 'r11', requiredPart: 'CONE',     position: { x: 8,    y: TEMPLATE_BASE_Y + 1.8, z: 7.5 }, scale: { x: 0.7, y: 1,   z: 0.7 }, label: 'Antenna' }
  ],
  ROBOT: [
    { slotId: 'rob0',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 0,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Foot Left' },
    { slotId: 'rob1',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 0,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Foot Right' },
    { slotId: 'rob2',  requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 1,   z: 8 }, scale: { x: 0.9, y: 1.2, z: 0.9 }, label: 'Leg Left' },
    { slotId: 'rob3',  requiredPart: 'CYLINDER', position: { x: 8.5, y: TEMPLATE_BASE_Y + 1,   z: 8 }, scale: { x: 0.9, y: 1.2, z: 0.9 }, label: 'Leg Right' },
    { slotId: 'rob4',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 2,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Hip Left' },
    { slotId: 'rob5',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 2,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Hip Right' },
    { slotId: 'rob6',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 3,   z: 8 }, scale: { x: 1.2, y: 1.5, z: 1.2 }, label: 'Torso' },
    { slotId: 'rob7',  requiredPart: 'CYLINDER', position: { x: 6.5, y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 1.2, y: 0.7, z: 1.2 }, label: 'Arm Left' },
    { slotId: 'rob8',  requiredPart: 'CYLINDER', position: { x: 9.5, y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 1.2, y: 0.7, z: 1.2 }, label: 'Arm Right' },
    { slotId: 'rob9',  requiredPart: 'CUBE',     position: { x: 6,   y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Hand Left' },
    { slotId: 'rob10', requiredPart: 'CUBE',     position: { x: 10,  y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Hand Right' },
    { slotId: 'rob11', requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 4,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Shoulder Left' },
    { slotId: 'rob12', requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 4,   z: 8 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Shoulder Right' },
    { slotId: 'rob13', requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 5,   z: 8 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, label: 'Head' },
    { slotId: 'rob14', requiredPart: 'CONE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 6.3, z: 8 }, scale: { x: 0.9, y: 1.3, z: 0.9 }, label: 'Helmet' }
  ],
  ELEPHANT: [
    { slotId: 'e0',  requiredPart: 'CYLINDER', position: { x: 6.8, y: TEMPLATE_BASE_Y + 0,   z: 9.0 }, scale: { x: 0.9, y: 1.1, z: 0.9 }, label: 'Front Leg Left' },
    { slotId: 'e1',  requiredPart: 'CYLINDER', position: { x: 9.2, y: TEMPLATE_BASE_Y + 0,   z: 9.0 }, scale: { x: 0.9, y: 1.1, z: 0.9 }, label: 'Front Leg Right' },
    { slotId: 'e2',  requiredPart: 'CYLINDER', position: { x: 7.0, y: TEMPLATE_BASE_Y + 0,   z: 6.8 }, scale: { x: 0.9, y: 1.1, z: 0.9 }, label: 'Back Leg Left' },
    { slotId: 'e3',  requiredPart: 'CYLINDER', position: { x: 9.0, y: TEMPLATE_BASE_Y + 0,   z: 6.8 }, scale: { x: 0.9, y: 1.1, z: 0.9 }, label: 'Back Leg Right' },
    { slotId: 'e4',  requiredPart: 'CUBE',     position: { x: 7.0, y: TEMPLATE_BASE_Y + 0.9, z: 7.4 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Back Left' },
    { slotId: 'e5',  requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 0.9, z: 7.4 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Back Center' },
    { slotId: 'e6',  requiredPart: 'CUBE',     position: { x: 9.0, y: TEMPLATE_BASE_Y + 0.9, z: 7.4 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Back Right' },
    { slotId: 'e7',  requiredPart: 'CUBE',     position: { x: 7.0, y: TEMPLATE_BASE_Y + 0.9, z: 8.4 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Front Left' },
    { slotId: 'e8',  requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 0.9, z: 8.4 }, scale: { x: 1.1, y: 1,   z: 1.1 }, label: 'Body Core' },
    { slotId: 'e9',  requiredPart: 'CUBE',     position: { x: 9.0, y: TEMPLATE_BASE_Y + 0.9, z: 8.4 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Front Right' },
    { slotId: 'e10', requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 1.8, z: 7.9 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Top Left' },
    { slotId: 'e11', requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 1.8, z: 7.9 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Top Right' },
    { slotId: 'e12', requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 2.3, z: 9.1 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Neck' },
    { slotId: 'e13', requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 2.6, z: 9.8 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, label: 'Head' },
    { slotId: 'e14', requiredPart: 'CONE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 1.8, z: 10.5 }, scale: { x: 0.7, y: 1.4, z: 0.7 }, label: 'Trunk' },
    { slotId: 'e15', requiredPart: 'CONE',     position: { x: 6.4, y: TEMPLATE_BASE_Y + 2.6, z: 9.6 }, scale: { x: 1.2, y: 1,   z: 1.2 }, label: 'Ear Left' },
    { slotId: 'e16', requiredPart: 'CONE',     position: { x: 9.6, y: TEMPLATE_BASE_Y + 2.6, z: 9.6 }, scale: { x: 1.2, y: 1,   z: 1.2 }, label: 'Ear Right' },
    { slotId: 'e17', requiredPart: 'CONE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 1.3, z: 10.1 }, scale: { x: 0.55, y: 0.9, z: 0.55 }, label: 'Tusks' }
  ],
  DRAGON: [
    { slotId: 'd0',  requiredPart: 'CUBE',     position: { x: 7.0, y: TEMPLATE_BASE_Y + 0.8, z: 7.6 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Left' },
    { slotId: 'd1',  requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 0.8, z: 7.6 }, scale: { x: 1.1, y: 1,   z: 1.1 }, label: 'Body Core' },
    { slotId: 'd2',  requiredPart: 'CUBE',     position: { x: 9.0, y: TEMPLATE_BASE_Y + 0.8, z: 7.6 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Body Right' },
    { slotId: 'd3',  requiredPart: 'CUBE',     position: { x: 7.5, y: TEMPLATE_BASE_Y + 1.6, z: 7.9 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Back Left' },
    { slotId: 'd4',  requiredPart: 'CUBE',     position: { x: 8.5, y: TEMPLATE_BASE_Y + 1.6, z: 7.9 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Back Right' },
    { slotId: 'd5',  requiredPart: 'CYLINDER', position: { x: 8.0, y: TEMPLATE_BASE_Y + 2.1, z: 8.8 }, scale: { x: 0.8, y: 1.2, z: 0.8 }, label: 'Neck' },
    { slotId: 'd6',  requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 2.7, z: 9.6 }, scale: { x: 1,   y: 1,   z: 1   }, label: 'Head' },
    { slotId: 'd7',  requiredPart: 'CONE',     position: { x: 7.6, y: TEMPLATE_BASE_Y + 3.5, z: 9.7 }, scale: { x: 0.55, y: 0.9, z: 0.55 }, label: 'Horn Left' },
    { slotId: 'd8',  requiredPart: 'CONE',     position: { x: 8.4, y: TEMPLATE_BASE_Y + 3.5, z: 9.7 }, scale: { x: 0.55, y: 0.9, z: 0.55 }, label: 'Horn Right' },
    { slotId: 'd9',  requiredPart: 'CYLINDER', position: { x: 7.2, y: TEMPLATE_BASE_Y + 0.1, z: 7.0 }, scale: { x: 0.7, y: 0.9, z: 0.7 }, label: 'Leg Back Left' },
    { slotId: 'd10', requiredPart: 'CYLINDER', position: { x: 8.8, y: TEMPLATE_BASE_Y + 0.1, z: 7.0 }, scale: { x: 0.7, y: 0.9, z: 0.7 }, label: 'Leg Back Right' },
    { slotId: 'd11', requiredPart: 'CYLINDER', position: { x: 7.2, y: TEMPLATE_BASE_Y + 0.1, z: 8.4 }, scale: { x: 0.7, y: 0.9, z: 0.7 }, label: 'Leg Front Left' },
    { slotId: 'd12', requiredPart: 'CYLINDER', position: { x: 8.8, y: TEMPLATE_BASE_Y + 0.1, z: 8.4 }, scale: { x: 0.7, y: 0.9, z: 0.7 }, label: 'Leg Front Right' },
    { slotId: 'd13', requiredPart: 'CONE',     position: { x: 6.0, y: TEMPLATE_BASE_Y + 2.0, z: 7.8 }, scale: { x: 1.4, y: 1.2, z: 1.4 }, label: 'Wing Left' },
    { slotId: 'd14', requiredPart: 'CONE',     position: { x: 10.0,y: TEMPLATE_BASE_Y + 2.0, z: 7.8 }, scale: { x: 1.4, y: 1.2, z: 1.4 }, label: 'Wing Right' },
    { slotId: 'd15', requiredPart: 'CUBE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 0.8, z: 6.5 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Tail Base' },
    { slotId: 'd16', requiredPart: 'CYLINDER', position: { x: 8.0, y: TEMPLATE_BASE_Y + 1.0, z: 5.6 }, scale: { x: 0.55,y: 1.1, z: 0.55 }, label: 'Tail' },
    { slotId: 'd17', requiredPart: 'CONE',     position: { x: 8.0, y: TEMPLATE_BASE_Y + 1.2, z: 4.8 }, scale: { x: 0.65,y: 0.9, z: 0.65 }, label: 'Tail Tip' }
  ],
  OFFROAD_4X4: [
    { slotId: 'off0',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0.5,  z: 8    }, scale: { x: 1.8, y: 0.4, z: 3.6 }, label: 'Chasis Principal' },
    { slotId: 'off1',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.2,  z: 7.8  }, scale: { x: 1.7, y: 1.0, z: 1.8 }, label: 'Cabina Habitaculo' },
    { slotId: 'off2',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.0,  z: 9.2  }, scale: { x: 1.6, y: 0.6, z: 1.1 }, label: 'Capo Delantero' },
    { slotId: 'off3',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.0,  z: 6.7  }, scale: { x: 1.6, y: 0.6, z: 0.8 }, label: 'Caja Trasera' },
    { slotId: 'off4',  requiredPart: 'CYLINDER', position: { x: 7,   y: TEMPLATE_BASE_Y + 0.4,  z: 9.1  }, scale: { x: 0.8, y: 0.4, z: 0.8 }, label: 'Rueda Delantera Izq' },
    { slotId: 'off5',  requiredPart: 'CYLINDER', position: { x: 9,   y: TEMPLATE_BASE_Y + 0.4,  z: 9.1  }, scale: { x: 0.8, y: 0.4, z: 0.8 }, label: 'Rueda Delantera Der' },
    { slotId: 'off6',  requiredPart: 'CYLINDER', position: { x: 7,   y: TEMPLATE_BASE_Y + 0.4,  z: 6.9  }, scale: { x: 0.8, y: 0.4, z: 0.8 }, label: 'Rueda Trasera Izq' },
    { slotId: 'off7',  requiredPart: 'CYLINDER', position: { x: 9,   y: TEMPLATE_BASE_Y + 0.4,  z: 6.9  }, scale: { x: 0.8, y: 0.4, z: 0.8 }, label: 'Rueda Trasera Der' },
    { slotId: 'off8',  requiredPart: 'CYLINDER', position: { x: 8,   y: TEMPLATE_BASE_Y + 1.3,  z: 6.25 }, scale: { x: 0.7, y: 0.3, z: 0.7 }, label: 'Rueda de Repuesto' },
    { slotId: 'off9',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0.6,  z: 9.85 }, scale: { x: 1.9, y: 0.3, z: 0.3 }, label: 'Parachoques Frontal' },
    { slotId: 'off10', requiredPart: 'CYLINDER', position: { x: 8,   y: TEMPLATE_BASE_Y + 0.85, z: 9.9  }, scale: { x: 1.6, y: 0.15,z: 0.15}, label: 'Defensa Bullbar' },
    { slotId: 'off11', requiredPart: 'CYLINDER', position: { x: 8,   y: TEMPLATE_BASE_Y + 1.75, z: 8.6  }, scale: { x: 1.5, y: 0.1, z: 0.1 }, label: 'Barra de Luces Techo' },
    { slotId: 'off12', requiredPart: 'CONE',     position: { x: 7.4, y: TEMPLATE_BASE_Y + 1.0,  z: 9.78 }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Faro Izquierdo' },
    { slotId: 'off13', requiredPart: 'CONE',     position: { x: 8.6, y: TEMPLATE_BASE_Y + 1.0,  z: 9.78 }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Faro Derecho' },
    { slotId: 'off14', requiredPart: 'CONE',     position: { x: 7.6, y: TEMPLATE_BASE_Y + 1.9,  z: 8.6  }, scale: { x: 0.2, y: 0.2, z: 0.2 }, label: 'Foco Techo 1' },
    { slotId: 'off15', requiredPart: 'CONE',     position: { x: 8.4, y: TEMPLATE_BASE_Y + 1.9,  z: 8.6  }, scale: { x: 0.2, y: 0.2, z: 0.2 }, label: 'Foco Techo 2' },
    { slotId: 'off16', requiredPart: 'CYLINDER', position: { x: 8.9, y: TEMPLATE_BASE_Y + 1.3,  z: 8.9  }, scale: { x: 0.12,y: 1.0, z: 0.12}, label: 'Tubo Snorkel' },
    { slotId: 'off17', requiredPart: 'CUBE',     position: { x: 8.9, y: TEMPLATE_BASE_Y + 1.8,  z: 8.95 }, scale: { x: 0.2, y: 0.2, z: 0.2 }, label: 'Cabeza Snorkel' },
    { slotId: 'off18', requiredPart: 'CUBE',     position: { x: 7.05,y: TEMPLATE_BASE_Y + 1.3,  z: 8.5  }, scale: { x: 0.1, y: 0.2, z: 0.15}, label: 'Retrovisor Izq' },
    { slotId: 'off19', requiredPart: 'CUBE',     position: { x: 8.95,y: TEMPLATE_BASE_Y + 1.3,  z: 8.5  }, scale: { x: 0.1, y: 0.2, z: 0.15}, label: 'Retrovisor Der' }
  ],
  FLYING_SAUCER: [
    { slotId: 'fs0',  requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 1.0, z: 8  }, scale: { x: 6.0, y: 0.3, z: 6.0 }, label: 'Casco Externo A' },
    { slotId: 'fs1',  requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 1.0, z: 8  }, scale: { x: 6.2, y: 0.3, z: 6.2 }, label: 'Casco Externo B' },
    { slotId: 'fs2',  requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 1.3, z: 8  }, scale: { x: 4.5, y: 0.6, z: 4.5 }, label: 'Casco Central' },
    { slotId: 'fs3',  requiredPart: 'CONE',     position: { x: 8, y: TEMPLATE_BASE_Y + 2.0, z: 8  }, scale: { x: 3.0, y: 0.8, z: 3.0 }, label: 'Cupula Base' },
    { slotId: 'fs4',  requiredPart: 'CONE',     position: { x: 8, y: TEMPLATE_BASE_Y + 2.5, z: 8  }, scale: { x: 1.5, y: 0.6, z: 1.5 }, label: 'Cupula Cima' },
    { slotId: 'fs5',  requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 0.4, z: 10 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, label: 'Propulsor Trasero' },
    { slotId: 'fs6',  requiredPart: 'CYLINDER', position: { x: 6.3,y: TEMPLATE_BASE_Y + 0.4, z: 7  }, scale: { x: 0.6, y: 0.6, z: 0.6 }, label: 'Propulsor Izq' },
    { slotId: 'fs7',  requiredPart: 'CYLINDER', position: { x: 9.7,y: TEMPLATE_BASE_Y + 0.4, z: 7  }, scale: { x: 0.6, y: 0.6, z: 0.6 }, label: 'Propulsor Der' },
    { slotId: 'fs8',  requiredPart: 'CONE',     position: { x: 6, y: TEMPLATE_BASE_Y + 0.6, z: 10 }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Luz Delantera Izq' },
    { slotId: 'fs9',  requiredPart: 'CONE',     position: { x: 10,y: TEMPLATE_BASE_Y + 0.6, z: 10 }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Luz Delantera Der' },
    { slotId: 'fs10', requiredPart: 'CONE',     position: { x: 6, y: TEMPLATE_BASE_Y + 0.6, z: 6  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Luz Trasera Izq' },
    { slotId: 'fs11', requiredPart: 'CONE',     position: { x: 10,y: TEMPLATE_BASE_Y + 0.6, z: 6  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Luz Trasera Der' },
    { slotId: 'fs12', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 3.0, z: 8  }, scale: { x: 0.1, y: 0.5, z: 0.1 }, label: 'Base Antena' },
    { slotId: 'fs13', requiredPart: 'CONE',     position: { x: 8, y: TEMPLATE_BASE_Y + 3.4, z: 8  }, scale: { x: 0.2, y: 0.2, z: 0.2 }, label: 'Punta Antena' }
  ],
  CASTLE_KEEP: [
    { slotId: 'ck0',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0.5, z: 8   }, scale: { x: 6.0, y: 0.4, z: 6.0 }, label: 'Cimientos' },
    { slotId: 'ck1',  requiredPart: 'CYLINDER', position: { x: 5.5, y: TEMPLATE_BASE_Y + 2.0, z: 10.5}, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre Delantera Izq' },
    { slotId: 'ck2',  requiredPart: 'CYLINDER', position: { x: 10.5,y: TEMPLATE_BASE_Y + 2.0, z: 10.5}, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre Delantera Der' },
    { slotId: 'ck3',  requiredPart: 'CYLINDER', position: { x: 5.5, y: TEMPLATE_BASE_Y + 2.0, z: 5.5 }, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre Trasera Izq' },
    { slotId: 'ck4',  requiredPart: 'CYLINDER', position: { x: 10.5,y: TEMPLATE_BASE_Y + 2.0, z: 5.5 }, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre Trasera Der' },
    { slotId: 'ck5',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.8, z: 8   }, scale: { x: 5.0, y: 2.6, z: 5.0 }, label: 'Cuerpo Central Keep' },
    { slotId: 'ck6',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.2, z: 10.7}, scale: { x: 2.0, y: 1.6, z: 0.6 }, label: 'Entrada' },
    { slotId: 'ck7',  requiredPart: 'CUBE',     position: { x: 5.5, y: TEMPLATE_BASE_Y + 3.6, z: 11  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FL 1' },
    { slotId: 'ck8',  requiredPart: 'CUBE',     position: { x: 6.0, y: TEMPLATE_BASE_Y + 3.6, z: 11  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FL 2' },
    { slotId: 'ck9',  requiredPart: 'CUBE',     position: { x: 10.5,y: TEMPLATE_BASE_Y + 3.6, z: 11  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FR 1' },
    { slotId: 'ck10', requiredPart: 'CUBE',     position: { x: 10.0,y: TEMPLATE_BASE_Y + 3.6, z: 11  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FR 2' },
    { slotId: 'ck11', requiredPart: 'CONE',     position: { x: 5.5, y: TEMPLATE_BASE_Y + 3.8, z: 10.5}, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado FL' },
    { slotId: 'ck12', requiredPart: 'CONE',     position: { x: 10.5,y: TEMPLATE_BASE_Y + 3.8, z: 10.5}, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado FR' },
    { slotId: 'ck13', requiredPart: 'CONE',     position: { x: 5.5, y: TEMPLATE_BASE_Y + 3.8, z: 5.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado RL' },
    { slotId: 'ck14', requiredPart: 'CONE',     position: { x: 10.5,y: TEMPLATE_BASE_Y + 3.8, z: 5.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado RR' },
    { slotId: 'ck15', requiredPart: 'CUBE',     position: { x: 4.5, y: TEMPLATE_BASE_Y + 0.6, z: 8   }, scale: { x: 1.0, y: 0.2, z: 3.0 }, label: 'Rampa Escaleras' }
  ],
  ROCKET_CARRIER: [
    { slotId: 'rc0',  requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 0.6, z: 8   }, scale: { x: 4.0, y: 0.8, z: 8.0 }, label: 'Plataforma Base A' },
    { slotId: 'rc1',  requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 0.6, z: 4   }, scale: { x: 4.0, y: 0.8, z: 2.0 }, label: 'Plataforma Base B' },
    { slotId: 'rc2',  requiredPart: 'CUBE',     position: { x: 6.4,y: TEMPLATE_BASE_Y + 1.6, z: 11.6}, scale: { x: 0.8, y: 1.2, z: 1.0 }, label: 'Cabina Control' },
    { slotId: 'rc3',  requiredPart: 'CYLINDER', position: { x: 6, y: TEMPLATE_BASE_Y + 0.4, z: 11  }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Izq Del' },
    { slotId: 'rc4',  requiredPart: 'CYLINDER', position: { x: 6, y: TEMPLATE_BASE_Y + 0.4, z: 8   }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Izq Central' },
    { slotId: 'rc5',  requiredPart: 'CYLINDER', position: { x: 6, y: TEMPLATE_BASE_Y + 0.4, z: 5   }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Izq Tras' },
    { slotId: 'rc6',  requiredPart: 'CYLINDER', position: { x: 10,y: TEMPLATE_BASE_Y + 0.4, z: 11  }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Der Del' },
    { slotId: 'rc7',  requiredPart: 'CYLINDER', position: { x: 10,y: TEMPLATE_BASE_Y + 0.4, z: 8   }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Der Central' },
    { slotId: 'rc8',  requiredPart: 'CYLINDER', position: { x: 10,y: TEMPLATE_BASE_Y + 0.4, z: 5   }, scale: { x: 1.0, y: 0.4, z: 1.0 }, label: 'Oruga Der Tras' },
    { slotId: 'rc9',  requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 1.6, z: 8   }, scale: { x: 2.5, y: 1.2, z: 2.5 }, label: 'Base Cohete' },
    { slotId: 'rc10', requiredPart: 'CUBE',     position: { x: 6.7,y: TEMPLATE_BASE_Y + 2.2, z: 8.3 }, scale: { x: 0.2, y: 2.0, z: 0.2 }, label: 'Brazo Soporte Izq' },
    { slotId: 'rc11', requiredPart: 'CUBE',     position: { x: 9.3,y: TEMPLATE_BASE_Y + 2.2, z: 8.3 }, scale: { x: 0.2, y: 2.0, z: 0.2 }, label: 'Brazo Soporte Der' },
    { slotId: 'rc12', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 3.0, z: 8.3 }, scale: { x: 1.2, y: 2.0, z: 1.2 }, label: 'Cuerpo Cohete 1' },
    { slotId: 'rc13', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 5.2, z: 8.3 }, scale: { x: 1.0, y: 1.8, z: 1.0 }, label: 'Cuerpo Cohete 2' },
    { slotId: 'rc14', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 7.0, z: 8.3 }, scale: { x: 0.8, y: 1.0, z: 0.8 }, label: 'Carga Util' },
    { slotId: 'rc15', requiredPart: 'CONE',     position: { x: 8, y: TEMPLATE_BASE_Y + 8.2, z: 8.3 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, label: 'Punta Cohete' },
    { slotId: 'rc16', requiredPart: 'CUBE',     position: { x: 8, y: TEMPLATE_BASE_Y + 0.3, z: 16.5}, scale: { x: 4.0, y: 0.1, z: 1.0 }, label: 'Rampa de Carga' }
  ],
  SEA_FORTRESS: [
    { slotId: 'sf0',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 0.5,  z: 8   }, scale: { x: 8.0, y: 0.4, z: 8.0 }, label: 'Cimientos Marina' },
    { slotId: 'sf1',  requiredPart: 'CYLINDER', position: { x: 4.5, y: TEMPLATE_BASE_Y - 0.5,  z: 11.5}, scale: { x: 1.0, y: 1.0, z: 1.0 }, label: 'Pilar FL' },
    { slotId: 'sf2',  requiredPart: 'CYLINDER', position: { x: 11.5,y: TEMPLATE_BASE_Y - 0.5,  z: 11.5}, scale: { x: 1.0, y: 1.0, z: 1.0 }, label: 'Pilar FR' },
    { slotId: 'sf3',  requiredPart: 'CYLINDER', position: { x: 4.5, y: TEMPLATE_BASE_Y - 0.5,  z: 4.5 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, label: 'Pilar RL' },
    { slotId: 'sf4',  requiredPart: 'CYLINDER', position: { x: 11.5,y: TEMPLATE_BASE_Y - 0.5,  z: 4.5 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, label: 'Pilar RR' },
    { slotId: 'sf5',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.8,  z: 8   }, scale: { x: 7.0, y: 2.6, z: 7.0 }, label: 'Cuerpo Central Fortaleza' },
    { slotId: 'sf6',  requiredPart: 'CUBE',     position: { x: 8,   y: TEMPLATE_BASE_Y + 1.2,  z: 11.7}, scale: { x: 2.0, y: 1.6, z: 0.6 }, label: 'Entrada' },
    { slotId: 'sf7',  requiredPart: 'CYLINDER', position: { x: 4.5, y: TEMPLATE_BASE_Y + 2.0,  z: 11.5}, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre FL' },
    { slotId: 'sf8',  requiredPart: 'CYLINDER', position: { x: 11.5,y: TEMPLATE_BASE_Y + 2.0,  z: 11.5}, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre FR' },
    { slotId: 'sf9',  requiredPart: 'CYLINDER', position: { x: 4.5, y: TEMPLATE_BASE_Y + 2.0,  z: 4.5 }, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre RL' },
    { slotId: 'sf10', requiredPart: 'CYLINDER', position: { x: 11.5,y: TEMPLATE_BASE_Y + 2.0,  z: 4.5 }, scale: { x: 1.0, y: 3.0, z: 1.0 }, label: 'Torre RR' },
    { slotId: 'sf11', requiredPart: 'CUBE',     position: { x: 4.5, y: TEMPLATE_BASE_Y + 3.6,  z: 12  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FL 1' },
    { slotId: 'sf12', requiredPart: 'CUBE',     position: { x: 5.0, y: TEMPLATE_BASE_Y + 3.6,  z: 12  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FL 2' },
    { slotId: 'sf13', requiredPart: 'CUBE',     position: { x: 11.5,y: TEMPLATE_BASE_Y + 3.6,  z: 12  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FR 1' },
    { slotId: 'sf14', requiredPart: 'CUBE',     position: { x: 11.0,y: TEMPLATE_BASE_Y + 3.6,  z: 12  }, scale: { x: 0.3, y: 0.3, z: 0.3 }, label: 'Almena FR 2' },
    { slotId: 'sf15', requiredPart: 'CONE',     position: { x: 4.5, y: TEMPLATE_BASE_Y + 3.8,  z: 11.5}, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado FL' },
    { slotId: 'sf16', requiredPart: 'CONE',     position: { x: 11.5,y: TEMPLATE_BASE_Y + 3.8,  z: 11.5}, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado FR' },
    { slotId: 'sf17', requiredPart: 'CONE',     position: { x: 4.5, y: TEMPLATE_BASE_Y + 3.8,  z: 4.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado RL' },
    { slotId: 'sf18', requiredPart: 'CONE',     position: { x: 11.5,y: TEMPLATE_BASE_Y + 3.8,  z: 4.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, label: 'Tejado RR' },
    { slotId: 'sf19', requiredPart: 'CUBE',     position: { x: 3.5, y: TEMPLATE_BASE_Y + 0.6,  z: 8   }, scale: { x: 1.0, y: 0.2, z: 4.0 }, label: 'Rampa Escaleras Marina' }
  ]
}

const EXTRA_TEMPLATE_SLOTS: Record<TemplateId, SlotDefinition[]> = {
  CASTLE: [
    { slotId: 'c6', requiredPart: 'CUBE', position: { x: 6.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Left' },
    { slotId: 'c7', requiredPart: 'CUBE', position: { x: 9.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Right' },
    { slotId: 'c8', requiredPart: 'CUBE', position: { x: 6.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Wall Left' },
    { slotId: 'c9', requiredPart: 'CUBE', position: { x: 9.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Wall Right' },
    { slotId: 'c10', requiredPart: 'CYLINDER', position: { x: 6.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Tower Left' },
    { slotId: 'c11', requiredPart: 'CONE', position: { x: 7.5, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Left Roof' },
    { slotId: 'c12', requiredPart: 'CONE', position: { x: 8.5, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Right Roof' }
  ],
  PYRAMID: [
    { slotId: 'p6', requiredPart: 'CUBE', position: { x: 6, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Left' },
    { slotId: 'p7', requiredPart: 'CUBE', position: { x: 10, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Right' },
    { slotId: 'p8', requiredPart: 'CUBE', position: { x: 7, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Lower Step Left' },
    { slotId: 'p9', requiredPart: 'CUBE', position: { x: 9, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Lower Step Right' },
    { slotId: 'p10', requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Relic Left' },
    { slotId: 'p11', requiredPart: 'CYLINDER', position: { x: 8.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Relic Right' },
    { slotId: 'p12', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 2.7, z: 8 }, scale: { x: 0.85, y: 0.85, z: 0.85 }, label: 'Relic Core' },
    { slotId: 'p13', requiredPart: 'CONE', position: { x: 8, y: TEMPLATE_BASE_Y + 3.5, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Crystal Top' }
  ],
  TOWER: [
    { slotId: 't6', requiredPart: 'CUBE', position: { x: 7, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Left' },
    { slotId: 't7', requiredPart: 'CUBE', position: { x: 9, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Base Right' },
    { slotId: 't8', requiredPart: 'CUBE', position: { x: 7.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Top Left' },
    { slotId: 't9', requiredPart: 'CUBE', position: { x: 8.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Top Right' },
    { slotId: 't10', requiredPart: 'CYLINDER', position: { x: 7.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Side Body Left' },
    { slotId: 't11', requiredPart: 'CYLINDER', position: { x: 8.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Side Body Right' },
    { slotId: 't12', requiredPart: 'CONE', position: { x: 7.5, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 0.8, y: 1, z: 0.8 }, label: 'Left Spire' },
    { slotId: 't13', requiredPart: 'CONE', position: { x: 8.5, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 0.8, y: 1, z: 0.8 }, label: 'Right Spire' }
  ],
  ARCH: [
    { slotId: 'a10', requiredPart: 'CUBE', position: { x: 5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Left Foot' },
    { slotId: 'a11', requiredPart: 'CUBE', position: { x: 11, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Right Foot' },
    { slotId: 'a12', requiredPart: 'CUBE', position: { x: 7.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Inner Cap Left' },
    { slotId: 'a13', requiredPart: 'CUBE', position: { x: 8.5, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Inner Cap Right' },
    { slotId: 'a14', requiredPart: 'CYLINDER', position: { x: 5.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Pillar Left' },
    { slotId: 'a15', requiredPart: 'CYLINDER', position: { x: 10.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Pillar Right' },
    { slotId: 'a16', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Arch Core' },
    { slotId: 'a17', requiredPart: 'CONE', position: { x: 7, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Left Crest' },
    { slotId: 'a18', requiredPart: 'CONE', position: { x: 9, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Right Crest' }
  ],
  KEEP: [
    { slotId: 'k15', requiredPart: 'CUBE', position: { x: 5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Left' },
    { slotId: 'k16', requiredPart: 'CUBE', position: { x: 11, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Base Right' },
    { slotId: 'k17', requiredPart: 'CUBE', position: { x: 6, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Battlement Left' },
    { slotId: 'k18', requiredPart: 'CUBE', position: { x: 10, y: TEMPLATE_BASE_Y + 2, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Battlement Right' },
    { slotId: 'k19', requiredPart: 'CYLINDER', position: { x: 5.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Column Left' },
    { slotId: 'k20', requiredPart: 'CYLINDER', position: { x: 10.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Column Right' },
    { slotId: 'k21', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 3, z: 8 }, scale: { x: 0.9, y: 1, z: 0.9 }, label: 'Upper Core' },
    { slotId: 'k22', requiredPart: 'CONE', position: { x: 7, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Left Roof' },
    { slotId: 'k23', requiredPart: 'CONE', position: { x: 9, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Right Roof' }
  ],
  FORTRESS: [
    { slotId: 'f20', requiredPart: 'CUBE', position: { x: 4.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Wall Left' },
    { slotId: 'f21', requiredPart: 'CUBE', position: { x: 11.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Wall Right' },
    { slotId: 'f22', requiredPart: 'CUBE', position: { x: 8, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Upper Keep' },
    { slotId: 'f23', requiredPart: 'CYLINDER', position: { x: 5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Column Left' },
    { slotId: 'f24', requiredPart: 'CYLINDER', position: { x: 11, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Outer Column Right' },
    { slotId: 'f25', requiredPart: 'CONE', position: { x: 6.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Left Roof' },
    { slotId: 'f26', requiredPart: 'CONE', position: { x: 8, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 0.9, y: 1, z: 0.9 }, label: 'Center Roof' },
    { slotId: 'f27', requiredPart: 'CONE', position: { x: 9.5, y: TEMPLATE_BASE_Y + 4, z: 8 }, scale: { x: 0.85, y: 1, z: 0.85 }, label: 'Right Roof' }
  ],
  SPACESHIP: [
    { slotId: 's10', requiredPart: 'CUBE', position: { x: 5.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wing Base Left' },
    { slotId: 's11', requiredPart: 'CUBE', position: { x: 10.5, y: TEMPLATE_BASE_Y + 0, z: 8 }, scale: { x: 1, y: 1, z: 1 }, label: 'Wing Base Right' },
    { slotId: 's12', requiredPart: 'CUBE', position: { x: 6.5, y: TEMPLATE_BASE_Y + 1.8, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Wing Left' },
    { slotId: 's13', requiredPart: 'CUBE', position: { x: 9.5, y: TEMPLATE_BASE_Y + 1.8, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Wing Right' },
    { slotId: 's14', requiredPart: 'CUBE', position: { x: 8, y: TEMPLATE_BASE_Y + 2.7, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Upper Hull' },
    { slotId: 's15', requiredPart: 'CYLINDER', position: { x: 5.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 0.9, y: 0.8, z: 0.9 }, label: 'Outer Engine Left' },
    { slotId: 's16', requiredPart: 'CYLINDER', position: { x: 10.5, y: TEMPLATE_BASE_Y + 1, z: 8 }, scale: { x: 0.9, y: 0.8, z: 0.9 }, label: 'Outer Engine Right' },
    { slotId: 's17', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 3.2, z: 7.4 }, scale: { x: 0.7, y: 1.4, z: 0.7 }, label: 'Signal Mast' },
    { slotId: 's18', requiredPart: 'CONE', position: { x: 7.3, y: TEMPLATE_BASE_Y + 3.5, z: 8 }, scale: { x: 0.7, y: 1, z: 0.7 }, label: 'Left Antenna' },
    { slotId: 's19', requiredPart: 'CONE', position: { x: 8.7, y: TEMPLATE_BASE_Y + 3.5, z: 8 }, scale: { x: 0.7, y: 1, z: 0.7 }, label: 'Right Antenna' }
  ],
  ROVER: [
    { slotId: 'r12', requiredPart: 'CUBE', position: { x: 5.5, y: TEMPLATE_BASE_Y + 0.5, z: 8.5 }, scale: { x: 0.9, y: 0.8, z: 0.9 }, label: 'Outer Chassis Left' },
    { slotId: 'r13', requiredPart: 'CUBE', position: { x: 10.5, y: TEMPLATE_BASE_Y + 0.5, z: 8.5 }, scale: { x: 0.9, y: 0.8, z: 0.9 }, label: 'Outer Chassis Right' },
    { slotId: 'r14', requiredPart: 'CUBE', position: { x: 7, y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Upper Cabin Left' },
    { slotId: 'r15', requiredPart: 'CUBE', position: { x: 9, y: TEMPLATE_BASE_Y + 2.5, z: 8 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, label: 'Upper Cabin Right' },
    { slotId: 'r16', requiredPart: 'CYLINDER', position: { x: 8, y: TEMPLATE_BASE_Y + 2.2, z: 7.2 }, scale: { x: 0.8, y: 1, z: 0.8 }, label: 'Scanner' },
    { slotId: 'r17', requiredPart: 'CONE', position: { x: 8, y: TEMPLATE_BASE_Y + 3.4, z: 7.4 }, scale: { x: 0.7, y: 1, z: 0.7 }, label: 'Signal Tip' }
  ],
  ROBOT: [
    { slotId: 'rob15', requiredPart: 'CUBE', position: { x: 7, y: TEMPLATE_BASE_Y + 3.2, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Chest Left' },
    { slotId: 'rob16', requiredPart: 'CUBE', position: { x: 9, y: TEMPLATE_BASE_Y + 3.2, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Chest Right' },
    { slotId: 'rob17', requiredPart: 'CUBE', position: { x: 7, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Ear Left' },
    { slotId: 'rob18', requiredPart: 'CUBE', position: { x: 9, y: TEMPLATE_BASE_Y + 5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Ear Right' },
    { slotId: 'rob19', requiredPart: 'CYLINDER', position: { x: 6.3, y: TEMPLATE_BASE_Y + 3.5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Upper Arm Left' },
    { slotId: 'rob20', requiredPart: 'CYLINDER', position: { x: 9.7, y: TEMPLATE_BASE_Y + 3.5, z: 8 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, label: 'Upper Arm Right' },
    { slotId: 'rob21', requiredPart: 'CONE', position: { x: 7.2, y: TEMPLATE_BASE_Y + 6.1, z: 8 }, scale: { x: 0.65, y: 0.9, z: 0.65 }, label: 'Antenna Left' },
    { slotId: 'rob22', requiredPart: 'CONE', position: { x: 8.8, y: TEMPLATE_BASE_Y + 6.1, z: 8 }, scale: { x: 0.65, y: 0.9, z: 0.65 }, label: 'Antenna Right' }
  ],
  ELEPHANT: [],
  DRAGON: [],
  OFFROAD_4X4: [],
  FLYING_SAUCER: [],
  CASTLE_KEEP: [],
  ROCKET_CARRIER: [],
  SEA_FORTRESS: []
}

// Keep layout spacing aligned with GLB scale.
const LAYOUT_SCALE = 0.75

function withExtraSlots(src: Record<TemplateId, SlotDefinition[]>): Record<TemplateId, SlotDefinition[]> {
  const out = {} as Record<TemplateId, SlotDefinition[]>
  for (const id of Object.keys(src) as TemplateId[]) {
    out[id] = [...src[id], ...EXTRA_TEMPLATE_SLOTS[id]]
  }
  return out
}

function centerTemplates(src: Record<TemplateId, SlotDefinition[]>): Record<TemplateId, SlotDefinition[]> {
  const out = {} as Record<TemplateId, SlotDefinition[]>
  for (const id of Object.keys(src) as TemplateId[]) {
    out[id] = src[id].map(s => {
      const ox = (s.position.x - TEMPLATE_SOURCE_CENTER.x) * LAYOUT_SCALE
      const oy = (s.position.y - TEMPLATE_BASE_Y)          * LAYOUT_SCALE
      const oz = (s.position.z - TEMPLATE_SOURCE_CENTER.z) * LAYOUT_SCALE
      return {
        ...s,
        position: {
          x: SCENE_CENTER.x + ox,
          y: TEMPLATE_BASE_Y + oy,
          z: SCENE_CENTER.z + oz
        }
      }
    })
  }
  return out
}

export const TEMPLATES: Record<TemplateId, SlotDefinition[]> = centerTemplates(withExtraSlots(RAW_TEMPLATES))

export const TEMPLATE_ORDER: TemplateId[] = [
  'CASTLE', 'PYRAMID', 'TOWER', 'ARCH', 'KEEP',
  'FORTRESS', 'SPACESHIP', 'ROVER', 'ROBOT', 'ELEPHANT', 'DRAGON',
  'OFFROAD_4X4', 'FLYING_SAUCER', 'CASTLE_KEEP', 'ROCKET_CARRIER', 'SEA_FORTRESS'
]

export function getTemplate(id: string): SlotDefinition[] | null {
  if (!id) return null
  const slots = TEMPLATES[id as TemplateId]
  return slots ?? null
}

export function findSlotIndex(templateId: string, slotId: string): number {
  const slots = getTemplate(templateId)
  if (!slots) return -1
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].slotId === slotId) return i
  }
  return -1
}
