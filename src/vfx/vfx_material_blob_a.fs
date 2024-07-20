#include <common>

varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform sampler2D tDiffuse;
uniform sampler2D noise0;

vec2 rotate2D(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 tile(vec2 _st, float _zoom){
    _st *= _zoom;
    return fract(_st);
}

float box(vec2 _st, vec2 _size, float _smoothEdges){
    _size = vec2(0.5)-_size*0.5;
    vec2 aa = vec2(_smoothEdges*0.5);
    vec2 uv = smoothstep(_size,_size+aa,_st);
    uv *= smoothstep(_size,_size+aa,vec2(1.0)-_st);
    return uv.x*uv.y;
}

float checker(float size, vec2 uv) {
	float color = mod(floor(uv.x * size) + floor(uv.y * size), 2.0);

	return color;
}

void main() {
	float scale = 0.2;
	float dist = distance(vPosition.xz * scale, vec2(0));
	dist = pow(clamp(dist * 1.2 - 0.6, 0.0, 1.0), 1.9);

	float noise_scale = 0.2;
	float t = time * 1e-4;
	vec2 uv = rotate2D(vUv * noise_scale, t * 0.01);
	vec4 noise0 = texture2D( noise0, uv + t * 0.005);
	float noise = noise0.x + 0.1;
	

	float color_factor1 = step(0.04, noise * dist);
	//vec2 tile = tile(vPosition.xz, 0.1);
	//vec3 color2 = vec3(box(tile,vec2(0.7),0.01));
	float color_factor2 = checker(0.4, vPosition.xz);
	vec3 color2 = mix(vec3(0.8), vec3(0.9), color_factor2);
	//vec3 colorfin = mix(vec3(0.0), color2, color_factor1);
	vec3 colorfin = mix(vec3(0.0), color2, color_factor1);



	gl_FragColor = vec4(colorfin, 1.0);
}
