import React from 'react';
import logo from './logo.svg';
import './App.css';
import { FacemeshWorkerManager } from '@dannadori/facemesh-worker-js'
import { BodypixWorkerManager, ModelConfigMobileNetV1_05 } from '@dannadori/bodypix-worker-js'
import { OpenCVWorkerManager, OpenCVFunctionType } from '@dannadori/opencv-worker-js'
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
  asciiart: AsciiArt = new AsciiArt()
  opencv:OpenCVWorkerManager = new OpenCVWorkerManager()

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

    console.log("Facemesh prediction:", prediction)

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
    const initBodypixPromise = this.bodypix.init(ModelConfigMobileNetV1_05)
    const initOpenCVPromise = this.opencv.init()
    Promise.all([initFacemeshPromise, initBodypixPromise, initOpenCVPromise]).then(() => {
      console.log("Both AI Model is initialized!")
      // Faceswap main process starting..
      this.faceswap = new FaceSwap(640, 480)
      // this.faceswap = new FaceSwap(640, 480, this.landmarkCanvasGLRef.current! )


      // this.imageElementRef.current!.onload = () => {
      //   console.log("image element onload ed")
      // }
      //      this.imageElementRef.current!.src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"
      //      this.imageElementRef.current!.src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"
      // this.imageElementRef.current!.src = "/ai_face01.jpeg"

      // this.predictMask(this.imageElementRef.current!)
      this.predictVideoFrame()
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
    console.log("IMAGE SIZE>>>>>",mask.width, mask.height)
    const ctx = maskCanvas.getContext("2d")!
    ctx.drawImage(mask, 0, 0, mask.width, mask.height)
    this.facemesh.predict(maskCanvas).then(prediction => {
      console.log("predict mask done...", prediction)
      // this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
      this.faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
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
    if(w <= 0 || h <= 0){
      if(this.backgroundInput === "image"){
        w = this.backgroundImageElementRef.current!.width
        h = this.backgroundImageElementRef.current!.height
        this.backgroundCanvasElementRef.current!.width=w
        this.backgroundCanvasElementRef.current!.height=h
        const ctx = this.backgroundCanvasElementRef.current!.getContext("2d")!
        ctx.drawImage(this.backgroundImageElementRef.current!, 0, 0, w, h)    
      }else if(this.backgroundInput === "window" || this.backgroundInput === "movie"){
        w = this.backgroundVideoElementRef.current!.width
        h = this.backgroundVideoElementRef.current!.height
        this.backgroundCanvasElementRef.current!.width=w
        this.backgroundCanvasElementRef.current!.height=h
        const ctx = this.backgroundCanvasElementRef.current!.getContext("2d")!
        ctx.drawImage(this.backgroundVideoElementRef.current!, 0, 0, w, h)
    
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

    const promises = []
    if(this.virtualBackgroundEnable){
      promises.push(this.bodypix.predict(this.foregroundCanvasElementRef.current!))
    }else{
      promises.push(null)
    }

    if(this.foregroundEffect === "ascii"){
      promises.push(this.asciiart.convert(this.foregroundCanvasElementRef.current!))
    }else if(this.foregroundEffect === "canny"){
      promises.push(this.opencv.predict(this.foregroundCanvasElementRef.current!, OpenCVFunctionType.Canny))
    }else{
      promises.push(null)
    }

    if(this.backgroundEffect === "ascii"){
      promises.push(this.asciiart.convert(this.backgroundCanvasElementRef.current!))
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

    Promise.all(promises).then((results)=>{
      const bodypixResult = results[0]
      const foreEffectResult = results[1]
      const backEffectResult = results[2]
      const faceswapResult = results[3]

      const currentForegroundCanvas = foreEffectResult ? foreEffectResult:this.foregroundCanvasElementRef.current!
      const currentBackgroundCanvas = backEffectResult ? backEffectResult:this.backgroundCanvasElementRef.current!


      if(faceswapResult){
        const out = this.handleResult(this.foregroundCanvasElementRef.current!, faceswapResult as facemesh.AnnotatedPrediction[])

        const ctx = this.landmarkCanvasGLRef.current!.getContext("2d")!
//         ctx.fillText("ADFASDFASDFASFD " + out.width + "  "+out.height,100,100)
        ctx.drawImage(currentForegroundCanvas as HTMLCanvasElement,0,0)
        ctx.drawImage(out, 0, 0)

      }


      console.log(results)
      const e = performance.now()
      console.log("ASCII ART: ", e - s)
      requestAnimationFrame(() => this.predictVideoFrame())
    })




    // const ctx = this.videoFrameCanvasRef.current!.getContext("2d")!
    // ctx.drawImage(this.inputVideoElement, 0, 0, this.videoFrameCanvasRef.current!.width, this.videoFrameCanvasRef.current!.height)

    // const facemeshPromise = this.facemesh.predict(this.videoFrameCanvasRef.current!)
    // const bodypixPromise = this.bodypix.predict(this.videoFrameCanvasRef.current!)
    // Promise.all([facemeshPromise, bodypixPromise]).then(async predictions => {
    //   console.log("predict video frame done!.", predictions)
    //   const out = this.handleResult(this.videoFrameCanvasRef.current!, predictions[0] as facemesh.AnnotatedPrediction[])
    //   const ctx = this.landmarkCanvasGLRef.current!.getContext("2d")!
    //   ctx.drawImage(this.videoFrameCanvasRef.current!, 0, 0)
    //   ctx.drawImage(out, 0, 0)

    //   const s = performance.now()
    //   const ascii = await this.asciiart.convert(this.videoFrameCanvasRef.current!)
    //   ctx.drawImage(ascii, 0, 0)
    //   const e = performance.now()
    //   console.log("ASCII ART: ", e - s)

    //   requestAnimationFrame(() => this.predictVideoFrame())
    // })
  }



  //////////////////////////////////////////////
  // Callbacks 
  //////////////////////////////////////////////
  callbacks = {

    /////// Foreground //////
    setForegroundInput: async (deviceId: string) => {
      console.log("select input",deviceId)
      this.foregroundVideoElementRef.current!.pause()
      const p = await getVideoDevice(deviceId).then(stream => {
        if (stream !== null) {
          this.foregroundVideoElementRef.current!.width = stream.getVideoTracks()[0].getSettings().width!
          this.foregroundVideoElementRef.current!.height = stream.getVideoTracks()[0].getSettings().height!
          this.foregroundVideoElementRef.current!.srcObject = stream
          this.foregroundVideoElementRef.current!.play()
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
      // console.log("deivce selected", deviceId)
    },

    setForegroundMovie:  (path:string) =>{
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
        // this.foregroundMediaStream = stream
        this.backgroundVideoElementRef.current!.width = stream!.getVideoTracks()[0].getSettings().width!
        this.backgroundVideoElementRef.current!.height = stream!.getVideoTracks()[0].getSettings().height!
        this.backgroundVideoElementRef.current!.srcObject = stream!
        this.backgroundVideoElementRef.current!.play()
        this.virtualBackgroundEnable = true
        this.backgroundInput="window"
      }
      console.log("backgournd media", stream)
    },
    setBackgroundImage: (path:string) =>{
      this.virtualBackgroundEnable = true
      this.backgroundImageElementRef.current!.src = path
      this.backgroundInput="image"
      console.log("background image", path)
    },
    setBackgroundMovie: (path:string) =>{
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
  }

  render() {
    console.log("rendor")
    return (
      <div>
        {/* <img  crossOrigin="anonymous" ref={this.imageElementRef} src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"></img> */}
        {/* <img crossOrigin="anonymous" ref={this.imageElementRef} src="https://pbs.twimg.com/media/EjKgWJRU8AAIGue?format=jpg&name=small"></img>
        <img crossOrigin="anonymous" ref={this.dummyImageElementRef} src="/white.png"></img> */}

        <canvas ref={this.landmarkCanvasRef} style={{ position: "absolute", top:"0px", left:"0px"}}/>
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

        <div>
        <video ref={this.foregroundVideoElementRef} style={{ width:"480px", height:"320"}} playsInline />
        <video ref={this.backgroundVideoElementRef} style={{ width:"480px", height:"320"}} playsInline />
        <img ref={this.backgroundImageElementRef} style={{ width:"480px", height:"320"}} />
        <img ref={this.faceswapMaskImageElementRef} style={{ width:"480px", height:"320"}} />


        <canvas ref={this.foregroundCanvasElementRef} width="1280px" style={{width:"480px", height:"320"}}/>
        <canvas ref={this.backgroundCanvasElementRef} width="1280px" style={{width:"480px", height:"320"}}/>
        {/* <video ref={this.foregroundVideoElementRef} width="1280px" style={{ display: "none"}} playsInline />
        <video ref={this.backgroundVideoElementRef} width="1280px" style={{ display: "none"}} playsInline />

        <canvas ref={this.foregroundCanvasElementRef} width="1280px" style={{ display: "none"}}/>
        <canvas ref={this.backgroundCanvasElementRef} width="1280px" style={{ display: "none"}}/> */}
        </div>
      </div>
    )
  }
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
