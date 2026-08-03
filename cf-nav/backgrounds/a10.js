Main 
{
    vec4 f = A(U);
    Q = 1.-2.*f.wwww*(.5+.5*sin(6.2*f.z+vec4(1,2,3,4)));
    Q *= 1.-smoothstep(.1,0.,f.w)*A(U+vec2(6)).w;
    Q *= 1.-(exp(-.1*U.x)+exp(-.1*(R.x-U.x))+exp(-.1*U.y)+exp(-.1*(R.y-U.y)));
}