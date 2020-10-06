import React from 'react';
import logo from './logo.svg';
import './App.css';
import { FacemeshWorkerManager } from '@dannadori/facemesh-worker-js'
import { BodypixWorkerManager, ModelConfigMobileNetV1_05 } from '@dannadori/bodypix-worker-js'
import * as facemesh from '@tensorflow-models/facemesh'
import * as bodyPix from '@tensorflow-models/body-pix'
import { Coords3D } from '@tensorflow-models/facemesh/dist/util';
import { TRIANGULATION } from './Faceswap/traiangulation';
import { Icon, Label, Dropdown } from 'semantic-ui-react';
import { getDeviceLists, getVideoDevice } from './CameraUtil';
import { FacemeshRenderer } from './Faceswap/FaceswapRenderer';
import { FaceSwap } from './Faceswap/Faceswap';
import { AsciiArt } from './AsciiArt/AsciiArt';
import { render } from '@testing-library/react';




class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      deviceLists: {}
    };
  }

  imageElementRef = React.createRef<HTMLImageElement>()
  dummyImageElementRef = React.createRef<HTMLImageElement>()
  landmarkCanvasRef = React.createRef<HTMLCanvasElement>()
  landmarkCanvasGLRef = React.createRef<HTMLCanvasElement>()
  videoFrameCanvasRef = React.createRef<HTMLCanvasElement>()


  facemesh: FacemeshWorkerManager = new FacemeshWorkerManager()
  bodypix: BodypixWorkerManager = new BodypixWorkerManager()
  asciiart: AsciiArt = new AsciiArt()


  private dropdownVideoInput: any = null

  facemesh_initialized = false
  bodypix_initialized = false
  faceswap?: FaceSwap


  facemesh_predicted = false
  bodypix_predicted = false
  facemesh_prediction: facemesh.AnnotatedPrediction[] | null = null
  bodypix_prediction: bodyPix.SemanticPersonSegmentation | null = null
  maskPrediction: facemesh.AnnotatedPrediction[] | null = null

  private inputVideoElement = document.createElement("video")

  handleResult = (videoFrame: HTMLCanvasElement, prediction: facemesh.AnnotatedPrediction[]): HTMLCanvasElement => {
    const ctx = this.landmarkCanvasRef.current!.getContext("2d")!!
    ctx.clearRect(0, 0, this.landmarkCanvasRef.current!.width, this.landmarkCanvasRef.current!.height)

    console.log(prediction)

    //// Drawing mesh
    prediction!.forEach(x => {
      const keypoints = x.scaledMesh as Coords3D
      //      const keypoints = x.mesh as Coords3D
      for (let i = 0; i < TRIANGULATION.length / 3; i++) {
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

  componentDidMount() {

    // AI Model Worker initializing.... 
    const initFacemeshPromise = this.facemesh.init()
    const initBodypixPromis = this.bodypix.init(ModelConfigMobileNetV1_05)
    Promise.all([initFacemeshPromise, initBodypixPromis]).then(() => {
      console.log("Both AI Model is initialized!")
      // Faceswap main process starting..
      this.faceswap = new FaceSwap(640, 480)
      this.imageElementRef.current!.onload = () => {
        console.log("image element onload ed")
        // this.predictMask(this.imageElementRef.current!)
        // this.predictVideoFrame()
      }
      //      this.imageElementRef.current!.src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"
      //      this.imageElementRef.current!.src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"
      this.imageElementRef.current!.src = "/ai_face01.jpeg"

      // this.predictMask(this.imageElementRef.current!)
      // this.predictVideoFrame()
    })

    // Device List initializing...
    getDeviceLists().then((deviceLists) => {
      this.setState({ deviceLists: deviceLists })
    })
  }

  predictMask = (mask: HTMLImageElement) => {
    const maskCanvas = document.createElement("canvas")
    maskCanvas.width = mask.width
    maskCanvas.height = mask.height
    const ctx = maskCanvas.getContext("2d")!
    ctx.drawImage(mask, 0, 0)
    this.facemesh.predict(maskCanvas).then(prediction => {
      console.log("predict mask done...", prediction)
      // this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
      this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
    })
  }

  predictVideoFrame = async () => {
    const ctx = this.videoFrameCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.inputVideoElement, 0, 0, this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height)

    const facemeshPromise = this.facemesh.predict(this.videoFrameCanvasRef.current!)
    const bodypixPromise = this.bodypix.predict(this.videoFrameCanvasRef.current!)
    Promise.all([facemeshPromise, bodypixPromise]).then(async predictions => {
      console.log("predict video frame done!.", predictions)
      const out = this.handleResult(this.videoFrameCanvasRef.current!, predictions[0] as facemesh.AnnotatedPrediction[])
      const ctx = this.landmarkCanvasGLRef.current!.getContext("2d")!
      ctx.drawImage(this.videoFrameCanvasRef.current!, 0, 0)
      ctx.drawImage(out, 0, 0)

      const s = performance.now()
      const ascii = await this.asciiart.convert(this.videoFrameCanvasRef.current!)
      ctx.drawImage(ascii, 0, 0)
      const e = performance.now()
      console.log("ASCII ART: ", e - s)

      requestAnimationFrame(() => this.predictVideoFrame())
    })
  }



  private _inputVideoStream: MediaStream | null = null
  selectInputVideoDevice = async (deviceId: string) => {
    this._inputVideoStream ?.getTracks().map(s => s.stop())
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
      throw new Error("DEVICE:error: " + e)
    });
  }

  callbacks = {
    setForegroundInput:  (deviceId: string) => { console.log("deivce selected", deviceId) },
    setForegroundMovie:  (path:string) =>{console.log("movie selected", path) },
    setForegroundEffect: (effectId: string) => { console.log("foreground effect selected", effectId) },

    setBackgroundInput: (input:any) => {console.log("backgournd media", input)},
    setBackgroundImage: (path:string) =>{console.log("background image", path)},
    setBackgroundMovie: (path:string) =>{console.log("background movie", path)},
    setBackgroundEffect: (effectId: string) => { console.log("background effect selected", effectId) },

    setFaceswapImage: (path:string) => { console.log("faceswap", path) },
  }

  render() {
    console.log("rendor")
    return (
      <div>
        {/* <img  crossOrigin="anonymous" ref={this.imageElementRef} src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"></img> */}
        <img crossOrigin="anonymous" ref={this.imageElementRef} src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"></img>
        <img crossOrigin="anonymous" ref={this.dummyImageElementRef} src="/white.png"></img>

        {/* <canvas ref={this.landmarkCanvasRef} style={{ position: "absolute", top:"0px", left:"0px"}}/> */}
        <canvas ref={this.videoFrameCanvasRef} width="640px" height="480px" />
        <canvas ref={this.landmarkCanvasRef} width="640px" height="480px" />
        <canvas ref={this.landmarkCanvasGLRef} width="640px" height="480px" />

        <span style={{ marginLeft: "10px" }}>
          VideoSource <ForegroundInputList {...this.state} callbacks={this.callbacks} />
          <ForegroundEffect {...this.state} callbacks={this.callbacks} />
          <BackgroundInputList {...this.state} callbacks={this.callbacks}/>
          <BackgroundEffect  {...this.state} callbacks={this.callbacks}/>
          <FaceSwapEffect {...this.state} callbacks={this.callbacks}/>
        </span>
      </div>
    )
  }
}




