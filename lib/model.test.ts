import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,conflict} from './model';
test('blocks overlapping staff bookings but allows adjacent slots and different staff',()=>{const d=seed(),b=d.bookings[0];assert.equal(conflict(d.bookings,{...b,id:'new',time:'13:00'}),true);assert.equal(conflict(d.bookings,{...b,id:'new',time:'15:00',duration:60}),false);assert.equal(conflict(d.bookings,{...b,id:'new',staff:'Hira',time:'12:00',duration:60}),false)});
test('cancelled appointments release their slot and existing record does not conflict with itself',()=>{const b=seed().bookings[0];assert.equal(conflict([b],b),false);assert.equal(conflict([{...b,status:'Cancelled'}],{...b,id:'new'}),false)});
