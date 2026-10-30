# MiniMax模型接入说明

配置模型：`MiniMax-M3.1-Flash`，中国官方OpenAI兼容入口 `https://api.minimax.cn/v1/chat/completions`。使用官方 `@minimax-ai/ai-sdk-provider` 及 AI SDK；实际安装版本见锁文件。

官方依据：[MiniMax AI SDK](https://platform.minimax.cn/docs/api-reference/text-ai-sdk.md)、[兼容接口](https://platform.minimax.cn/docs/api-reference/text-chat-openai.md)、[模型列表](https://platform.minimax.cn/docs/faq/models.md)。

## 当前真实状态

接入代码和三个产品入口已实现：变化传导、公司比较解释、公开材料提取候选。用户指定的既有key已配置到本地被忽略的`.dev.vars`和Sites服务端secret，未写入前端、GitHub或提交包。

早期使用按量Key返回HTTP 402；用户确认应使用“个人订阅→套餐管理”的订阅Key后，已完成本地和Sites服务端替换，环境修订2已生效。真实直连、线上传导、公司比较和材料提取均成功返回；候选已在隔离空间保存v2并刷新读回。验证记录见delivery/MiniMax接入验证.json。

## 本地配置

在`app/.dev.vars`中配置（不要提交）：

```dotenv
MINIMAX_API_KEY=填写自己的订阅Key或按量Key
MINIMAX_MODEL=MiniMax-M3.1-Flash
MINIMAX_DAILY_LIMIT=30
```

重新启动`npm run dev`。生产环境通过Sites原生环境变量工具设置，其中`MINIMAX_API_KEY`必须为secret；新部署应用环境修订。`.env.example`只保留空密钥字段。

## 产品入口与协议

- `POST /api/analyze`：`mode:live`真实调用MiniMax；`mode:offline`明确使用规则。可带`revision`指定历史证据版本。不会自动降级后冒充实时模型。
- `POST /api/ai`：`task:compare`接收两家公司ID；`task:extract`接收公司、标题、官方URL、原文定位、报告期及材料文本（30–3500字符）。外部文本明确视为不可信数据。
- `GET /api/research`：只返回模型名称、是否配置和额度上限，不返回密钥或账户余额。

成功结果包含模型名称、提示词版本、运行ID、提供商请求ID（若返回）、token用量及耗时。模型思考过程不展示、不保存。只有结构与来源校验通过才显示成功回执。

## 输出校验与AI边界

当前官方API文档未承诺原生严格JSON Schema，所以使用文本JSON约束，再由Zod检查字段和类型。检查必要的假设/推断/待验证顺序、推断节点引用、引用是否存在及是否新增材料没有的数字。公司事实由已核验数据直接提供，模型只生成条件性解释。引用ID有效不等于语义必然成立，模型结论仍需人工复核。

材料提取的短摘录必须实际出现在提交文本中。提取结果标记为“AI候选/用户材料”，不能自封为独立核验，不自动获得收入或产业归属信用。官方URL域名校验只验证来源范围，不证明用户粘贴内容与远端原文一致。

## 额度、错误与记录

- 每请求最多4096输出tokens，思考深度`low`，45秒超时，自动重试0次。
- 默认全站每日30次、单空间每日8次、全站每分钟6次。按Asia/Shanghai日期计数。
- 通过D1单条`INSERT ... SELECT ... WHERE`原子申请额度，避免并发绕过。失败调用也占次数，因为提供商失败/截断仍可能产生费用；这只是调用次数限制，不是人民币账单硬限额。
- `ai_runs`只保存任务、版本、来源ID、模型、用量、耗时、状态和错误码；不保存密钥、原始提示词、思考过程或用户全文。
- 覆盖鉴权、余额、提供商限流、模型权限、非零`base_resp`、无效JSON、截断、超时及不支持引用。不会把HTTP200或请求已发出当作生成成功。

订阅Key从“个人订阅→套餐管理”获取（sk-cp前缀），按量Key从“API管理→API Key”获取，两者扣费资源不同。官方M Plan接入文档确认两者可使用同一OpenAI兼容Base URL，当前模型无需更换：[其他工具](https://platform.minimax.cn/docs/m-plan/other-tools)、[订阅说明](https://platform.minimax.cn/docs/m-plan/faq)。本次仅替换既有Key，不创建、重置密钥或购买套餐。

最新提示词版本minimax-research-v3：比较条目数量与服务端结构限制一致，解释不复述数字，禁止将上市地当作销售地区。数值校验将09与9、17.80与17.8视为同值，不允许四舍五入为新数值。

语义边界仍存在：真实比较曾把行业口径称为分产品口径，引用存在不能证明用语完全准确，须回到原文核对。当前额度为演示次数限制；订阅Key仍受提供商套餐窗口和可用额度约束。
