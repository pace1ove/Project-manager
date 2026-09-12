import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserInfo } from '@/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo>({
    name: '管理员',
    role: 'admin'
  })

  function setUser(info: UserInfo) {
    user.value = info
  }

  return { user, setUser }
})
