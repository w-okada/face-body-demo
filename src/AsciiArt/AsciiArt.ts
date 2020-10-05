export class AsciiArt{
    private _asciiStr = " .,:;i1tfLCG08@"
    private _asciiCharacters = (this._asciiStr).split("");
    set asciiString(val:string){
        this._asciiStr=val
        this._asciiCharacters = (this._asciiStr).split("")
    }

    private _asciiFontSize                                  = 6
    set asciiFontSize(val:number){
        this._asciiFontSize=val
    }

    // http://www.dfstudios.co.uk/articles/image-processing-algorithms-part-5/
    private contrastFactor = (259 * (128 + 255)) / (255 * (259 - 128));

    private canvasOut = document.createElement("canvas")   // for final image
    private canvasSmall = document.createElement("canvas") // for creating bitmap to calculate the dot brightness
    convert = async (image:HTMLCanvasElement):Promise<HTMLCanvasElement> =>{
        this.canvasOut.width  = image.width
        this.canvasOut.height = image.height
        const ctx = this.canvasOut.getContext("2d")!
        ctx.font = this._asciiFontSize + "px monospace"
        ctx.textBaseline = "top"
        const m = ctx.measureText(this._asciiStr)
        const charWidth = Math.floor(m.width / this._asciiCharacters.length)
        const tmpWidth  = Math.ceil(this.canvasOut.width  / charWidth)
        const tmpHeight = Math.ceil(this.canvasOut.height / this._asciiFontSize)

        // creating bitmap to calculate the dot brightness
        this.canvasSmall.width = tmpWidth
        this.canvasSmall.height = tmpHeight
        const ctxSmall = this.canvasSmall.getContext("2d")!
        ctxSmall.drawImage(image, 0, 0, tmpWidth, tmpHeight)
        const imageData = ctxSmall.getImageData(0, 0, tmpWidth, tmpHeight)

        // generate chars agaist the each dot
        const lines = []
        for(let y = 0; y < tmpHeight; y++){
            let line =""
            for(let x = 0; x < tmpWidth; x++){
                const offset = (y * tmpWidth + x) * 4
                const r = Math.max(0, Math.min((Math.floor((imageData.data[offset + 0] - 128 ) * this.contrastFactor) + 128), 255))
                const g = Math.max(0, Math.min((Math.floor((imageData.data[offset + 1] - 128 ) * this.contrastFactor) + 128), 255))
                const b = Math.max(0, Math.min((Math.floor((imageData.data[offset + 2] - 128 ) * this.contrastFactor) + 128), 255))

                var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                var character = this._asciiCharacters[
                    (this._asciiCharacters.length - 1) - Math.round(brightness * (this._asciiCharacters.length - 1))
                ]
                line += character
            }
            lines.push(line)
        }

        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(0, 0, this.canvasOut.width, this.canvasOut.height)
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font = this._asciiFontSize + "px monospace"
        for(let n=0; n<lines.length; n++){
            ctx.fillText(lines[n], 0, n * this._asciiFontSize)
        }
        return this.canvasOut

    }


}