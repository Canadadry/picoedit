pico-8 cartridge // http://www.pico-8.com
version 42
__lua__
function n𝘺()w,n0,𝘱,𝘺,n5={},0,0,0,{1,-1,0}n𝘣,nj=f[[{
  0,1,5,
  2,1,13,6,
  2,4,9,3,
  13,5,8,9,0
 }]],f[[{
  0,0,1,
  1,0,5,13,
  1,2,4,5,
  5,1,2,4,0
 }]]poke(24424,40)poke(24419,83)end function n𝘹(d,o,n,e)local n={x=d,y=o,w=n,h=e,cam=n7(n/2,e/2)}return n end function nd(n)for d,e in ipairs(n.f)do no(e,n.v)end 𝘣(n)return n end function no(n,d)n.v={}for e=1,#n do add(n.v,n[e])n[e]=d[n[e]]end end function 𝘣(n)for e,n in pairs(n.f)do n.n=n5 local e,d=n[1]for o=2,#n do local e=nz(e,n[o])if n𝘸(e)>.01do e=nt(e)if d do if(abs(j(d,e))<.99)n.n=nt(n𝘷(e,d))
else d=e end end end n.cp=j(n.n,n[1])end end function 𝘹(e,n,d,o)local n={pos={n or 0,d or 0,o or 0},rot={0,0,0},meshes={},dirty=true}for d,e in ipairs(e)do q(n,nd(e))end return n end function q(n,e)n.dirty,e.model=true,n add(n.meshes,e)end function n7(n,e,d,o,t)return{pos={0,0,0},x0=n,y0=e,xangle=d,yangle=o,zangle=t,near=-2,far=-100,focal=193}end function n𝘨(e,o)local n=n6(e.zangle,e.yangle,e.xangle)local d={n[9],n[10],n[11]}n8(d,o)n[2],n[5],n[3],n[9],n[7],n[10]=n[5],n[2],n[9],n[3],n[10],n[7]for n=1,3do d[n]+=e.pos[n]end e.m=ns(n,{1,0,0,0,0,1,0,0,0,0,1,0,-d[1],-d[2],-d[3],1})end function n9(n,o)local t,f=999,-999for i,d in pairs(o)do local l,c,e=d[1],d[2],d[3]e=e*2/1.90001+.10524t,f=min(e,t),max(e,f)local t=n.focal/(e+8)if(n.orto)t=-n.focal/n.orto
o[i]={x=n.x0+l*t,y=n.y0-c*t,u=d.u,v=d.v,z=e}end return o,t,f end function nx(n,e)if(nf and n.noshade~=1)local n=j(n.n,n5)if n>-.228do pal(nj)elseif n>-.3575do pal(n𝘣)elseif n>-.486do fillp"0b1010010110100101.011"end
palt"0"palt(𝘺,true)e(n,n.c)pal()fillp()end function nv(n,e,d)n0+=1local o,n=nk(n,e),{}for o,d in pairs(o)do nq(d,e,n)end if(𝘱>0)ni(n,"z")
for e,n in pairs(n)do if 𝘱==1or n.notex==1and 𝘱==2do nx(n,n𝘻)elseif 𝘱==2do nx(n,n𝘫)else z(n,d)end end end function nk(n,e)local d={}for o,n in ipairs(n)do if(n.dirty)for e,n in pairs(n.meshes)do n.m1=n6(n.rot[1]+n.model.rot[1],n.rot[2]+n.model.rot[2],n.rot[3]+n.model.rot[3])for e=1,3do n.m1[12+e]=n.pos[e]+n.model.pos[e]end end n.dirty=false
for o,n in pairs(n.meshes)do n.cam=n𝘬(n.m1,e.cam.pos)n.m=ns(e.cam.m,n.m1)add(d,n)end end return d end function nq(t,d,o)for e,n in pairs(t.f)do n.verts=nil local f=j(n.n,t.cam)if 𝘱==0or f>n.cp or n.dbl==1do local e={}for d=1,#n do local o=d*2if(n[d].vrc~=n0)local t=np(t.m,n[d])t.u,t.v=n.uv[o-1],n.uv[o]e[d]=t n[d].vcache,n[d].vrc=t,n0 else e[d]=n[d].vcache e[d].u,e[d].v=n.uv[o-1],n.uv[o]
end e,𝘻,n𝘲=n9(d.cam,e)if d.cam.orto or n𝘲<d.cam.near and 𝘻>d.cam.far do n.verts=e n.z=𝘻 e.z=n.prio and 𝘻-30000or 𝘻 e.c,e.face,e.n=n.c,n,n.n e.noshade,e.notex=n.noshade,n.notex if(f<=n.cp and n.dbl)for n=1,3do e.n[n]=-e.n[n]end n.cp=j(n.n,n[1])
add(o,e)end end end return o end function nz(n,e)return{e[1]-n[1],e[2]-n[2],e[3]-n[3]}end function j(n,e)return n[1]*e[1]+n[2]*e[2]+n[3]*e[3]end function n8(n,e)n[1]*=e n[2]*=e n[3]*=e end function nt(e)local d,o,t=e[1],e[2],e[3]local n=d*d+o*o+t*t if(n>.001)n=n^.5return{d/n,o/n,t/n}
return e end function n𝘷(n,e)local n,e,d,o,t,f=n[1],n[2],n[3],e[1],e[2],e[3]return{e*f-d*t,d*o-n*f,n*t-e*o}end function n𝘬(n,e)local e,d,o=e[1]-n[13],e[2]-n[14],e[3]-n[15]return{n[1]*e+n[2]*d+n[3]*o,n[5]*e+n[6]*d+n[7]*o,n[9]*e+n[10]*d+n[11]*o}end function n𝘸(n)local n,e,d=n[1],n[2],n[3]local o=max(max(abs(n),abs(e)),abs(d))n/=o e/=o d/=o return o*(n*n+e*e+d*d)^.5end function np(n,e)local e,d,o=e[1],e[2],e[3]return{n[1]*e+n[5]*d+n[9]*o+n[13],n[2]*e+n[6]*d+n[10]*o+n[14],n[3]*e+n[7]*d+n[11]*o+n[15]}end function ns(n,e)local d,o,t,f,i,l,c,a,r,e,u,h,s,x,v,p,b,𝘦,𝘢,𝘥,m=n[1],n[5],n[9],n[2],n[6],n[10],n[3],n[7],n[11],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14],e[3],e[7],e[11],e[15]return{d*e+o*x+t*𝘦,f*e+i*x+l*𝘦,c*e+a*x+r*𝘦,0,d*u+o*v+t*𝘢,f*u+i*v+l*𝘢,c*u+a*v+r*𝘢,0,d*h+o*p+t*𝘥,f*h+i*p+l*𝘥,c*h+a*p+r*𝘥,0,d*s+o*b+t*m+n[13],f*s+i*b+l*m+n[14],c*s+a*b+r*m+n[15],1}end function n6(n,e,d)local e,n,d,o,t,f=cos(n),-sin(n),cos(e),-sin(e),cos(d),-sin(d)local i,l,c,a=d*t,d*f,o*t,o*f return{i+a*n,e*f,l*n-c,0,c*n-l,e*t,a+i*n,0,e*o,-n,e*d,0,0,0,0,1}end function n𝘫(t)local n,a=t[#t],{}local e,n,d,o=n.x,n.y,n.u,n.v for f=1,#t do local t=t[f]local f,t,i,l=t.x,t.y,t.u,t.v local u,h,s,x=f,t,i,l if(n>t)e,n,f,t,d,o,i,l=f,t,e,n,i,l,d,o
local c=t-n local f,i,l=(f-e)/c,(i-d)/c,(l-o)/c if(n<0)e-=n*f d-=n*i o-=n*l n=0
local r=ceil(n)local c=r-n e+=c*f d+=c*i o+=c*l for t=r,min(ceil(t)-1,127)do local n=a[t]if n do local n,e,d,o,f,i=n[1],n[2],n[3],e,d,o if(n>o)n,e,d,o,f,i=o,f,i,n,e,d
local l,c=ceil(n),min(ceil(o)-1,127)if(l<=c)local o=o-n local o,f,n=(f-e)/o,(i-d)/o,l-n e+=n*o d+=n*f tline(l,t,c,t,e,d,o,f)
else a[t]={e,d,o}end e+=f d+=i o+=l end e,n,d,o=u,h,s,x end end function n𝘻(d,i)local n,t=d[#d],{}local e,n=n.x,n.y for o=1,#d do local d=d[o]local o,d=d.x,d.y local l,c=o,d if(n>d)e,n,o,d=o,d,e,n
local f=d-n local o=(o-e)/f if(n<0)e-=n*o n=0
local f=ceil(n)local a=f-n e+=a*o for n=f,min(ceil(d)-1,127)do local d=t[n]if d do local e,d=d[1],e if(e>d)e,d=d,e
local e,d=ceil(e),min(ceil(d)-1,127)if(e<=d)rectfill(e,n,d,n,i)
else t[n]={e,e𝘩,e𝘤}end e+=o end e,n=l,c end end function z(n,e)for d=1,#n-1do local n,d=n[d],n[d+1]line(n.x,n.y,d.x,d.y,e)end line(n[1].x,n[1].y,n[#n].x,n[#n].y,e)end function en(e)local t,d,n={" ","\n","	","\r"},""for o=1,#e do local e=sub(e,o,o)if(e=="'")n=not n
if(not 𝘫(t,e)or n)d..=e
end return d end function f(n)n=en(n)local e=sub(n,1,1)if(e=="'")return sub(n,2,#n-1)
if e=="{"do local e,n=𝘬(sub(n,2,#n-1),","),{}for d=1,#e do local e,d=f(e[d])if(d)n[e[1]]=f(e[2])else n[#n+1]=e
end return n end local e=ord(e)if(e>=48and e<=57or e==45)return tonum(n)
return 𝘬(n,"="),true end function 𝘬(n,i)local d,o,t={},1,0for e=1,#n do local f=sub(n,e,e)if(f=="{")t+=1
if(f=="}")t-=1
if(f==i and t==0)add(d,sub(n,o,e-1))e+=1o=e
end add(d,sub(n,o,#n))return d end function 𝘫(e,n)for d,e in pairs(e)do if(e==n)return n
end return end function ni(e,d)for n=1,#e do local n=n while(n>1and e[n-1][d]>e[n][d])e[n],e[n-1]=e[n-1],e[n]n=n-1
end end function _init()ee="1.0.2"cartdata"jppicocad"p=0poke(24365,1)poke(24374,8)n𝘺()𝘸,𝘷=f"{-1,1,0,0}",f"{0,0,-1,1}"local n=𝘹()q(n,nb(1))e1={n}e0=f"{'c','dbl','noshade','notex','prio'}"n𝘦()end function n𝘢(n)𝘢,𝘮,𝘦=16,false,{}add(𝘦,𝘲(unpack(f[[{
0,8, 64,56,
3,1,-1,-1,
31.5,36.5,
0,-1,0,
0,0.25,0.25,
2,0
}]])))add(𝘦,𝘲(unpack(f[[{
0,64, 64,56, 3,2,-1,-1,
31.5,100.5,
1,0,0,
0,0.25,0,
1,3
}]])))add(𝘦,𝘲(unpack(f[[{
64,64, 64,56, 1,2,1,-1,
95.5,100.5,
0,0,1,
0,0,0,
3,2
}]])))add(𝘦,𝘲(unpack(f[[{
64,8, 64,56, 1,3,0,0,
95.5,52.5,
0,-0.5,1,
0,0.02,0.04,
0,0
}]]))).bg=n 𝘦[4].cam.orto=nil nl()end function n𝘦()reload()n𝘢(1)𝘰,b,u=0,0,false w,𝘳,𝘪,nn={},{},{},nil o=add(w,𝘹())nc,n2=0,0n𝘥(𝘦[4])n=dget"0"+1dset(0,n)y="unnamed_"..n end function _draw()local n=𝘦[4].cam.pos n5=nt{-n[1],-n[2]+.5*𝘢*cos(𝘦[4].cam.zangle),-n[3]}r,a,𝘴=stat"32",stat"33",stat"34"v,𝘨=not 𝘨 and 𝘴>0,𝘴>0if(k)r,a=55537,55537
if(not i)h=𝘮
if not h or u do for e,n in ipairs(𝘦)do n.active=𝘩(r,a,n.x,n.y,n.w,n.h)if(n.active)h=n
end end for e,n in ipairs(𝘦)do if(n.full or not 𝘮)e5(n)
end if(u)ed()
clip()if(not k)eo()
if stat"30"do local n=stat"31"if n=="セ"do nm()elseif n=="キ"do na{}elseif n=="m"and not i do n𝘰(𝘤[3])elseif n=="l"do n𝘪()elseif n=="f"do n𝘴()elseif n=="v"do n𝘵{tex=not u}elseif h and n==" "and not u do nr(h)i=nil elseif u do if(n=="r"and 𝘵)et(𝘵 or c)s()
elseif c do if n=="e"do n𝘭(c)elseif n=="y"or n=="u"do ef(c.mesh,n=="y"and.8or 1.25)elseif n=="r"or n=="t"do n𝘳(c.mesh,h.cvx,n=="r"and-0x.1or 0x.1)end end end if(stat"120")ei()nn=true s()
if(stat"121")el()
local n=stat"36"if(n~=0and(not u or a<64))nl{p=-sgn(n)}
if h and not i do if v do if 𝘴==2do if c do ne(ec)elseif not u do ny()end elseif 𝘴==1do if(c and h.id~=4)e2(c.mesh,h)
end end end if(stat"0">1500or#𝘪>50)nn=deli(𝘪,1)or nn
end function ed()clip(0,64,128,56)rectfill(0,64,127,119,0)map(0,b/8,0,64,16,7)if(c)fillp"0b1010010110100101.1"n𝘯(c)fillp()
𝘶=nil local e=0if 𝘵 do n𝘯(𝘵)for n in all(𝘥)do if(n.selected)circfill(n.x,n.y-b,2,0)circfill(n.x,n.y-b,1,7)e+=1
end ea=nw(𝘥,{x=r,y=a+b})if v do if ea and not 𝘶 do for n in all(𝘥)do n.selected=true end n𝘱()else local e,d for n in all(𝘥)do local o,t=r-n.x,a-n.y+b if abs(o)<3and abs(t)<3do if(not n.selected)e=n
n𝘱()n.selected,d=true,true end end if e and not btn"5"or not d do for n in all(𝘥)do if(n~=e)n.selected=false
end end end end if a>63do if(not i)c=nil
for e=1,4do if btnp(e-1)do for n in all(𝘥)do if(n.selected)n.face.uv[n.i]+=.25*𝘸[e]n.face.uv[n.i+1]+=.25*𝘷[e]nu(n)
end s()end end end end if a>63do if(btnp"2"and e==0or stat"36">0)b=max(0,b-8)
if(btnp"3"and e==0or stat"36"<0)b=min(64,b+8)
end if 𝘭 do for n in all(𝘥)do if n.selected do local e,d,o,t=(r-n.omx)/8,(a-n.omy)/8,n.face.uv[n.i],n.face.uv[n.i+1]local e,d=n.ou+e,n.ov+d if(not btn(🅾️))e,d=flr(e*4)/4,flr(d*4)/4
if(o~=e or t~=d)n.face.uv[n.i],n.face.uv[n.i+1],𝘯=e,d,true nu(n)
end end if(not 𝘨)𝘭=false if(𝘯)s()
end if(𝘦[4].active and not c and v and not e𝘶)_()
end function et(n)for e=1,2do add(n.uv,deli(n.uv,1))end n𝘮(n)end function n𝘮(n)𝘥={}for e=1,#n.uv,2do nu(add(𝘥,{i=e,face=n}))end end function nu(n)n.x,n.y=8*n.face.uv[n.i],64+8*n.face.uv[n.i+1]end function n𝘯(n)local d={}for e=1,#n.uv,2do local o,t=8*n.uv[e],64+8*n.uv[e+1]-b local d,d,f,i=add(d,{x=o,y=t,face=n,i=e}),r-o,a-t,n[(e+1)\2]i.mouse_over=false if(abs(d)<3and abs(f)<3)𝘶=true n[(e+1)\2].mouse_over=true circ(o,t,3,8)
end z(d,nh())return d end function n𝘱()𝘭,𝘯=true,false for n in all(𝘥)do n.ou,n.ov,n.omx,n.omy=n.face.uv[n.i],n.face.uv[n.i+1],r,a end end function 𝘲(n,e,d,o,t,f,i,l,c,a,r,u,h,s,x,v,p,b)local n=n𝘹(n,e,d,o)n.cam=n7(c,a,s,x,v)local e=n.cam e.orto,e.pos,e.near=𝘢,{r,u,h},-10n1(n,{bg=13,mx=t,my=f,dx=i,dy=l,cvx=p,cvy=b,id=1+#𝘦,fog=nil})return n end function n𝘥(n)for n=1,4do if(btn(n-1))nc+=𝘸[n]n2+=𝘷[n]
end local n=n.cam n.yangle+=nc/256n.zangle+=n2/256nc*=.8n2*=.8n3(n)end function n3(n)local e=𝘢 n.pos={e*cos(n.zangle)*cos(-.25+n.yangle),e*cos(-.25-n.zangle),e*cos(n.zangle)*sin(-.25+n.yangle)}end function e5(n)local e=n.id<4clip()n𝘨(n.cam,8)rectfill(n.x,n.y,n.x+n.w-1,n.y+n.h-1,n.bg)clip(n.x,n.y,n.w,n.h)if n.active and not i do if not e and not d do n𝘥(n)elseif#𝘳>0do if e do local d for o in all(𝘳)do for e=1,4do if(btnp(e-1))o.v[n.mx]-=.25*n.dx*𝘸[e]o.v[n.my]-=.25*n.dy*𝘷[e]d=true
end end if(d)for n in all(o.meshes)do 𝘣(n)end s()
end elseif not d do for n=1,4do if btnp(n-1)do h.cam.x0-=8*𝘸[n]h.cam.y0-=8*𝘷[n]if(h.cvx>0)𝘦[h.cvx].cam.x0-=8*𝘸[n]
if(h.cvy>0)𝘦[h.cvy].cam.y0-=8*𝘷[n]
end end end end 𝘱=p if(e or p==0)𝘱=0fillp"0b1010010110100101.1"nv(e1,n,5)fillp()
nv(w,n,6)palt()if(e or p==0or u and 𝘶)er(n)
if not i and n.active and not 𝘭 and not l and not 𝘶 do c=nil local n={}for e,d in ipairs(o.meshes)do for e in all(d.f)do local o=e.verts if(o)if(nw(o,{x=r,y=a}))e.mesh=d add(n,e)
end end if(#n>0and not btn"5")ni(n,"z")c=n[#n]
end if c and c.verts do fillp(42405.5)z(c.verts,nh())fillp()if(p==0or e)z(n9(n.cam,{np(c.mesh.m,{0,0,0})}),8)
if(v and 𝘴==1and u)𝘵=c n𝘮(𝘵)
end if(𝘵)if(𝘵.verts)z(𝘵.verts,nh())
if n.active and not c and(e or p==0)and not 𝘶 and not 𝘭 do if not l do if(𝘴==1)l={x=r,y=a,w=0,h=0}
else l.w=r-l.x l.h=a-l.y if not 𝘨 do if(l.w<0)l.x+=l.w l.w=-l.w
if(l.h<0)l.y+=l.h l.h=-l.h
for n,d in pairs(o.meshes)do for e,n in pairs(d.f)do if n.verts do for e=1,#n do local o=n.verts[e]if(𝘩(o.x,o.y,l.x,l.y,l.w,l.h))if(not n[e].selected)n[e].selected=true n[e].v=n[e]n[e].mesh=d add(𝘳,n[e])
end end end end l=nil end end end if(l)fillp"0b0101101001011010.1"rect(l.x,l.y,l.x+l.w,l.y+l.h,6)fillp()
if(n.active and not n.full)rect(n.x,n.y,n.x+n.w-1,n.y+n.h-1,7)
end function er(t)local d={}for n,i in pairs(o.meshes)do for n,o in pairs(i.f)do for f=1,#o do local e=o[f]if o.verts do local n=o.verts[f]if(e.mouse_over)circ(n.x,n.y,3,8)
if e.selected do circfill(n.x,n.y,2,0)circfill(n.x,n.y,1,7)elseif not u do pset(n.x,n.y,5)end if(t.active and not l)e.mouse_over=false local t,l=r-n.x,a-n.y if(not c and abs(t)<3and abs(l)<3)e.z=n.z e.v=o[f]e.mesh=i add(d,e)
end end end end if t.active do 𝘶=false if#d>0do ni(d,"z")local n=d[#d]n.mouse_over,𝘶=true,true if v and 𝘴==1do if(not btn"5"and not n.selected)n𝘩()
if(not n.selected)add(𝘳,n)
n.selected=true eu(t)end else if(𝘴==1and v and not btn"5")_(true)
end if(𝘭)if(x)eh()else e3()
end end function eu(e)𝘭,𝘯=true,false for d,n in pairs(𝘳)do n.ox=n.v[e.mx]n.oy=n.v[e.my]n.view=e n.mx=r n.my=a end end function e3()if 𝘨 do for e,n in pairs(𝘳)do local o,t,e,d=n.v[n.view.mx],n.v[n.view.my],n.view.dx*(n.mx-r)*𝘢/200,n.view.dy*(n.my-a)*𝘢/200local e,d=n.ox+e,n.oy+d e,d=n𝘤(e,d)if(o~=e or t~=d)𝘯=true n.v[n.view.mx],n.v[n.view.my]=e,d 𝘣(n.mesh)
end else 𝘭=false if(𝘯)s()
end end function n𝘤(n,e)if(btn(🅾️))return n,e
return flr((n+.125)*4)/4,flr((e+.125)*4)/4end function e2(n,e)𝘭,𝘯=true,false x=n n.ox,n.oy=n.pos[e.mx],n.pos[e.my]n.view,n.mx,n.my=e,r,a end function eh()if 𝘨 do local n=x.view local o,t,e,d=x.pos[n.mx],x.pos[n.my],x.ox+n.dx*(x.mx-r)*𝘢/200,x.oy+x.view.dy*(x.my-a)*𝘢/200e,d=n𝘤(e,d)if(o~=e or t~=d)x.pos[n.mx],x.pos[n.my]=e,d 𝘯,x.model.dirty=true,true
else 𝘭,x=false,nil if(𝘯)s()
end end function e4(n)𝘮,n.full=n,true n1(n,{o_x=n.x,o_y=n.y,o_w=n.w,o_h=n.h,x=0,y=8,w=128,h=56})n.cam.x0-=32end function nr(n,o)local e,d=f"{32,32,-32,-32}",f"{32,-32,-32,32}"if n.full do 𝘮,n.full=nil,nil n.x,n.y=n.o_x,n.o_y n.w,n.h=n.o_w,n.o_h n.cam.x0-=e[n.id]if(not o)n.cam.y0-=d[n.id]
else 𝘮,n.full=n,true n.o_x,n.o_y=n.x,n.y n.o_w,n.o_h=n.w,n.h n.cam.x0+=e[n.id]n.cam.y0+=d[n.id]n1(n,f"{x=0,y=0,w=128,h=128}")end end function s()local e,n=𝘰,{}𝘰=0for e in all(o.meshes)do local e=n4(e)add(n,e)𝘰+=#e end add(𝘪,n)if(𝘰>16384)m"😐 project limit reached"nm()𝘰=e
end function nm()if(#𝘪<2and nn)return m"😐 no more undos"
w,𝘰={},0deli(𝘪,#𝘪)local n=𝘪[#𝘪]if(n and#n>0)local n="{"..g(n,",").."}"o=𝘹(f(n))𝘰+=#n else o=𝘹()
add(w,o)_()end function n4(n)local e="{\n name='"..n.name.."', pos={"..g(n.pos,",").."}, rot={"..g(n.rot,",").."},\n v={"for d=1,#n.v do e..="\n  {"..g(n.v[d],",").."}"if(d~=#n.v)e..=","
end e..="\n },\n f={"for o=1,#n.f do local t,d=n.f[o],"\n  {"d..=g(t.v,",")for n in all(e0)do if(t[n])d..=", "..n.."="..t[n]
end d..=", uv={"..g(n.f[o].uv,",").."} }"if(o~=#n.f)d..=","
e..=d end e..="\n } \n}"return e end function n1(n,e)for e,d in pairs(e)do n[e]=d end end function g(n,d)local e=""for o=1,#n do e..=n[o]if(o~=#n and d)e..=d
end return e end function nh()local n=f"{5,6,7,6}"return n[1+flr(t()*5)%#n]end function nw(e,n)local t,o=#e for f=1,#e do local e,d=e[f],e[t]if(e.y<n.y and d.y>=n.y or d.y<n.y and e.y>=n.y)if(e.x+(n.y-e.y)/(d.y-e.y)*(d.x-e.x)<n.x)o=not o
t=f end return o end function 𝘧(n)serial(n,17152,1)return peek"0x4300"end function n𝘶()local e,n=""while(stat"120"and n~=10and n~=13)n=𝘧"0x800"e..=chr(n)
return sub(e,1,#e-1)end function e7(n)return 𝘫(𝘬("_, ,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,0,1,2,3,4,5,6,7,8,9",","),n)end function 𝘩(n,e,d,o,t,f)return n>=d and n<d+t and e>=o and e<o+f end function el()local n,e=𝘧"0x802"+𝘧"0x802",𝘧"0x802"+𝘧"0x802"for e=0,min(e-1,119)do for n=0,n-1do local d=𝘧(2050)sset(n,e,d)end end while(stat"121")𝘧"0x802"
for n=0,14do for e=0,15do mset(e,n,e+n*16)end end m"texture imported"end function n𝘭(n)local e,d={},{c=n.c,uv={}}for o,f in ipairs(n)do local t={}for e=1,3do add(t,f[e]+n.n[e])end add(n.mesh.v,t)add(e,{n.v[o],#n.mesh.v})add(d,#n.mesh.v)add(d.uv,n.uv[(o-1)*2+1])add(d.uv,n.uv[o*2])end for d=1,#e do local o,t,e,d=e[d],e[d%#e+1],n.uv[1],n.uv[2]local e=add(n.mesh.f,{o[2],o[1],t[1],t[2],c=n.c,uv={e,d,e+1,d,e+1,d+1,e,d+1}})no(e,n.mesh.v)end local e=add(n.mesh.f,d)no(e,n.mesh.v)del(n.mesh.f,n)𝘣(n.mesh)s()end e6={"{name='origo', pos={0,0,0},rot={0,0,0},v={{5,0,0},{-5,0,0},{0,-5,0},{0,0,0},{0,0,5},{0,0,-5}},f={{3,4,3,4,uv={0,0,1,0}},{1,2,1,2,uv={0,0,1,0}},{5,6,5,6,uv={0,0,1,0}}}}","{name='pyramid',pos={0,0,0},rot={0,0,0},v={{-0.5,0.5,-0.5},{0.5,0.5,-0.5},{0.5,0.5,0.5},{-0.5,0.5,0.5},{0,-0.5,0}},f={{1,2,3,4,c=8,uv={1.5,0.5,2.5,0.5,2.5,1.5,1.5,1.5}},{5,2,1,c=8,uv={2,0.5,2.5,1.5,1.5,1.5}},{5,3,2,c=8,uv={2,0.5,2.5,1.5,1.5,1.5}},{5,4,3,c=8,uv={2,0.5,2.5,1.5,1.5,1.5}},{5,1,4,c=8,uv={2,0.5,2.5,1.5,1.5,1.5}}}}","{name='prism',pos={0,0,0},rot={0,0,0},v={{0,-0.5,-0.5},{0.5,0.5,-0.5},{-0.5,0.5,-0.5},{0,-0.5,0.5},{0.5,0.5,0.5},{-0.5,0.5,0.5}},f={{1,2,3,c=10,uv={4,0.5,4.5,1.5,3.5,1.5}},{4,6,5,c=10,uv={4,0.5,4.5,1.5,3.5,1.5}},{1,4,5,2,c=10,uv={3.5,0.5,4.5,0.5,4.5,1.5,3.5,1.5}},{5,6,3,2,c=10,uv={3.5,0.5,4.5,0.5,4.5,1.5,3.5,1.5}},{4,1,3,6,c=10,uv={3.5,0.5,4.5,0.5,4.5,1.5,3.5,1.5}}}}","{name='cube',pos={0,0,0},rot={0,0,0},v={{-0.5,-0.5,-0.5},{0.5,-0.5,-0.5},{0.5,0.5,-0.5},{-0.5,0.5,-0.5},{-0.5,-0.5,0.5},{0.5,-0.5,0.5},{0.5,0.5,0.5},{-0.5,0.5,0.5}},f={{1,2,3,4,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}},{6,5,8,7,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}},{5,6,2,1,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}},{5,1,4,8,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}},{2,6,7,3,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}},{4,3,7,8,c=11,uv={5.5,0.5,6.5,0.5,6.5,1.5,5.5,1.5}}}}","{name='pentagonalprism',pos={0,0,0},rot={0,0,0},v={{0.7496,0.5,0.5005},{-0.2497,0.5,0.75},{-0.7499,0.5,0},{-0.2497,0.5,-0.75},{0.7498,0.5,-0.5002},{0.7496,-0.5,0.5005},{-0.2497,-0.5,0.75},{-0.7499,-0.5,0},{-0.2497,-0.5,-0.75},{0.7498,-0.5,-0.5002}},f={{1,2,3,4,5,c=12,uv={7.5,1.5,7.25,0.5,8,0,8.75,0.5,8.5,1.5}},{7,6,10,9,8,c=12,uv={8.75,0.5,8.5,1.5,7.5,1.5,7.25,0.5,8,0}},{2,7,8,3,c=12,uv={7.5,1.5,7.5,0.5,8.5,0.5,8.5,1.5}},{3,8,9,4,c=12,uv={7.5,1.5,7.5,0.5,8.5,0.5,8.5,1.5}},{4,9,10,5,c=12,uv={7.5,1.5,7.5,0.5,8.5,0.5,8.5,1.5}},{6,1,5,10,c=12,uv={8.5,0.5,8.5,1.5,7.5,1.5,7.5,0.5}},{1,6,7,2,c=12,uv={7.5,1.5,7.5,0.5,8.5,0.5,8.5,1.5}}}}","{name='hexagonalprism',pos={0,0,0},rot={0,0,0},v={{0.75,-0.5,0.5},{0.75,-0.5,-0.5},{0,-0.5,-1},{-0.75,-0.5,-0.5},{-0.75,-0.5,0.5},{0,-0.5,1},{0.75,0.5,0.5},{0.75,0.5,-0.5},{0,0.5,-1},{-0.75,0.5,-0.5},{-0.75,0.5,0.5},{0,0.5,1}},f={{1,2,3,4,5,6,c=15,uv={9.5,0.25,10.5,0.25,11,1,10.5,1.75,9.5,1.75,9,1}},{8,7,12,11,10,9,c=15,uv={9.5,0,10.5,0,11,1,10.5,2,9.5,2,9,1}},{2,8,9,3,c=15,uv={10.5,0.5,10.5,1.5,9.5,1.5,9.5,0.5}},{3,9,10,4,c=15,uv={10.5,0.5,10.5,1.5,9.5,1.5,9.5,0.5}},{4,10,11,5,c=15,uv={10.5,0.5,10.5,1.5,9.5,1.5,9.5,0.5}},{12,6,5,11,c=15,uv={9.5,1.5,9.5,0.5,10.5,0.5,10.5,1.5}},{6,12,7,1,c=15,uv={10.5,0.5,10.5,1.5,9.5,1.5,9.5,0.5}},{1,7,8,2,c=15,uv={10.5,0.5,10.5,1.5,9.5,1.5,9.5,0.5}}}}","{name='cylinder',pos={0,0,0},rot={0,0,0},v={{0.75,-0.5,-0.25},{0.25,-0.5,-0.75},{-0.25,-0.5,-0.75},{-0.75,-0.5,-0.25},{-0.75,-0.5,0.25},{-0.25,-0.5,0.75},{0.25,-0.5,0.75},{0.75,-0.5,0.25},{0.75,0.5,-0.25},{0.25,0.5,-0.75},{-0.25,0.5,-0.75},{-0.75,0.5,-0.25},{-0.75,0.5,0.25},{-0.25,0.5,0.75},{0.25,0.5,0.75},{0.75,0.5,0.25}},f={{1,2,3,4,5,6,7,8,c=7,uv={11.5,0,12.5,0,13,0.5,13,1.5,12.5,2,11.5,2,11,1.5,11,0.5}},{16,15,14,13,12,11,10,9,c=7,uv={11,0.5,11.5,0,12.5,0,13,0.5,13,1.5,12.5,2,11.5,2,11,1.5}},{1,9,10,2,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{2,10,11,3,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{3,11,12,4,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{4,12,13,5,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{5,13,14,6,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{6,14,15,7,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{7,15,16,8,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}},{8,16,9,1,c=7,uv={12.5,0.5,12.5,1.5,11.5,1.5,11.5,0.5}}}}","{name='plane',pos={0,0,0},rot={0,0,0},v={{-1,0,-1},{1,0,-1},{-1,0,1},{1,0,1}},f={{3,4,2,1,c=6,dbl=1,uv={13,0,15,0,15,2,13,2}}}}"}function nb(n)return nd(f(e6[n]))end function e8(n)local e=n.hover_face local n=e.mesh del(n.f,e)if#n.f==0do del(o.meshes,n)else local e={}for n in all(n.f)do for n in all(n.v)do if(not 𝘫(e,n))add(e,n)
end end for d=#n.v,1,-1do if not 𝘫(e,d)do deli(n.v,d)for n in all(n.f)do for e=1,#n.v do local o=n.v[e]if(o>d)n.v[e]-=1
end end end end end s()end function ef(n,e)for n in all(n.v)do n8(n,e)end s()end function n𝘳(n,o,t)local e,d=2,3if(o==2)e=1
if(o==3)e,d=1,2
for n in all(n.v)do local o,f=sqrt(n[e]*n[e]+n[d]*n[d]),atan2(n[e],n[d])n[e]=o*cos(f+t)n[d]=o*sin(f+t)end n.model.dirty=true 𝘣(n)s()end function eo()rectfill(0,0,127,7,8)?"   𝘱𝘪𝘤𝘰cad",1,1,15
rectfill(0,120,127,127,d and 2or 8)line(-128,127,𝘰/64-127,127,𝘰<14000and 2or 15)if d do?es..d..(band(t(),.9961)<.5and""or"_"),1,121,14
local n if(𝘩(r,a,121,120,6,6))pal(15,8)pal(8,15)n=v
spr(242,122,121)pal()if not n do local n=stat"31"local e=ord(n)if(n=="p"or e==13)poke(24368,1)
if e==8do d=sub(d,1,#d-1)elseif e==13do e9{}d=nil elseif e7(n)do d..=n end else d=nil end else?y,12,121,15
if i and not k do i.uf(i)if(v and i)if(not 𝘩(r,a,i.x,i.y,i.w,i.h))i=nil
end for n in all(𝘤)do if n.on do pal(2,15)elseif n.cb==11do pal(2,𝘦[4].bg)pal(15,𝘺)end spr(n.id,n.x,n.y)pal()if(v)if(𝘩(r,a,n.x,n.y,8,7))n_[n.cb](n)
end end if e do e.y+=e.dy if(e.y<=120)e.dy=0e.delay-=1if(e.delay<=0)e.dy=1
rectfill(0,e.y,127,127,15)?e.str,1,e.y+2,8
if(e.y>127)e=nil
end spr(255,r,a)if(btn"5"and(p==0or u and a>63))spr(249,r,a)
end function m(n)e={y=128,dy=-2,delay=60,str=n}end function ne(n,e)i=n i.uf=n𝘧 i.x,i.y=min(e or r,127-i.w),min(a,120-#i.data*7)end function n𝘧(e)local d,o=e.x,e.y for n=1,#e.data do local n,o,t,f=e.data[n],o+(n-1)*7,14,2if 𝘩(r,a,d,o,e.w,7)do t,f=f,t if(v and 𝘴==1)if(n.cb)i=nil n.hover_face=c n_[n.cb](n)
end rectfill(d,o,d+e.w,o+6,f)local e=n.txt if(n.p)e=(c[n.p]and"𝘹 "or"  ")..e
?e,d+1,1+o,t
end end function ex(n)local d,o=min(n.x+4,100),n.y+4rectfill(d-1,o-7,d-4+28*n.n,o+24,2)?n.head,d,o-6,14
for e=0,15do for t=0,n.n*28-28,28do local d,o=d+6*(e%4)+t,o+6*flr(e/4)rectfill(d,o,d+5,o+5,e)if 𝘩(r,a,d,o,6,6)do rect(d,o,d+5,o+5,e<6and 6or 0)if v do if n.hover_face do if(n.mesh)for n in all(c.mesh.f)do n.c=e end
n.hover_face.c=e else if(t==0)𝘦[4].bg=e else 𝘺=e
end s()i=nil end end end end end function ev()fillp"0b1010010110100101.1"rectfill(0,0,127,127,5)fillp()rectfill(11,17,116,110,14)?"  ⁶i    ★  𝘱𝘪𝘤𝘰cad  ★    ⁶-i\n    ᶜf𝘢 𝘵𝘪𝘯𝘺 𝘮𝘰𝘥𝘦𝘭𝘭𝘦𝘳 𝘧𝘰𝘳 \n        𝘵𝘪𝘯𝘺 𝘮𝘰𝘥𝘦𝘭𝘴\n\n  ᶜ2c𝘳𝘦𝘢𝘵𝘦𝘥 𝘣𝘺 @ᶜfj𝘰𝘩𝘢𝘯p𝘦𝘪𝘵𝘻\n\n ᶜ23𝘥 𝘮𝘢𝘵𝘩 𝘢𝘯𝘥 𝘧𝘪𝘭𝘭 𝘳𝘰𝘶𝘵𝘪𝘯𝘦𝘴\n       𝘣𝘺 @ᶜffs𝘰𝘶𝘤𝘩𝘶\n\n   ᶜ2pico-8 𝘣𝘺 @ᶜfl𝘦𝘹𝘢𝘭𝘰𝘧𝘧𝘭𝘦\n\n ᶜ7p𝘳𝘰 𝘵𝘪𝘱 - 𝘳𝘦𝘢𝘥 𝘵𝘩𝘦 𝘮𝘢𝘯𝘶𝘢𝘭\n\n   ᶜ2𝘱𝘳𝘦𝘴𝘴 ❎ 𝘵𝘰 𝘤𝘰𝘯𝘵𝘪𝘯𝘶𝘦\n\n\n\nᶜ7⁴d³3                         "..ee,11,22,7
while(not btn(❎))flip()
end function n𝘰(n)p+=1if(p>2)p=0
n.id=250+p end function ep()extcmd"folder"m"output folder opened"end function _(n)n𝘩()𝘥,𝘵={},nil if(not n)c=nil
end function n𝘩()for n in all(𝘳)do n.selected,n.mouse_over=false,false end 𝘳={}end function nl(n)if(n)𝘢=max(5,𝘢+n.p)
for n=1,3do 𝘦[n].cam.orto=𝘢 end n3(𝘦[4].cam)end function eb()i=e𝘦 i.uf=n𝘧 end function e𝘢(n)i=e𝘥 i.hover_face,i.mesh=nil,nil i.w=n.w n1(i,{head=n.head,n=n.n,x=min(r-5,127-i.w),y=max(a,11),hover_face=n.n==1and c,uf=ex,mesh=n.mesh})end function em()ne(e𝘰)end function n𝘴()if(c)ne(e𝘪)
end function e𝘴(n)if(c[n.p])c[n.p]=nil else c[n.p]=1
s()end function e𝘵(n)n𝘭(c)end function e𝘭(n)n𝘳(c.mesh,h.cvx,.125)end function e𝘳(n)del(o.meshes,c.mesh)_()s()end function ey(n)q(o,nb(n.id))s()end function e𝘯(n)local n=nd(f(n4(c.mesh)))n.pos[2]-=1.5q(o,n)s()end function n𝘵(n)_()if n.tex and not u do u=true 𝘤[1].on,𝘤[2].on=not u,u if(𝘮)nr(𝘮)
e4(𝘦[4])else if(u)u=false 𝘤[1].on,𝘤[2].on=not u,u nr(𝘦[4],true)else n𝘢(𝘦[4].bg)
end end function n𝘪(n)nf=not nf 𝘤[4].on=nf end function ei(n)local n,e=𝘬(n𝘶(),";")if(n[1]=="picocad")y,e_=n[2],tonum(n[3])𝘦[4].bg,𝘺=tonum(n[4]),tonum(n[5])else e=true
ng=""while(stat"120")ng..=n𝘶()
if(e)m"😐 project not recognized"return
local n=split(ng,"%",false)_()𝘪,w={},{}o=add(w,𝘹(f(n[1])))if(n[2])for e=0,119do for d=0,127do local o=1+d+e*128local n=sub(n[2],o,o)sset(d,e,tonum("0x"..n))end end
m(y.." loaded")end function ew(n)es,d,e9="s𝘢𝘷𝘦 𝘢𝘴: ",y,na end function na(n)if(#o.meshes==0)return m"😐 cannot save empty project"
if(d=="")return m"😐 no filename specified"
if(d)y=d
local n=y..".txt"printh("picocad;"..y..";"..𝘢..";"..𝘦[4].bg..";"..𝘺,n,true)local e=""for n,d in ipairs(o.meshes)do e..=n4(d)if(n<#o.meshes)e..=","
end printh("{\n"..e.."\n}%",n)local d=f"{'0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'}"for o=0,119do local e=""for n=0,127do e..=d[sget(n,o)+1]end printh(e,n)end m(n.." saved")end function e𝘱(e)i,l,k=nil,nil,true local n=𝘦[4].cam local o,t=n.yangle,btn"5"and-1or 1_()extcmd("set_filename",y.."_%d")for d=0,e.spd do if(d==1)extcmd"rec_frames"
n.yangle=o+t*d/e.spd n3(n)_draw()if(k and h and h.full)?": ³a# ³a:³f𝘱𝘪𝘤𝘰cad",92,121,h.bg+8
flip()end extcmd("video",0,1)k=m"gif saved"extcmd("set_filename","picocad_%d")end function ny(n)ne(e𝘮,n and 0)end n_={e𝘧,n𝘰,nl,eb,ey,ep,n𝘦,em,ny,nil,e𝘢,e𝘵,e8,na,ew,e𝘳,e𝘯,eg,n𝘪,n𝘵,ev,e𝘭,e𝘱,n𝘴,e𝘴}𝘤=f[[{
{id=247,x=112,y=1,cb=20,on=1},
{id=248,x=120,y=1,cb=20,tex=1},
{id=250,x=64,y=1,cb=2},
{id=243,x=72,y=1,cb=19},
{id=246,x=80,y=1,cb=11,w=56,head='𝘣𝘨     𝘢𝘭𝘱𝘩𝘢',n=2},
{id=253,x=112,y=120,p=1,cb=3},
{id=254,x=120,y=120,p=-1,cb=3},
{id=244,x=0,y=-1,cb=4},
{id=245,x=2,y=120,cb=9}
}]]e𝘮=f[[{
w=56,h=36,
data={
{txt='𝘢𝘥𝘥 p𝘺𝘳𝘢𝘮𝘪𝘥', cb=5, id=2},
{txt='𝘢𝘥𝘥 p𝘳𝘪𝘴𝘮', cb=5, id=3},
{txt='𝘢𝘥𝘥 c𝘶𝘣𝘦', cb=5, id=4},
{txt='𝘢𝘥𝘥 p𝘦𝘯𝘵.𝘱𝘳𝘪𝘴𝘮', cb=5, id=5},
{txt='𝘢𝘥𝘥 h𝘦𝘹.𝘱𝘳𝘪𝘴𝘮', cb=5, id=6},
{txt='𝘢𝘥𝘥 c𝘺𝘭𝘪𝘯𝘥𝘦𝘳', cb=5, id=7},
{txt='𝘢𝘥𝘥 p𝘭𝘢𝘯𝘦', cb=5, id=8}
}
}]]ec=f[[{
w=52,h=24,
data={
{txt='c𝘰𝘭𝘰𝘳 𝘮𝘦𝘴𝘩', w=23,cb=11, mesh=1, head='𝘮𝘦𝘴𝘩',n=1},
{txt='e𝘹𝘵𝘳𝘶𝘥𝘦 𝘧𝘢𝘤𝘦', cb=12},
{txt='r𝘰𝘵𝘢𝘵𝘦 𝘮𝘦𝘴𝘩', cb=22},
{txt='f𝘢𝘤𝘦 𝘱𝘳𝘰𝘱𝘴...', cb=24},
{txt='c𝘭𝘰𝘯𝘦 𝘮𝘦𝘴𝘩', face=1, cb=17},
{txt='d𝘦𝘭𝘦𝘵𝘦 𝘧𝘢𝘤𝘦', cb=13},
{txt='d𝘦𝘭𝘦𝘵𝘦 𝘮𝘦𝘴𝘩', cb=16}
}
}]]e𝘪=f[[{
w=52,h=24,
data={
{txt='𝘤𝘰𝘭𝘰𝘳', w=23, cb=11, 2=26, p='f', head='𝘧𝘢𝘤𝘦',n=1},
{txt='d𝘣𝘭-𝘴𝘪𝘥𝘦𝘥', cb=25, p='dbl'},
{txt='n𝘰 𝘴𝘩𝘢𝘥𝘪𝘯𝘨', cb=25, p='noshade'},
{txt='n𝘰 𝘵𝘦𝘹𝘵𝘶𝘳𝘦', cb=25, p='notex'},
{txt='d𝘳𝘢𝘸 b𝘦𝘩𝘪𝘯𝘥', cb=25, p='prio'}
}
}]]e𝘦=f[[{
x=0, y=8, w=52, h=54,
data={
{txt='n𝘦𝘸', cb=7},
{txt='v𝘪𝘦𝘸 𝘧𝘪𝘭𝘦𝘴', cb=6},
{txt='s𝘢𝘷𝘦', cb=14},
{txt='s𝘢𝘷𝘦 𝘢𝘴...', cb=15},
{txt='e𝘹𝘱𝘰𝘳𝘵 gif...', cb=8},
{txt=' ', p8l=1},
{txt='a𝘣𝘰𝘶𝘵', p8l=1, cb=21}
}
}]]e𝘰=f[[{
x=0, y=8, w=52, h=54,
data={
{txt='s𝘭𝘰𝘸 𝘴𝘱𝘪𝘯', spd=360, cb=23},
{txt='m𝘦𝘥𝘪𝘶𝘮 𝘴𝘱𝘪𝘯', spd=180, cb=23},
{txt='f𝘢𝘴𝘵 𝘴𝘱𝘪𝘯', spd=90, cb=23}
}
}]]e𝘥={h=25,data={}}
__gfx__
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
00000000eeee8888eeee8888aaaa9999aaaa9999bbbb3333bbbb3333ccccddddccccddddffffeeeeffffeeee7777666677776666555566665555666600000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
000000008888eeee8888eeee9999aaaa9999aaaa3333bbbb3333bbbbddddccccddddcccceeeeffffeeeeffff6666777766667777666655556666555500000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00008821000ff000fffff000002222000000000000000002022220000220222002222220000070000ffffff00ffffff00f0f0f00000000000000000001000000
1100942200f00f00f8f8f000022222200000000000f00002022220000220222002222220000777000f0000f00ffffff000f0f0f00000000ff000000017100000
2210a9420f0000f0ff8ff000022222200ffffff000f0000202222ff00000222002222220000070000f0000f00ffffff00f0f0f00000000f00f000f0017710000
3510bb350ff00ff0f8f8f0000022220000000000fffff00202222ff00222000002020200000000000f0000f00ffffff000f0f0f00fff00f00f00fff017771000
4221ccd50f0ff0f0fffff000000000000ffffff000f00002000ffff00222022000202020000000000f0000f00ffffff00f0f0f00000000fff0000f0017777100
5511dd510f00f0f000000000000220000000000000f00002000ffff00222022002020200000000000ffffff00ffffff000f0f0f000000f000000000017711000
6d51ee8200f0ff0000000000000000000ffffff00000000200000000000000000000000000000000000000000000000000000000000000000000000001171000
76d5fe82000ff0000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000
__map__
000102030405060708090a0b0c0d0e0f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
101112131415161718191a1b1c1d1e1f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
202122232425262728292a2b2c2d2e2f0000000000000b0b0b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
303132333435363738393a3b3c3d3e3f00000000000b0b0b0b06060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
404142434445464748494a4b4c4d4e4f000000000006060b0b06060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
505152535455565758595a5b5c5d5e5f000000000606060b0b0b0b0b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
606162636465666768696a6b6c6d6e6f000000000606060b0b0b0b0b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
707172737475767778797a7b7c7d7e7f0000000006060b0b0b0b0b0b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
808182838485868788898a8b8c8d8e8f0000000b0b0b0b0b06060b0b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
909192939495969798999a9b9c9d9e9f0000000b0b0b0b060606060b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
a0a1a2a3a4a5a6a7a8a9aaabacadaeaf0000000b0b0b0b060606060b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
b0b1b2b3b4b5b6b7b8b9babbbcbdbebf0000000b0b0b0b060606060b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
c0c1c2c3c4c5c6c7c8c9cacbcccdcecf000000000b0b0b0b06060b0b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
d0d1d2d3d4d5d6d7d8d9dadbdcdddedf0000000000000b0b0b0b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
e0e1e2e3e4e5e6e7e8e9eaebecedeeef00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
__meta:title__
tre de
@johanpeitz
