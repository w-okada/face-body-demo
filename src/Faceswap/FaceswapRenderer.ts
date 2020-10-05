import { generate_shader } from "./ShaderUtil";
import { TRIANGULATION } from "./traiangulation";
import { matrix_identity, matrix_mult } from "../MatrixUtil";
import * as facemesh from '@tensorflow-models/facemesh'
import { Coords3D } from "@tensorflow-models/facemesh/dist/util";



export class FacemeshRenderer{

    private strVS = `
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

    private strFS = `
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

    private program      : WebGLProgram
    private loc_vtx      : number
    private loc_clr      : number
    private loc_nrm      : number
    private loc_uv       : number
    private loc_vtxalpha : number
    private loc_smp      : WebGLUniformLocation
    private loc_mtx_pmv  : WebGLUniformLocation
    private loc_color    : WebGLUniformLocation
    private loc_alpha    : WebGLUniformLocation

    private matPrj       : number[]
//    private texid_dummy  : WebGLTexture

    private vbo_vtx      : WebGLBuffer
    private vbo_uv       : WebGLBuffer
    private vbo_idx      : WebGLBuffer
    private vbo_alpha    : WebGLBuffer


    private masktexId?:WebGLTexture
    private masktexImage?:HTMLCanvasElement
    private maskPrediction?:facemesh.AnnotatedPrediction[]
    /////
    constructor(gl:WebGLRenderingContext, w:number, h:number){
        gl.clearColor (0.0, 0.0, 0.0, 0.0);
        gl.clear (gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer (gl.FRAMEBUFFER, null);
        gl.viewport (0, 0, w, h);
        gl.scissor  (0, 0, w, h);


        this.program      = generate_shader (gl, this.strVS, this.strFS)

        this.loc_vtx      = gl.getAttribLocation (this.program, `a_Vertex`)
        this.loc_clr      = gl.getAttribLocation (this.program, `a_Color` )
        this.loc_nrm      = gl.getAttribLocation (this.program, `a_Normal` )
        this.loc_uv       = gl.getAttribLocation (this.program, `a_TexCoord`)

        this.loc_vtxalpha = gl.getAttribLocation  (this.program, "a_vtxalpha")
        this.loc_mtx_pmv  = gl.getUniformLocation (this.program, "u_PMVMatrix" )!
        this.loc_color    = gl.getUniformLocation (this.program, "u_color" )!
        this.loc_alpha    = gl.getUniformLocation (this.program, "u_alpha" )!

        this.loc_smp      = gl.getUniformLocation (this.program, `u_sampler`)!


        //
        this.matPrj = [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            -1, 1, 0, 1]; // 平行移動 (転置)
        this.matPrj[0] =  2.0 / w; // 拡大縮小
        this.matPrj[5] = -2.0 / h; // 拡大縮小


        
        const dummyCanvas = document.createElement("canvas")
        const texid_dummy = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, texid_dummy)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dummyCanvas)
        gl.generateMipmap (gl.TEXTURE_2D)

