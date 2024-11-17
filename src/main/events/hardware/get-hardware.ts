import { hardwareRepository } from "@main/repository";
import { registerEvent } from "../register-event";

const getHardware = async (_event: Electron.IpcMainInvokeEvent) => {
  const hardware = await hardwareRepository.find({
    take: 1,
    select: ["cpuName", "gpuName", "ramSize"],
  });
  return hardware.length
    ? hardware[0]
    : { cpuName: "NO", gpuName: "NO", ramSize: "NO" };
};

registerEvent("getHardware", getHardware);
