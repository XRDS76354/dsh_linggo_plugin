import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PYTHON_DIR } from "./worker.js";

const SKILLS = [
  ["linggo-data-import", "LingGo 数据导入与清理：智能体批量导入、目录边界、人工向导、字段映射与坐标系", "用户要求导入文件／目录、清理数据或准备公交数据，或缺少某类数据时"],
  ["linggo-network-analysis", "LingGo 线网查询与地图操作的做法", "回答线路、站点、班次等查询问题或操作地图时"],
  ["linggo-drt", "LingGo DRT 动态插入算法：约束、需求来源、实验数据标注、运行与回放", "用户要做需求响应公交 / DRT 调度实验时"],
  ["linggo-fleet-timetable", "LingGo 常规公交配车与客流班次生成：口径、假设与缺口", "用户问用车数、配车、发车间隔或时刻表生成时"],
  ["linggo-custom-algorithm", "LingGo 自定义 Python 算法：模板、自检、注册与安全提示", "用户想接入自己的调度算法时"],
];

/** Register the LingGo how-to skills; returns disposers. */
export function registerSkills(skills) {
  return SKILLS.map(([name, description, whenToUse]) =>
    skills.register({
      name,
      description,
      whenToUse,
      content: readFileSync(fileURLToPath(new URL(`../skills/${name}.md`, import.meta.url)), "utf8").replaceAll("{{PYTHON_DIR}}", PYTHON_DIR),
      source: "runtime",
      invocation: { modelInvocable: true, userInvocable: true },
    }),
  );
}
