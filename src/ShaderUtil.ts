import { TRIANGULATION } from "./traiangulation";


export const compile_shader_text = (gl:WebGLRenderingContext, shader_type:number, text:string)=>{
    const shader = gl.createShader (shader_type)!;
    gl.shaderSource (shader, text);

    gl.compileShader (shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export const link_shaders = (gl:WebGLRenderingContext, vertShader:WebGLShader, fragShader:WebGLShader) => {
    const program = gl.createProgram()!;

    gl.attachShader (program, vertShader);
    gl.attachShader (program, fragShader);

    gl.linkProgram (program);
    if (!gl.getProgramParameter (program, gl.LINK_STATUS))
    {
        alert("Could not initialise shaders");
    }
    return program;
}

export const generate_shader = function (gl:WebGLRenderingContext, str_vs:string, str_fs:string)
{
    const vs = compile_shader_text (gl, gl.VERTEX_SHADER,   str_vs)!;
    const fs = compile_shader_text (gl, gl.FRAGMENT_SHADER, str_fs)!;
    const prog = link_shaders (gl, vs, fs);

    gl.deleteShader (vs);
    gl.deleteShader (fs);

    const sobj = {
        program: prog,
        loc_vtx: gl.getAttribLocation (prog, `a_Vertex`),
        loc_clr: gl.getAttribLocation (prog, `a_Color` ),
        loc_nrm: gl.getAttribLocation (prog, `a_Normal` ),
        loc_uv : gl.getAttribLocation (prog, `a_TexCoord`),
        loc_smp: gl.getUniformLocation (prog, `u_sampler`),
    };
    return sobj;
}


const strVS = `
    attribute vec4  a_Vertex;
    attribute vec2  a_TexCoord;
    attribute float a_vtxalpha;
    uniform   mat4  u_PMVMatrix;
    varying   vec2  v_texcoord;
    varying   float v_vtxalpha;
    void main(void)
    {
        gl_Position = u_PMVMatrix * a_Vertex;
        v_texcoord  = a_TexCoord;
        v_vtxalpha  = a_vtxalpha;
    }
`;

const strFS = `
    precision mediump float;
    uniform vec3    u_color;
    uniform float   u_alpha;
    varying vec2    v_texcoord;
    varying float   v_vtxalpha;
    uniform sampler2D u_sampler;
    void main(void)
    {
        vec3 color;
        color = vec3(texture2D(u_sampler, v_texcoord));
        color *= u_color;
        gl_FragColor = vec4(color, v_vtxalpha * u_alpha);
    }
`;


interface FacemeshGL{
    sobj:any,
    loc_vtxalpha:number|null,
    loc_mtx_pmv:WebGLUniformLocation|null,
    loc_color:WebGLUniformLocation|null,
    loc_alpha:WebGLUniformLocation|null,
    matPrj:number[],
    texid_dummy:WebGLTexture|null,

    vbo_vtx:WebGLBuffer | null,
    vbo_uv:WebGLBuffer | null,
    vbo_idx:WebGLBuffer | null,
    vbo_alpha:WebGLBuffer|null,

}

const render:FacemeshGL = {
    sobj:null,
    loc_vtxalpha:null, 
    loc_mtx_pmv:null, 
    loc_color:null, 
    loc_alpha:null,
    matPrj:[],
    texid_dummy:null,
    vbo_vtx:null,
    vbo_uv:null,
    vbo_idx:null,
    vbo_alpha:null,

}

export const init_facemesh_render = (gl:WebGLRenderingContext, w:number, h:number, imageElement:HTMLImageElement) =>{
    render.sobj = generate_shader (gl, strVS, strFS);
    render.loc_vtxalpha= gl.getAttribLocation  (render.sobj.program, "a_vtxalpha");
    render.loc_mtx_pmv = gl.getUniformLocation (render.sobj.program, "u_PMVMatrix" );
    render.loc_color   = gl.getUniformLocation (render.sobj.program, "u_color" );
    render.loc_alpha   = gl.getUniformLocation (render.sobj.program, "u_alpha" );

    render.matPrj = [
         0, 0, 0, 0,
         0, 0, 0, 0,
         0, 0, 0, 0,
         -1, 1, 0, 1];
    render.matPrj[0] =  2.0 / w; // 拡大縮小
    render.matPrj[5] = -2.0 / h; // 拡大縮小


    let texid = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texid);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, texid);
    gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageElement);
    gl.generateMipmap (gl.TEXTURE_2D);    

    render.texid_dummy = texid


    render.vbo_vtx = gl.createBuffer();
    render.vbo_uv  = gl.createBuffer();
    render.vbo_idx = gl.createBuffer();
    gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, render.vbo_idx);
    gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(TRIANGULATION), gl.STATIC_DRAW);

    render.vbo_alpha  = create_vbo_alpha_array (gl, TRIANGULATION);
}


