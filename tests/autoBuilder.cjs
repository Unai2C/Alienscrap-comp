const fs = require('fs')
const path = require('path')
const vm = require('vm')
const assert = require('assert/strict')
const root = path.resolve(__dirname, '..')
const ts = require(path.join(root,'node_modules/typescript'))
const read = p => fs.readFileSync(path.join(root,p),'utf8')
const compile = s => ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const helper = {exports:{},require:()=>({ARTIFACT_DURATION_MS:10000})}
vm.runInNewContext(compile(read('src/shared/autoBuilder.ts')), helper)
const {findAutoBuilderSlot,startAutoBuilder,stopAutoBuilder,takeAutoBuilderPlacements} = helper.exports
const schedule={autoPlaceUntil:0,nextAutoPlaceAt:0}
startAutoBuilder(schedule,1000)
for (const [now,want] of [[1000,0],[2999,0],[3000,1],[3000,0],[5000,1],[7000,1],[9000,1],[10999,0],[11000,1],[20000,0]]) assert.equal(takeAutoBuilderPlacements(schedule,now),want)
startAutoBuilder(schedule,1000)
assert.equal(takeAutoBuilderPlacements(schedule,12000),5)
assert.equal(takeAutoBuilderPlacements(schedule,13000),0)
startAutoBuilder(schedule,1000); stopAutoBuilder(schedule)
assert.equal(takeAutoBuilderPlacements(schedule,12000),0)
const file=ts.createSourceFile('server.ts',read('src/server/alienServer.ts'),ts.ScriptTarget.Latest,true)
const names=['tickAutoBuilders','placeServerSlot','findOpenSlotIndex']
const functions=file.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(file)).join('\n')
assert.equal(functions.includes('function tickAutoBuilders'),true)
const fixture=()=>{
 const state={templateId:'test',occupiedMask:0,partsAttached:0,partsRequired:12,stateSeq:0}
 const session={address:'player',name:'P',joined:true,lastSeenAt:1000,autoPlaceUntil:0,nextAutoPlaceAt:0,lastAttachAt:777,nextAttachAt:888,points:0}
 const ctx={findAutoBuilderSlot,startAutoBuilder,stopAutoBuilder,takeAutoBuilderPlacements,currentPhase:'BUILD',buildCompletePending:false,roundParticipants:new Set(['player']),sessions:new Map([['player',session]]),PLAYER_ONLINE_MS:45000,roundEntity:1,RoundState:{getMutable:()=>state},TEMPLATES:{test:Array.from({length:12},(_,i)=>({slotId:'s'+i,requiredPart:'CUBE'}))},slotPlacedBy:{},slotPlacedByName:{},POINTS_AUTO_PIECE:{CUBE:60},POINTS_MANUAL_PIECE:{CUBE:100},POINTS_FINAL_PIECE:50,awardPoints:(p,n)=>p.points+=n,awardScrap:()=>{},sendPlayerUpdate:()=>{},broadcastState:()=>{},scheduleBuildComplete:()=>{ctx.buildCompletePending=true}}
 vm.createContext(ctx);vm.runInContext(compile(functions),ctx)
 return {ctx,state,session}
}
let {ctx,state,session}=fixture()
startAutoBuilder(session,1000)
ctx.tickAutoBuilders(1000);assert.equal(state.partsAttached,0)
ctx.tickAutoBuilders(3000);assert.equal(state.partsAttached,1)
ctx.placeServerSlot(state,session,1,'manual')
ctx.tickAutoBuilders(5000);assert.equal(state.partsAttached,3)
ctx.tickAutoBuilders(11000);assert.equal(state.partsAttached,6)
assert.equal(session.points,5*60+100)
assert.equal(session.lastAttachAt,777);assert.equal(session.nextAttachAt,888)
ctx.tickAutoBuilders(13000);assert.equal(state.partsAttached,6)
for(const cancel of [f=>f.session.joined=false,f=>f.ctx.roundParticipants.clear(),f=>f.ctx.currentPhase='BUILD_COMPLETE',f=>f.ctx.buildCompletePending=true,f=>f.session.lastSeenAt=-50000]) {
 const f=fixture();startAutoBuilder(f.session,1000);cancel(f);f.ctx.tickAutoBuilders(3000)
 assert.equal(f.state.partsAttached,0);assert.equal(f.session.nextAutoPlaceAt,0)
}
({ctx,state,session}=fixture());state.partsRequired=1;startAutoBuilder(session,1000)
ctx.tickAutoBuilders(3000);assert.equal(state.partsAttached,1);assert.equal(ctx.buildCompletePending,true)
ctx.tickAutoBuilders(11000);assert.equal(state.partsAttached,1)
console.log('PASS: five timed placements, exact final pulse, delayed frames, no duplicates, parallel manual placement and scoring, unchanged manual cooldown, exit/round cancellation, final-block completion')

// Grouped template storage must not cause repeated shapes.
const rotation = {autoPlaceUntil:0,nextAutoPlaceAt:0,nextAutoPartIndex:0}
const checkRotation = (parts, expected) => {
 startAutoBuilder(rotation,1000)
 const slots=parts.slice(), picked=[]
 for(let n=0;n<expected.length;n++) {
  const index=findAutoBuilderSlot(rotation,part=>slots.indexOf(part))
  assert.ok(index>=0);picked.push(slots[index]);slots[index]=null
 }
 assert.deepEqual(picked,expected)
}
checkRotation(['CUBE','CUBE','CYLINDER','CYLINDER','CONE','CONE'], ['CUBE','CYLINDER','CONE','CUBE','CYLINDER','CONE'])
checkRotation(['CUBE','CUBE','CONE','CONE'], ['CUBE','CONE','CUBE','CONE'])
checkRotation(['CYLINDER','CYLINDER','CYLINDER'], ['CYLINDER','CYLINDER','CYLINDER'])
assert.equal(findAutoBuilderSlot(rotation,()=>-1),-1)
// A manual placement removes the next shape before the following pulse.
startAutoBuilder(rotation,1000)
const remaining=['CUBE','CYLINDER','CONE','CUBE']
assert.equal(findAutoBuilderSlot(rotation,p=>remaining.indexOf(p)),0)
remaining[0]=null;remaining[1]=null
assert.equal(findAutoBuilderSlot(rotation,p=>remaining.indexOf(p)),2)
remaining[2]=null
assert.equal(findAutoBuilderSlot(rotation,p=>remaining.indexOf(p)),3)
// Rotation state belongs to each activation/player.
const other={autoPlaceUntil:0,nextAutoPlaceAt:0,nextAutoPartIndex:0}
startAutoBuilder(other,1000)
assert.equal(findAutoBuilderSlot(other,p=>['CUBE','CYLINDER','CONE'].indexOf(p)),0)
startAutoBuilder(rotation,9000)
assert.equal(rotation.nextAutoPartIndex,0)
console.log('PASS: shape rotation, exhausted shapes, one remaining shape, full template, concurrent manual placement, independent activations')