        this.vbo_vtx = gl.createBuffer()!
        this.vbo_uv  = gl.createBuffer()!
        this.vbo_idx = gl.createBuffer()!
        gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, this.vbo_idx);
        gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(TRIANGULATION), gl.STATIC_DRAW);
        
        this.vbo_alpha  = this.create_vbo_alpha_array (gl, TRIANGULATION)!
    }

    /////
    private create_vbo_alpha_array = (gl:WebGLRenderingContext, tris:number[]) => {
        /*
        *  Vertex indices are from:
        *      https://github.com/tensorflow/tfjs-models/blob/master/facemesh/src/keypoints.ts
        */
        const face_countour_idx = [
            10,  338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58,  132, 93,  234, 127, 162, 21,  54,  103, 67,  109
        ];

        let vtx_counts = tris.length
        let alpha_array = new Array(vtx_counts)

        for (let i = 0; i < vtx_counts; i ++){
            let alpha = 1.0
            for (let j = 0; j < face_countour_idx.length; j ++){
                if (i == face_countour_idx[j]){
                    alpha = 0.8
                    break
                }
            }
            alpha_array[i] = alpha
        }

        let vbo_alpha = gl.createBuffer()!
        gl.bindBuffer (gl.ARRAY_BUFFER, vbo_alpha)
        gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(alpha_array), gl.STATIC_DRAW)

        return vbo_alpha;
    }

    /////
    setMask = (gl:WebGLRenderingContext, maskImage:HTMLCanvasElement, maskPrediction:facemesh.AnnotatedPrediction[]) =>{
        const masktexId = gl.createTexture()!;


        gl.bindTexture(gl.TEXTURE_2D, masktexId);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskImage);
        gl.generateMipmap (gl.TEXTURE_2D);

        this.masktexId = masktexId
        this.masktexImage = maskImage
        this.maskPrediction = maskPrediction

    }


    drawFacemesh = (gl:WebGLRenderingContext, videoFrameCanvas:HTMLCanvasElement, videoFramePrediction:facemesh.AnnotatedPrediction[], 
        ) =>{
        gl.clear (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let texid = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texid);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, texid);
        gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrameCanvas);
        gl.generateMipmap (gl.TEXTURE_2D);    


        this.render_2d_scene (gl, texid, videoFramePrediction, 
            videoFrameCanvas.width, videoFrameCanvas.height, 
            this.masktexId!, this.maskPrediction!);
    }


    render_2d_scene (gl:WebGLRenderingContext, texid:WebGLTexture, face_predictions:facemesh.AnnotatedPrediction[], 
        tex_w:number, tex_h:number, masktex:WebGLTexture, mask_predictions:facemesh.AnnotatedPrediction[]){
            
            const s_srctex_region = this.calc_size_to_fit (tex_w, tex_h, tex_w, tex_h);

            let color = [1.0, 1.0, 1.0, 0.5]
            let radius = 5;
            let tx = s_srctex_region.tex_x;
            let ty = s_srctex_region.tex_y;
            let tw = s_srctex_region.tex_w;
            let th = s_srctex_region.tex_h;
            let scale = s_srctex_region.scale;
            let flip_h = false;

            gl.disable (gl.DEPTH_TEST);

            let flip = 0
            //r2d.draw_2d_texture (gl, texid, tx, ty, tw, th, flip)

            let mask_color = [0.4, 0.4, 0.4, 0.6];


            for (let i = 0; i < face_predictions.length; i++) {
                const keypoints = face_predictions[i].scaledMesh as Coords3D;

                /* render the deformed mask image onto the camera image */
                if (mask_predictions.length > 0){
                    const mask_keypoints = mask_predictions[0].scaledMesh  as Coords3D;

                    let face_vtx = new Array(keypoints.length * 3);
                    let face_uv  = new Array(keypoints.length * 2);
                    for (let i = 0; i < keypoints.length; i++){
                        let p = keypoints[i];
                        face_vtx[3 * i + 0] = p[0] * scale + tx;
                        face_vtx[3 * i + 1] = p[1] * scale + ty;
                        face_vtx[3 * i + 2] = p[2];

                        let q = mask_keypoints[i];
                        face_uv [2 * i + 0] = q[0] / this.masktexImage!.width;
                        face_uv [2 * i + 1] = q[1] / this.masktexImage!.height;

                        if (flip_h){
                            face_vtx[3 * i + 0] = (tex_w - p[0]) * scale + tx;
                        }
                    }
                    console.log("predface", i)
                    this.draw_facemesh_tri_tex(gl, this.masktexId, face_vtx, face_uv, mask_color, false, flip_h)
                }
            }
    }



    calc_size_to_fit = (src_w:number, src_h:number, win_w:number, win_h:number) => {
        let win_aspect = win_w / win_h;
        let tex_aspect = src_w / src_h;
        let scale;
        let scaled_w, scaled_h;
        let offset_x, offset_y;
    
        if (win_aspect > tex_aspect)
        {
            scale = win_h / src_h;
            scaled_w = scale * src_w;
            scaled_h = scale * src_h;
            offset_x = (win_w - scaled_w) * 0.5;
            offset_y = 0;
        }
        else
        {
            scale = win_w / src_w;
            scaled_w = scale * src_w;
            scaled_h = scale * src_h;
            offset_x = 0;
            offset_y = (win_h - scaled_h) * 0.5;
        }
    
        let region = {
            width  : win_w,     /* full rect width  with margin */
            height : win_h,     /* full rect height with margin */
            tex_x  : offset_x,  /* start position of valid texture */
            tex_y  : offset_y,  /* start position of valid texture */
            tex_w  : scaled_w,  /* width  of valid texture */
            tex_h  : scaled_h,  /* height of valid texture */
            scale  : scale,
        }
        return region;
    }






    /////
    draw_facemesh_tri_tex = (gl:WebGLRenderingContext, texid:any, vtx:any[], uv:any[], color:number[], drill_eye_hole:boolean, flip_h:boolean)=> {
        const matMV     = new Array(16);
        const matPMV    = new Array(16);
    
        gl.enable (gl.CULL_FACE);
        if (flip_h)
            gl.frontFace (gl.CW);
    
        gl.useProgram (this.program);
    
        gl.enableVertexAttribArray (this.loc_vtx);
        gl.enableVertexAttribArray (this.loc_uv );
        gl.enableVertexAttribArray (this.loc_vtxalpha!);
    
        gl.bindBuffer (gl.ARRAY_BUFFER, this.vbo_vtx);
        gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);
        gl.vertexAttribPointer (this.loc_vtx, 3, gl.FLOAT, false, 0, 0);
    
        gl.bindBuffer (gl.ARRAY_BUFFER, this.vbo_uv);
        gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
        gl.vertexAttribPointer (this.loc_uv , 2, gl.FLOAT, false, 0, 0);
    
        let vtx_counts;
    
        gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, this.vbo_idx);
        vtx_counts = TRIANGULATION.length;
    
        gl.bindBuffer (gl.ARRAY_BUFFER, this.vbo_alpha);
        gl.vertexAttribPointer (this.loc_vtxalpha!, 1, gl.FLOAT, false, 0, 0);
    
    
        matrix_identity (matMV);
        matrix_mult (matPMV, this.matPrj, matMV);
    
        gl.uniformMatrix4fv (this.loc_mtx_pmv, false, matPMV);
        gl.uniform3f (this.loc_color, color[0], color[1], color[2]);
        gl.uniform1f (this.loc_alpha, color[3]);
    
        gl.enable (gl.BLEND);
    
        gl.bindTexture (gl.TEXTURE_2D, texid);
    
        gl.drawElements (gl.TRIANGLES, vtx_counts, gl.UNSIGNED_SHORT, 0);
    
        gl.disable (gl.BLEND);
        gl.frontFace (gl.CCW);
    }





}