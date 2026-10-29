import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
from numpy.polynomial import Polynomial as P
from numpy.polynomial.legendre import leggauss
# Tensor-product cubic Hermite plate: w, wy, wx, wxy at each node.
H=[P([1,0,-3,2]),P([0,1,-2,1]),P([0,0,3,-2]),P([0,0,-1,1])]
def model(nx,ny,a,b,q,p):
 hx,hy=a/nx,b/ny; nd=4*(nx+1)*(ny+1)
 z,wt=leggauss(4);z=(z+1)/2;wt=wt/2
 def B(t,h,k):return np.array([v.deriv(k)(t)*h**(i%2-k) for i,v in enumerate(H)])
 K=np.zeros((16,16)); F=np.zeros(16); Fy=np.zeros(16)
 for x,wx in zip(z,wt):
  for y,wy in zip(z,wt):
   W=np.kron(B(x,hx,0),B(y,hy,0));xx=np.kron(B(x,hx,2),B(y,hy,0));yy=np.kron(B(x,hx,0),B(y,hy,2));xy=np.kron(B(x,hx,1),B(y,hy,1))
   K+=(np.outer(xx,xx)+np.outer(yy,yy)+.2*(np.outer(xx,yy)+np.outer(yy,xx))+1.6*np.outer(xy,xy))*wx*wy*hx*hy
   F+=W*wx*wy*hx*hy;Fy+=W*y*wx*wy*hx*hy
 rows=[];cols=[];vals=[];f=np.zeros(nd);elts=[]
 for ix in range(nx):
  for iy in range(ny):
   ids=np.array([4*((ix+i//2)*(ny+1)+(iy+j//2))+2*(i%2)+j%2 for i in range(4) for j in range(4)])
   rows.extend(np.repeat(ids,16));cols.extend(np.tile(ids,16));vals.extend(K.ravel());f[ids]+=(q+p*(1-iy/ny))*F-p/ny*Fy;elts.append((ix,iy,ids))
 k=coo_matrix((vals,(rows,cols)),shape=(nd,nd)).tocsr();fixed=np.array([4*(ix*(ny+1)+iy)+d for ix in range(nx+1) for iy in range(ny+1) if ix==0 or iy==0 for d in range(4)])
 free=np.setdiff1d(np.arange(nd),fixed);u=np.zeros(nd);u[free]=spsolve(k[free][:,free],f[free]);R=k@u-f
 mx=[];my=[];mxy=[]
 for ix,iy,ids in elts:
  for x in [0,.5,1]:
   for y in [0,.5,1]:
    xx=np.kron(B(x,hx,2),B(y,hy,0))@u[ids];yy=np.kron(B(x,hx,0),B(y,hy,2))@u[ids];xy=np.kron(B(x,hx,1),B(y,hy,1))@u[ids]
    mx.append(xx+.2*yy);my.append(yy+.2*xx);mxy.append(.8*xy)
 rx=-R[:4*(ny+1):4];ry=-R[::4*(ny+1)]
 # Split the shared corner reaction equally; tends to zero for smooth pressure.
 rx[0]/=2;ry[0]/=2
 print(nx,ny,'M',np.round([max(mx),min(mx),max(my),min(my),max(np.abs(mxy))],5),'Vpeak',round(max(rx)/hy,5),round(max(ry)/hx,5),'eq',round(sum(rx)+sum(ry)-a*b*(q+p/2),9))
 return rx,ry
if __name__=='__main__':
 for n in [5,10,20,40]:model(n,n,1,1,1,0)
 for n in [5,10,20,40]:model(n,n,1,1,0,1)
 for n in [5,10,20,40]:model(round(n*5.5/2.43),n,5.5,2.43,20,35.3565)
