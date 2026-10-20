# -*- coding: utf-8 -*-
"""Write the redesigned EVA (新世纪福音战士) IP presets, matching the repo's exact file shape:
single-line JSON, alphabetically sorted keys, UTF-8 no BOM, no trailing newline.

写两个文件（同一 IP 的明暗两册）：
  src/custom-presets/evangelion.json      id=evangelion      name=新世纪福音战士            appearance=dark  （37 个深色色位）
  src/custom-presets/evangelion-day.json  id=evangelion-day  name=新世纪福音战士 · 晴空      appearance=light （37 个浅色色位）

⚠ src/custom-presets/evangelion.json **已经存在**，是已发布的霓虹版预设。本脚本原地替换它
  （id 与 name 都不变），不是新增文件——跑之前请看清下面的替换告示。

用法：
    python write_preset.py [OUT_DIR]

OUT_DIR 缺省 = 仓库的 src/custom-presets/（真落地路径）；
传一个临时目录 = 干跑（干跑只写临时目录，不碰仓库）。
"""
import json
import os
import re
import sys
from collections import OrderedDict

# Windows 控制台默认 GBK，中文提示会花屏：强制 UTF-8 输出。
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # 老 Python / 非标准流
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
DEFAULT_OUT = os.path.join(REPO, "src", "custom-presets")

# updatedAt：仓库里所有 IP 预设都是硬编码时间戳，这里也用常量（重跑字节稳定）。
UPDATED_AT = "2026-10-20T11:00:00+08:00"
SCHEMA = "dsh-opencode-palette.custom-theme.v1"

# 37 个色位（与 src/engine/map-dsh.ts 的 COLOR_SLOTS 同集合）——写盘前自检用。
SLOT_KEYS = [
    "background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg", "inputBg",
    "codeBlockBg", "codeHeaderBg", "text", "textMuted", "primary", "secondary", "info",
    "success", "warning", "error", "border", "borderActive", "diffAdded", "diffRemoved",
    "diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg",
    "markdownHeading", "markdownLink", "markdownCode", "markdownEmph", "markdownStrong",
    "markdownBlockQuote", "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
    "syntaxNumber", "syntaxString", "syntaxOperator",
]

# 两册预设的定义：(文件名, id, 中文展示名, appearance, basePreset, palette.json 里的色板键)
PRESETS = [
    ("evangelion.json", "evangelion", "新世纪福音战士", "dark", "evangelion", "colors"),
    ("evangelion-day.json", "evangelion-day", "新世纪福音战士 · 晴空", "light", "evangelion-day", "colorsLight"),
]


def load_palette():
    with open(os.path.join(HERE, "palette.json"), encoding="utf-8") as fp:
        return json.load(fp)


def build_object(preset_id, name, appearance, base_preset, colors):
    """仓库同形：appearance / basePreset / colors / id / name / schema / updatedAt，键按字母序。"""
    obj = OrderedDict([
        ("appearance", appearance),
        ("basePreset", base_preset),
        ("colors", OrderedDict((k, colors[k]) for k in sorted(colors))),
        ("id", preset_id),
        ("name", name),
        ("schema", SCHEMA),
        ("updatedAt", UPDATED_AT),
    ])
    return obj


def write_preset(path, obj):
    """单行 JSON + 字母序键 + UTF-8 无 BOM + 无尾换行（与 src/custom-presets/ 现有文件同形）。"""
    line = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
    with open(path, "wb") as fp:
        fp.write(line.encode("utf-8"))          # 二进制写：保证无 BOM、无尾换行
    raw = open(path, "rb").read()
    problems = []
    if raw.startswith(b"\xef\xbb\xbf"):
        problems.append("有 BOM")
    if raw.endswith(b"\n") or raw.endswith(b"\r"):
        problems.append("有尾换行")
    if b"\n" in raw:
        problems.append("不是单行")
    if raw.decode("utf-8") != line:
        problems.append("内容与预期不一致")
    return raw, problems


def find_line(lines, needle):
    """返回 (1-based 行号, 整行) —— 第一个包含 needle 的行；找不到返回 (0, '')。"""
    for i, text in enumerate(lines, start=1):
        if needle in text:
            return i, text
    return 0, ""


def find_re(lines, pattern):
    """返回 (1-based 行号, 正则 match, 整行) —— 第一个命中 pattern 的行；找不到返回 (0, None, '')。"""
    for i, text in enumerate(lines, start=1):
        m = re.search(pattern, text)
        if m:
            return i, m, text
    return 0, None, ""


