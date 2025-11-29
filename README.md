<p align="center">
  <img alt="text-to-image" src="public/cat0.png" width="100" height="100" />
</p>

<div align="center">
  <h1>Text2img · Cloudflare Workers</h1>
  <p>基于 Cloudflare Workers AI 的在线文生图/图生图/重绘服务，开箱即用。</p>
  <p>本项目基于 [huarzone/Text2img-Cloudflare-Workers](https://github.com/huarzone/Text2img-Cloudflare-Workers)、[zhumengkang/cf-ai-image](https://github.com/zhumengkang/cf-ai-image) 进行二次开发和功能增强。</p>
</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/top-dark.png">
  <img alt="应用截图" src="public/top.png">
</picture>

### 功能总览

- **🌏 全面支持中文**：正向提示词和反向提示词均支持中文输入，自动翻译为英文后生成图像
- 多模型：SDXL、FLUX、DreamShaper、Lightning、SD1.5 图生图、SD1.5 局部重绘
- 一次生成 1–8 张，画廊预览 + 悬浮操作（放大/复制/单张下载）
- 批量下载 ZIP、复制参数、显示每张尺寸与大小
- 真实 it/s 指标（服务端推理耗时），带进度条与 60s 超时提示
- 登录认证（Cookie），支持密码保护、明暗主题、自适应移动端
- 提供中英文混合的随机提示词示例

---

## 📦 部署步骤

### 1. 创建 Worker

在 [Cloudflare 控制台](https://dash.cloudflare.com/) 中：**Workers & Pages → 创建应用程序 → 创建 Worker → 部署**

### 2. 配置代码

- 点击 **快速编辑**
- 复制 `src/worker.js` 的全部内容，粘贴并保存
- 如果提示需要 `index.html`，也复制 `src/index.html` 的内容创建该文件

### 3. 绑定 Workers AI

**设置 → 绑定 → 添加绑定**

- 类型：`Workers AI`
- 变量名：`AI`
- 保存

### 4. 配置访问密码（推荐）

**设置 → 变量和机密 → 添加机密**（选择"机密"而非"变量"）

| 配置项          | 说明                      | 示例值              |
| --------------- | ------------------------- | ------------------- |
| `PASSWORD`      | 单个密码                  | `MySecureP@ssw0rd`  |
| `PASSWORDS`     | 多个密码（逗号分隔）      | `pass1,pass2,pass3` |
| `PASSWORD_LIST` | 多个密码（JSON 数组格式） | `["pass1","pass2"]` |

💡 **提示**：

- 使用"机密"而不是"变量"，机密会被加密存储且控制台无法查看
- 如果不配置任何密码，系统将使用默认密码 `admin123`（仅供测试，不安全）

### 5. 配置翻译引擎（可选）

默认使用免费的 MyMemory、LibreTranslate 和 Cloudflare AI 翻译服务。如需最佳质量，可配置：

**设置 → 变量和机密 → 添加机密**

- `DEEPL_API_KEY` - DeepL 翻译（推荐，免费 50 万字/月）
- `GOOGLE_TRANSLATE_API_KEY` - Google 翻译（需付费账户）

详见下方"翻译引擎配置"章节。

### 6. 设置自定义域（可选）

**设置 → 域和路由 → 添加**

---

✅ **部署完成！** 访问 `https://<your-worker>.<subdomain>.workers.dev/` 即可使用。

---

## 🌏 中文提示词支持

本项目**全面支持中文输入**，无需手动翻译！

### 工作原理

- **自动检测**：系统会自动检测提示词中是否包含中文字符
- **智能翻译**：支持多种翻译引擎，按质量自动选择：
  1. **DeepL API**（可选，需 API 密钥）- 🌟 质量最好
  2. **Google Translation API**（可选，需 API 密钥）- 质量优秀
  3. **MyMemory Translation**（✅ 免费，无需 API）- 质量良好，推荐！
  4. **LibreTranslate**（✅ 免费，开源）- 质量一般，备用方案
  5. **Cloudflare AI M2M100-1.2B**（✅ 免费，默认）- 质量较好，最终方案
- **智能降级**：系统会按优先级尝试翻译服务，失败时自动切换到下一个
- **优化处理**：翻译后会自动进行以下优化：
  - 去除末尾的句号
  - 修正常见单词的错误复数形式（如 "schools" → "school"）
  - 去除冗余的英文冠词（a/an/the）
  - 规范化空格
- **双向支持**：正向提示词和反向提示词均支持中文
- **翻译展示**：生成结果页面会显示翻译后的英文提示词，方便查看和学习

### 使用示例

```
正向提示词（中文）：
一只可爱的猫咪，赛博朋克风格，霓虹灯光，未来城市背景

自动翻译为：
cute cat cyberpunk style neon lights future city background

反向提示词（中文）：
模糊，低质量，变形

自动翻译为（已优化）：
blurry low quality deformed
# 注意：末尾的句号已被自动去除
```

**翻译优化示例：**

| 中文输入 | 原始翻译（Cloudflare AI） | 优化后的翻译                 |
| -------- | ------------------------- | ---------------------------- |
| 学校     | schools.                  | school（去除复数和句号）     |
| 猫咪     | cats.                     | cat（去除复数和句号）        |
| 美丽的花 | beautiful flowers.        | beautiful flower（已优化）   |
| 夜晚城市 | the night city.           | night city（去除冠词和句号） |

### 中文示例提示词

点击"随机提示词"按钮即可获取中英文混合的示例提示词：

- 一只可爱的猫咪，赛博朋克风格，霓虹灯光，未来城市背景
- 古风美少女，长发飘飘，汉服，樱花树下，唯美意境，水墨画风格
- 中国风景，山水画，云雾缭绕，高山流水，宁静祥和
- 机器人女孩，科幻风格，金属质感，蓝色发光眼睛，未来感
- 梦幻森林，精灵，魔法光芒，神秘氛围
- 冬季雪景，小木屋，炊烟袅袅，温馨氛围
- 龙，中国龙，祥云，金色鳞片，威严神圣

---

## 使用说明（前端）

- 基本：输入访问密码（若启用）→ 填写提示词 → 选择模型 → 配置尺寸/步数/引导/种子 → 选择“生成数量” → 生成。
- 画廊：多图时显示网格，悬浮显示操作条（放大/复制/下载）。支持 ZIP 批量下载。
- 指标：右栏显示生成时间、使用模型、it/s（步数/秒）、输出大小、所有参数；下方表格列出每张图片的尺寸与大小。
- 进度：进度条最多推进到 95%，图片真正完成后封顶 100%。

---

## 模型能力与适用场景

| 模型 ID                          | 类型           | 适合图片/场景                                       | 建议                                                    | 备注                                       |
| -------------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| stable-diffusion-xl-base-1.0     | 文生图         | 通用写实/插画、高分辨率 1024×1024，人物/风景/产品图 | 步数 20 左右，宽高 1024 起步                            | 质量稳定、细节好，速度中等                 |
| flux-1-schnell                   | 文生图（快速） | 快速草图/封面/风格化作品，追求速度的场景            | 步数 4–8（已自动限制），较小分辨率起步                  | 返回 JSON（base64）→ 已在后端转为 PNG 输出 |
| dreamshaper-8-lcm                | 文生图（LCM）  | 二次元/插画/艺术风格，迭代少、出图快                | 步数 8–12，512–768 更稳                                 | 风格统一、对细节追求适中                   |
| stable-diffusion-xl-lightning    | 文生图（极速） | 秒级出图、快速迭代与方案对比                        | 极少步数（1–4），512–768                                | 速度快、细节欠佳，适合草稿                 |
| stable-diffusion-v1-5-img2img    | 图生图         | 风格迁移、构图保持、低侵入式修改                    | 需传 `image_url`，步数与 strength 控制变化幅度          | 输入图必须是图片直链（image/\*）≤10MB      |
| stable-diffusion-v1-5-inpainting | 局部重绘       | 遮罩内替换/修复/擦除/换物                           | 需 `image_url` + `mask_url`，mask 黑白/透明区域为编辑区 | 遮罩与原图分辨率一致更稳                   |

> 小贴士：遇到 3001/内部错误，优先降低尺寸到 512–768、减少步数，并确认 `image_url/mask_url` 为可访问的图片直链且不超过 10MB。

---

## 后端接口

- GET `/api/models`：返回可用模型清单（含 `requiresImage/Mask`）。
- GET `/api/prompts`：随机提示词（支持中英文混合）。
- GET `/api/config`：是否启用密码。
- POST `/api/auth`：提交 `{ password }` 设置 Cookie 登录。
- POST `/`：生成图片
  - 入参（JSON）：
    - 通用：`prompt, negative_prompt, model, width, height, num_steps, guidance, seed, num_outputs(1-8)`
    - **提示词支持中文**：`prompt` 和 `negative_prompt` 均可使用中文，后端会自动检测并翻译
    - 图生图：另需 `image_url`
    - 重绘：另需 `image_url, mask_url`
  - 出参：
    - 单图：二进制 PNG，头部包含 `X-Used-Model / X-Server-Seconds / X-Image-Bytes / X-Translated-Prompt / X-Translated-Negative-Prompt`
    - 多图：`{ images: [dataURL...] }` JSON，头部含 `X-Server-Seconds / X-Translated-Prompt / X-Translated-Negative-Prompt`
    - 响应头中的翻译信息：
      - `X-Translated-Prompt`：翻译后的正向提示词（如果原始提示词包含中文）
      - `X-Translated-Negative-Prompt`：翻译后的反向提示词（如果原始反向提示词包含中文）

示例（cURL）：

**英文提示词：**

```bash
curl -X POST https://<worker>.<subdomain>.workers.dev/ \
  -H 'Content-Type: application/json' -H 'Accept: image/*' \
  -d '{
    "prompt":"a cyberpunk cat",
    "model":"stable-diffusion-xl-base-1.0",
    "width":1024,"height":1024,"num_steps":20,"guidance":7.5,
    "num_outputs":1
  }' --output out.png
```

**中文提示词（自动翻译）：**

```bash
curl -X POST https://<worker>.<subdomain>.workers.dev/ \
  -H 'Content-Type: application/json' -H 'Accept: image/*' \
  -d '{
    "prompt":"一只可爱的赛博朋克猫咪，霓虹灯光",
    "negative_prompt":"模糊，低质量",
    "model":"stable-diffusion-xl-base-1.0",
    "width":1024,"height":1024,"num_steps":20,"guidance":7.5,
    "num_outputs":1
  }' --output out.png
```

---

## 配置与自定义

### 模型配置

- 模型清单：编辑 `src/worker.js` 中 `AVAILABLE_MODELS` 可增删/改描述、是否需要图片/遮罩。
- 随机提示词：在 `RANDOM_PROMPTS` 维护，支持添加中文或英文提示词。
- 生成数量：默认开放 1–8，可在前端下拉与后端上限同步调整。

### 翻译引擎配置

本项目支持 5 种翻译引擎，会按质量优先级自动选择。**默认情况下已包含 3 个免费选项，无需任何配置即可获得良好的翻译质量！**

#### 🆓 免费方案（推荐，无需配置）

系统会自动使用以下免费翻译服务（按顺序尝试）：

1. **MyMemory Translation API** ✅ 推荐

   - 完全免费，无需 API 密钥
   - 翻译质量良好，优于 Cloudflare AI
   - 限制：每天 1000 次请求，每次最多 5000 字符
   - 适合个人和中小型项目

2. **LibreTranslate** ✅ 备用

   - 开源免费翻译服务
   - 无需 API 密钥（使用公共实例）
   - 翻译质量一般，但完全可用
   - 适合作为备用方案

3. **Cloudflare AI** ✅ 最终方案
   - 使用 `@cf/meta/m2m100-1.2b` 模型
   - 完全免费，无限制
   - 翻译质量较好（已通过后处理优化）

#### 🌟 高级方案（可选，需要 API 密钥）

如需最佳翻译质量，可配置以下服务：

**方案一：DeepL API（推荐）** 🏆

DeepL 是目前质量最好的翻译服务，支持免费套餐！

1. 注册 DeepL API：

   - 访问 [DeepL API 注册页面](https://www.deepl.com/pro-api)
   - 选择"DeepL API Free"计划（每月 500,000 字符免费）
   - 获取 API 密钥

2. 配置密钥：

   在 Cloudflare Dashboard 中：**设置 → 变量和机密 → 添加机密 `DEEPL_API_KEY`**

**方案二：Google Translation API**

1. 获取 Google Cloud Translation API 密钥：

   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 启用 Cloud Translation API
   - 创建 API 密钥（需要绑定付费账户，但有免费额度）

2. 配置密钥：

   在 Cloudflare Dashboard 中：**设置 → 变量和机密 → 添加机密 `GOOGLE_TRANSLATE_API_KEY`**

#### 📊 翻译引擎对比

| 翻译引擎           | 费用                 | API 密钥 | 翻译质量   | 速度 | 推荐场景           |
| ------------------ | -------------------- | -------- | ---------- | ---- | ------------------ |
| DeepL              | 免费 50 万字/月      | 需要     | ⭐⭐⭐⭐⭐ | 快   | 生产环境，最佳选择 |
| Google Translation | 有免费额度，超出收费 | 需要     | ⭐⭐⭐⭐   | 快   | 商业项目           |
| MyMemory           | 完全免费，1000 次/天 | 不需要   | ⭐⭐⭐     | 快   | 个人使用，推荐！   |
| LibreTranslate     | 完全免费             | 不需要   | ⭐⭐       | 中等 | 备用方案           |
| Cloudflare AI      | 完全免费，无限制     | 不需要   | ⭐⭐⭐     | 快   | 默认方案           |

#### ⚙️ 高级配置（可选）

如果你想自托管 LibreTranslate 或使用自定义实例，在 Cloudflare Dashboard 中配置：

- **设置 → 变量和机密 → 添加变量/机密**
  - `LIBRETRANSLATE_URL` - 自定义 LibreTranslate 实例地址（例如：`https://your-instance.com/translate`）
  - `LIBRETRANSLATE_API_KEY` - 如果需要 API 密钥

### 密码配置（推荐使用环境变量）

**方式一：通过 Cloudflare 控制台配置（推荐）**

进入 Worker 设置 → 变量和机密 → 添加：

| 变量名          | 类型 | 说明                      | 示例                |
| --------------- | ---- | ------------------------- | ------------------- |
| `PASSWORD`      | 机密 | 单个密码                  | `MySecureP@ssw0rd`  |
| `PASSWORDS`     | 机密 | 多个密码（逗号分隔）      | `pass1,pass2,pass3` |
| `PASSWORD_LIST` | 机密 | 多个密码（JSON 数组格式） | `["pass1","pass2"]` |

💡 **推荐使用"机密"而不是"变量"**：

- 机密会被加密存储，控制台无法查看
- 更安全，适合生产环境

**方式二：代码中硬编码（不推荐）**

修改 `src/worker.js` 中的 `DEFAULT_PASSWORDS`：

```javascript
const DEFAULT_PASSWORDS = ["your-password-here"];
```

⚠️ **注意事项**：

- 如果未配置任何密码环境变量，系统将使用默认密码 `admin123`
- 前端含登录遮罩与 Cookie 认证，Cookie 有效期为 7 天

**如何禁用密码验证？**

将 `DEFAULT_PASSWORDS` 修改为空数组即可：

```javascript
const DEFAULT_PASSWORDS = [];
```

或者通过环境变量设置空值（系统会忽略空密码）。

---

## 常见问题

### 功能相关

- **如何禁用密码保护？** 修改 `worker.js` 中 `DEFAULT_PASSWORDS = []`，或不设置任何密码环境变量且将默认值改为空数组。
- **如何更改密码？** 推荐通过 Cloudflare 控制台的"变量和机密"功能设置 `PASSWORD` 或 `PASSWORDS` 变量，无需修改代码。
- **多用户如何设置不同密码？** 使用 `PASSWORDS` 变量配置多个密码，用逗号分隔，如 `user1pass,user2pass,user3pass`。
- **密码存在哪里最安全？** 使用 Cloudflare 的"机密"功能，而不是"环境变量"。机密会被加密且控制台无法查看。

### 翻译相关

- **默认翻译质量如何？** 无需任何配置即可使用 MyMemory、LibreTranslate 和 Cloudflare AI 三个免费翻译服务，质量已经很不错！系统会自动选择可用的服务。
- **如何获得最佳翻译质量？** 配置 `DEEPL_API_KEY` 使用 DeepL 免费 API（每月 50 万字符），翻译质量最好。或者配置 `GOOGLE_TRANSLATE_API_KEY` 使用 Google 翻译。
- **MyMemory 翻译服务有限制吗？** 有的，每天 1000 次请求，每次最多 5000 字符。对个人使用完全够用。超限后会自动切换到其他翻译服务。
- **如何查看当前使用的翻译引擎？** 打开浏览器开发者工具（F12），查看控制台日志，会显示使用的翻译引擎名称（如 `[MyMemory]` 或 `[DeepL]`）。
- **翻译失败怎么办？** 系统会按优先级尝试 5 个翻译引擎。如果全部失败，会使用原始的中文提示词继续生成图像，不会中断流程。
- **DeepL 免费 API 如何申请？** 访问 https://www.deepl.com/pro-api 注册账号，选择"DeepL API Free"计划即可，无需信用卡，每月 50 万字符免费额度。

### 技术问题

- **3001 Unknown internal error**：通常为尺寸/步数过大或图片直链不规范。将宽高调到 512–768、步数 < 20；确保 `image_url`/`mask_url` 响应头为 `image/*` 且 ≤10MB。
- **3030 missing mask_image**：使用 inpainting 时必须提供 `mask_url`（已在前端/后端分别做必填校验）。
- **it/s 为什么波动**：以服务端推理耗时为准（`X-Server-Seconds`），网络/解码不会影响该指标。
- **中文提示词不生效**：检查浏览器控制台是否有翻译错误，翻译失败时会自动使用原始提示词。

---

## 致谢

- 感谢原作者 [huarzone](https://github.com/huarzone) 、[zhumengkang](https://github.com/zhumengkang/cf-ai-image) 提供的优秀基础项目，本增强版在其基础上进行了功能扩展和平台适配。
