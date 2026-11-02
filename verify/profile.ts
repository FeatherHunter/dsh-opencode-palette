/**
 * 真机验证声明（票 14「其余四仓接入」）。
 * 自检入口：npm run verify:self-check（dsh-verify 由已有 devDependency 提供，零新增安装）。
 * 声明发现顺序见 base：verify/profile.ts → .js → .mjs；--declaration 可覆盖。
 */
import { defineVerificationProfile } from "dsh-featherhunter-plugin-base/real-machine-verification";

export default defineVerificationProfile({
  id: "palette",
  packageName: "dsh-opencode-palette",
  defaultProfile: "web",
  clientEntry: "lib/client.js",
  bundledSkills: false,
  model: false,
});
