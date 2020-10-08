import { FacemeshWorkerManager } from "@dannadori/facemesh-worker-js"
import { BodypixWorkerManager, ModelConfigMobileNetV1_05 } from "@dannadori/bodypix-worker-js"
import { AsciiArtWorkerManager } from "@dannadori/asciiart-worker-js"
import { OpenCVWorkerManager, OpenCVFunctionType } from "@dannadori/opencv-worker-js"
import { VirtualBackground } from "../VirtualBackground/VirtualBackground"
import { FaceSwap } from "../Faceswap/Faceswap"
import * as facemesh from '@tensorflow-models/facemesh'
import * as bodyPix from '@tensorflow-models/body-pix'


export const EFFECT = {"none":"none", "ascii":"ascii", "canny":"canny"}
type EFFECT = keyof typeof EFFECT;

export class LocalVideoEffector {

    private _facemesh: FacemeshWorkerManager = new FacemeshWorkerManager()
    private _facemesh2: FacemeshWorkerManager = new FacemeshWorkerManager()
    private _bodypix: BodypixWorkerManager = new BodypixWorkerManager()
    private _asciiart: AsciiArtWorkerManager = new AsciiArtWorkerManager()
    private _opencv:OpenCVWorkerManager = new OpenCVWorkerManager()
    private _vbg: VirtualBackground = new VirtualBackground()
    private _faceswap: FaceSwap = new FaceSwap(640, 480)



    private _faceswapEnable = false
    set faceswapEnable(value:boolean){this._faceswapEnable = value}
    private _virtualBackgroundEnable = false
    set virtualBackgroundEnable(value:boolean){this._virtualBackgroundEnable = value}
    private _foregroundEffect = EFFECT.none
    set foregroundEffect(value:EFFECT|string){this._foregroundEffect = value}
    private _backgroundEffect = EFFECT.none
    set backgroundEffect(value:EFFECT|string){this._backgroundEffect = value}

    init = () =>{
        const initBodypixPromise = this._bodypix.init(ModelConfigMobileNetV1_05)
        const initFacemeshPromise = this._facemesh.init()
        const initOpenCVPromise = this._opencv.init()
        const initAsciiArtPromise = this._asciiart.init()
        const p = Promise.all([initFacemeshPromise, initBodypixPromise, initOpenCVPromise, initAsciiArtPromise]).then(() => {
            console.log("All AI Model is initialized!")
            return
        })
        return p
    }
    predictMask = (mask: HTMLImageElement) => {
      const initFacemeshPromise2 = this._facemesh2.init()
      initFacemeshPromise2.then(()=>{
        const maskCanvas = document.createElement("canvas")
        maskCanvas.width = mask.width
        maskCanvas.height = mask.height
        const ctx = maskCanvas.getContext("2d")!
        ctx.drawImage(mask, 0, 0, mask.width, mask.height)
        console.log("start predicting mask")
        this._facemesh2.predict(maskCanvas).then(prediction => {
          console.log("predict mask done...", prediction)
          this._faceswap!.setMask(maskCanvas, prediction as facemesh.AnnotatedPrediction[])
        })
      })
    }
  

    convertFrame = async (foregroundCanvasElement:HTMLCanvasElement, backgroundCanvasElement:HTMLCanvasElement) => {
        if (foregroundCanvasElement.width <= 0 ||
            foregroundCanvasElement.height <= 0 ||
            backgroundCanvasElement.width <= 0 ||
            backgroundCanvasElement.height <= 0) {
            return foregroundCanvasElement
        }

        const promises: (Promise<any> | null)[] = []
        if (this._virtualBackgroundEnable) {
            promises.push(this._bodypix.predict(foregroundCanvasElement))
        } else {
            promises.push(null)
        }

        if (this._foregroundEffect === EFFECT.ascii) {
            promises.push(this._asciiart.predict(foregroundCanvasElement))
        } else if (this._foregroundEffect === EFFECT.canny) {
            promises.push(this._opencv.predict(foregroundCanvasElement, OpenCVFunctionType.Canny))
        } else {
            promises.push(null)
        }

        if (this._backgroundEffect === EFFECT.ascii) {
            promises.push(this._asciiart.predict(backgroundCanvasElement))
        } else if (this._backgroundEffect === EFFECT.canny) {
            promises.push(this._opencv.predict(backgroundCanvasElement, OpenCVFunctionType.Canny))
        } else {
            promises.push(null)
        }

        if (this._faceswapEnable) {
            promises.push(this._facemesh.predict(foregroundCanvasElement))
        } else {
            promises.push(null)
        }

        const p = Promise.all(promises).then(async (results) => {
            console.log(results)

            const bodypixResult = results[0] as bodyPix.SemanticPersonSegmentation
            const foreEffectResult = results[1] as ImageBitmap
            const backEffectResult = results[2] as ImageBitmap
            const faceswapResult = results[3] as facemesh.AnnotatedPrediction[]

            if (foreEffectResult) {
                foregroundCanvasElement.getContext("2d")!.drawImage(
                    foreEffectResult, 0, 0, foregroundCanvasElement.width, foregroundCanvasElement.height)
            }
            if (backEffectResult) {
                backgroundCanvasElement.getContext("2d")!.drawImage(
                    backEffectResult, 0, 0, backgroundCanvasElement.width, backgroundCanvasElement.height)
            }

            const fs = performance.now()
            if (faceswapResult) {
                const out = this._faceswap!.swapFace(foregroundCanvasElement, faceswapResult)!
                const ctx = foregroundCanvasElement.getContext("2d")!
                ctx.drawImage(out, 0, 0)
            }

            const fe = performance.now()
            console.log("faceswap time:", fe - fs)

            let outputCanvas = foregroundCanvasElement
            if (this._virtualBackgroundEnable) {
                console.log("outputc:0 ")
                outputCanvas = await this._vbg.convert(foregroundCanvasElement, backgroundCanvasElement, bodypixResult)
            }
            return outputCanvas
        })
        return p
    }
}