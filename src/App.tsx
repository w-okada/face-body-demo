import React from 'react';
import logo from './logo.svg';
import './App.css';
import {FacemeshWorkerManager} from 'facemesh-worker-js'
import {BodypixWorkerManager} from 'bodypix-worker-js'
import * as facemesh from '@tensorflow-models/facemesh'
import * as bodyPix from '@tensorflow-models/body-pix'

class App extends React.Component {
  imageElementRef = React.createRef<HTMLImageElement>()
  landmarkCanvasRef = React.createRef<HTMLCanvasElement>()
  facemesh:FacemeshWorkerManager = new FacemeshWorkerManager()
  bodypix:BodypixWorkerManager = new BodypixWorkerManager()

  facemesh_initialized = false
  bodypix_initialized = false

  facemesh_predicted = false
  bodypix_predicted = false
  facemesh_prediction:facemesh.AnnotatedPrediction[]|null =null
  bodypix_prediction:bodyPix.SemanticPersonSegmentation|null=null

  module_initialized = () => {
    if(this.facemesh_initialized && this.bodypix_initialized){
      requestAnimationFrame(() => this.predict())
    }
  }

  lastTime = performance.now();
  predict_finished = () =>{
    if(this.facemesh_predicted && this.bodypix_predicted){
      const thisTime = performance.now();
      console.log("both prediction done", thisTime-this.lastTime)
      this.lastTime = thisTime
      this.facemesh_predicted = false
      this.bodypix_predicted = false
      requestAnimationFrame(() => this.predict())
    }
  }


  predict = () =>{
    const canvas = document.createElement("canvas")
    canvas.width = this.imageElementRef.current!.width
    canvas.height = this.imageElementRef.current!.height
    
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(this.imageElementRef.current!,0,0,this.imageElementRef.current!.width, this.imageElementRef.current!.height)
    this.facemesh.predict(canvas)
    this.bodypix.predict(canvas)
  }

  componentDidMount() {
    this.facemesh.init()
    this.facemesh.addInitializedListener(()=>{
      console.log("Demo: facemesh initialized")
      this.facemesh_initialized=true
      this.module_initialized()
    })
    this.facemesh.addPredictedListeners((prediction:facemesh.AnnotatedPrediction[])=>{
//      console.log("Demo: facemesh predicted", prediction)
      this.facemesh_prediction=prediction
      this.facemesh_predicted=true
      this.predict_finished()
    })


    this.bodypix.init()
    this.bodypix.addInitializedListener(()=>{
      console.log("Demo: bodypix initialized")
      this.bodypix_initialized=true
      this.module_initialized()
    })
    this.bodypix.addPredictedListeners((prediction:bodyPix.SemanticPersonSegmentation)=>{
//      console.log("Demo: bodypix predicted", prediction)
      this.bodypix_prediction=prediction
      this.bodypix_predicted=true
      this.predict_finished()
    })

  }

  render() {
    console.log("rendor")

    return(
      <div>
        <img  crossOrigin="anonymous" ref={this.imageElementRef} src="https://www.sponichi.co.jp/entertainment/news/2019/10/04/jpeg/20191004s00041000331000p_view.jpg"></img>
        <canvas ref={this.landmarkCanvasRef} style={{ position: "absolute", top:"0px", left:"0px"}}/>
      </div>
    )

  }
}

export default App;
