import numpy as np
from numpy.polynomial import Legendre, Polynomial
from numpy.polynomial.legendre import leggauss
from scipy.linalg import solve

def basis(n,t):
 t=np.asarray(t);r=2*t-1
 P=np.zeros((n+3,len(t))); Pd=P.copy();P[0]=1
 P[1]=r;Pd[1]=2
 for i in range(1,n+2):
  P[i+1]=((2*i+1)*r*P[i]-i*P[i-1])/(i+1)
  Pd[i+1]=((2*i+1)*(2*P[i]+r*Pd[i])-i*Pd[i-1])/(i+1)
 B=np.zeros((4,len(t),n))
 for i in range(n):
  B[2,:,i]=P[i];B[3,:,i]=Pd[i]
  if i==0: B[0,:,i]=t*t/2; B[1,:,i]=t
  elif i==1: B[0,:,i]=t**3/3-t*t/2;B[1,:,i]=t*t-t
  else:
   B[1,:,i]=(P[i+1]-P[i-1])/(2*(2*i+1))
   B[0,:,i]=((P[i+2]-P[i])/(2*i+3)-(P[i]-P[i-2])/(2*i-1))/(4*(2*i+1))
 return B

def plate(n,a=1,b=1,q=1,p=0):
 z,w=leggauss(n+3);z=(z+1)/2;w=w/2
 B=basis(n,z); G=np.einsum('t,kti,ltj->klij',w,B[:3],B[:3])
 nu=.2
 K=(np.kron(G[2,2],G[0,0])*b/a**3+np.kron(G[0,0],G[2,2])*a/b**3+nu*(np.kron(G[2,0],G[0,2])+np.kron(G[0,2],G[2,0]))/(a*b)+2*(1-nu)*np.kron(G[1,1],G[1,1])/(a*b))
 f=np.outer(w@B[0], (w*(q+p*(1-z)))@B[0])*a*b
 c=solve(K,f.ravel(),assume_a='pos').reshape(n,n)
 t=np.linspace(0,1,101);T=basis(n,t)
 mx=T[2]@c@T[0].T/a**2+nu*T[0]@c@T[2].T/b**2
 my=T[0]@c@T[2].T/b**2+nu*T[2]@c@T[0].T/a**2
 # effective Kirchhoff edge reactions
 rx=-(T[3][0]@c@T[0].T/a**3+(2-nu)*T[1][0]@c@T[2].T/(a*b*b))
 ry=-(T[0]@c@T[3][0]/b**3+(2-nu)*T[2]@c@T[1][0]/(a*a*b))
 print('compliance',float(np.sum(c*f)),n,a/b, 'M',*(round(v,6) for v in [mx.max(),mx.min(),my.max(),my.min()]), 'V',round(rx.max(),6),round(ry.max(),6),'corner',round(rx[-1],6),round(ry[-1],6))
 return t,mx,my,rx,ry
if __name__=='__main__':
 for a,q,p in [(1,1,0),(1,0,1),(5.5/2.43,1,0),(5.5/2.43,0,1)]:
  for n in [4,6,8,10,12,14]:plate(n,a,q=q,p=p)
