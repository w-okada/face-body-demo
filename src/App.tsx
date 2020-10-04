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
import { getDeviceLists, getVideoDevice } from './CameraUtil';
import { FacemeshRenderer } from './FaceswapRenderer';

class FaceSwap {
  private _maskImage?:HTMLCanvasElement
  private _maskPrediction?: facemesh.AnnotatedPrediction[]
  private _targetImage?:HTMLImageElement
  private _targetPrediction?: facemesh.AnnotatedPrediction[]
  
  private glCanvas    = document.createElement("canvas")
  private glCanvasOut = document.createElement("canvas")
  private frd:FacemeshRenderer

  constructor(glCanvas:HTMLCanvasElement, width:number, height:number){
    this.glCanvas = glCanvas
    this.glCanvas.width  = width
    this.glCanvas.height = height
    this.glCanvasOut.width= width
    this.glCanvasOut.height=height
    this.frd = new FacemeshRenderer(
      this.glCanvas.getContext("webgl")!, 
      this.glCanvas.width,
      this.glCanvas.height
    )


  }

  setMask(maskImage:HTMLCanvasElement, maskPrediction:facemesh.AnnotatedPrediction[]){
    console.log("set mask")
    this._maskImage = maskImage
    this._maskPrediction = maskPrediction
    this.frd.setMask(this.glCanvas.getContext("webgl")!, this._maskImage, this._maskPrediction)
  }


  swapFace(videoFrame:HTMLCanvasElement, maskPrediction:facemesh.AnnotatedPrediction[]):HTMLCanvasElement{
    const gl = this.glCanvas.getContext("webgl")!
    this.frd.drawFacemesh(gl, videoFrame, maskPrediction)
    // const ctx = this.glCanvasOut.getContext("2d")!
    // ctx.drawImage(this.glCanvasOut,0,0)
    return this.glCanvasOut
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


  private dropdownVideoInput:any = null

  facemesh_initialized = false
  bodypix_initialized = false
  faceswap?:FaceSwap


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


//   lastTime = performance.now();
//   first_predict = true





  handleResult = (videoFrame:HTMLCanvasElement, prediction:facemesh.AnnotatedPrediction[]):HTMLCanvasElement =>{
    const ctx = this.landmarkCanvasRef.current!.getContext("2d")!!
    ctx.clearRect(0,0,this.landmarkCanvasRef.current!.width,this.landmarkCanvasRef.current!.height)

    console.log(prediction)

    prediction!.forEach(x=>{
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
    
    return this.faceswap!.swapFace(videoFrame, prediction)!
  }




//   masktex_id:any = null
//   masktex_image:any = null

  
  componentDidMount() {

    // AI Model Worker initializing.... 
    const initFacemeshPromise = this.facemesh.init()
    const initBodypixPromis = this.bodypix.init(ModelConfigMobileNetV1_05)
    Promise.all([initFacemeshPromise, initBodypixPromis]).then(()=>{
      console.log("Both AI Model is initialized!")
      // Faceswap main process starting..
      this.faceswap = new FaceSwap(this.landmarkCanvasGLRef.current!, 640,480)
      this.imageElementRef.current!.onload = ()=>{
        console.log("image element onload ed")
        this.predictMask(this.imageElementRef.current!)
        this.predictVideoFrame()
      }
//      this.imageElementRef.current!.src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"
      this.imageElementRef.current!.src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"
      
      // this.predictMask(this.imageElementRef.current!)
      // this.predictVideoFrame()
    })

    // Device List initializing...
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
  }

  predictMask = (mask:HTMLImageElement) =>{
    const maskCanvas = document.createElement("canvas")
    maskCanvas.width=mask.width
    maskCanvas.height=mask.height
    const ctx = maskCanvas.getContext("2d")!
    ctx.drawImage(mask, 0,0)
    this.facemesh.predict(maskCanvas).then(prediction=>{
      console.log("predict mask done...",prediction)
      // this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
      this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
    })
  }

  predictVideoFrame = () =>{
    const ctx = this.videoFrameCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.inputVideoElement,0,0,this.videoFrameCanvasRef.current!.width,this.videoFrameCanvasRef.current!.height)

    const facemeshPromise = this.facemesh.predict(this.videoFrameCanvasRef.current!)
    const bodypixPromise = this.bodypix.predict(this.videoFrameCanvasRef.current!)
    Promise.all([facemeshPromise, bodypixPromise]).then(predictions=>{
      console.log("predict video frame done!.",predictions)
      const out = this.handleResult(this.videoFrameCanvasRef.current!, predictions[0] as facemesh.AnnotatedPrediction[])
      // const ctx = this.landmarkCanvasGLRef.current!.getContext("2d")!
      // ctx.drawImage(out,0,0)
      // ctx.fillText("AAAAAAAAAAAAAAa",10,10)
      requestAnimationFrame(() => this.predictVideoFrame())
    })
  }



  private _inputVideoStream:MediaStream | null           = null
  selectInputVideoDevice = async(deviceId:string) =>{
    this._inputVideoStream?.getTracks().map(s=>s.stop())
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
