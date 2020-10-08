import React from 'react';
import './App.css';
import { FacemeshWorkerManager } from '@dannadori/facemesh-worker-js'
import { BodypixWorkerManager, ModelConfigMobileNetV1_05 } from '@dannadori/bodypix-worker-js'
import { OpenCVWorkerManager, OpenCVFunctionType } from '@dannadori/opencv-worker-js'
import { AsciiArtWorkerManager} from '@dannadori/asciiart-worker-js'
import * as facemesh from '@tensorflow-models/facemesh'
import * as bodyPix from '@tensorflow-models/body-pix'
import { Dropdown } from 'semantic-ui-react';
import { getDeviceLists, getVideoDevice } from './CameraUtil';
import { FaceSwap } from './Faceswap/Faceswap';

import { VirtualBackground } from './VirtualBackground/VirtualBackground';

class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      deviceLists: {}
    };
  }
  foregroundVideoElementRef = React.createRef<HTMLVideoElement>()
  backgroundVideoElementRef = React.createRef<HTMLVideoElement>()
  foregroundCanvasElementRef = React.createRef<HTMLCanvasElement>()
  backgroundCanvasElementRef = React.createRef<HTMLCanvasElement>()
  backgroundImageElementRef = React.createRef<HTMLImageElement>()
  faceswapMaskImageElementRef = React.createRef<HTMLImageElement>()
  foregroundEffect = "none"
  backgroundEffect = "none"
  backgroundInput  = "none"
  virtualBackgroundEnable = false
  faceswapEnable = false




  imageElementRef = React.createRef<HTMLImageElement>()
  dummyImageElementRef = React.createRef<HTMLImageElement>()
  landmarkCanvasRef = React.createRef<HTMLCanvasElement>()
  landmarkCanvasGLRef = React.createRef<HTMLCanvasElement>()
  videoFrameCanvasRef = React.createRef<HTMLCanvasElement>()


  facemesh: FacemeshWorkerManager = new FacemeshWorkerManager()
  bodypix: BodypixWorkerManager = new BodypixWorkerManager()
  asciiart: AsciiArtWorkerManager = new AsciiArtWorkerManager()
  opencv:OpenCVWorkerManager = new OpenCVWorkerManager()
  vbg: VirtualBackground = new VirtualBackground()

  private dropdownVideoInput: any = null

  facemesh_initialized = false
  bodypix_initialized = false
  faceswap?: FaceSwap


  facemesh_predicted = false
  bodypix_predicted = false
  facemesh_prediction: facemesh.AnnotatedPrediction[] | null = null
  bodypix_prediction: bodyPix.SemanticPersonSegmentation | null = null
  maskPrediction: facemesh.AnnotatedPrediction[] | null = null

  handleResult = (videoFrame: HTMLCanvasElement, prediction: facemesh.AnnotatedPrediction[]): HTMLCanvasElement => {
    // const ctx = this.landmarkCanvasRef.current!.getContext("2d")!!
    // ctx.clearRect(0, 0, this.landmarkCanvasRef.current!.width, this.landmarkCanvasRef.current!.height)

    //console.log("Facemesh prediction:", prediction)

    // //// Drawing mesh
    // prediction!.forEach(x => {
    //   const keypoints = x.scaledMesh as Coords3D
    //   //      const keypoints = x.mesh as Coords3D
    //   for (let i = 0; i < TRIANGULATION.length / 3; i++) {
    //     const points = [
    //       TRIANGULATION[i * 3],
    //       TRIANGULATION[i * 3 + 1],
    //       TRIANGULATION[i * 3 + 2]
    //     ].map(index => keypoints[index]);
    //     const region = new Path2D();
    //     region.moveTo(points[0][0], points[0][1]);
    //     for (let i = 1; i < points.length; i++) {
    //       const point = points[i];
    //       region.lineTo(point[0], point[1]);
    //     }
    //     region.closePath();
    //     ctx.stroke(region);
    //   }
    // })

    return this.faceswap!.swapFace(videoFrame, prediction)!
  }

  componentDidMount() {

    // AI Model Worker initializing.... 
    const initFacemeshPromise = this.facemesh.init()
    const initBodypixPromise = this.bodypix.init(ModelConfigMobileNetV1_05)
    const initOpenCVPromise = this.opencv.init()
    const initAsciiArtPromise = this.asciiart.init()
    
    Promise.all([initFacemeshPromise, initBodypixPromise, initOpenCVPromise, initAsciiArtPromise]).then(() => {
      console.log("Both AI Model is initialized!")
      // Faceswap main process starting..
      this.faceswap = new FaceSwap(640, 480)
      this.predictVideoFrame()
    })

    // Device List initializing...
    getDeviceLists().then((deviceLists) => {
      this.setState({ deviceLists: deviceLists })
    })
  }

  facemesh2: FacemeshWorkerManager = new FacemeshWorkerManager()
  predictMask = (mask: HTMLImageElement) => {
    const initFacemeshPromise2 = this.facemesh2.init()
    initFacemeshPromise2.then(()=>{
      const maskCanvas = document.createElement("canvas")
      maskCanvas.width = mask.width
      maskCanvas.height = mask.height
      const ctx = maskCanvas.getContext("2d")!
      ctx.drawImage(mask, 0, 0, mask.width, mask.height)
      console.log("start predicting mask")
      this.facemesh2.predict(maskCanvas).then(prediction => {
        console.log("predict mask done...", prediction)
        // this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
        this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
      })
    })
  }

  private drawForegroundCanvas = (w:number, h:number) =>{
    if(w <= 0 || h <= 0){
      w = this.foregroundVideoElementRef.current!.width
      h = this.foregroundVideoElementRef.current!.height
    }
    this.foregroundCanvasElementRef.current!.width=w
    this.foregroundCanvasElementRef.current!.height=h
    const ctx = this.foregroundCanvasElementRef.current!.getContext("2d")!
    ctx.drawImage(this.foregroundVideoElementRef.current!, 0, 0, w, h)
  }

  private drawBackgroundCanvas = (w:number, h:number) =>{
    // console.log("image-- drawbg bbb", w, h, this.backgroundInput)
    if(w <= 0 || h <= 0){
      if(this.backgroundInput === "image"){
        w = this.backgroundImageElementRef.current!.width
        h = this.backgroundImageElementRef.current!.height
        this.backgroundCanvasElementRef.current!.width=w
        this.backgroundCanvasElementRef.current!.height=h
        const ctx = this.backgroundCanvasElementRef.current!.getContext("2d")!
        // console.log("image-- drawbg aaa1 ", w, h)
        // console.log("image-- drawbg aaa2 ", this.backgroundCanvasElementRef.current!.width, this.backgroundCanvasElementRef.current!.height)
        ctx.drawImage(this.backgroundImageElementRef.current!, 0, 0, w, h)    
      }else if(this.backgroundInput === "window" || this.backgroundInput === "movie"){
        w = this.backgroundVideoElementRef.current!.width
        h = this.backgroundVideoElementRef.current!.height
        this.backgroundCanvasElementRef.current!.width=w
        this.backgroundCanvasElementRef.current!.height=h
        const ctx = this.backgroundCanvasElementRef.current!.getContext("2d")!
        ctx.drawImage(this.backgroundVideoElementRef.current!, 0, 0, w, h)
        console.log("movie width", w)
      }else if(this.backgroundInput === "none"){ // use foreground video
        w = this.foregroundVideoElementRef.current!.width
        h = this.foregroundVideoElementRef.current!.height
        this.backgroundCanvasElementRef.current!.width=w
        this.backgroundCanvasElementRef.current!.height=h
        const ctx = this.backgroundCanvasElementRef.current!.getContext("2d")!
        ctx.drawImage(this.foregroundVideoElementRef.current!, 0, 0, w, h)
      }
    }
  }

  predictVideoFrame = async () => {
    const s = performance.now()

    this.drawForegroundCanvas(640, 480)
    this.drawBackgroundCanvas(-1, -1)

    if(this.foregroundCanvasElementRef.current!.width <= 0 ||
      this.foregroundCanvasElementRef.current!.height <= 0 ||
      this.backgroundCanvasElementRef.current!.width <= 0 ||
      this.backgroundCanvasElementRef.current!.height <= 0 ){
        console.log("reload ",this.foregroundCanvasElementRef.current!.width, this.backgroundCanvasElementRef.current!.width)
        requestAnimationFrame(() => this.predictVideoFrame())
        return
    }

    const promises:(Promise<any>|null)[] = []
    if(this.virtualBackgroundEnable){
      promises.push(this.bodypix.predict(this.foregroundCanvasElementRef.current!))
    }else{
      promises.push(null)
    }

    if(this.foregroundEffect === "ascii"){
      promises.push(this.asciiart.predict(this.foregroundCanvasElementRef.current!))
    }else if(this.foregroundEffect === "canny"){
      promises.push(this.opencv.predict(this.foregroundCanvasElementRef.current!, OpenCVFunctionType.Canny))
    }else{
      promises.push(null)
    }

    if(this.backgroundEffect === "ascii"){
      promises.push(this.asciiart.predict(this.backgroundCanvasElementRef.current!))
    }else if(this.backgroundEffect === "canny"){
      promises.push(this.opencv.predict(this.backgroundCanvasElementRef.current!, OpenCVFunctionType.Canny))
    }else{
      promises.push(null)
    }

    if(this.faceswapEnable){
      promises.push(this.facemesh.predict(this.foregroundCanvasElementRef.current!))
    }else{
      promises.push(null)
    }

    Promise.all(promises).then(async (results)=>{
      console.log(results)

      const bodypixResult = results[0] as bodyPix.SemanticPersonSegmentation
      const foreEffectResult = results[1] as ImageBitmap
      const backEffectResult = results[2] as ImageBitmap
      const faceswapResult = results[3] as facemesh.AnnotatedPrediction[]

      if(foreEffectResult){
        this.foregroundCanvasElementRef.current!.getContext("2d")!.drawImage(
          foreEffectResult,0,0,this.foregroundCanvasElementRef.current!.width, this.foregroundCanvasElementRef.current!.height)
      }
      if(backEffectResult){
        this.backgroundCanvasElementRef.current!.getContext("2d")!.drawImage(
          backEffectResult,0,0,this.backgroundCanvasElementRef.current!.width, this.backgroundCanvasElementRef.current!.height)
      }

      // let currentForegroundCanvas = foreEffectResult ? foreEffectResult:this.foregroundCanvasElementRef.current!
      // let currentBackgroundCanvas = backEffectResult ? backEffectResult:this.backgroundCanvasElementRef.current!

      const fs = performance.now()
      if(faceswapResult){
        const out = this.handleResult(this.foregroundCanvasElementRef.current!, faceswapResult )
        const ctx = this.foregroundCanvasElementRef.current!.getContext("2d")!
        ctx.drawImage(out, 0, 0)
      }
      const fe = performance.now()
      console.log("faceswap time:",fe-fs)

      let outputCanvas = this.foregroundCanvasElementRef.current!
      if(this.virtualBackgroundEnable){
        // console.log("outputc:0 ",this.backgroundCanvasElementRef.current!.width, this.backgroundCanvasElementRef.current!.height)
        outputCanvas = await this.vbg.convert(this.foregroundCanvasElementRef.current!, this.backgroundCanvasElementRef.current!, bodypixResult)
      }
      this.landmarkCanvasGLRef.current!.width = 640
      this.landmarkCanvasGLRef.current!.height = 480
      // console.log("outputc:1 ",outputCanvas.width, outputCanvas.height)
      // console.log("outputc:2 ",this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height)
      this.landmarkCanvasGLRef.current!.getContext("2d")!
        .drawImage(outputCanvas, 0, 0, this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height)
      

      const e = performance.now()
      console.log("Processing: ", e - s)
      requestAnimationFrame(() => this.predictVideoFrame())
    })
  }



  //////////////////////////////////////////////
  // Callbacks 
  //////////////////////////////////////////////
  callbacks = {

    /////// Foreground //////
    setForegroundInput: async (deviceId: string) => {
      console.log("select input",deviceId)
      this.foregroundVideoElementRef.current!.pause()
      await getVideoDevice(deviceId).then(stream => {
        if (stream !== null) {
          this.foregroundVideoElementRef.current!.onloadedmetadata = () => {
            console.log("video--",this.foregroundVideoElementRef.current!.videoWidth)
            console.log("video--",this.foregroundVideoElementRef.current!.videoHeight)
            this.foregroundVideoElementRef.current!.width = this.foregroundVideoElementRef.current!.videoWidth
            this.foregroundVideoElementRef.current!.height = this.foregroundVideoElementRef.current!.videoHeight
          }
          this.foregroundVideoElementRef.current!.srcObject = stream
          this.foregroundVideoElementRef.current!.play()
        }
      }).catch((e) => {
        console.log("DEVICE:error:", e)
        throw new Error("DEVICE:error: " + e)
      });
      // console.log("deivce selected", deviceId)
    },

    setForegroundMovie:  (path:string) =>{
      this.foregroundVideoElementRef.current!.onloadedmetadata = () => {
        console.log("video--",this.foregroundVideoElementRef.current!.videoWidth)
        console.log("video--",this.foregroundVideoElementRef.current!.videoHeight)
        this.foregroundVideoElementRef.current!.width = this.foregroundVideoElementRef.current!.videoWidth
        this.foregroundVideoElementRef.current!.height = this.foregroundVideoElementRef.current!.videoHeight
      }
      this.foregroundVideoElementRef.current!.pause()
      this.foregroundVideoElementRef.current!.srcObject = null
      this.foregroundVideoElementRef.current!.src = path
      this.foregroundVideoElementRef.current!.currentTime=0
      this.foregroundVideoElementRef.current!.autoplay = true
      this.foregroundVideoElementRef.current!.play()
      console.log("movie selected", path) 
    },
    setForegroundEffect: (effectId: string) => {
      this.foregroundEffect = effectId
      console.log("foreground effect selected", effectId) 
    },


    ////// Background /////
    setBackgroundInput: (stream?:MediaStream) => {
      if(stream === null){
        console.log("clear bg")
        this.backgroundVideoElementRef.current!.srcObject = null
        this.backgroundVideoElementRef.current!.pause()
        this.virtualBackgroundEnable = false
        this.backgroundInput="none"
      }else{
        this.backgroundVideoElementRef.current!.onloadedmetadata = () => {
          console.log("video--",this.backgroundVideoElementRef.current!.videoWidth)
          console.log("video--",this.backgroundVideoElementRef.current!.videoHeight)
          this.backgroundVideoElementRef.current!.width = this.backgroundVideoElementRef.current!.videoWidth
          this.backgroundVideoElementRef.current!.height = this.backgroundVideoElementRef.current!.videoHeight
        }

        this.backgroundVideoElementRef.current!.srcObject = stream!
        this.backgroundVideoElementRef.current!.play()
        this.virtualBackgroundEnable = true
        this.backgroundInput="window"
      }
      console.log("backgournd media", stream)
    },
    setBackgroundImage: (path:string) =>{
      this.backgroundImageElementRef.current!.onload = () => {
        console.log("image--w1",this.backgroundImageElementRef.current!.naturalWidth)
        console.log("image--w2",this.backgroundImageElementRef.current!.naturalHeight)
        this.backgroundImageElementRef.current!.width = this.backgroundImageElementRef.current!.naturalWidth
        this.backgroundImageElementRef.current!.height = this.backgroundImageElementRef.current!.naturalHeight
        console.log("image--w3",this.backgroundImageElementRef.current!.width)
        console.log("image--w4",this.backgroundImageElementRef.current!.height)
      }

      this.virtualBackgroundEnable = true
      this.backgroundImageElementRef.current!.src = path
      this.backgroundInput="image"
      console.log("background image", path)
    },
    setBackgroundMovie: (path:string) =>{
      this.backgroundVideoElementRef.current!.onloadedmetadata = () => {
        console.log("video--",this.backgroundVideoElementRef.current!.videoWidth)
        console.log("video--",this.backgroundVideoElementRef.current!.videoHeight)
        this.backgroundVideoElementRef.current!.width = this.backgroundVideoElementRef.current!.videoWidth
        this.backgroundVideoElementRef.current!.height = this.backgroundVideoElementRef.current!.videoHeight
      }
      this.backgroundVideoElementRef.current!.pause()
      this.backgroundVideoElementRef.current!.srcObject = null
      this.backgroundVideoElementRef.current!.src = path
      this.backgroundVideoElementRef.current!.currentTime=0
      this.backgroundVideoElementRef.current!.autoplay = true
      this.backgroundVideoElementRef.current!.play()
      this.virtualBackgroundEnable = true
      this.backgroundInput="movie"
      console.log("background movie", path)
    },

    setBackgroundEffect: (effectId: string) => { 
      this.backgroundEffect = effectId
      console.log("background effect selected", effectId) 
    },

    ////// Face swap ///////
    setFaceswapImage: (path:string) => { 
      if(path === null){
        this.faceswapEnable = false
      }else{
        this.faceswapMaskImageElementRef.current!.src = path
        this.faceswapEnable = true        
        this.faceswapMaskImageElementRef.current!.onload = ()=>{
          this.predictMask(this.faceswapMaskImageElementRef.current!)
        }
      }
      console.log("faceswap", path) 
    },

    //////// etc ////////
    setResolution: (type:string, resolution:number[]) => {
      console.log("setResolution:",type, resolution)
      switch(type){
        case "front":
          console.log("back fro")
          this.foregroundVideoElementRef.current!.width = resolution[0]
          this.foregroundVideoElementRef.current!.height = resolution[1]
          break
        case "back":
          console.log("back reso")
          this.backgroundVideoElementRef.current!.width = resolution[0]
          this.backgroundVideoElementRef.current!.height = resolution[1]
          break
      }
    }
  }

  render() {
    console.log("rendor")
    return (
      <div>
        {/* <canvas ref={this.landmarkCanvasRef} style={{ display: "none", position: "absolute", top:"0px", left:"0px"}}/>
        <canvas ref={this.videoFrameCanvasRef} width="640px" height="480px" style={{ display: "none"}}/>
        <canvas ref={this.landmarkCanvasRef} width="640px" height="480px" style={{ display: "none"}}/> */}
        <canvas ref={this.landmarkCanvasGLRef} width="640px" height="480px" onWheel={(e)=>{
          if(e.deltaY<0){
            console.log("go")
            this.foregroundVideoElementRef.current!.currentTime += 10
          }else{
            console.log("back")
            this.foregroundVideoElementRef.current!.currentTime -= 10
          }
        }}/>
        <img ref={this.faceswapMaskImageElementRef} style={{ width:"480px", height:"320"}} />


        <span style={{ marginLeft: "10px" }}>
          VideoSource <ForegroundInputList {...this.state} callbacks={this.callbacks} />
          <ForegroundEffect {...this.state} callbacks={this.callbacks} />
          <BackgroundInputList {...this.state} callbacks={this.callbacks}/>
          <BackgroundEffect  {...this.state} callbacks={this.callbacks}/>
          <FaceSwapEffect {...this.state} callbacks={this.callbacks}/>

          <ResolutionList {...this.state} callbacks={this.callbacks} type="front"/>
          <ResolutionList {...this.state} callbacks={this.callbacks} type="back"/>

        </span>

        <div>
        <video ref={this.foregroundVideoElementRef} style={{ width:"480px", height:"320"}} playsInline />
        <video ref={this.backgroundVideoElementRef} style={{ width:"480px", height:"320"}} playsInline />
        <img ref={this.backgroundImageElementRef} style={{ display: "none", width:"480px", height:"320"}} />


        <canvas ref={this.foregroundCanvasElementRef} width="1280px" style={{width:"480px", height:"320"}}/>
        <canvas ref={this.backgroundCanvasElementRef} width="1280px" style={{width:"480px", height:"320"}}/>
        </div>
      </div>
    )
  }
}


