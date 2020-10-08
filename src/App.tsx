import React from 'react';
import './App.css';
import { Dropdown } from 'semantic-ui-react';
import { getDeviceLists, getVideoDevice } from './CameraUtil';

import { LocalVideoEffector, EFFECT } from './LocalVideoEffector/LocalVideoEffector';

class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      deviceLists: {}
    };
  }
  localVideoEffector = new LocalVideoEffector()

  foregroundVideoElementRef = React.createRef<HTMLVideoElement>()
  backgroundVideoElementRef = React.createRef<HTMLVideoElement>()
  foregroundCanvasElementRef = React.createRef<HTMLCanvasElement>()
  backgroundCanvasElementRef = React.createRef<HTMLCanvasElement>()
  backgroundImageElementRef = React.createRef<HTMLImageElement>()
  faceswapMaskImageElementRef = React.createRef<HTMLImageElement>()
  backgroundInput  = "none"

  imageElementRef = React.createRef<HTMLImageElement>()
  dummyImageElementRef = React.createRef<HTMLImageElement>()
  landmarkCanvasRef = React.createRef<HTMLCanvasElement>()
  landmarkCanvasGLRef = React.createRef<HTMLCanvasElement>()
  videoFrameCanvasRef = React.createRef<HTMLCanvasElement>()

  componentDidMount() {
    // AI Model Worker initializing.... 
    this.localVideoEffector.init().then(()=>{
      this.predictVideoFrame()
    })
    // Device List initializing...
    getDeviceLists().then((deviceLists) => {
      this.setState({ deviceLists: deviceLists })
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

    if(this.foregroundCanvasElementRef.current!.width <= 0 ||
      this.foregroundCanvasElementRef.current!.height <= 0 ||
      this.backgroundCanvasElementRef.current!.width <= 0 ||
      this.backgroundCanvasElementRef.current!.height <= 0 ){
        console.log("reload ",this.foregroundCanvasElementRef.current!.width, this.backgroundCanvasElementRef.current!.width)
        requestAnimationFrame(() => this.predictVideoFrame())
        return
    }

    this.localVideoEffector.convertFrame(
      this.foregroundCanvasElementRef.current!, 
      this.backgroundCanvasElementRef.current!).then((canvas)=>{

      this.landmarkCanvasGLRef.current!.width = 640
      this.landmarkCanvasGLRef.current!.height = 480
      this.landmarkCanvasGLRef.current!.getContext("2d")!
        .drawImage(canvas, 0, 0, this.landmarkCanvasGLRef.current!.width, this.landmarkCanvasGLRef.current!.height)

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
      this.localVideoEffector.foregroundEffect = effectId
      console.log("foreground effect selected", effectId) 
    },


    ////// Background /////
    setBackgroundInput: (stream?:MediaStream) => {
      if(stream === null){
        console.log("clear bg")
        this.backgroundVideoElementRef.current!.srcObject = null
        this.backgroundVideoElementRef.current!.pause()
        this.localVideoEffector.virtualBackgroundEnable = false
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
        this.localVideoEffector.virtualBackgroundEnable = true
        this.backgroundInput="window"
      }
      console.log("backgournd media", stream)
    },
    setBackgroundImage: (path:string) =>{
      this.backgroundImageElementRef.current!.onload = () => {
        this.backgroundImageElementRef.current!.width = this.backgroundImageElementRef.current!.naturalWidth
        this.backgroundImageElementRef.current!.height = this.backgroundImageElementRef.current!.naturalHeight
      }

      this.localVideoEffector.virtualBackgroundEnable = true
      this.backgroundImageElementRef.current!.src = path
      this.backgroundInput="image"
      console.log("background image", path)
    },
    setBackgroundMovie: (path:string) =>{
      this.backgroundVideoElementRef.current!.onloadedmetadata = () => {
        this.backgroundVideoElementRef.current!.width = this.backgroundVideoElementRef.current!.videoWidth
        this.backgroundVideoElementRef.current!.height = this.backgroundVideoElementRef.current!.videoHeight
      }
      this.backgroundVideoElementRef.current!.pause()
      this.backgroundVideoElementRef.current!.srcObject = null
      this.backgroundVideoElementRef.current!.src = path
      this.backgroundVideoElementRef.current!.currentTime=0
      this.backgroundVideoElementRef.current!.autoplay = true
      this.backgroundVideoElementRef.current!.play()
      this.localVideoEffector.virtualBackgroundEnable = true
      this.backgroundInput="movie"
      console.log("background movie", path)
    },

    setBackgroundEffect: (effectId: string) => { 
      this.localVideoEffector.backgroundEffect = effectId
      console.log("background effect selected", effectId) 
    },

    ////// Face swap ///////
    setFaceswapImage: (path:string) => { 
      if(path === null){
        this.localVideoEffector.faceswapEnable = false
      }else{
        this.faceswapMaskImageElementRef.current!.src = path
        this.faceswapMaskImageElementRef.current!.onload = ()=>{
          this.localVideoEffector.predictMask(this.faceswapMaskImageElementRef.current!)
          this.localVideoEffector.faceswapEnable = true
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
        <canvas ref={this.landmarkCanvasGLRef} width="640px" height="480px" onWheel={(e)=>{
          if(e.deltaY<0){
            console.log("go")
            this.foregroundVideoElementRef.current!.currentTime += 10
          }else{
            console.log("back")
            this.foregroundVideoElementRef.current!.currentTime -= 10
          }
        }}/>
        <img alt="" ref={this.faceswapMaskImageElementRef} style={{ width:"480px", height:"320"}} />


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
        <video ref={this.foregroundVideoElementRef} style={{ display: "none", width:"480px", height:"320"}} playsInline />
        <video ref={this.backgroundVideoElementRef} style={{ display: "none", width:"480px", height:"320"}} playsInline />
        <img alt="" ref={this.backgroundImageElementRef} style={{ display: "none", width:"480px", height:"320"}} />


        <canvas ref={this.foregroundCanvasElementRef} width="1280px" style={{display: "none", width:"480px", height:"320"}}/>
        <canvas ref={this.backgroundCanvasElementRef} width="1280px" style={{display: "none", width:"480px", height:"320"}}/>
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
//  const effects=["none","ascii","canny"]
  const effects = Object.entries(EFFECT).map(([_, value]) => value);
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
//  const effects = ["none","ascii","canny"]
//  const effects = EFFECT
  const effects = Object.entries(EFFECT).map(([_, value]) => value);
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