def landing_checklist():
    """读 ip-presets.ts 与 ip-presets.test.ts，算出落地要改的确切行号与改法。"""
    out = []
    ip_path = os.path.join(REPO, "src", "engine", "ip-presets.ts")
    test_path = os.path.join(REPO, "tests", "ip-presets.test.ts")
    if not (os.path.exists(ip_path) and os.path.exists(test_path)):
        out.append("  ! 找不到 src/engine/ip-presets.ts 或 tests/ip-presets.test.ts，无法给出行号")
        return out

    ip_lines = open(ip_path, encoding="utf-8").read().split("\n")
    test_lines = open(test_path, encoding="utf-8").read().split("\n")

    # 现状：注册表里已有几套、测试钉了几个（行号实时算，别的 agent 同时改也不会写错）
    raw_entry_no, _ = find_line(ip_lines, "'evangelion': evangelion")
    import_no, _ = find_line(ip_lines, "import evangelion from")
    count_no, count_m, _ = find_re(test_lines, r"assert\.equal\(countIpPresets\(\),\s*(\d+)\)")
    cur = int(count_m.group(1)) if count_m else 0
    nxt = cur + 1
    light_no, light_m, _ = find_re(test_lines, r"assert\.equal\(light,\s*(\d+)")
    light_cur = int(light_m.group(1)) if light_m else 0
    dark_no, dark_m, _ = find_re(test_lines, r"assert\.equal\(dark,\s*(\d+)")
    dark_cur = int(dark_m.group(1)) if dark_m else 0
    ids_no, _ = find_line(test_lines, "'evangelion',")

    out.append("  ① src/engine/ip-presets.ts")
    out.append("     - 第 %d 行后插入 import（字母序：evangelion < evangelion-day < genshin）：" % import_no)
    out.append("         import evangelion_day from '../custom-presets/evangelion-day.json' with { type: 'json' }")
    out.append("     - 第 %d 行（IP_PRESETS_RAW）把：" % raw_entry_no)
    out.append("         'evangelion': evangelion, 'genshin': genshin,")
    out.append("       改成：")
    out.append("         'evangelion': evangelion, 'evangelion-day': evangelion_day, 'genshin': genshin,")
    for i, t in enumerate(ip_lines, start=1):
        if re.search(r"\b%d 套|\b%d 个 IP id|\bIP %d\b" % (cur, cur, cur), t):
            out.append("     - 第 %d 行 注释里的「%d 套 / IP %d / %d 个 IP id」改成「%d 套 / IP %d / %d 个 IP id」"
                       % (i, cur, cur, cur, nxt, nxt, nxt))
    out.append("  ② tests/ip-presets.test.ts")
    out.append("     - 第 %d 行 EXPECTED_IDS：'evangelion', 后面加 'evangelion-day'," % ids_no)
    out.append("     - 第 %d 行：assert.equal(countIpPresets(), %d) → %d" % (count_no, cur, nxt))
    out.append("     - 第 %d 行：assert.equal(light, %d, ...) → %d（深色 %d 不变）"
               % (light_no, light_cur, light_cur + 1, dark_cur))
    for i, t in enumerate(test_lines, start=1):
        if re.search(r"\b%d 套|\b%d 个 IP id|\bIP %d\b" % (cur, cur, cur), t) and i != count_no:
            out.append("     - 第 %d 行 注释/用例名里的「%d 套 / IP %d / %d 个 IP id」改成「%d 套 / IP %d / %d 个 IP id」"
                       % (i, cur, cur, cur, nxt, nxt, nxt))
    out.append("  ③ 落地后必须重跑产物：npm run build:artifacts（client.js 内联的 IP id 清单要含新 id）")
    out.append("     然后 node scripts/audit-themes.ts --check 与 npm test")
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    out_dir = os.path.abspath(args[0]) if args else DEFAULT_OUT
    dry_run = out_dir != DEFAULT_OUT

    palette = load_palette()

    # 颜色源自检：两半各 37 个色位，键与仓库的 COLOR_SLOTS 一致
    for key in ("colors", "colorsLight"):
        cols = palette.get(key)
        if not isinstance(cols, dict):
            print("palette.json 缺 %s" % key)
            return 2
        if sorted(cols) != sorted(SLOT_KEYS):
            missing = [k for k in SLOT_KEYS if k not in cols]
            extra = [k for k in cols if k not in SLOT_KEYS]
            print("palette.json %s 色位不符：缺 %s / 多 %s" % (key, missing, extra))
            return 2

    os.makedirs(out_dir, exist_ok=True)
    print("输出目录：%s%s" % (out_dir, "（干跑，不碰仓库）" if dry_run else "（仓库真落地路径）"))
    if dry_run:
        print("※ 干跑模式：不会写 src/custom-presets/，请用「python write_preset.py <临时目录>」验证后再落地。")
    print("")

    for filename, preset_id, name, appearance, base_preset, color_key in PRESETS:
        path = os.path.join(out_dir, filename)
        existed = os.path.exists(path)
        if existed and not dry_run:
            print("!!" * 30)
            print("!! 替换告警：%s 已存在 —— 这是**已发布的既有预设**。" % path)
            print("!! 本脚本会原地覆盖它（id=%s、name=%s 都不变，只换色板），不是新增文件。" % (preset_id, name))
            print("!!" * 30)
            print("")
        obj = build_object(preset_id, name, appearance, base_preset, palette[color_key])
        raw, problems = write_preset(path, obj)
        status = "覆盖既有文件" if existed else "新建文件"
        print("已写 %s（%s）" % (path, status))
        print("   id=%s  name=%s  appearance=%s  basePreset=%s  %d 色位  %d bytes"
              % (preset_id, name, appearance, base_preset, len(obj["colors"]), len(raw)))
        print("   形制：单行=%s  BOM=%s  尾换行=%s  键序=%s"
              % ("是" if b"\n" not in raw else "否",
                 "有" if raw.startswith(b"\xef\xbb\xbf") else "无",
                 "有" if raw.endswith((b"\n", b"\r")) else "无",
                 "、".join(list(obj.keys()))))
        if problems:
            print("   !! 形制不合规：%s" % "、".join(problems))
            return 3
    print("")

    print("── 落地清单（脚本不代改，需人工/负责人执行）──")
    for line in landing_checklist():
        print(line)
    print("")
    print("提示：evangelion.json 是原地替换已发布预设，落地前请在 PR 里写明「重绘 EVA 预设配色」。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
