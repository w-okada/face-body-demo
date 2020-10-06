


export const getVideoDevice = async (deviceId:string): Promise<MediaStream|null>=>{

    const webCamPromise = navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: deviceId,
            // width: { ideal: 1280 },
            // height: { ideal: 720 }
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
  