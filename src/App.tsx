import React from 'react';
import logo from './logo.svg';
import './App.css';
import {FacemeshWorkerManager} from 'facemesh-worker-js'
import {BodypixWorkerManager,  ModelConfigMobileNetV1_05} from 'bodypix-worker-js'
import * as facemesh from '@tensorflow-models/facemesh'
import * as bodyPix from '@tensorflow-models/body-pix'
import { Coords3D } from '@tensorflow-models/facemesh/dist/util';
import { TRIANGULATION } from './traiangulation';
import { Icon, Label, Dropdown } from 'semantic-ui-react';
import { init_facemesh_render, draw_facemesh_tri_tex2 } from './ShaderUtil';


export const getVideoDevice = async (deviceId:string): Promise<MediaStream|null>=>{

  const webCamPromise = navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 }
      }
  })
  return webCamPromise
}
export const getDeviceLists = async () =>{
  const list = await navigator.mediaDevices.enumerateDevices()
  console.log("GET_DEVICE_LIST", list)

  const audioInputDevices = list.filter((x:InputDeviceInfo | MediaDeviceInfo)=>{
      return x.kind === "audioinput"
  })
  const videoInputDevices = list.filter((x:InputDeviceInfo | MediaDeviceInfo)=>{
      return x.kind === "videoinput"
  })
  const audioOutputDevices = list.filter((x:InputDeviceInfo | MediaDeviceInfo)=>{
      return x.kind === "audiooutput"
  })
  const videoInputResolutions = [
      {deviceId: "360p", groupId: "360p", kind: "videoinputres", label: "360p"},
      {deviceId: "540p", groupId: "540p", kind: "videoinputres", label: "540p"},
      {deviceId: "720p", groupId: "720p", kind: "videoinputres", label: "720p"},
  ]
  return{
      audioinput    : audioInputDevices,
      videoinput    : videoInputDevices,
      audiooutput   : audioOutputDevices,
      videoinputres : videoInputResolutions,
  }
}

class App extends React.Component {
  imageElementRef = React.createRef<HTMLImageElement>()
  dummyImageElementRef = React.createRef<HTMLImageElement>()
  landmarkCanvasRef = React.createRef<HTMLCanvasElement>()
  landmarkCanvasGLRef =  React.createRef<HTMLCanvasElement>()
  videoFrameCanvasRef = React.createRef<HTMLCanvasElement>()
  facemesh:FacemeshWorkerManager = new FacemeshWorkerManager()
  bodypix:BodypixWorkerManager = new BodypixWorkerManager()

  facemesh_initialized = false
  bodypix_initialized = false

  facemesh_predicted = false
  bodypix_predicted = false
  facemesh_prediction:facemesh.AnnotatedPrediction[]|null =null
  bodypix_prediction:bodyPix.SemanticPersonSegmentation|null=null
  maskPrediction:facemesh.AnnotatedPrediction[]|null =null

  targetCanvas = (()=>{
    const c = document.createElement("canvas")
    c.width=200
    c.height=200
    return c
  })()

  outpuCanvas = (()=>{
    const c = document.createElement("canvas")
    c.width=200
    c.height=200
    return c
  })()

  private inputVideoElement = document.createElement("video")


  module_initialized = () => {
    if(this.facemesh_initialized && this.bodypix_initialized){
      this.facemesh.predict(this.masktex_image)
      this.bodypix.predict(this.masktex_image)
      // requestAnimationFrame(() => this.predict())
    }
  }

  lastTime = performance.now();
  first_predict = true
  

