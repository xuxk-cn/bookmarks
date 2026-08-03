void mainImage(out vec4 O, vec2 C) {
  float 
      i     // Loop counter (starts at 0)
    , d     // Distance to nearest surface
    , z = fract(dot(C,sin(C)))-.5  // Ray distance + noise for anti-banding
    ;
  vec4 
      o     // Accumulated color/lighting
    , p     // Current 3D position along ray
    ;
  for(
      vec2 r = iResolution.xy  // Screen resolution
    ; ++i < 77.                
    ; z += .6*d                // Step forward (larger steps when far from surfaces)
    )
      // Convert 2D pixel to 3D ray direction
      p = vec4(z*normalize(vec3(C-.5*r,r.y)),.1*iTime)
      
      // Move through 3D space over time
    , p.z += iTime
    
      // Save position for lighting calculations
    , O = p
    
      // Apply rotation matrices to create fractal patterns
      // (These transform the 3D coordinates in interesting ways)
    , p.xy *= mat2(cos(2.+O.z+vec4(0,11,33,0)))
      
      // This was originally a bug in the matrix calculation
      // The incorrect transformation created an unexpectedly interesting pattern
      // Bob Ross would call this a "happy little accident"
    , p.xy *= mat2(cos(O+vec4(0,11,33,0)))
    
      // Calculate color based on position and space distortion
      // The sin() creates a nice looking palette, division by dot() creates falloff
    , O = (1.+sin(.5*O.z+length(p-O)+vec4(0,4,3,6)))
       / (.5+2.*dot(O.xy,O.xy))
    
      // Domain repetition, repeats the single line and the 2 planes infinitely
    , p = abs(fract(p)-.5)
    
      // Calculate distance to nearest surface
      // This combines a cylinder (length(p.xy)-.125) with 2 planesbox (min(p.x,p.y))
    , d = abs(min(length(p.xy)-.125,min(p.x,p.y)+1e-3))+1e-3
    
      // Add lighting contribution (brighter when closer to surfaces)
    , o += O.w/d*O
    ;
  
  // tanh() compresses the accumulated brightness to 0-1 range
  // (Like HDR tone mapping in photography)
  O = tanh(o/2e4);
}