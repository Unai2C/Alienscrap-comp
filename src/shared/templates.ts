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
  | 'FORTRESS' | 'SPACESHIP' | 'ROVER' | 'ROBOT'

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
  ]
}

// Keep layout spacing aligned with GLB scale.
const LAYOUT_SCALE = 0.75

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

export const TEMPLATES: Record<TemplateId, SlotDefinition[]> = centerTemplates(RAW_TEMPLATES)

export const TEMPLATE_ORDER: TemplateId[] = [
  'CASTLE', 'PYRAMID', 'TOWER', 'ARCH', 'KEEP',
  'FORTRESS', 'SPACESHIP', 'ROVER', 'ROBOT'
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
