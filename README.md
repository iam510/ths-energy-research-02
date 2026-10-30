# 储能研究台

第二题：产业链、跨市场与公司研究。面向需要判断“公司到底做什么、业务能否比较、变化如何传导”的投资研究者，以公开披露为依据，完成产业分层、证据核对、跨市场比较、条件传导和版本更新。

当前版本已加入 **MiniMax API 接入**：变化传导、公司可比性解释、公开材料候选提取使用服务端MiniMax；离线规则可手动选择。采用M Plan订阅Key，支持真实AI分析和明确标注的历史调用样例。新增候选复核生效、撤回及公司×环节可信度矩阵。扶摇/iFinD仍未接入。

- 在线产品：[储能研究台](https://storage-research-510.green-trout-2026.chatgpt.site)（发布状态及线上验收见交付记录）
- 源码仓库：[iam510/ths-energy-research-02](https://github.com/iam510/ths-energy-research-02)（推送状态见交付记录）
- 演示：`delivery/演示视频.mp4`；具体交付状态见 [提交清单](delivery/提交清单.md)。
- 主要数据：6家公司、3个市场、4类业务环节；23条初始证据，另有1条已核验旧材料用于演示新增入库。

## 如何体验

1. 产业链页面点击业务环节筛选公司，打开公司证据，沿来源链接核对原文。
2. 对照阳光电源与Tesla，查看业务相似点及“纯储能/含发电分部”差异；可切换Fluence查看财年差异。
3. 选择公司和情景，生成有引用的传导分析，检查假设、条件、反向因素和信息缺口。
4. 更新中心可粘贴官方材料文本并调用MiniMax提取候选，经复核后保存；也可载入官方来源示例，保存候选后核对来源、选择服务环节并生效，查看Tesla归属变化。
5. 查看候选v1、生效v2和撤回v3；按版本查看归属差异，刷新后仍保留。示例是旧材料新增入库，不是今日新公告。

每位访客的演示空间通过随机的HttpOnly Cookie隔离，版本保存在服务端D1。公共种子数据不可由访客覆盖。清除Cookie后不会自动找回此前匿名空间。本产品不包含账户恢复或生产级配额系统。

## 本地运行

已在macOS、Node.js 23.10.0上完成构建及验证。建议Node.js 22.13+；依赖以锁文件为准。

```sh
cd app
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_material_celestials.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_medical_the_hand.sql
npm run dev -- --port 5173 --hostname 127.0.0.1
```

打开终端打印的地址。迁移命令用于全新本地数据库，不要对已迁移的数据库重复执行原SQL。`npm start`可预览构建后的Worker。无需API Key即可使用离线规则；真实模型需按`.env.example`配置服务端密钥。余额或额度不足时明确报错。

## 技术与源码

- `app/app/`：页面、样式、研究与分析API。
- `app/components/research-app.tsx`：交互界面。
- `app/lib/domain.ts`：分类依据、比较规则、情景路径与引用校验。
- `app/lib/validation.ts`：材料校验、官方域名限制与边界规则。
- `app/lib/repository.ts`：D1持久化，保留独立空间及版本。
- `app/db/`、`app/drizzle/`：数据库结构与迁移。
- `data/research-sources.json`：24条官方证据主档；应用内快照由同步脚本生成。
- `tests/`：领域规则与API异常测试；`docs/`：口径、AI记录、测试与部署说明。

采用React + TypeScript + Vinext/Next.js路由 + Cloudflare Worker/D1，保留Sites构建集成；本地源码可以独立运行，不需要在浏览器中配置凭据。

## AI角色与数据边界

开发过程使用Codex参与资料读取、代码和规则编写，并通过测试与浏览器验证；`source-checked`表示AI读取源文核对，不代表候选人已逐条人工签字。详见[AI使用与验证记录](docs/AI使用与验证记录.md)。

真实模式使用MiniMax官方AI SDK Provider、`MiniMax-M3.1-Flash`和服务端secret。模型生成结构化条件传导、可比性解释及候选材料；代码校验JSON、来源引用和新增数字，确定性业务事实不交由模型改写。运行记录包含模型、提示词版本、请求ID、token用量及状态。默认全站每日30次、单空间每日8次、每分钟6次；45秒超时、不自动重试，不静默使用离线文本代替失败的模型调用。

早期按量Key曾返回HTTP 402；换成订阅Key后已完成真实生成、候选复核保存及刷新持久化验收。模拟测试与真实调用记录明确分开。当前页面可查看剩余调用次数、北京时间恢复时间及历史真实样例。配置方法、校验边界及错误处理见[模型接入说明](docs/模型接入说明.md)。

资料主要为2025年度公开披露，核验日期2026-10-30，不保证已覆盖2026年全部增量公告。关键数字保留来源、原文位置、报告期、单位和币种；Tesla的发电与储能合并收入不能等同纯储能收入，LG合并收入不能替代ESS收入，Fluence财年与自然年不同。所有指标不直接跨币种排名；未披露数据不估填。详见[数据口径与来源](docs/数据口径与来源.md)。

## 已知边界与未做事项

- 已加强每条结论的引用公司、双方证据、数值、币种、年度和混合收入边界检查，但这些局部约束不等于完整语义验证。扶摇/iFinD仍未接入。
- 新材料先进入候选，经个人复核后参与当前空间的归属、比较和传导，可撤回；不继承独立核验信用。自定义复核仅支持产品和规划，自报收入指标不授信。未做无人值守抓取。
- 不提供股价预测、目标价、交易指令或收益承诺。传导分析是有条件的研究推断，不是因果验证或投资建议。
- 未覆盖全行业、客户/供应商图谱、估值模型和全部2026年公告。未部署生产级账户、空间恢复、计费、反滥用配额及数据保留清理策略；当前是笔试研究原型。

## 验证与打包

```sh
node --experimental-strip-types --test tests/domain.test.ts tests/minimax.test.ts tests/research-review.test.ts
python3 tests/quota_check.py
node tests/api-check.mjs http://127.0.0.1:5173
python3 scripts/package_submission.py
```

API测试使用独立匿名空间，不修改公共种子数据。真实执行结果见[测试说明](docs/测试说明.md)。压缩包保留整个02目录结构及必要交付文件，排除密钥、依赖、构建缓存、私有运行数据库和压缩包自身。
