import * as facemesh from '@tensorflow-models/facemesh'
import { FacemeshRenderer } from './FaceswapRenderer';

export class FaceSwap {
    private _maskImage?:HTMLCanvasElement
    private _maskPrediction?: facemesh.AnnotatedPrediction[]
    
    private glCanvas    = document.createElement("canvas")
    private glCanvasOut = document.createElement("canvas")
    private frd:FacemeshRenderer
  
    constructor(width:number, height:number){
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
      const ctx = this.glCanvasOut.getContext("2d")!
      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.clearRect(0,0,this.glCanvasOut.width,this.glCanvasOut.height)
      ctx.fillRect(0,0,this.glCanvasOut.width,this.glCanvasOut.height)
      ctx.drawImage(this.glCanvas,0,0)
      return this.glCanvasOut
      // return ctx.getImageData(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
    }
  
  
  }
  