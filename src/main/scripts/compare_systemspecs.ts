import { logger } from "@main/services/logger";
import { getCPUScore, getGPUScore } from "@main/services/scrapbenchmarks";
import { Hardware } from "@types";

export async function compareSystemSpecs(
  mySystem: Hardware,
  comparingSystem: Hardware
): Promise<number | null> {
  // Getting Scores
  const myGPUScore = await getGPUScore(mySystem.gpuName);
  const comparingGPUScore = await getGPUScore(comparingSystem.gpuName);
  const myCPUScore = await getCPUScore(mySystem.cpuName);
  const comparingCPUScore = await getCPUScore(comparingSystem.cpuName);

  // Cheking for nulls
  if (
    myGPUScore === null ||
    comparingGPUScore === null ||
    myCPUScore === null ||
    comparingCPUScore === null
  ) {
    logger.error("Error getting system specs");
    return null;
  }
  // If 1 -> can; 0 -> can't
  return (
    (myGPUScore >= comparingGPUScore ? 1 : 0) *
    (myCPUScore >= comparingCPUScore ? 1 : 0) *
    (mySystem.ramSize >= comparingSystem.ramSize ? 1 : 0)
  );
}