const FaceSwapEffect = (props: any) =>{
  const backgroundEffects: any = [
    {key: "none", text: "none", value: "none"},
    {key: "on", text: "on", value: "on"},
  ]
  const imageFileInputRef = React.createRef<HTMLInputElement>()
  let imageFileinput = <input type="file" hidden ref={imageFileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setFaceswapImage(path)
  }} />

  const backgroundEffectList = <Dropdown placeholder='State' search selection options={backgroundEffects} onChange={(e, v) => {
    if(v.value === "on"){
      imageFileInputRef.current!.click()
    }else{
      props.callbacks.setFaceswapImage(null)
    }
  }} />
  return (
    <div>
      {imageFileinput}
      {backgroundEffectList}
    </div>
  )
}



const BackgroundEffect = (props: any) =>{
  const backgroundEffects: any = [
    {key: "none", text: "none", value: "none"},
    {key: "ascii", text: "ascii", value: "ascii"},
    {key: "canny", text: "canny", value: "canny"},
  ]
  const backgroundEffectList = <Dropdown placeholder='State' search selection options={backgroundEffects} onChange={(e, v) => {
    props.callbacks.setBackgroundEffect(v.value)
  }} />
  return (
    <div>
      {backgroundEffectList}
    </div>
  )
}


const BackgroundInputList = (props: any) => {
  console.log("VIDEO LIST: ", props)

  // Generate File chooser for movie
  const movieFileInputRef = React.createRef<HTMLInputElement>()
  let movieFileinput = <input type="file" hidden ref={movieFileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setBackgroundMovie(path)
  }} />
  const imageFileInputRef = React.createRef<HTMLInputElement>()
  let imageFileinput = <input type="file" hidden ref={imageFileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setBackgroundImage(path)
  }} />

  // Generate backgroundInputDropdownList 
  let backgroundInputList = <div />
  const backgroundInputs: any = [
    {key: "none", text: "none", value: "none"},
    {key: "image", text: "image", value: "image"},
    {key: "movie", text: "movie", value: "movie"},
    {key: "window", text: "window", value: "window"},
  ]
  backgroundInputList = <Dropdown placeholder='State' search selection options={backgroundInputs} onChange={async (e, v) => {
    if (v.value === "movie") {
      movieFileInputRef.current!.click()
    }else if (v.value === "image"){
      imageFileInputRef.current!.click()
    } else if(v.value === "window"){
      // @ts-ignore https://github.com/microsoft/TypeScript/issues/31821
      const media = await window.navigator.mediaDevices.getDisplayMedia(
        {video:true}
      );
      props.callbacks.setBackgroundInput(media)
    } else{
      props.callbacks.setBackgroundInput(null)
    }
  }} />

  return (
    <div>
      {movieFileinput}
      {imageFileinput}
      {backgroundInputList}
    </div>
  )
}

