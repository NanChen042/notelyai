<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ breaks: true })
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import type { RecordCategory, RecordDraft } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

type MessageRole = 'user' | 'assistant'

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: {
    transcript: string
  }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

interface AssistantMessage {
  id: string
  role: MessageRole
  content: string
}

interface PendingRecordAction {
  category: RecordCategory
  amount: number
  note: string
  date: string
}

interface ToolPlan {
  reply: string
  records: PendingRecordAction[]
  batch?: {
    action: 'create' | 'use'
    name: string
  }
}

interface SiliconFlowToolCall {
  function?: {
    name?: string
    arguments?: string
  }
}

interface SiliconFlowChoice {
  message?: {
    content?: string
    tool_calls?: SiliconFlowToolCall[]
  }
}

const router = useRouter()
const store = useBookkeepingStore()

const input = ref('')
const sending = ref(false)
const isListening = ref(false)
const showConfirm = ref(false)
const pendingRecords = ref<PendingRecordAction[]>([])
const messageListRef = ref<HTMLElement | null>(null)
const selectedBatchId = ref('')
const shouldCreateBatch = ref(false)
const newBatchName = ref('')
const showApiSettings = ref(false)

const SILICONFLOW_API_KEY_STORAGE = 'notely-siliconflow-api-key'

const today = () => new Date().toISOString().slice(0, 10)

const envApiKey = import.meta.env.VITE_SILICONFLOW_API_KEY as string | undefined
const savedApiKey = ref(localStorage.getItem(SILICONFLOW_API_KEY_STORAGE) || '')
const apiKeyDraft = ref('')
const modelName = 'deepseek-ai/DeepSeek-V4-Flash'
let recognition: SpeechRecognitionLike | null = null
let voiceFinalText = ''
let voiceCanceled = false

const messages = ref<AssistantMessage[]>([
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '请先选择您需要添加的批次，如果没有您目前已经添加过的批次，可以新增一个。\n\n然后您可以像聊天一样告诉我账单内容（例如：“今天买栗子十块钱，运费五块钱”），我会帮您自动拆分记录。',
  },
])

const selectedBatch = computed(() => store.sortedBatches.find((batch) => batch.id === selectedBatchId.value) ?? null)
const isIncome = (category: RecordCategory) => category === '卖出收入' || category === '其他收入'
const renderMarkdown = (text: string) => {
  return md.render(text)
}
const pendingTotal = computed(() => {
  return pendingRecords.value.reduce((sum, record) => {
    return sum + (isIncome(record.category) ? record.amount : -record.amount)
  }, 0)
})
const hasLocalApiKey = computed(() => Boolean(savedApiKey.value))
const hasConfiguredApiKey = computed(() => Boolean(savedApiKey.value || envApiKey))
const apiKeyStatusText = computed(() => {
  if (savedApiKey.value) return '已读取本地 API Key'
  if (envApiKey) return '已读取环境变量 API Key'
  return '未配置时会使用本地解析'
})

function scrollToBottom() {
  nextTick(() => {
    if (!messageListRef.value) return
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  })
}

function pushMessage(role: MessageRole, content: string) {
  messages.value.push({ id: crypto.randomUUID(), role, content })
  scrollToBottom()
}

function getSpeechRecognition() {
  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
}

function getRuntimeApiKey() {
  const latestLocalKey = localStorage.getItem(SILICONFLOW_API_KEY_STORAGE) || ''
  if (latestLocalKey !== savedApiKey.value) savedApiKey.value = latestLocalKey
  return latestLocalKey || envApiKey || ''
}

function parseChineseNumber(text: string): number {
  const map: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }

  if (/^\d+(\.\d+)?$/.test(text)) return Number(text)
  if (text.includes('百')) {
    const [left, right = ''] = text.split('百')
    return (left ? map[left] ?? 1 : 1) * 100 + (right ? parseChineseNumber(right) : 0)
  }
  if (text === '十') return 10
  if (text.includes('十')) {
    const [left, right] = text.split('十')
    return (left ? map[left] ?? 0 : 1) * 10 + (right ? map[right] ?? 0 : 0)
  }
  return map[text] ?? 0
}

function normalizeDate(text: string) {
  const now = new Date()
  if (text.includes('昨天')) {
    now.setDate(now.getDate() - 1)
    return now.toISOString().slice(0, 10)
  }
  if (text.includes('明天')) {
    now.setDate(now.getDate() + 1)
    return now.toISOString().slice(0, 10)
  }
  return today()
}

