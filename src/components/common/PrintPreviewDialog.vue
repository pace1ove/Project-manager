<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="90%"
    top="3vh"
    :close-on-click-modal="false"
    class="print-preview-dialog"
    @closed="onClosed"
  >
    <!-- ===== 工具栏选项 ===== -->
    <div class="print-options">
      <div class="opt-group">
        <span class="opt-label">纸张方向：</span>
        <el-radio-group
          v-model="orientation"
          size="small"
        >
          <el-radio-button value="portrait">
            纵向
          </el-radio-button>
          <el-radio-button value="landscape">
            横向
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="opt-group">
        <el-checkbox v-model="showHeader">
          打印页眉
        </el-checkbox>
        <el-checkbox v-model="showFooter">
          打印页脚
        </el-checkbox>
      </div>
      <div class="opt-group">
        <span class="opt-label">页眉文本：</span>
        <el-input
          v-model="headerText"
          size="small"
          style="width: 260px"
          placeholder="自定义公司名称/页眉"
        />
      </div>
    </div>

    <!-- ===== 预览区域 ===== -->
    <div class="print-preview-area">
      <div
        class="print-paper"
        :class="{ landscape: orientation === 'landscape' }"
      >
        <!-- 页眉 -->
        <div
          v-if="showHeader"
          class="print-header"
        >
          <div class="print-header-title">
            {{ headerText || defaultHeader }}
          </div>
          <div class="print-header-sub">
            {{ printSubtitle }}
          </div>
        </div>

        <!-- 插槽：打印内容 -->
        <slot />

        <!-- 页脚 -->
        <div
          v-if="showFooter"
          class="print-footer"
        >
          <span>打印时间：{{ printTime }}</span>
          <span>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
        </div>
      </div>
    </div>

    <!-- ===== 底部按钮 ===== -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :icon="Printer"
          @click="doPrint"
        >
          <el-icon><Printer /></el-icon> 打印
        </el-button>
      </div>
    </template>

    <!-- ===== 传送门：实际打印内容（隐藏在屏幕，打印时显示） ===== -->
    <Teleport to="body">
      <div
        id="print-area"
        :class="{ 'print-landscape': orientation === 'landscape' }"
      >
        <div class="print-paper raw">
          <div
            v-if="showHeader"
            class="print-header"
          >
            <div class="print-header-title">
              {{ headerText || defaultHeader }}
            </div>
            <div class="print-header-sub">
              {{ printSubtitle }}
            </div>
          </div>
          <slot />
          <div
            v-if="showFooter"
            class="print-footer"
          >
            <span>打印时间：{{ printTime }}</span>
            <span>第 1 页</span>
          </div>
        </div>
      </div>
    </Teleport>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Printer } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const props = withDefaults(
  defineProps<{
    /** 打印标题（用于页眉副标题和对话框标题） */
    title?: string
    /** 默认页眉文本 */
    defaultHeader?: string
    /** 是否默认显示页眉 */
    defaultShowHeader?: boolean
    /** 是否默认显示页脚 */
    defaultShowFooter?: boolean
  }>(),
  {
    title: '打印预览',
    defaultHeader: 'BOM 管理系统',
    defaultShowHeader: true,
    defaultShowFooter: true
  }
)

const emit = defineEmits<{
  (e: 'printed'): void
}>()

const visible = ref(false)
const orientation = ref<'portrait' | 'landscape'>('portrait')
const showHeader = ref(props.defaultShowHeader)
const showFooter = ref(props.defaultShowFooter)
const headerText = ref('')

// 从 localStorage 读取页眉配置
try {
  const saved = localStorage.getItem('bom-manager-print-header')
  if (saved) {
    const parsed = JSON.parse(saved)
    if (parsed.headerText) headerText.value = parsed.headerText
    if (typeof parsed.showFooter === 'boolean') showFooter.value = parsed.showFooter
  }
} catch {
  // ignore
}

const dialogTitle = computed(() => `打印预览 - ${props.title}`)
const printSubtitle = computed(() => `${props.title}  |  打印日期：${dayjs().format('YYYY-MM-DD')}`)
const printTime = computed(() => dayjs().format('YYYY-MM-DD HH:mm'))

// 模拟分页（预览用，实际分页由浏览器处理）
const currentPage = ref(1)
const totalPages = ref(1)

/** 打开预览对话框 */
function open() {
  visible.value = true
}

/** 关闭 */
function close() {
  visible.value = false
}

defineExpose({ open, close })

/** 执行打印 */
function doPrint() {
  // 打印前保存页眉配置
  try {
    localStorage.setItem(
      'bom-manager-print-header',
      JSON.stringify({
        headerText: headerText.value,
        showFooter: showFooter.value
      })
    )
  } catch {
    // ignore
  }

  // 给 body 加标记类，配合 print.css 隐藏应用外壳
  document.body.classList.add('is-printing')
  document.documentElement.classList.add('printing')

  // 等待 DOM 更新后调用打印
  setTimeout(() => {
    window.print()
    // 打印结束后移除标记类
    setTimeout(() => {
      document.body.classList.remove('is-printing')
      document.documentElement.classList.remove('printing')
      emit('printed')
    }, 500)
  }, 100)
}

function onClosed() {
  document.body.classList.remove('is-printing')
  document.documentElement.classList.remove('printing')
}

// 监听打印后自动关闭对话框
watch(visible, (val) => {
  if (!val) onClosed()
})
</script>

<style scoped>
.print-options {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
}
.opt-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opt-label {
  font-size: 13px;
  color: #606266;
}
.print-preview-area {
  background: #f0f2f5;
  padding: 16px;
  overflow: auto;
  max-height: 65vh;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.print-paper {
  background: #fff;
  margin: 0 auto;
  padding: 18mm 16mm;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  width: 210mm;
  min-height: 297mm;
  font-size: 10.5pt;
  color: #000;
}
.print-paper.landscape {
  width: 297mm;
  min-height: 210mm;
}
.print-header {
  text-align: center;
  margin-bottom: 8mm;
  border-bottom: 2px solid #303133;
  padding-bottom: 4mm;
}
.print-header-title {
  font-size: 14pt;
  font-weight: 700;
}
.print-header-sub {
  font-size: 10pt;
  font-weight: 400;
  color: #606266;
  margin-top: 2mm;
}
.print-footer {
  margin-top: 6mm;
  padding-top: 3mm;
  border-top: 1px solid #ccc;
  font-size: 9pt;
  color: #606266;
  display: flex;
  justify-content: space-between;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