const ForegroundEffect = (props: any) =>{
  const foregroundEffects: any = [
    {key: "none", text: "none", value: "none"},
    {key: "ascii", text: "ascii", value: "ascii"},
    {key: "canny", text: "canny", value: "canny"},
  ]
  const foregroundEffectList = <Dropdown placeholder='State' search selection options={foregroundEffects} onChange={(e, v) => {
    props.callbacks.setForegroundEffect(v.value)
  }} />
  return (
    <div>
      {foregroundEffectList}
    </div>
  )
}

const ForegroundInputList = (props: any) => {
  console.log("VIDEO LIST: ", props)

  // Generate File chooser for movie
  const fileInputRef = React.createRef<HTMLInputElement>()
  let fileinput = <input type="file" hidden ref={fileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setForegroundMovie(path)
  }} />

  // Generate foregroundInputDropdownList 
  let foregroundInputList = <div />
  const foregroundInputs: any = []
  if (props.deviceLists["videoinput"]) {
    props.deviceLists["videoinput"].map((videoInput: any) => {
      //console.log("----------------", videoInput)
      foregroundInputs.push({
        key: videoInput.label,
        text: videoInput.label,
        value: videoInput.deviceId,
      })
    })
    foregroundInputs.push({key: "movie", text: "movie", value: "movie",})
    foregroundInputList = <Dropdown placeholder='State' search selection options={foregroundInputs} onChange={(e, v) => {
      if (v.value === "movie") {
        fileInputRef.current!.click()
      } else {
        props.callbacks.setForegroundInput(v.value)
      }
    }} />
  }



  return (
    <div>
      {fileinput}
      {foregroundInputList}

    </div>
  )
}


export default App;
