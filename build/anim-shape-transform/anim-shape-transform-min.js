YUI.add("anim-shape-transform",function(e,d){var b=Number,a,c;e.Anim.behaviors.transform={set:function(l,r,u,v,w,k,t){var h=l._node,g="",s,o,x,f,n=0,m,q,p;v=a;p=a.length;for(;n<p;++n){x=v[n].concat();f=u[n].concat();s=x.shift();o=f.shift();q=x.length;g+=s+"(";for(m=0;m<q;++m){g+=t(w,b(f[m]),b(x[m])-b(f[m]),k);if(m<q-1){g+=", ";}}g+=");";}if(g){h.set("transform",g);}h._transform=c;},get:function(l){var k=l._node,j=k.matrix,s=l.get("to")||{},f=l.get("to").transform,h=k.get("transform"),m=e.MatrixUtil.getTransformArray(f),r=h?e.MatrixUtil.getTransformArray(h):null,o,n,p,g,q;if(m){if(!r||r.length<1){r=[];p=m.length;for(n=0;n<p;++n){g=m[n][0];r[n]=e.MatrixUtil.getTransformFunctionArray(g);}a=m;q=r;}else{if(e.MatrixUtil.compareTransformSequence(m,r)){a=m;q=r;}else{o=new e.Matrix();p=m.length;for(n=0;n<p;++n){g=m[n].shift();g=g=="matrix"?"multiply":g;o[g].apply(o,m[n]);}a=o.decompose();q=j.decompose();}}}c=f;return q;}};},"@VERSION@",{"requires":["anim-base","anim-easing","matrix"]});