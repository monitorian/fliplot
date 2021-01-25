// var chai = require('chai');
import {Node, Tree} from '../../core/tree.js';
import { inspect } from 'util';
import chai from 'chai';
const { assert } = chai;
const { expect } = chai;

describe('Tree Test', function() {
	it('basic insert', function(done) {
        var t = new Tree();

        t.insert('asd', null, 0);
		
		assert.equal(t.get('asd'), t.nodes.asd);
		assert.equal(t.get('asd'), t._root.children[0]);

		done();
	});

	it('more insert', function(done) {
        var t = new Tree();

        t.insert('a');
        t.insert('a0', 'a');
		t.insert('a1', 'a');
		
        t.insert('b');
        t.insert('b2', 'b', 0);
        t.insert('b0', 'b', 0);
        t.insert('b1', 'b', 1);
		
		assert.equal(t.get('a'), t._root.children[0]);
		assert.equal(t.get('b'), t._root.children[1]);
		assert.equal(t.get('a0'), t.get('a').children[0]);
		assert.equal(t.get('a1'), t.get('a').children[1]);
		assert.equal(t.get('b0'), t.get('b').children[0]);
		assert.equal(t.get('b1'), t.get('b').children[1]);
		assert.equal(t.get('b2'), t.get('b').children[2]);

		done();
	});

	it('insert with data', function(done) {
		var t = new Tree();
		
		const databank = {
			a: 'Hello darkness my old friend!',
			a0: [1,2,3,4,5,6],
			a1: ['Not', 'to', 'us'],
			b: 1234567,
			b0: {x:1, y:2, z:3},
			b1: {x:11, y:12, z:13},
			b2: {x:21, y:22, z:23}
		};

        t.insert('a', null, null, databank['a']);
        t.insert('a0', 'a', null, databank['a0']);
		t.insert('a1', 'a', null, databank['a1']);
		
        t.insert('b', null, null, databank['b']);
        t.insert('b2', 'b', 0, databank['b2']);
        t.insert('b0', 'b', 0, databank['b0']);
        t.insert('b1', 'b', 1, databank['b1']);
		
		assert.equal(t.get('a').data, databank['a']);
		assert.equal(t.get('b').data, databank['b']);
		assert.equal(t.get('a0').data, databank['a0']);
		assert.equal(t.get('a1').data, databank['a1']);
		assert.equal(t.get('b0').data, databank['b0']);
		assert.equal(t.get('b1').data, databank['b1']);
		assert.equal(t.get('b2').data, databank['b2']);

		done();
	});

});

