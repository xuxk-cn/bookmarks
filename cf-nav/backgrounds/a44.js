void mainImage( out vec4 O, in vec2 I )
{
    float v = texelFetch(iChannel0, ivec2(I), 0).x;
    
    // Ex: 5
    //O = vec4(mix(vec3(0,0,0),vec3(0,0.7,.7), v),1);
    
    // Ex: 4
    
    // tone map keep bright areas visible
    v = v/(0.4+v);
    O = vec4(v * vec3(0,0.7,0.7) + v*v*.3,1);
    
    
    // Ex: 3
    /*
    // bound the screen from -1 to 1
    float b = sin(v * 3.0);
    O = vec4(b * vec3(1,0,0),1);
    */
    
    // Ex: 2
    /*
    vec3 c = v * vec3(1,0.5,0.14) + v*v*.5;
    
    // one pixel divider
    if(abs(I.x - R.x*.5) < .5) c = vec3(0,0,1);
    O = vec4(c,1);
    */
    
    // Ex: 1
    //O = vec4(v * vec3(1,0.5,0.14) + v*v*.5,1);
}