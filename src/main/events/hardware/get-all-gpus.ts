import { registerEvent } from "../register-event";

const getGPU = async (_event: Electron.IpcMainInvokeEvent) => {
  const gl = document.createElement("canvas").getContext("webgl");
  if (!gl) {
    return { error: "can't find gl" };
  }
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

  return debugInfo
    ? {
        name: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).split("(")[1],
      }
    : {
        error: "no gpu info found",
      };
};

registerEvent("getAllGPUs", getGPU);