function inferCategory(text: string): RecordCategory {
  if (/运费|邮费|快递|物流/.test(text)) return '邮费'
  if (/手续费|平台费|服务费/.test(text)) return '手续费'
  if (/包装|纸箱|胶带|袋子/.test(text)) return '包装费'
  if (/收入|卖出|卖了|收款|到账/.test(text)) return '卖出收入'
  return '进货支出'
}

function cleanNote(text: string) {
  const note = text
    .replace(/今天|昨日|昨天|明天|我|了|个|一笔|添加|记录|账单/g, '')
    .replace(/[零一二两三四五六七八九十百\d.]+(?:元|块钱|块|人民币)?/g, '')
    .replace(/买|购买|花|支出|收入|卖出|卖了|收款|运费|邮费/g, '')
    .trim()
  return note || text.replace(/[，。,、]/g, '').slice(0, 12) || 'AI 记账'
}

function inferBatchNameFromText(text: string) {
  const explicitMatch = text.match(/(?:批次|账单|项目|商品)(?:名称)?\s*[：:为是叫]?\s*([^，。,、\s]+)|存到\s*([^，。,、\s]+)|放到\s*([^，。,、\s]+)/)
  const explicitName = explicitMatch?.[1] || explicitMatch?.[2] || explicitMatch?.[3]
  if (explicitName) return explicitName.slice(0, 16)

  const itemMatch = text.match(/(?:买|购买|卖出|卖了)\s*(?:了|个|一批)?\s*([^，。,、\d零一二两三四五六七八九十百元块钱人民币\s]+)/)
  return itemMatch?.[1]?.slice(0, 16) || ''
}

function parseRecordsLocally(text: string): PendingRecordAction[] {
  const date = normalizeDate(text)
  return text
    .split(/，|,|。|、|以及|还有|和/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const amountMatch = part.match(/(\d+(?:\.\d+)?|[零一二两三四五六七八九十百]+)\s*(?:元|块钱|块|人民币)?/)
      if (!amountMatch) return null
      const amount = parseChineseNumber(amountMatch[1] as string)
      if (!amount) return null
      return {
        category: inferCategory(part),
        amount,
        note: cleanNote(part),
        date,
      }
    })
    .filter((record): record is PendingRecordAction => Boolean(record))
}

function normalizeToolRecords(records: unknown): PendingRecordAction[] {
  if (!Array.isArray(records)) return []

  const categories: RecordCategory[] = ['进货支出', '邮费', '手续费', '包装费', '卖出收入', '其他收入']
  return records
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Partial<PendingRecordAction>
      const amount = Number(record.amount)
      const category = categories.includes(record.category as RecordCategory) ? (record.category as RecordCategory) : inferCategory(record.note ?? '')
      if (!Number.isFinite(amount) || amount <= 0) return null
      return {
        category,
        amount,
        note: `${record.note ?? category}`.trim() || category,
        date: record.date || today(),
      }
    })
    .filter((record): record is PendingRecordAction => Boolean(record))
}

