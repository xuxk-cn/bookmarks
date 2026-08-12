//https://www.shadertoy.com/view/XsyGWV
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	fragColor = vec4(texture(iChannel0, fragCoord.xy/iResolution.xy).rgb, 1.0);
}