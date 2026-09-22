const test=require('node:test');const assert=require('node:assert/strict');const {normalizeScore,better,sortRows}=require('./lib');
test('normalizes hostile score',()=>{const x=normalizeScore({nickname:'<b>A</b>',level:99,time:-5,distance:'NaN',result:'hack'});assert.equal(x.nickname,'bA/b');assert.equal(x.level,10);assert.equal(x.time,0);assert.equal(x.distance,0);assert.equal(x.result,'unknown')});
test('score-first ranking levels 2,4,5',()=>{const a=['','','','','',20,100],b=['','','','','',30,200];assert.equal(better(4,b,a),true);assert.equal(sortRows(5,[a,b])[0],b)});
test('time-first ranking levels 1,3',()=>{const a=['','','','','',20,10],b=['','','','','',30,999];assert.equal(better(1,a,b),true);assert.equal(sortRows(3,[b,a])[0],a)});
