#include <common>

varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform sampler2D tDiffuse;
uniform sampler2D noise0;
uniform float blob_size;
uniform float wave_scale;

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
	float scale = wave_scale;
	float dist = distance(vPosition.xz * scale, vec2(0));
	dist = pow(clamp(dist - blob_size * scale, 0.0, 1.0), 1.9);

	float noise_scale = 0.2;
	float t = time * 1e-4;
	vec2 uv = rotate2D(vUv * noise_scale, t * 0.01);
	vec4 noise0 = texture2D( noise0, uv + t * 0.005);
	float noise = noise0.x + 0.1;

	float color_factor_blob = step(0.04, noise * dist);

	// transparent blob
	// if  (color_factor_blob > 0.5) discard;

	float color_factor_checker = checker(0.4, vPosition.xz);
	vec3 color_checker = mix(vec3(0.8), vec3(0.9), color_factor_checker);
	vec3 colorfin = mix(color_checker, vec3(0.0), color_factor_blob);

	gl_FragColor = vec4(colorfin, 1.0);
}