async function callSiliconFlow(userText: string, assistantMsgId: string): Promise<ToolPlan | null> {
  const apiKey = getRuntimeApiKey()
  if (!apiKey) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 秒超时

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `你是账单助手。今天是 ${today()}。用户提出记账需求时，只调用 create_records 工具，不要直接写入。分类只能使用：进货支出、邮费、手续费、包装费、卖出收入、其他收入。所有金额必须为正数，不要带负号。系统会自动根据分类处理正负。`,
          },
          ...messages.value
            .filter(m => m.id !== assistantMsgId && m.content !== '思考中...')
            .map(m => ({
              role: m.role,
              content: m.content,
            })),
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_records',
              description: '把用户的自然语言账单拆成待确认的收支记录',
              parameters: {
                type: 'object',
                properties: {
                  batch: {
                    type: 'object',
                    description: '用户指定的批次信息。如果明确提到新建或新增，action为create；如果提到已有批次，action为use。',
                    properties: {
                      action: { type: 'string', enum: ['create', 'use'] },
                      name: { type: 'string', description: '批次名称，不含语气词' },
                    },
                    required: ['action', 'name'],
                  },
                  records: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: {
                          type: 'string',
                          enum: ['进货支出', '邮费', '手续费', '包装费', '卖出收入', '其他收入'],
                        },
                        amount: { type: 'number' },
                        note: { type: 'string' },
                        date: { type: 'string' },
                      },
                      required: ['category', 'amount', 'note', 'date'],
                    },
                  },
                },
                required: ['records'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `请求失败: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `[${errorJson.code}] ${errorJson.message}`
      } catch {
        errorMessage = errorText || errorMessage
      }
      showToast(errorMessage)
      throw new Error(errorMessage)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    let toolArguments = ''
    let hasSetContent = false
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        if (trimmedLine.startsWith('data: ')) {
          const dataStr = trimmedLine.slice(6)
          if (dataStr === '[DONE]') break

          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices?.[0]?.delta

            if (delta?.content) {
              const msg = messages.value.find(m => m.id === assistantMsgId)
              if (msg) {
                if (!hasSetContent) {
                  msg.content = ''
                  hasSetContent = true
                }
                msg.content += delta.content
                if (msg.content.length <= delta.content.length) {
                  msg.content = msg.content.trimStart()
                }
              }
            }

            if (delta?.tool_calls?.[0]?.function?.arguments) {
              toolArguments += delta.tool_calls[0].function.arguments
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
          }
        }
      }
    }

    if (toolArguments) {
      try {
        const payload = JSON.parse(toolArguments)
        const records = normalizeToolRecords(payload.records)
        const msg = messages.value.find(m => m.id === assistantMsgId)
        return {
          reply: msg?.content || '好的，接下来请确认您的需求',
          records,
          batch: payload.batch,
        }
      } catch (e) {
        console.error('Error parsing tool arguments:', e)
      }
    }

    const msg = messages.value.find(m => m.id === assistantMsgId)
    return {
      reply: msg?.content || '我没有理解您的意思，请重试。',
      records: [],
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      showToast('请求超时，已切换为本地解析')
    } else {
      console.error('Error in callSiliconFlow:', e)
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

async function buildPlan(userText: string, assistantMsgId: string): Promise<ToolPlan> {
  try {
    const remotePlan = await callSiliconFlow(userText, assistantMsgId)
    if (remotePlan) return remotePlan
  } catch {
    showToast(hasConfiguredApiKey.value ? '已读取 API Key，但 AI 请求失败，已使用本地解析' : 'AI 服务暂不可用，已使用本地解析')
  }

  const records = parseRecordsLocally(userText)
  if (!records.length) {
    return {
      reply: '我还没有识别到可添加的金额和事项，你可以换成“今天买栗子十块钱，运费五块钱”这种说法。',
      records: [],
    }
  }

  return {
    reply: '好的，接下来请确认您的需求',
    records,
  }
}

async function sendMessage(text = input.value) {
  const content = text.trim()
  if (!content || sending.value) return

  input.value = ''
  sending.value = true
  pushMessage('user', content)

  const assistantMsgId = crypto.randomUUID()
  messages.value.push({
    id: assistantMsgId,
    role: 'assistant',
    content: '思考中...',
  })

  try {
    const plan = await buildPlan(content, assistantMsgId)

    const msg = messages.value.find(m => m.id === assistantMsgId)
    if (msg && msg.content === '思考中...') {
      msg.content = plan.reply
    }

    if (plan.batch) {
      if (plan.batch.action === 'create') {
        shouldCreateBatch.value = true
        newBatchName.value = plan.batch.name
      } else if (plan.batch.action === 'use') {
        shouldCreateBatch.value = false
        const targetName = plan.batch.name
        const existingBatch = store.sortedBatches.find(b => b.name === targetName)
        if (existingBatch) {
          selectedBatchId.value = existingBatch.id
        }
      }
    } else {
      // 本地兜底解析
      const inferredName = inferBatchNameFromText(content)
      newBatchName.value = inferredName || 'AI 新批次'
      const hasCreateIntent = /(?:新建|创建|新增|建一个)\s*(?:批次|账单)/.test(content)
      const batchExists = store.sortedBatches.some(b => b.name === inferredName)
      shouldCreateBatch.value = hasCreateIntent || (inferredName && !batchExists) || !store.sortedBatches.length
    }

    if (msg && newBatchName.value && shouldCreateBatch.value) {
      msg.content += `\n\n> 💡 检测到您提到了新建批次 **${newBatchName.value}**，已为您默认选中。请在下方清单中确认名称。`
    }

    pendingRecords.value = plan.records
    selectedBatchId.value = store.sortedBatches[0]?.id ?? ''
    showConfirm.value = plan.records.length > 0
  } catch (e) {
    console.error('Error in sendMessage:', e)
    const msg = messages.value.find(m => m.id === assistantMsgId)
    if (msg) {
      msg.content = '抱歉，处理您的请求时出错了，请重试。'
    }
  } finally {
    sending.value = false
  }
}

function startVoiceInput() {
  if (sending.value) return

  if (isListening.value) {
    recognition?.stop()
    return
  }

  const SpeechRecognition = getSpeechRecognition()
  if (!SpeechRecognition) {
    showToast('当前浏览器不支持语音识别')
    return
  }

  recognition?.abort()
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = true
  recognition.continuous = false
  voiceFinalText = ''
  voiceCanceled = false
  isListening.value = true
  showToast('正在听写')

  recognition.onresult = (event) => {
    let interimText = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (!result) continue
      const transcript = result[0].transcript.trim()
      if (result.isFinal) voiceFinalText += transcript
      else interimText += transcript
    }
    input.value = voiceFinalText || interimText
  }

  recognition.onerror = () => {
    voiceCanceled = true
    isListening.value = false
    showToast('语音识别失败，请重试')
  }

  recognition.onend = () => {
    isListening.value = false
    if (voiceCanceled) {
      voiceFinalText = ''
      return
    }
    const content = voiceFinalText.trim() || input.value.trim()
    voiceFinalText = ''
    if (content) sendMessage(content)
  }

  try {
    recognition.start()
  } catch {
    isListening.value = false
    showToast('语音识别启动失败')
  }
}

function confirmRecords() {
  let batchId = selectedBatch.value?.id
  let batchName = selectedBatch.value?.name ?? ''

  if (shouldCreateBatch.value) {
    const trimmedName = newBatchName.value.trim()
    if (!trimmedName) {
      showToast('请输入新批次名称')
      return
    }
    const batch = store.addBatch(trimmedName)
    batchId = batch.id
    batchName = batch.name
  }

  if (!batchId) {
    showToast('请选择批次或新建批次')
    return
  }

  pendingRecords.value.forEach((record) => {
    const draft: RecordDraft = {
      batchId: batchId!,
      category: record.category,
      amount: record.amount,
      note: record.note,
      date: record.date,
    }
    store.addRecord(draft)
  })

  const count = pendingRecords.value.length
  showConfirm.value = false
  pendingRecords.value = []
  pushMessage('assistant', `已添加 ${count} 条记录到「${batchName || store.getBatchName(batchId)}」。`)
  showToast({
    message: `已添加 ${count} 条记录`,
    duration: 2000,
  })
}

function openApiSettings() {
  apiKeyDraft.value = ''
  showApiSettings.value = true
}

function saveApiKey() {
  const value = apiKeyDraft.value.trim()
  if (!value) {
    showToast('请输入 API Key')
    return
  }

  localStorage.setItem(SILICONFLOW_API_KEY_STORAGE, value)
  savedApiKey.value = localStorage.getItem(SILICONFLOW_API_KEY_STORAGE) || ''
  apiKeyDraft.value = ''
  showToast(savedApiKey.value ? 'API Key 已保存并启用' : 'API Key 保存失败，请重试')
}

function clearApiKey() {
  localStorage.removeItem(SILICONFLOW_API_KEY_STORAGE)
  savedApiKey.value = ''
  apiKeyDraft.value = ''
  showToast(envApiKey ? '已清除本地 API Key' : 'API Key 已清除')
}
</script>

<template>
  <main class="ai-shell app-text mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden">
    <header class="ai-header flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
      <button class="icon-button" type="button" @click="router.back()">
        <van-icon name="arrow-left" size="22" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-xl font-black">AI账单助手</h1>
        <p class="app-subtle mt-1 truncate text-xs">自然语言记账，确认后自动执行</p>
      </div>
      <button class="icon-button" type="button" @click="openApiSettings">
        <van-icon name="setting-o" size="20" />
      </button>
      <span class="model-badge">V4</span>
    </header>

    <section ref="messageListRef" class="message-list flex-1 flex flex-col space-y-3 overflow-y-auto px-4 py-4">
      <article v-for="message in messages" :key="message.id" class="message" :class="message.role === 'user' ? 'message-user' : 'message-assistant'">
        <div :class="['prose prose-sm max-w-none prose-p:my-0', message.role === 'user' ? 'prose-invert prose-p:text-white prose-strong:text-white text-white' : '']" v-html="renderMarkdown(message.content)"></div>
      </article>
    </section>

    <footer class="composer shrink-0 px-4 pb-4 pt-3">
      <!-- 重新唤起弹窗的提示条 -->
      <div v-if="pendingRecords.length > 0 && !showConfirm" class="mb-3 flex items-center justify-between rounded-xl bg-amber-50/80 px-4 py-3 text-sm text-amber-800 border border-amber-200/50 backdrop-blur-sm">
        <span class="flex items-center gap-1">
          <van-icon name="info-o" size="16" />
          您有 {{ pendingRecords.length }} 条未确认的账单
        </span>
        <button class="font-bold text-amber-600 active:text-amber-700" type="button" @click="showConfirm = true">重新打开</button>
      </div>

      <div class="quick-row mb-3 flex gap-2 overflow-x-auto">
        <button class="quick-chip" type="button" @click="sendMessage('我今天买了个栗子十块钱，运费五块钱')">栗子 + 运费</button>
        <button class="quick-chip" type="button" @click="sendMessage('今天卖出收入一百二十元')">卖出收入</button>
        <button class="quick-chip" type="button" @click="sendMessage('包装费六块，手续费三块')">费用拆分</button>
      </div>
      <div class="composer-box flex items-end gap-2">
        <van-field v-model="input" class="composer-input flex-1" autosize rows="1" type="textarea" placeholder="例如：我今天买了个栗子十块钱，运费五块钱" @keyup.enter.exact.prevent="sendMessage()" />
        <button class="voice-button" :class="{ 'voice-button-active': isListening }" type="button" :disabled="sending" @click="startVoiceInput">
          <svg v-if="!isListening" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <van-icon v-else name="pause-circle-o" size="20" />
        </button>
        <button class="send-button" type="button" :disabled="sending" @click="sendMessage()">
          <van-loading v-if="sending" color="#fff" size="18" />
          <van-icon v-else name="guide-o" size="20" />
        </button>
      </div>
    </footer>

    <van-popup v-model:show="showConfirm" round position="bottom" class="confirm-popup">
      <section class="px-5 pb-5 pt-4">
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--app-border)]" />
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-black">确认执行清单</h2>
            <p class="app-subtle mt-1 text-sm">确认后会自动写入当前账本</p>
          </div>
          <span class="summary-pill">{{ pendingRecords.length }} 条</span>
        </div>

        <div class="mt-4 rounded-2xl border border-[var(--app-border)]">
          <div class="border-b border-[var(--app-border)] p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-black">写入批次账单</p>
                <p class="app-subtle mt-1 text-xs">选择已有批次，或为这次 AI 记账创建新批次</p>
              </div>
              <button class="batch-mode-button" type="button" @click="shouldCreateBatch = !shouldCreateBatch">
                {{ shouldCreateBatch ? '选已有' : '新建' }}
              </button>
            </div>

            <div v-if="shouldCreateBatch || !store.sortedBatches.length" class="batch-create-box">
              <span class="app-subtle text-xs">新批次名称</span>
              <van-field v-model="newBatchName" class="batch-name-field" placeholder="例如：栗子批次" />
            </div>

            <div v-else class="py-1">
              <van-dropdown-menu class="!bg-transparent">
                <van-dropdown-item v-model="selectedBatchId" :options="store.sortedBatches.map(b => ({ text: b.name, value: b.id }))" />
              </van-dropdown-menu>
            </div>
          </div>
          <div class="divide-y divide-[var(--app-border)]">
            <div v-for="record in pendingRecords" :key="`${record.category}-${record.amount}-${record.note}`" class="record-action">
              <div class="min-w-0">
                <p class="truncate text-sm font-black">{{ record.note }}</p>
                <p class="app-subtle mt-1 text-xs">{{ record.category }} · {{ record.date }}</p>
              </div>
              <strong class="amount-text" :class="isIncome(record.category) ? 'text-emerald-500' : 'text-red-500'">
                {{ isIncome(record.category) ? '+' : '-' }}{{ formatMoney(record.amount) }}
              </strong>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="app-subtle text-xs">合计待添加</span>
            <strong class="text-base">{{ formatMoney(pendingTotal) }}</strong>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="cancel-button" type="button" @click="showConfirm = false">取消</button>
          <button class="confirm-button" type="button" @click="confirmRecords">确认添加</button>
        </div>
      </section>
    </van-popup>

    <van-popup v-model:show="showApiSettings" round position="bottom" class="confirm-popup">
      <section class="px-5 pb-5 pt-4">
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--app-border)]" />
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-black">AI 模型配置</h2>
            <p class="app-subtle mt-1 text-sm">{{ apiKeyStatusText }}</p>
          </div>
          <span class="summary-pill">{{ hasConfiguredApiKey ? '已配置' : '本地' }}</span>
        </div>

        <div class="api-key-box mt-4">
          <span class="app-subtle text-xs">SiliconFlow API Key</span>
          <van-field v-model="apiKeyDraft" class="api-key-field" type="password" autocomplete="off" clearable placeholder="请输入 API Key" />
          <p v-if="hasLocalApiKey" class="app-subtle mt-2 text-xs">当前浏览器已保存，重新输入后会覆盖。</p>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="cancel-button" type="button" @click="clearApiKey">清除</button>
          <button class="confirm-button" type="button" @click="saveApiKey">保存</button>
        </div>
      </section>
    </van-popup>
  </main>
</template>

<style scoped>
.ai-shell {
  background: var(--app-page);
}

.ai-header,
.composer {
  border-color: var(--app-border);
  background: var(--app-page);
}

.ai-header {
  border-bottom: 1px solid var(--app-border);
}

.composer {
  border-top: 1px solid var(--app-border);
}

.icon-button,
.send-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
}

.icon-button {
  background: var(--app-surface);
  color: var(--app-text);
}

.model-badge,
.quick-chip,
.summary-pill {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.model-badge {
  padding: 7px 10px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.message-list {
  scrollbar-width: none;
}

.message-list::-webkit-scrollbar,
.quick-row::-webkit-scrollbar {
  display: none;
}

.message {
  width: fit-content;
  min-width: 0;
  max-width: 86%;
  border-radius: 20px;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.message-assistant {
  align-self: flex-start;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
}

.message-user {
  align-self: flex-end;
  background: var(--app-primary);
  color: #fff;
}

.quick-row {
  scrollbar-width: none;
}

.quick-chip {
  flex: 0 0 auto;
  border: 1px solid var(--app-border);
  padding: 7px 11px;
  background: var(--app-surface);
  color: var(--app-text-muted);
}

.composer-box {
  border: 1px solid var(--app-border);
  border-radius: 22px;
  padding: 6px;
  background: var(--app-surface);
}

:deep(.composer-input) {
  background: transparent;
}

:deep(.composer-input .van-cell) {
  padding: 6px 4px 6px 10px;
  background: transparent;
}

.voice-button,
.send-button {
  flex: 0 0 auto;
}

.voice-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.voice-button-active {
  background: var(--app-expense);
  color: #fff;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--app-expense) 14%, transparent);
}

.send-button {
  background: var(--app-primary);
  color: #fff;
}

.voice-button:disabled,
.send-button:disabled {
  opacity: 0.7;
}

:global(.confirm-popup) {
  max-width: 430px;
  margin: 0 auto;
  background: var(--app-page);
}

.summary-pill {
  padding: 7px 10px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.batch-mode-button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 7px 11px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
}

.batch-create-box {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 10px 12px 6px;
  background: var(--app-surface);
}

.api-key-box {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 10px 12px 6px;
  background: var(--app-surface);
}

:deep(.batch-name-field),
:deep(.api-key-field) {
  margin-top: 4px;
  background: transparent;
}

:deep(.batch-name-field .van-cell),
:deep(.api-key-field .van-cell) {
  padding: 0;
  background: transparent;
}

.batch-option-list {
  display: grid;
  max-height: 188px;
  gap: 8px;
  overflow-y: auto;
  padding-right: 2px;
}

.batch-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 10px;
  background: var(--app-surface);
  color: var(--app-text);
}

.batch-option-active {
  border-color: color-mix(in srgb, var(--app-primary) 42%, var(--app-border));
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.batch-option-cover {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 13px;
  background: color-mix(in srgb, var(--app-primary) 12%, white);
  font-size: 12px;
  font-weight: 900;
}

.batch-option-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record-action {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.amount-text {
  flex: 0 0 auto;
  color: var(--app-expense);
  font-size: 15px;
}

.cancel-button,
.confirm-button {
  height: 44px;
  border: 0;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 800;
}

.cancel-button {
  background: var(--app-surface);
  color: var(--app-text-muted);
}

.confirm-button {
  background: var(--app-primary);
  color: #fff;
}
</style>
