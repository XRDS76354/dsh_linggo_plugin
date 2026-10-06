// Test-only JSAPI 4.0 contract fixture. Not a map, demo or shipping asset.
window.BMAP_COORD_GCJ02 = 'GCJ02';
window.__baiduFixture = [];
class Point {constructor(lng,lat){this.lng=lng;this.lat=lat;}}
class Pixel {constructor(x,y){this.x=x;this.y=y;}}
class Emitter {
 constructor(){this.events=new Map();}
 addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn);}
 removeEventListener(name,fn){this.events.get(name)?.delete(fn);}
 fire(name){for(const fn of this.events.get(name)??[])fn({target:this});}
}
class Overlay extends Emitter {constructor(...args){super();this.args=args;}}
class MockMap extends Emitter {
 constructor(el,options){super();if(window.BMap.coordType!==window.BMAP_COORD_GCJ02)throw Error('Coordinate configuration happened after construction');this.el=el;this.options=options;this.overlays=[];this.box=[120,30,121,31];this.destroyed=false;window.__baiduFixture.push(this);}
 centerAndZoom(point,zoom){this.center=point;this.zoom=zoom;}
 enableScrollWheelZoom(){}
 setMapStyle(style){if(!style.styleJson||style.styleId)throw Error('Expected portable style JSON');this.style=style;}
 setViewport(points){this.box=[points[0].lng,points[0].lat,points[1].lng,points[1].lat];this.fire('moveend');}
 pointToPixel(p){return new Pixel((p.lng-this.box[0])/(this.box[2]-this.box[0])*this.el.clientWidth,(this.box[3]-p.lat)/(this.box[3]-this.box[1])*this.el.clientHeight);}
 pixelToPoint(p){return new Point(this.box[0]+p.x/this.el.clientWidth*(this.box[2]-this.box[0]),this.box[3]-p.y/this.el.clientHeight*(this.box[3]-this.box[1]));}
 getDistance(a,b){return Math.hypot(a.lng-b.lng,a.lat-b.lat)*1e5;}
 addOverlay(o){this.overlays.push(o);}
 removeOverlay(o){this.overlays=this.overlays.filter(x=>x!==o);}
 checkResize(){this.resizes=(this.resizes??0)+1;}
 destroy(){this.destroyed=true;this.overlays=[];this.events.clear();}
}
window.BMap = {Map:MockMap,Point,Pixel,Polyline:class Polyline extends Overlay{},Circle:class Circle extends Overlay{}};