const create_vbo_alpha_array = (gl:WebGLRenderingContext, tris:number[])=>{
    /*
     *  Vertex indices are from:
     *      https://github.com/tensorflow/tfjs-models/blob/master/facemesh/src/keypoints.ts
     */
    const face_countour_idx = [
        10,  338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58,  132, 93,  234, 127, 162, 21,  54,  103, 67,  109
    ];

    let vtx_counts = tris.length;
    let alpha_array = new Array(vtx_counts);

    for (let i = 0; i < vtx_counts; i ++)
    {
        let alpha = 1.0;
        for (let j = 0; j < face_countour_idx.length; j ++)
        {
            if (i == face_countour_idx[j])
            {
                alpha = 0.5;
                break;
            }
        }
        alpha_array[i] = alpha;
    }

    let vbo_alpha = gl.createBuffer();
    gl.bindBuffer (gl.ARRAY_BUFFER, vbo_alpha);
    gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(alpha_array), gl.STATIC_DRAW);

    return vbo_alpha;
}

export const draw_facemesh_tri_tex2 = (gl:WebGLRenderingContext, texid:any, vtx:any[], uv:any[], color:number[], drill_eye_hole:boolean, flip_h:boolean)=> {
    let matMV     = new Array(16);
    let matPMV    = new Array(16);

    gl.enable (gl.CULL_FACE);
    if (flip_h)
        gl.frontFace (gl.CW);

    gl.useProgram (render.sobj.program);

    gl.enableVertexAttribArray (render.sobj.loc_vtx);
    gl.enableVertexAttribArray (render.sobj.loc_uv );
    gl.enableVertexAttribArray (render.loc_vtxalpha!);

    gl.bindBuffer (gl.ARRAY_BUFFER, render.vbo_vtx);
    gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);
    gl.vertexAttribPointer (render.sobj.loc_vtx, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer (gl.ARRAY_BUFFER, render.vbo_uv);
    gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.vertexAttribPointer (render.sobj.loc_uv , 2, gl.FLOAT, false, 0, 0);

    let vtx_counts;

    gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, render.vbo_idx);
    vtx_counts = TRIANGULATION.length;

    gl.bindBuffer (gl.ARRAY_BUFFER, render.vbo_alpha);
    gl.vertexAttribPointer (render.loc_vtxalpha!, 1, gl.FLOAT, false, 0, 0);


    matrix_identity (matMV);
    matrix_mult (matPMV, render.matPrj, matMV);

    gl.uniformMatrix4fv (render.loc_mtx_pmv, false, matPMV);
    gl.uniform3f (render.loc_color, color[0], color[1], color[2]);
    gl.uniform1f (render.loc_alpha, color[3]);

    gl.enable (gl.BLEND);

    gl.bindTexture (gl.TEXTURE_2D, texid);

    gl.drawElements (gl.TRIANGLES, vtx_counts, gl.UNSIGNED_SHORT, 0);

    gl.disable (gl.BLEND);
    gl.frontFace (gl.CCW);
}

const matrix_identity = (m:any[]) => {
    m[ 0] = 1.0; m[ 4] = 0.0; m[ 8] = 0.0; m[12] = 0.0;
    m[ 1] = 0.0; m[ 5] = 1.0; m[ 9] = 0.0; m[13] = 0.0;
    m[ 2] = 0.0; m[ 6] = 0.0; m[10] = 1.0; m[14] = 0.0;
    m[ 3] = 0.0; m[ 7] = 0.0; m[11] = 0.0; m[15] = 1.0;
}

const matrix_mult = (m:any[], m1:number[], m2:any[]) => {
    let fm0, fm1, fm2, fm3;
    let fpm00, fpm01, fpm02, fpm03;
    let fpm10, fpm11, fpm12, fpm13;
    let fpm20, fpm21, fpm22, fpm23;
    let fpm30, fpm31, fpm32, fpm33;
    let x, y, z, w;

    /* load pMb */
    fpm00 = m2[0];
    fpm01 = m2[4];
    fpm02 = m2[8];
    fpm03 = m2[12];

    fpm10 = m2[1];
    fpm11 = m2[5];
    fpm12 = m2[9];
    fpm13 = m2[13];

    fpm20 = m2[2];
    fpm21 = m2[6];
    fpm22 = m2[10];
    fpm23 = m2[14];

    fpm30 = m2[3];
    fpm31 = m2[7];
    fpm32 = m2[11];
    fpm33 = m2[15];

    /*  process 0-line of "m1" */
    fm0 = m1[0];
    fm1 = m1[4];
    fm2 = m1[8];
    fm3 = m1[12];

    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[1];
    fm1 = m1[5];
    fm2 = m1[9];
    fm3 = m1[13];

    m[0] = x;
    m[4] = y;
    m[8] = z;
    m[12] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[2];
    fm1 = m1[6];
    fm2 = m1[10];
    fm3 = m1[14];

    m[1] = x;
    m[5] = y;
    m[9] = z;
    m[13] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[3];
    fm1 = m1[7];
    fm2 = m1[11];
    fm3 = m1[15];

    m[2] = x;
    m[6] = y;
    m[10] = z;
    m[14] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    m[3] = x;
    m[7] = y;
    m[11] = z;
    m[15] = w;
}
