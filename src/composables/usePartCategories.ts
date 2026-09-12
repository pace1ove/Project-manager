import { ref, watch, computed } from 'vue'

export interface PartCategory {
  id: string
  name: string
  color?: string
  sortOrder: number
}

const STORAGE_KEY = 'bom_part_categories'

const DEFAULT_CATEGORIES: PartCategory[] = [
  { id: 'cat_85', name: '85零件', color: '#409eff', sortOrder: 1 },
  { id: 'cat_86', name: '86零件', color: '#67c23a', sortOrder: 2 },
  { id: 'cat_standard', name: '标准件', color: '#e6a23c', sortOrder: 3 },
  { id: 'cat_purchased', name: '外购件', color: '#f56c6c', sortOrder: 4 }
]

function loadCategories(): PartCategory[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
}

// 模块级单例（多个组件共享同一份数据）
const categories = ref<PartCategory[]>(loadCategories())

watch(categories, (val) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch { /* ignore */ }
}, { deep: true })

export function usePartCategories() {
  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  function getCategoryName(id: string): string {
    return categories.value.find(c => c.id === id)?.name || id || ''
  }

  function getCategoryColor(id: string): string {
    return categories.value.find(c => c.id === id)?.color || '#909399'
  }

  function addCategory(data: Omit<PartCategory, 'id' | 'sortOrder'> & { sortOrder?: number }): PartCategory {
    const maxOrder = categories.value.reduce((m, c) => Math.max(m, c.sortOrder), 0)
    const cat: PartCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      color: data.color || '#909399',
      sortOrder: data.sortOrder ?? maxOrder + 1
    }
    categories.value.push(cat)
    return cat
  }

  function updateCategory(id: string, data: Partial<Omit<PartCategory, 'id'>>): void {
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      categories.value[idx] = { ...categories.value[idx], ...data }
    }
  }

  function deleteCategory(id: string): void {
    categories.value = categories.value.filter(c => c.id !== id)
  }

  function resetToDefaults(): void {
    categories.value = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
  }

  return {
    categories,
    sortedCategories,
    getCategoryName,
    getCategoryColor,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults
  }
}
