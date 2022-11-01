/**
 * jsdom is a pure-JavaScript implementation of many web standards, notably the WHATWG DOM and HTML Standards, for use with Node.js
 * https://www.npmjs.com/package/jsdom
 */

var jsdom = require('jsdom');
const { JSDOM } = jsdom;

const d3 = require('d3');
const fs = require('fs');



const dom = new JSDOM(`<!DOCTYPE html><body></body>`);


let body = d3.select(dom.window.document.querySelector("body"))
let svg = body.append('svg').attr('width', 300).attr('height', 300).attr('xmlns', 'http://www.w3.org/2000/svg');
svg.append("circle")
    .attr("cx", 70)
    .attr("cy", 70)
    .attr("r", 50)
    .style("fill", "transparent")
    .style("stroke", "#5a5a5a");

svg.append('text')
    .attr('x', 80)
    .attr('y', 50)
    .style("fill", "#0000ff")
    .text("POPPY");

fs.writeFileSync('out.svg', body.html());