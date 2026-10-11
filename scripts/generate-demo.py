"""Offline, explicit extraction of the approved public routes and anonymous replay.
Input directories are never copied. Only selected fields leave this generator.
"""
import argparse, base64, csv, gzip, hashlib, heapq, json, math, random, re, sys, tempfile
from pathlib import Path
import pandas as pd
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'python'))
from linggo_data import algo, versions, jsonio
from linggo_data.schema import ENTITIES
from linggo_data.geo import km, fmt
from linggo_data.crs import gcj02_to_wgs84
SEED=20261011
STAMP='2030-01-01T00:00:00Z'
# Explicit source ID and terminal pair, independent of the source direction field (all 0).
PAIRS={
 '1009':[('310100015737','水华路橄榄路','滴水湖枢纽站'),('310100015736','滴水湖枢纽站','水华路橄榄路')],
 '1037':[('310100015760','祥凯路万隆村委会','书院地铁站'),('310100015761','书院地铁站','万隆村民委员会')],
 '1043':[('310100015772','临港共享区枢纽站','滴水湖枢纽站'),('310100015771','滴水湖枢纽站','临港共享区枢纽站')],
 '1061':[('310100015792','塘北路塘北村','书孝路洋溢村委站'),('310100015791','书孝路洋溢村委站','塘北路塘北村')],
 '1063':[('310100015795','东海农场','新欣路新府路'),('310100015796','新欣路新府路','东海农场')],
 '1064':[('900000035269','老书院社区','书院地铁站'),('900000035270','书院地铁站','老书院社区')],
 '1075':[('900000033553','老芦公路新港','书院地铁站'),('900000033554','书院地铁站','老芦公路新港')],
 '1077':[('900000031237','临港共享区枢纽站','临港大道枢纽站'),('900000031238','临港大道枢纽站','临港共享区枢纽站')],
}
def digest(v): return hashlib.sha256(jsonio.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def point(p): return [round(float(v),6) for v in p]
def canonical_tables(tables):
 return {n:[{f:json.dumps(r[f],separators=(',',':')) if k=='coords' and f in r else str(r[f]) if f in r else '' for f,(k,_) in ENTITIES[n]['fields'].items()} for r in rows] for n,rows in tables.items()}
def lines(source):
 features={f['properties']['route_id']:f for f in json.load(open(source/'shanghai_bus_routes.geojson'))['features']}
 allrows=list(csv.DictReader(open(source/'shanghai_bus_route_stops.csv',encoding='utf-8-sig')))
 stops, routes, rs, mapping={},[],[],[]
 for rid,pairs in PAIRS.items():
  for d,(sid,start,end) in enumerate(pairs):
   f=features[sid]; p=f['properties']; assert (p['start_stop'],p['end_stop'],p['direction'])==(start,end,'0')
   path=[point(x) for x in f['geometry']['coordinates']]
   routes.append(dict(route_id=rid,route_name=rid+'路',direction=str(d),geometry=path))
   rows=sorted((r for r in allrows if r['route_id']==sid),key=lambda r:int(r['seq']))
   for r in rows:
    st=dict(stop_id=r['stop_id'],stop_name=r['stop_name'],lon=round(float(r['lon']),6),lat=round(float(r['lat']),6))
    stops[st['stop_id']]=st;rs.append(dict(**st,route_id=rid,route_name=rid+'路',direction=str(d),seq=int(r['seq'])))
   mapping.append(dict(routeId=rid,direction=str(d),sourceRouteId=sid,sourceDirection='0',start=start,end=end,km=round(sum(km(a,b) for a,b in zip(path,path[1:])),3),source='CPTOND 上海公交线网 / WGS84'))
 assert (len(routes),len(stops),len(rs))==(16,95,176)
 return dict(stops=list(stops.values()),routes=routes,route_stops=rs),mapping

def operations(tables):
 rng=random.Random(SEED); od=[];rid=[];profiles=[];trips=[]
 for li,line in enumerate(tables['routes']):
  route,d=line['route_id'],line['direction']; stops=[s['stop_id'] for s in tables['route_stops'] if s['route_id']==route and s['direction']==d];n=len(stops)
  pairs=[(0,n-1),(0,n//2),(1,n-2),(n//3,n-1),(n//2,n-1),(0,max(1,n//3))]
  for day in ['workday','saturday','sunday']:
   bins=[];sections=[]
   for b in range(48):
    hr=b/2;peak=7+(li%4)*.5 if d=='0' else 17+(li%3)*.5
    weight=(.12+math.exp(-((hr-peak)/1.2)**2)+.65*math.exp(-((hr-(18 if d=='0' else 8))/1.7)**2)) if 5<=hr<23 else 0
    if day!='workday':weight=(.09+.7*math.exp(-((hr-(11+li%4))/2.4)**2)+.45*math.exp(-((hr-18)/2)**2))*(.75 if day=='saturday' else .55) if 6<=hr<22 else 0
    boards=[0]*n;alights=[0]*n;timebin=f'{fmt(b*1800)[:5]}-{fmt((b+1)*1800)[:5]}'
    for pi,(a,z) in enumerate(pairs):
     count=round(weight*(5+li*1.8)*(1+.2*pi)*rng.uniform(.65,1.35))
     if count:od.append(dict(route_id=route,direction=d,day_type=day,time_bin=timebin,origin_stop_id=stops[a],dest_stop_id=stops[z],count=count))
     boards[a]+=count;alights[z]+=count
    load=0;sec=[]
    for si,stop in enumerate(stops):
     rid.append(dict(route_id=route,direction=d,day_type=day,stop_id=stop,time_bin=timebin,boardings=boards[si],alightings=alights[si]));load+=boards[si]-alights[si]
     assert load>=0
     if si<n-1:sec.append(load)
    assert load==0
    bins.append(sum(boards));sections.append(sec)
   profiles.append(dict(routeId=route,direction=d,dayType=day,bins=bins,sections=sections,source='模拟运营 / 固定种子'))
  length=sum(km(a,b) for a,b in zip(line['geometry'],line['geometry'][1:]));duration=round(length/22*3600+len(stops)*20)
  for j,departure in enumerate(range(12*3600+30*60,13*3600+15*60,900+(li%3)*180)):
   trips.append(dict(trip_id=f'SIM-T{li:02}-{j}',route_id=route,direction=d,departure_time=fmt(departure),arrival_time=fmt(departure+duration),service_id='workday'))
 tables.update(od=od,ridership=rid,trips=trips)
 return profiles

def network(tables,road):
 import shapefile
 nodes={str(r['node_id']):(float(r['x']),float(r['y'])) for r in (x.as_dict() for x in shapefile.Reader(str(road/'lingang_nodes.shp')).iterRecords())}
 adj={n:[] for n in nodes}; edges={}
 speeds={'trunk':70,'trunk_link':45,'primary':60,'primary_link':40,'secondary':50,'secondary_link':40,'tertiary':45,'tertiary_link':35,'residential':30,'living_street':15,'service':20,'unclassified':40}
 for x in shapefile.Reader(str(road/'lingang_edges.shp')).iterShapeRecords():
  r=x.record.as_dict();a,b=str(r['from_node']),str(r['to_node']); highway=r['highway']
  if 'motorway' in highway or a not in nodes or b not in nodes:continue
  m=float(r['length']);s=re.search(r'\d+',str(r['maxspeed']));speed=float(s[0]) if s else speeds.get(highway,30)
  if not 5<=speed<=120:speed=speeds.get(highway,30)
  geometry=[point(p) for p in x.shape.points];geometry[0]=point(nodes[a]);geometry[-1]=point(nodes[b]);sec=m/(speed*.7/3.6)
  if (a,b) not in edges or sec<edges[a,b]['travel_time_s']:edges[a,b]=dict(length_m=round(m,3),travel_time_s=round(sec,3),highway=highway,geometry=geometry,oneway=r['oneway'])
 for (a,b),e in list(edges.items()):
  if not e['oneway'] and (b,a) not in edges:edges[b,a]={**e,'geometry':e['geometry'][::-1]}
 for (a,b),e in edges.items():adj[a].append((b,e['travel_time_s']))
 anchors=[]
 for s in tables['stops']:
  p=[s['lon'],s['lat']];nearest=min(nodes,key=lambda n:km(p,nodes[n]));assert km(p,nodes[nearest])<.7;anchors.append(nearest)
 home=anchors[0];chosen=set()
 for source in sorted(set(anchors)):
  dist={source:0};prev={};q=[(0,source)]
  while q:
   val,n=heapq.heappop(q)
   if val!=dist[n]:continue
   for target,sec in adj[n]:
    if val+sec<dist.get(target,math.inf):dist[target]=val+sec;prev[target]=n;heapq.heappush(q,(val+sec,target))
  targets=set(anchors) if source==home else {home}
  # Paths between all request anchors are present via their common home; no invented links.
  for target in targets:
   if target not in dist:raise ValueError('Road connection/home unavailable')
   while target!=source:a=prev[target];chosen.add((a,target));target=a
 kept=sorted({n for pair in chosen for n in pair});ids={n:f'SIM-N{i:04}' for i,n in enumerate(kept)}
 tables['network_nodes']=[dict(node_id=ids[n],lon=point(nodes[n])[0],lat=point(nodes[n])[1]) for n in kept]
 tables['network_edges']=[dict(edge_id=f'SIM-E{i:04}',from_node_id=ids[a],to_node_id=ids[b],**{k:e[k] for k in ['length_m','travel_time_s','highway','geometry']}) for i,((a,b),e) in enumerate(sorted((p,edges[p]) for p in chosen))]
 tables['depots']=[dict(depot_id='SIM-D1',depot_name='模拟车场',lon=point(nodes[home])[0],lat=point(nodes[home])[1])]
 tables['vehicles']=[dict(vehicle_id=f'SIM-V{i+1:02}',capacity=8,depot_id='SIM-D1') for i in range(6)]
 rng=random.Random(SEED); candidates=[s for s in tables['route_stops'] if s['route_id']=='1009' and s['direction']=='0'];demand=[]
 for i in range(30):
  a,b=rng.sample(candidates,2);when=45000+i*55+rng.randrange(30)
  demand.append(dict(request_id=f'SIM-Q{i+1:02}',request_time='2030-01-01T'+fmt(when),o_lon=a['lon'],o_lat=a['lat'],d_lon=b['lon'],d_lat=b['lat'],passengers=1+i%3))
 tables['demand']=demand
 return dict(nodes=len(kept),edges=len(chosen),source='既有公开道路几何最短路截取，禁行高速；通行速度为模拟参数')

def recorded(path):
 raw=json.load(open(path));start=raw['meta']['t0']+6.5*3600000;end=start+45*60000
 # Source t0 is 06:00 local. Bounds are derived without publishing the original date.
 groups={}
 for v in raw['vehicles']:
  orders=[o for o in raw['orders'] if o.get('veh')==v['vid'] and o.get('dropT') is not None and o['reqT']>=start and o['dropT']<=end]
  score=(len(orders),max([s.get('load',0) for s in v['stops'] if start<=s['t']<=end] or [0]),sum(start<=o.get('boardT',-1)<=end for o in raw['orders'] if o.get('veh')==v['vid']),sum(start<=p['t']<=end for p in v['pts']),v['vid'])
  groups.setdefault(v['depot'],[]).append((score,v))
 selected=[max(g,key=lambda x:x[0]) for g in groups.values()];used={v['vid'] for _,v in selected};selected.append(max((x for g in groups.values() for x in g if x[1]['vid'] not in used),key=lambda x:x[0])); selected.sort(key=lambda x:x[1]['vid'])
 convert=lambda p:point(gcj02_to_wgs84(*p));time=lambda t:round(45000+(t-start)/1000,3)
 orders=[o for o in raw['orders'] if o.get('veh') in {v['vid'] for _,v in selected} and o.get('dropT') is not None and o['reqT']<end and o['dropT']>=start]
 oid={o['oid']:f'REC-Q{i+1:02}' for i,o in enumerate(orders)};vid={v['vid']:f'REC-V{i+1:02}' for i,(_,v) in enumerate(selected)}
 places={};place=lambda p:places.setdefault(tuple(convert(p)),f'接驳点 {len(places)+1:02}')
 def interpolate(pts,t):
  for a,b in zip(pts,pts[1:]):
   if a['t']<=t<=b['t']:
    f=(t-a['t'])/(b['t']-a['t']) if b['t']!=a['t'] else 0;return {'t':t,'ll':[a['ll'][j]+f*(b['ll'][j]-a['ll'][j]) for j in [0,1]]}
  raise ValueError('Missing clip boundary')
 vehicles=[];depots=[];events=[]
 for i,(_,v) in enumerate(selected):
  pts=[interpolate(v['pts'],start)]+[p for p in v['pts'] if start<p['t']<end]+[interpolate(v['pts'],end)]
  vs=[s for s in v['stops'] if s.get('dep',s['t'])>=start and s['t']<=end];before=[s for s in v['stops'] if s['t']<start];after=[s for s in v['stops'] if s['t']>end]
  context=([before[-1]] if before and before[-1] not in vs else [])+vs+after[:1]
  stops=[dict(arrive=time(s['t']),depart=time(s.get('dep',s['t'])),lon=convert(s['ll'])[0],lat=convert(s['ll'])[1],name=place(s['ll']),pickups=[oid[q] for q in s['board'] if q in oid],dropoffs=[oid[q] for q in s['alight'] if q in oid],load=s['load'],context=not start<=s['t']<=end) for s in context]
  initial=sum(o['pax'] for o in orders if o['veh']==v['vid'] and o['boardT']<=start<o['dropT'])
  completed=sum(start<=o['dropT']<=end for o in orders if o['veh']==v['vid'])
  track=[dict(t=time(p['t']),p=convert(p['ll'])) for p in pts];distance=sum(km(a['p'],b['p']) for a,b in zip(track,track[1:]))
  vehicles.append(dict(vehicle_id=vid[v['vid']],capacity=v['seats'],depot_id=f'REC-D{list(groups).index(v["depot"])+1}',initial_load=initial,stops=stops,track=track,start=track[0]['p'],completed=completed,km=round(distance,3)))
 for j,(_,g) in enumerate(groups.items()):
  # Representative home location, anonymous name; never copy the source depot ID.
  v=g[0][1];depots.append(dict(depot_id=f'REC-D{j+1}',depot_name=f'样例车场 {j+1}',lon=convert(v['pts'][0]['ll'])[0],lat=convert(v['pts'][0]['ll'])[1]))
 requests=[dict(request_id=oid[o['oid']],vehicle_id=vid[o['veh']],o=convert(o['o']),d=convert(o['d']),origin_name=place(o['o']),dest_name=place(o['d']),passengers=o['pax'],request_time=time(o['reqT']),pickup_time=time(o['boardT']),dropoff_time=time(o['dropT']),served=True,carry_in=o['boardT']<start,carry_out=o['dropT']>end) for o in orders]
 box=[min(p['p'][0] for v in vehicles for p in v['track']),min(p['p'][1] for v in vehicles for p in v['track']),max(p['p'][0] for v in vehicles for p in v['track']),max(p['p'][1] for v in vehicles for p in v['track'])]
 rejected=[o for o in raw['orders'] if o.get('status')=='rejected' and start<=o['reqT']<=end and all(box[0]<=convert(o[p])[0]<=box[2] and box[1]<=convert(o[p])[1]<=box[3] for p in ['o','d'])][:4]
 for i,o in enumerate(rejected):requests.append(dict(request_id=f'REC-R{i+1}',o=convert(o['o']),d=convert(o['d']),passengers=o['pax'],request_time=time(o['reqT']),served=False,reason='原场景拒单样本'))
 for o in requests:
  for kind,field in [('order_received','request_time'),('pickup','pickup_time'),('dropoff','dropoff_time')]:
   if field in o and 45000<=o[field]<=47700:events.append(dict(t=o[field],type=kind,request_id=o['request_id'],vehicle_id=o.get('vehicle_id')))
  if not o['served']:events.append(dict(t=o['request_time'],type='reject',request_id=o['request_id']))
 completed=[o for o in requests if o['served'] and 45000<=o['dropoff_time']<=47700];waits=[(o['pickup_time']-o['request_time'])/60 for o in completed]
 shared=sum(any(q['vehicle_id']==o['vehicle_id'] and q['request_id']!=o['request_id'] and max(45000,q['pickup_time'],o['pickup_time'])<min(47700,q['dropoff_time'],o['dropoff_time']) for q in requests if q['served']) for o in requests if o['served'])
 scope={'label':'六辆样例车 · 12:30–13:15','serviceRateAvailable':False,'note':'完成数含跨窗口在车订单；等待仅对片段内完成订单统计；拒单仅为样本，不能计算服务率。'}
 provenance={'origin':'anonymous-recorded-clip','synthetic':False,'crs':'WGS84','dateShifted':True,'selectionRule':'每车场完整窗口订单最多，按峰值载客/上客/轨迹点/身份稳定排序，再补一辆','sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 summary={'completed_in_window':len(completed),'associated_orders':len(orders),'carry_in':sum(o['carry_in'] for o in requests if o['served']),'carry_out':sum(o['carry_out'] for o in requests if o['served']),'avg_wait_min':round(sum(waits)/len(waits),3),'p90_wait_min':round(float(pd.Series(waits).quantile(.9)),3),'pool_rate':round(shared/len(orders),4),'total_km':round(sum(v['km'] for v in vehicles),3),'rejected_samples':len(rejected)}
 result=dict(kind='drt',vehicles=vehicles,requests=requests,depots=depots,events=sorted(events,key=lambda e:e['t']),range=[45000,47700],summary=summary,provenance=provenance,statisticsScope=scope,originalScenarioReference={k:raw['kpi']['summary'][k] for k in ['serveRate','avgWaitMin','p90WaitMin','poolRate','emptyShare','winRate']},validation={'ok':True,'checked':False,'note':'既有片段仅核对截取状态，不作为可重跑输入。'})
 assert len(orders)==38 and len(vehicles)==6
 assert sum(len(v["track"])-2 for v in vehicles)==483
 return dict(id='recorded',algorithmId='recorded_clip',algorithmName='既有 DRT · 匿名片段',kind='drt',params={},summary=summary,validation=result['validation'],createdAt=STAMP,engineVersion='drt-v2-8532e46-recorded',result=result,provenance=provenance)

def generate(source,road,replay):
 tables,mapping=lines(source);profiles=operations(tables);network_info=network(tables,road);tables=canonical_tables(tables)
 provenance={'origin':'bundled-demo','synthetic':False,'demoVersion':2,'seed':SEED,'inputSha256':digest(tables),'entities':{n:('真实线网 / CPTOND 上海' if n in ['stops','routes','route_stops'] else '真实道路几何 / 模拟通行参数' if n.startswith('network_') else '固定种子模拟运营') for n in tables}}
 manifest={'schema':1,'createdAt':STAMP,'crs':'WGS84','entities':{n:{'rows':len(r),'columns':list(r[0])} for n,r in tables.items()},'sources':[{'type':'public-route-subset','routeIds':list(PAIRS)},{'type':'simulated-operations','seed':SEED}],'report':{'imports':[],'warnings':[]},'provenance':provenance};manifest['entities']['routes']['uniqueCount']=8
 with tempfile.TemporaryDirectory() as temp:
  directory=Path(temp)/'version';directory.mkdir()
  for n,r in tables.items():pd.DataFrame(r).to_csv(directory/(n+'.csv'),index=False)
  (directory/'manifest.json').write_text(jsonio.dumps(manifest,ensure_ascii=False));results=[recorded(replay)]
  for identity,aid,params in [('drt-a','drt_v2',{'policy':'A','fleet_size':6,'max_wait_min':15,'snap_radius_m':700}),('drt-b','drt_v2',{'policy':'B','fleet_size':6,'max_wait_min':15,'snap_radius_m':700}),('tripgen','trip_generation',{'day_type':'workday','service_start':'12:30','service_end':'13:15','bin_minutes':30,'capacity':40,'max_headway_min':20}),('fleet','fleet_assignment',{})]:
   target=Path(temp)/identity;meta=algo.run({'algorithm':{'builtin':aid},'versionDir':str(directory),'params':params,'resultDir':str(target)},lambda *_:None);result=json.load(open(target/'result.json'));assert result['validation']['ok'],result['validation']
   origin={**provenance,'origin':'simulated-operations','synthetic':True};result['provenance']=origin;result['synthetic']=True
   results.append(dict(id=identity,algorithmId=aid,algorithmName=algo.BUILTINS[aid].META['name'],createdAt=STAMP,engineVersion='drt-v2-8532e46' if aid=='drt_v2' else 'linggo-builtins-v1',**meta,result=result,provenance=origin))
  bundle=dict(version=2,label='LingGo 真实线网地图演示',provenance=provenance,tables=tables,manifest=manifest,map=versions.map_data(str(directory)),profiles=profiles,routeSources=mapping,networkSource=network_info,results=results)
 return bundle,algo.describe({})
def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--road',type=Path,required=True);p.add_argument('--replay',type=Path,required=True);p.add_argument('--check',action='store_true');a=p.parse_args();bundle,catalog=generate(a.source,a.road,a.replay)
 payload=jsonio.dumps(bundle,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode();wrapper={'version':2,'encoding':'gzip-base64','sha256':hashlib.sha256(payload).hexdigest(),'data':base64.b64encode(gzip.compress(payload,mtime=0)).decode()}
 size=0
 for n,v in [('bundle.json',wrapper),('catalog.json',catalog)]:
  txt=jsonio.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n';size+=len(txt.encode());target=ROOT/'demo'/n
  if a.check:assert target.read_text()==txt,'Stale demo assets'
  else:target.write_text(txt)
 assert size<=1024*1024,size
 print('Assets:',size,'bytes; expanded snapshot:',len(payload),'bytes; five results'); print(bundle['networkSource']);print(bundle['results'][0]['summary'])
if __name__=='__main__':main()
