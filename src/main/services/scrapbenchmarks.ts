import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "@main/services/logger";
import { JSDOM } from "jsdom";

const gpu_url = "https://www.videocardbenchmark.net/high_end_gpus.html";
const cpu_url = "https://www.cpubenchmark.net/cpu_list.php";

export async function getGPUScore(GPENAME: string): Promise<string | null> {
  try {
    const response = await axios.get(gpu_url);
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const listItems = document.querySelectorAll("ul.chartlist > li");
    for (const item of listItems) {
      const productNameElement = item.querySelector("span.prdname");
      if (productNameElement && productNameElement.textContent) {
        const productName = productNameElement.textContent.trim();
        if (productName.includes(GPENAME) && productName.endsWith(GPENAME)) {
          const countElement = item.querySelector("span.count");
          if (countElement) {
            return countElement.textContent;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching the data:", error);
    return null;
  }
}

export async function getCPUScore(cpuName: string): Promise<number | null> {
  try {
    const response = await axios.get(cpu_url);
    const html = response.data;
    const $ = cheerio.load(html);

    const element = $("td")
      .filter((_index, el) => {
        const linkElement = $(el).find("a");
        if (linkElement.length > 0) {
          const name = linkElement.text().trim();
          return name === cpuName || name.includes(cpuName);
        }
        return false;
      })
      .first();

    if (element.length > 0) {
      const score = element.next("td").text().trim();
      if (score) {
        return parseInt(score.replace(/,/g, ""), 10);
      } else {
        logger.error(" ---- SCORE ELEMENT NOT FOUND -----");
        return null;
      }
    } else {
      logger.error(" ---- CPU NOT FOUND -----");
      return null;
    }
  } catch (error) {
    logger.error(" ---- RESPONSE ERROR -----");
    logger.error(error);
    return null;
  }
}
