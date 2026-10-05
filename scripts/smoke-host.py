"""Test an isolated DSH profile. Reads its launch URL without printing credentials."""
import argparse, http.cookiejar, json, re, urllib.request, urllib.error
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('--removed',action='store_true');a=p.parse_args()
text=open(a.log).read()
assert 'did not activate' not in text, 'Host plugin activation failed'
url=re.search(r'http://127\.0\.0\.1:\d+/\?token=\S+',text).group(0)
base=url.split('/?')[0]
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
html=opener.open(url).read().decode()
assert ('dsh-linggo-plugin' in html) != a.removed

def rpc(method,payload):
 body=json.dumps({'type':'client-request','rpcId':'smoke','method':'linggo.'+method,'payload':payload}).encode()
 return json.load(opener.open(urllib.request.Request(base+'/api/linggo.'+method,data=body,headers={'Content-Type':'application/json'})))['result']
if a.removed:
 try:rpc('state',{})
 except urllib.error.HTTPError as e:assert e.code==404
 else:raise AssertionError('Plugin route survived uninstall')
 print('Uninstall: client module and API removed')
else:
 body=json.dumps({'type':'client-request','rpcId':'smoke','method':'linggo.state','payload':{}}).encode()
 try:urllib.request.urlopen(urllib.request.Request(base+'/api/linggo.state',data=body,headers={'Content-Type':'application/json'}))
 except urllib.error.HTTPError as e:assert e.code==401
 else:raise AssertionError('Unauthenticated API admitted')
 launch=rpc('launch',{'desktop':True})['value']['url']
 assert 'linggo=1' in launch and 'desktopReturn=1' in launch
 other=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 response=other.open(launch)
 assert response.status==200 and 'token=' not in response.url
 # Browsers inherit the input fragment when Location has no fragment (DSH redirects to './').
 projects=[rpc('createProject',{'name':'Integration test '+name})['value'] for name in ['A','B']]
 paths=[rpc('directory',{'projectId':x['id'],'mode':'presentation'})['value']['cwd'] for x in projects]
 assert paths[0]!=paths[1]
 assert not rpc('directory',{'projectId':'../outside','mode':'development'})['ok']
 assert not rpc('handoff',{'projectId':'unknown','summary':'test'})['ok']
 h=rpc('handoff',{'projectId':projects[0]['id'],'summary':'Integration check'})['value']
 assert h['projectId']==projects[0]['id']
 assert rpc('state',{})['ok']
 print('Host smoke: authenticated boot, unauthenticated rejection, isolated projects, validated handoff passed')
