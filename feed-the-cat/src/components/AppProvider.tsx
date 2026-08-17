'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'vi'
type Theme = 'light' | 'dark'

type AppContextType = {
  lang: Language
  setLang: (lang: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  t: (key: string) => string
}

const translations = {
  en: {
    welcome: 'Welcome',
    leaderboard: 'Leaderboard',
    logout: 'Logout',
    level: 'Level',
    tapToFeed: 'Tap the cat to feed it!',
    levelUp: '🎉 Level Up! 🎉',
    reachedLevel: 'Your cat has reached Level',
    claimRewardText: 'Claim your reward below:',
    claimRewardBtn: 'Claim Reward (+10% EXP)',
    close: 'Close',
    loading: 'Loading...',
    login: 'Login',
    loginTitle: 'Login to MewMewFeed',
    register: 'Register',
    registerTitle: 'Join MewMewFeed',
    username: 'Username',
    password: 'Password',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    rank: 'Rank',
    totalExp: 'Total EXP',
    backToGame: 'Back to Game',
    topCats: 'Top 100 Cats',
    noUsers: 'No users yet. Be the first to play!',
    profile: 'Profile',
    updateProfile: 'Update Profile',
    displayNamePlaceholder: 'Your Display Name',
    save: 'Save',
    saving: 'Saving...',
    yourMemeCollection: 'Your Meme Collection',
    uploadAvatar: 'Upload Avatar',
    searchUsers: 'Search Users',
    findPlayer: 'Find a Player',
    searchPlaceholder: 'Username...',
    search: 'Search',
    changeNameLimitMsg: 'You can only change your name once every 30 days. Next available:',
    deleteAvatarConfirm: 'Are you sure you want to delete your avatar?',
    deleteMemeConfirm: 'Are you sure you want to delete this meme?',
    cropImage: 'Crop Image',
  },
  vi: {
    welcome: 'Xin chào',
    leaderboard: 'Bảng xếp hạng',
    logout: 'Đăng xuất',
    level: 'Cấp',
    tapToFeed: 'Chạm vào mèo để cho ăn!',
    levelUp: '🎉 Lên cấp! 🎉',
    reachedLevel: 'Mèo của bạn đã đạt Cấp',
    claimRewardText: 'Nhận phần thưởng của bạn dưới đây:',
    claimRewardBtn: 'Nhận thưởng (+10% EXP)',
    close: 'Đóng',
    loading: 'Đang tải...',
    login: 'Đăng nhập',
    loginTitle: 'Đăng nhập vào MewMewFeed',
    register: 'Đăng ký',
    registerTitle: 'Tham gia MewMewFeed',
    username: 'Tên người dùng',
    password: 'Mật khẩu',
    noAccount: "Chưa có tài khoản?",
    haveAccount: 'Đã có tài khoản?',
    rank: 'Hạng',
    totalExp: 'Tổng EXP',
    backToGame: 'Về trò chơi',
    topCats: 'Top 100 Mèo',
    noUsers: 'Chưa có người chơi nào. Hãy là người đầu tiên!',
    profile: 'Hồ sơ',
    updateProfile: 'Cập nhật hồ sơ',
    displayNamePlaceholder: 'Tên hiển thị của bạn',
    save: 'Lưu',
    saving: 'Đang lưu...',
    yourMemeCollection: 'Bộ sưu tập Meme của bạn',
    uploadAvatar: 'Đổi ảnh đại diện',
    searchUsers: 'Tìm kiếm người chơi',
    findPlayer: 'Tìm một người chơi',
    searchPlaceholder: 'Tên người dùng...',
    search: 'Tìm kiếm',
    changeNameLimitMsg: 'Bạn chỉ được đổi tên 30 ngày một lần. Lần đổi tiếp theo:',
    deleteAvatarConfirm: 'Bạn có chắc chắn muốn xóa ảnh đại diện không?',
    deleteMemeConfirm: 'Bạn có chắc chắn muốn xóa meme này không?',
    cropImage: 'Cắt ảnh',
  }
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedLang = localStorage.getItem('lang') as Language
    if (savedLang) setLangState(savedLang)
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) {
      setThemeState(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const t = (key: string) => {
    // @ts-ignore
    return translations[lang][key] || key
  }

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, t }}>
      {!mounted ? <div style={{ visibility: 'hidden' }}>{children}</div> : children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppProvider')
  return context
}
