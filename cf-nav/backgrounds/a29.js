void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	ivec2 p = ivec2(fragCoord-0.5);
    
    vec3 col = texelFetch( iChannel0, p, 0 ).xyz;
    
    vec2 q = fragCoord / iResolution.xy;
    col *= 0.8 + 0.2*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.2 );

    
	fragColor = vec4(col,1.0);
}