  calc_size_to_fit = (gl:WebGLRenderingContext, src_w:number, src_h:number, win_w:number, win_h:number) => {
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



  predict_finished = () =>{
    if(this.facemesh_predicted && this.bodypix_predicted){
      const thisTime = performance.now();
      console.log("both prediction done", thisTime-this.lastTime)
      this.lastTime = thisTime
      this.facemesh_predicted = false
      this.bodypix_predicted = false
      if(this.first_predict){
        this.first_predict=false
        this.handleMaskPrediction()
        requestAnimationFrame(() => this.predict())
      }else{
        this.handleResult()
        requestAnimationFrame(() => this.predict())
      }
    }
  }
  handleMaskPrediction = () => {
    this.maskPrediction = this.facemesh_prediction
    const gl = this.landmarkCanvasGLRef.current!.getContext("webgl")!
    gl.bindFramebuffer (gl.FRAMEBUFFER, null);
    gl.viewport (0, 0, this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height);
    gl.scissor  (0, 0, this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height);

  }


  predict = () =>{
    const ctx = this.videoFrameCanvasRef.current!.getContext("2d")!
//    const ctx = this.targetCanvas.getContext("2d")!
//    ctx.drawImage(this.imageElementRef.current!,0,0,this.targetCanvas.width,this.targetCanvas.height)
    ctx.drawImage(this.inputVideoElement,0,0,this.videoFrameCanvasRef.current!.width,this.videoFrameCanvasRef.current!.height)

    this.facemesh.predict(this.videoFrameCanvasRef.current!)
    this.bodypix.predict(this.videoFrameCanvasRef.current!)
  }

  handleResult = () =>{
    const ctx = this.landmarkCanvasRef.current!.getContext("2d")!!
    ctx.clearRect(0,0,this.landmarkCanvasRef.current!.width,this.landmarkCanvasRef.current!.height)

    console.log(this.facemesh_prediction)

    this.facemesh_prediction?.forEach(x=>{
      const keypoints = x.scaledMesh as Coords3D
//      const keypoints = x.mesh as Coords3D
      for(let i = 0; i < TRIANGULATION.length/3 ;i++){
        const points = [
          TRIANGULATION[i * 3], 
          TRIANGULATION[i * 3 + 1],
          TRIANGULATION[i * 3 + 2]
        ].map(index => keypoints[index]);
        const region = new Path2D();
        region.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          region.lineTo(point[0], point[1]);
        }
        region.closePath();
        ctx.stroke(region);
      }
    })
    
    const gl = this.landmarkCanvasGLRef.current!.getContext("webgl")!
    gl.clear (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    

    let texid = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texid);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, texid);
    gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoFrameCanvasRef.current!);
    gl.generateMipmap (gl.TEXTURE_2D);    


    this.render_2d_scene (gl, texid, this.facemesh_prediction!, 
      this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height, 
      this.masktex_id, this.maskPrediction!);

    // const img_width = this.imageElementRef.current!!.width
    // const img_height = this.imageElementRef.current!!.height
    // // this.landmarkCanvasRef.current!!.width  = img_width
    // // this.landmarkCanvasRef.current!!.height = img_height
    // const ctx2 = this.landmarkCanvasRef.current!!.getContext("2d")!!
    // ctx2.drawImage(this.outpuCanvas,0,0,this.landmarkCanvasRef.current!!.width, this.landmarkCanvasRef.current!!.height)
  }