const ResolutionList = (props: any) =>{
  const resolution=[
    [320,240],
    [480,320],
    [640,480],
    [960,640],
    [1280,960]
  ]
    
  return (
    <div>
      <Dropdown text={'resolution_'+props.type} floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {resolution.map(x=><Dropdown.Item text={x[0]+"x"+x[1]} onClick={()=>{props.callbacks.setResolution(props.type,x)}} />)}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}

const FaceSwapEffect = (props: any) =>{
  const onoff = ["off","on"]

  const imageFileInputRef = React.createRef<HTMLInputElement>()
  let imageFileinput = <input type="file" hidden ref={imageFileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setFaceswapImage(path)
  }} />


  return (
    <div>
      {imageFileinput}
      <Dropdown text='faceswap' floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {onoff.map(x=><Dropdown.Item text={x} onClick={()=>{
            switch(x){
              case "off":
                props.callbacks.setFaceswapImage(null)
                break
              case "on":
                imageFileInputRef.current!.click()
                break
            }
          }} />)}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}



const BackgroundEffect = (props: any) =>{
  const effects=["none","ascii","canny"]
  return (
    <div>
      <Dropdown text='bg effect' floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {effects.map(x=><Dropdown.Item text={x} onClick={()=>{props.callbacks.setBackgroundEffect(x)}} />)}
        </Dropdown.Menu>
      </Dropdown>
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
  // Generate File chooser for image
  const imageFileInputRef = React.createRef<HTMLInputElement>()
  let imageFileinput = <input type="file" hidden ref={imageFileInputRef} onChange={(e: any) => {
    const path = URL.createObjectURL(e.target.files[0]);
    props.callbacks.setBackgroundImage(path)
  }} />

  const backgroundInputs= ["none", "image", "movie", "window"]

  return (
    <div>
      {movieFileinput}
      {imageFileinput}
      <Dropdown text='bg input' floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {backgroundInputs.map(x=><Dropdown.Item text={x} onClick={async ()=>{
            switch(x){
              case "movie":
                movieFileInputRef.current!.click()
                break
              case "image":
                imageFileInputRef.current!.click()
                break
              case "window":
                // @ts-ignore https://github.com/microsoft/TypeScript/issues/31821
                const media = await window.navigator.mediaDevices.getDisplayMedia(
                  {video:true}
                );
                props.callbacks.setBackgroundInput(media)
                break
              default:
                props.callbacks.setBackgroundInput(null)
                break
            }    
          }} />)}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}

const ForegroundEffect = (props: any) =>{
  const effects=["none","ascii","canny"]
  return (
    <div>
      <Dropdown text='fore effect' floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {effects.map(x=><Dropdown.Item text={x} onClick={()=>{props.callbacks.setForegroundEffect(x)}} />)}
        </Dropdown.Menu>
      </Dropdown>
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
  let foregroundInputs: any 
  if (props.deviceLists["videoinput"]) {
    foregroundInputs = props.deviceLists["videoinput"].map((v:any)=>
      <Dropdown.Item text={v.label} onClick={()=>{props.callbacks.setForegroundInput(v.deviceId)}} />
    )
  }else{
    foregroundInputs = []
  }
  foregroundInputs.push(<Dropdown.Item text="movie" onClick={()=>{fileInputRef.current!.click()}} />)

  return (
    <div>
      {fileinput}
      <Dropdown text='Input source' floating labeled button  >
        <Dropdown.Menu>
          <Dropdown.Header content='select...' />
          <Dropdown.Divider />
          {foregroundInputs}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}


export default App;