render_2d_scene (gl:WebGLRenderingContext, texid:WebGLTexture, face_predictions:facemesh.AnnotatedPrediction[], 
  tex_w:number, tex_h:number,
                 masktex:WebGLTexture, mask_predictions:facemesh.AnnotatedPrediction[])
{

  const s_srctex_region = this.calc_size_to_fit (gl, this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height, 
    this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height);

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
//    r2d.draw_2d_texture (gl, texid, tx, ty, tw, th, flip)

    let mask_color = [1.0, 1.0, 1.0, 1.0];


    for (let i = 0; i < face_predictions.length; i++) 
    {
        const keypoints = face_predictions[i].scaledMesh as Coords3D;

        /* render the deformed mask image onto the camera image */
        if (mask_predictions.length > 0)
        {
            const mask_keypoints = mask_predictions[0].scaledMesh  as Coords3D;

            let face_vtx = new Array(keypoints.length * 3);
            let face_uv  = new Array(keypoints.length * 2);
            for (let i = 0; i < keypoints.length; i++)
            {
                let p = keypoints[i];
                face_vtx[3 * i + 0] = p[0] * scale + tx;
                face_vtx[3 * i + 1] = p[1] * scale + ty;
                face_vtx[3 * i + 2] = p[2];

                let q = mask_keypoints[i];
                face_uv [2 * i + 0] = q[0] / this.masktex_image.width;
                face_uv [2 * i + 1] = q[1] / this.masktex_image.height;

                if (flip_h)
                {
                    face_vtx[3 * i + 0] = (tex_w - p[0]) * scale + tx;
                }
            }


            draw_facemesh_tri_tex2 (gl, this.masktex_id, face_vtx, face_uv, mask_color, false, flip_h)
        }
    }



    /* render 2D mask image */
    if (mask_predictions.length > 0)
    {
      const s_masktex_region = this.calc_size_to_fit (gl, this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height, 
        this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height);
    
        let texid = this.masktex_id;
        let tx = 5;
        let ty = 60;
        let tw = s_masktex_region.tex_w * 0.3;
        let th = s_masktex_region.tex_h * 0.3;
        let radius = 2;
        // r2d.draw_2d_texture (gl, texid, tx, ty, tw, th, 0)
        // r2d.draw_2d_rect (gl, tx, ty, tw, th, [1.0, 1.0, 1.0, 1.0], 3.0);

        if (mask_predictions.length > 0)
        {
            const mask_keypoints = mask_predictions[0].scaledMesh as Coords3D;
            for (let i = 0; i < mask_keypoints.length; i++)
            {
                let p = mask_keypoints[i];
                const x = p[0] / this.masktex_image.width  * tw + tx;
                const y = p[1] / this.masktex_image.height * th + ty;
//                r2d.draw_2d_fillrect (gl, x - radius/2, y - radius/2, radius,  radius, color);
            }
        }
    }
  }

  masktex_id:any = null
  masktex_image:any = null


  componentDidMount() {
    this.facemesh.init()
    this.facemesh.addInitializedListener(()=>{
      console.log("Demo: facemesh initialized")
      this.facemesh_initialized=true
      this.module_initialized()
    })
    this.facemesh.addPredictedListeners((prediction:facemesh.AnnotatedPrediction[])=>{
      const thisTime = performance.now();
      console.log("facemesh prediction done", thisTime-this.lastTime)      
//      console.log("Demo: facemesh predicted", prediction)
      this.facemesh_prediction=prediction
      this.facemesh_predicted=true
      this.predict_finished()
    })


    this.bodypix.init(ModelConfigMobileNetV1_05)
    this.bodypix.addInitializedListener(()=>{
      console.log("Demo: bodypix initialized")
      this.bodypix_initialized=true
      this.module_initialized()
    })
    this.bodypix.addPredictedListeners((prediction:bodyPix.SemanticPersonSegmentation)=>{
      const thisTime = performance.now();
      console.log("bodypix prediction done", thisTime-this.lastTime)      
//      console.log("Demo: bodypix predicted", prediction)
      this.bodypix_prediction=prediction
      this.bodypix_predicted=true
      this.predict_finished()
    })

    getDeviceLists().then((deviceLists)=>{
      // Video Input Selection
      const videoInputList:any = []
      deviceLists["videoinput"].map((videoInput)=>{
        console.log("----------------", videoInput)
        videoInputList.push({
            key: videoInput.label,
            text: videoInput.label,
            value: videoInput.deviceId,
        })
      })
      this.dropdownVideoInput = <Dropdown placeholder='State' search selection options={videoInputList} onChange={(e,v)=>{
        this.setState({selectedDeviceID:v.value})
        this.selectInputVideoDevice(v.value as string).then(() => {
          // this.media = this.localVideoEffectors!.getMediaStream()
        })        
      }} />
      this.setState({})
    })

    const webgl = this.landmarkCanvasGLRef.current!.getContext("webgl")!
    webgl.clearColor (0.7, 0.7, 0.7, 1.0);
    webgl.clear (webgl.COLOR_BUFFER_BIT);
  

    this.imageElementRef.current!.onload = ()=>{
      console.log("BGLOAD!!!!!!!!!!")
      const masktex_id = webgl.createTexture()!;

      webgl.bindTexture(webgl.TEXTURE_2D, masktex_id);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.LINEAR);
      webgl.texImage2D (webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, this.imageElementRef.current!);
      webgl.generateMipmap (webgl.TEXTURE_2D);
      init_facemesh_render(webgl, this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height, this.dummyImageElementRef.current!)
      this.masktex_image = this.imageElementRef.current!
      this.masktex_id = masktex_id
      console.log("BGLOAD!!!!!!!!!!", this.masktex_id)
    }
    

  }


  private _inputVideoStream:MediaStream | null           = null
  private deviceId:string=""

  selectInputVideoDevice = async(deviceId:string) =>{
    this._inputVideoStream?.getTracks().map(s=>s.stop())
    this.deviceId=deviceId
    getVideoDevice(deviceId).then(stream => {
        if (stream !== null) {
            this.inputVideoElement!.width = stream.getVideoTracks()[0].getSettings().width!
            this.inputVideoElement!.height = stream.getVideoTracks()[0].getSettings().height!
            this.inputVideoElement!.srcObject = stream
            this.inputVideoElement!.play()
            this._inputVideoStream = stream 
            return new Promise((resolve, reject) => {
                this.inputVideoElement!.onloadedmetadata = () => {
                    resolve();
                };
            });
        }
    }).catch((e) => {
        console.log("DEVICE:error:", e)
        throw new Error("DEVICE:error: "+e)
    });
  }



  private dropdownVideoInput:any = null
  render() {
    console.log("rendor")

    return(

      <div>
{/* <img  crossOrigin="anonymous" ref={this.imageElementRef} src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"></img> */}
<img  crossOrigin="anonymous" ref={this.imageElementRef} src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"></img>
        <img  crossOrigin="anonymous" ref={this.dummyImageElementRef} src="/white.png"></img>

        {/* <canvas ref={this.landmarkCanvasRef} style={{ position: "absolute", top:"0px", left:"0px"}}/> */}
        <canvas ref={this.videoFrameCanvasRef} width="640px" height="480px" />
        <canvas ref={this.landmarkCanvasRef} width="640px" height="480px"/>
        <canvas ref={this.landmarkCanvasGLRef} width="640px" height="480px"/>

        <span style={{marginLeft:"10px"}}>
          VideoSource{this.dropdownVideoInput} 
        </span>

      </div>

    )

  }
}

export default App;
